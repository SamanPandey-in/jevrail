"use client";

import { Tabs } from "./Tabs";
import { CodeBlock } from "./CodeBlock";
import { track } from "@/lib/analytics";

export function AgentTabs() {
  return (
    <Tabs
      onChange={(agent) => track("install_method_selected", { method: "agent-install", agent, surface: "installation_doc" })}
      items={[
        {
          value: "claude",
          label: "Claude Code",
          content: (
            <div className="space-y-3">
              <CodeBlock
                code="jevrail install --agent claude"
                label="Terminal"
                event="install_command_copied"
                trackData={{ method: "agent-install", agent: "claude", surface: "installation_doc" }}
              />
              <p className="text-sm text-muted-foreground">
                Merges a <code className="text-primary">PreToolUse</code> hook into{" "}
                <code className="text-primary">~/.claude/settings.json</code> (existing settings are backed up first).
              </p>
            </div>
          ),
        },
        {
          value: "opencode",
          label: "opencode",
          content: (
            <div className="space-y-3">
              <CodeBlock
                code="jevrail install --agent opencode"
                label="Terminal"
                event="install_command_copied"
                trackData={{ method: "agent-install", agent: "opencode", surface: "installation_doc" }}
              />
              <p className="text-sm text-muted-foreground">
                Installs the plugin to <code className="text-primary">~/.config/opencode/plugin/jevrail.ts</code> and
                registers it in <code className="text-primary">opencode.json</code>. Restart opencode afterward. Config
                is only loaded at startup.
              </p>
              <CodeBlock
                code="jevrail install --agent opencode --project"
                label="Project-local variant"
                event="install_command_copied"
                trackData={{ method: "agent-install", agent: "opencode", variant: "project", surface: "installation_doc" }}
              />
              <p className="text-sm text-muted-foreground">
                Installs to <code className="text-primary">.opencode/plugin/jevrail.ts</code> instead. It is auto-discovered,
                no config edit needed.
              </p>
            </div>
          ),
        },
        {
          value: "codex",
          label: "Codex",
          content: (
            <div className="space-y-3">
              <CodeBlock
                code="jevrail hook codex"
                label="Terminal"
                event="install_command_copied"
                trackData={{ method: "agent-install", agent: "codex", surface: "installation_doc" }}
              />
              <p className="text-sm text-muted-foreground">
                Codex support is wired through <code className="text-primary">jevrail hook codex</code> directly; its
                hook schema is still unverified against every Codex release. See{" "}
                <a href="/docs/supported-agents" className="text-primary underline underline-offset-2">
                  Supported Agents
                </a>{" "}
                for current status.
              </p>
            </div>
          ),
        },
      ]}
    />
  );
}
