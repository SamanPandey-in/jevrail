/**
 * jevrail opencode plugin
 *
 * Intercepts `bash` tool calls via `tool.execute.before` and delegates the
 * decision to the `jevrail` binary (`jevrail hook opencode`). Throwing inside
 * `tool.execute.before` blocks the tool — this is the opencode equivalent of
 * Claude Code's `PreToolUse` exit 2.
 *
 * Install: `jevrail install --agent opencode`
 *   - copies this file to `~/.config/opencode/plugin/jevrail.ts` (global)
 *     or `.opencode/plugin/jevrail.ts` (project, if opencode.json exists)
 *   - ensures `opencode.json` `plugin` array references it
 * Verify: `jevrail doctor` / `jevrail explain "rm -rf /"`
 *
 * The plugin intentionally does NOT import extra deps — it uses Node's
 * `child_process.spawn` so it works under both Bun and Node shims that
 * opencode ships with.
 */

import type { Plugin } from "@opencode-ai/plugin"
import { spawn } from "node:child_process"

type HookInput = {
  tool: string
  sessionID?: string
}

type HookOutput = {
  args: {
    command?: string
    [key: string]: unknown
  }
}

type JevrailDecision = {
  decision: string // allow | ask | deny
  reason: string
}

function runJevrailHook(payload: { tool: string; command: string; cwd: string }): Promise<JevrailDecision> {
  return new Promise((resolve, reject) => {
    // Prefer `jevrail` on PATH (installed via `go install`). Windows users
    // with a local build can set `JEVRAIL_BIN=.\jevrail.exe`.
    const bin = process.env.JEVRAIL_BIN || "jevrail"

    const child = spawn(bin, ["hook", "opencode"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    })

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (d: Buffer) => (stdout += d.toString()))
    child.stderr.on("data", (d: Buffer) => (stderr += d.toString()))

    child.on("error", (err: Error) => {
      // Binary not found — fail open with a warning, don't brick every bash call.
      // Mirrors jevrail's hook decode fail-open philosophy.
      reject(new Error(`jevrail binary not found (${bin}): ${err.message}. Install with: go install ./cmd/jevrail`))
    })

    child.on("close", (code: number | null) => {
      // jevrail opencode Encode returns JSON {decision, reason} and exit 2 on deny.
      // We parse stdout regardless of exit code — the JSON is authoritative.
      let parsed: JevrailDecision | null = null
      try {
        parsed = JSON.parse(stdout) as JevrailDecision
      } catch {
        // If stdout isn't JSON, fall back to exit code semantics.
        if (code === 2) {
          reject(new Error(stderr || stdout || "jevrail: blocked by hard rule (exit 2)"))
          return
        }
        if (code !== 0 && code !== null) {
          reject(new Error(stderr || stdout || `jevrail hook failed (exit ${code})`))
          return
        }
        // Non-JSON success -> allow
        resolve({ decision: "allow", reason: stdout || "jevrail: allow (no JSON)" })
        return
      }

      if (!parsed) {
        resolve({ decision: "allow", reason: "jevrail: empty response, allowing" })
        return
      }

      resolve(parsed)
    })

    child.stdin.write(JSON.stringify(payload))
    child.stdin.end()
  })
}

export default (async ({ directory }) => {
  return {
    // IMPORTANT: this is a top-level dotted key, NOT `tool: { execute: { before } }`.
    // `tool` is reserved for registering new tools. See:
    // https://github.com/anomalyco/opencode/issues - dcg plugin gist fix.
    "tool.execute.before": async (input: HookInput, output: HookOutput) => {
      if (input.tool !== "bash") return

      const command = output.args.command as string | undefined
      if (!command || typeof command !== "string" || command.trim() === "") return

      const cwd = (output.args.workdir as string) || directory || process.cwd()

      let decision: JevrailDecision
      try {
        decision = await runJevrailHook({ tool: "bash", command, cwd })
      } catch (err) {
        // Binary missing or spawn failure: warn but don't block.
        // To make this fail-closed, throw instead.
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes("binary not found")) {
          // Fail open — log to stderr so it shows in opencode's log
          console.error(`[jevrail] ${msg}`)
          return
        }
        throw err
      }

      if (decision.decision === "deny" || decision.decision === "ask") {
        // Throwing blocks the tool. Include the templated reason so the agent
        // can pick a safer alternative (model never generates free-form text).
        const label = decision.decision === "deny" ? "blocked" : "requires confirmation"
        throw new Error(`jevrail ${label}: ${decision.reason}\n\nCommand: ${command}`)
      }

      // "allow" -> do nothing, tool proceeds
    },
  }
}) satisfies Plugin
