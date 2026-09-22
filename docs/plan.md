# Jevrail — a probability-scored pre-execution guard for terminal coding agents

> Working name: `Jevrail`. Language: Go. Model: Jev (TypeSafe AI System One).
> Status: plan v1. Items marked ⚠️ are things I could not verify and you must check in current docs before coding against them.

---

## 0. TL;DR — the decisions

| Question | Decision |
|---|---|
| CLI or something else? | **A single Go binary that is a CLI, but used as a hook target — not a terminal watcher.** Claude Code and Codex both fire a `PreToolUse` hook that can block a command before it runs. That is the only supported interception point that can *prevent* damage. Watching a terminal only tells you after the fact. |
| Daemon? | **Not in the MVP.** Add a local unix-socket daemon in Phase 2, only to reuse the HTTPS connection and cache decisions. |
| What does Jev do? | Answers ~7 typed questions about a command plus its real context (git state, cwd, env hints, script bodies) in **one call**. Returns probabilities. |
| What does code do? | Everything Jev is bad at: parsing, path resolution, counting files, git stats, thresholds, final allow/ask/deny. |
| Golden rule | **Jev can only tighten a decision, never loosen one.** Deterministic hard-blocks are final. Jev's "looks safe" never overrides a rule. |
| What makes it not-slop | A public benchmark + calibration report proving the probabilities mean something on real commands. Without that it's just another regex wrapper with an API call. |

**The single biggest bottleneck:** does Jev's judgment on shell commands have good enough recall at an acceptable false-positive rate? Everything else is plumbing. Phase 0 tests this in a day before any infrastructure exists.

---

## 1. Problem and honest positioning

Coding agents run shell commands. Sometimes those commands destroy uncommitted work (`git reset --hard`, `rm -rf` on the wrong path, `git checkout -- .`) or touch production data (`DROP TABLE` against the wrong database). Nothing sits between the agent's decision and the shell.

> ⚠️ Verify before you cite: I did not verify any specific public incident report. In the README, link only primary sources you have opened yourself.

### Prior art you must know about

- **dcg (Destructive Command Guard)** — mature, open source, Rust, deterministic. Reported to hook into Claude Code, Codex CLI, Gemini CLI, Copilot CLI and others, with 49+ "packs" (databases, Kubernetes, cloud, etc.) and sub-millisecond matching. Its design is fail-open on timeouts/parse errors.
- **claude-code-command-guard**, **ai-agent-guardrails**, **quality-guard** — smaller rule-based guards, some fail-closed.
- Claude Code's own permission modes. One third-party README says there is also a built-in server-side classifier ⚠️ verify.

### What jevrail does that regex guards cannot

Regex guards match *shapes*. They cannot answer questions that depend on **context** or **meaning**:

1. `rm -rf ./dist` — harmless in one repo, catastrophic in another where `dist` is tracked and dirty. Only context knows.
2. `./cleanup.sh` — a regex sees nothing. jevrail reads the script body (bounded) and asks Jev about what it does.
3. `psql $DATABASE_URL -c "DELETE FROM users"` — is that env var pointing at prod? Regex cannot say.
4. **Calibrated probabilities**, so thresholds are per-harm and tunable instead of one global block/allow.
5. (v2) **Intent alignment**: capture the user's prompt via `UserPromptSubmit` and ask "did the user ask for this?".

Positioning line: *jevrail is the semantic layer on top of deterministic guards, not a replacement for them.* Run it next to dcg if you want.

---

## 2. Form factor: why a hook-target CLI

| Option | Can block before execution? | Works across agents? | Verdict |
|---|---|---|---|
| **A. `PreToolUse` hook → CLI** | ✅ yes (deny/exit 2) | ✅ Claude Code, Codex (both support it) | **Chosen** |
| B. PTY / shell wrapper | ✅ if the agent uses your shell | ⚠️ agents often spawn their own subprocesses | Later, as `jevrail exec` fallback for hookless agents |
| C. MCP server | ❌ agent chooses whether to call it | ✅ | Rejected: advisory, not enforcement |
| D. Proxy between agent and LLM API | ⚠️ sees tool calls in the stream | ❌ brittle per provider, TLS interception | Rejected |
| E. eBPF / syscall tracing | ✅ | ✅ | Rejected: huge over-engineering for v1 |
| F. Terminal output watcher | ❌ after the fact | ✅ | Rejected: useless for prevention |

### Verified hook facts

- Claude Code: `PreToolUse` hooks are configured in `settings.json` with a `matcher` (regex on tool name, e.g. `Bash`) and a command that reads JSON on stdin. Output is `hookSpecificOutput.permissionDecision` = `allow | deny | ask | defer`, with `permissionDecisionReason`. **Exit code 2 blocks the call regardless of JSON.** Precedence: deny > defer > ask > allow.
- Codex: hooks load from `~/.codex/hooks.json`, `~/.codex/config.toml`, or repo-local `.codex/` equivalents (project-local only when the project is trusted). Inline TOML form: `[[hooks.PreToolUse]]`, `matcher = "^Bash$"`, then `[[hooks.PreToolUse.hooks]]` with `type = "command"`, `command = ...`, `timeout = ...`.
- ⚠️ Not verified: Codex's exact stdin JSON fields, its allowed output schema (does it support `ask`, or only block?), and how hooks are enabled (a third-party doctor tool implies a feature flag).
- ⚠️ Not verified: one third-party README claims a hook `deny` still applies under `--dangerously-skip-permissions`. Test it yourself before you promise it.

---

## 3. Architecture

```
 Agent (Claude Code / Codex)
        │  PreToolUse hook: JSON on stdin
        ▼
 ┌──────────────────────────── jevrail hook <agent> ────────────────────────────┐
 │ 1. adapter      parse agent-specific JSON → Event{tool, command, cwd}          │
 │ 2. shellparse   parse command → AST; split &&, |, ;, $(...), bash -c, heredocs │
 │ 3. tier0        hard-deny rules (final)  |  trivial read-only allow (skip Jev) │
 │ 4. context      git state, env hints, resolved targets, script bodies, redact  │
 │ 5. jev          ONE call: state + 7 typed questions                            │
 │ 6. policy       thresholds per harm → allow / ask / deny + templated reason    │
 │ 7. audit        append JSONL: command, answers, model version, verdict, ms     │
 └────────────────────────────────┬───────────────────────────────────────────────┘
                                  ▼
              JSON decision on stdout (or exit 2 to hard-block)
```

Phase 2 adds: `jevrail hook` becomes a thin client that talks to `jevrail daemon` over a unix socket. The daemon holds a keep-alive HTTPS connection to the Jev API (a fresh process per hook call otherwise pays a new TLS handshake every time) and an LRU cache keyed by hash of the state.

### The pipeline in words

1. **Tier 0 hard-deny** (deterministic, final): `rm -rf /`, `rm -rf ~`, `rm -rf /*`, fork bombs, `mkfs*` on a device, `dd of=/dev/…`, `git push --force` to the default branch, `DROP DATABASE`, `curl … | sh`-style pipes to a shell. Small list on purpose — dcg has the big one.
2. **Tier 0 fast-allow**: only if the parsed AST is a single simple command from a short read-only allowlist (`ls`, `cat`, `git status`, `git diff`, `git log`, `pwd`, `echo` …) with no redirects, no substitutions, no pipes into a shell. Skips Jev entirely.
3. Everything else → **context + Jev + policy**.
4. **Jev unreachable / timeout (1.5 s budget)** → fall back by risk class:
   - AST contains a "dangerous keyword" (`rm`, `git reset`, `git clean`, `drop`, `truncate`, `delete`, `dd`, `mkfs`, `push --force`, `kubectl delete`, `terraform destroy`, …) → **ask**.
   - Otherwise → allow, logged as `degraded`.
   - Both are configurable (`fail_mode = "ask" | "allow" | "deny"`).

---

## 4. Jev question design

Rules from Jev's own docs and the launch write-ups that shape this: it **reads literally**, it is **not a calculator**, **dates are text to it**, accuracy **falls when state contains irrelevant material**, and each question should hold **one judgment**. So:

- Counts, dirty-file numbers and path resolution are computed in code and passed as facts.
- Each Noul asks about exactly one harm.
- State is a compact JSON object, not a dump.

### API contract (verified from TypeSafe's API reference and gateway docs)

`POST https://api.typesafe.ai/v1/systemone`, `Authorization: Bearer <key>`, body `{model, state, questions}` where each question has `type` = `noul | choice | score`, `instructions`, and `criteria` (choice: `{option: description}`, up to 255 options; score: ordered array of 2–10 level descriptions; noul: none). Response: `{model, answers, usage}`; Noul → `noul` (0–1, probability of yes, no confidence field); Choice → `choice`, `probabilities`, `confidence`; Score → `score` (can be fractional), `probabilities`, `confidence`. Env var used by TypeSafe SDKs: `TYPESAFE_API_KEY`. Pin the model (`jev-1.13.0` was the resolved `jev-latest` at the time of writing) — `jev-latest` can change answers under you.

Several third-party gateways expose a compatible `/v1/systemone`, so **the base URL must be configurable** and the client sits behind an interface.

### The questions

| ID | Type | What it measures |
|---|---|---|
| `destroys_uncommitted` | Noul | Would discard uncommitted/staged changes (uses `git.dirty_files`) |
| `irreversible_data_loss` | Noul | Deletes/overwrites data with no obvious recovery path |
| `touches_production` | Noul | Connects to or changes a production/shared system (uses `env.hints`) |
| `writes_outside_project` | Noul | Writes/deletes outside `project_root` (uses `resolved.targets`) |
| `exfiltrates_data` | Noul | Sends local files/secrets to a remote host |
| `blast_radius` | Score (4 levels) | Reach of the effects, scratch → project → outside → shared/prod |
| `category` | Choice | Kind of operation, for logging and per-category tuning |

Fan-out is cheap: questions run in parallel over one ingested state, output tokens are free, and TypeSafe's own cookbook reports batching many questions into one call is far cheaper and faster than asking one at a time (their number, self-reported).

```go
// internal/jev/client.go
package jev

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Question struct {
	Type         string `json:"type"` // "noul" | "choice" | "score"
	Instructions string `json:"instructions"`
	Criteria     any    `json:"criteria,omitempty"`
}

type Request struct {
	Model     string              `json:"model"`
	State     any                 `json:"state"`
	Questions map[string]Question `json:"questions"`
}

type Answer struct {
	Type   string   `json:"type"`
	Noul   *float64 `json:"noul,omitempty"`
	Choice string   `json:"choice,omitempty"`
	Score  *float64 `json:"score,omitempty"`
	// Shape differs by question type (map for choice; ⚠️ verify for score).
	Probabilities json.RawMessage `json:"probabilities,omitempty"`
	Confidence    *float64        `json:"confidence,omitempty"`
}

type Response struct {
	Model   string            `json:"model"`
	Answers map[string]Answer `json:"answers"`
	Usage   struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}

type Client struct {
	BaseURL string
	APIKey  string
	Model   string
	HTTP    *http.Client
}

func New(baseURL, apiKey, model string) *Client {
	return &Client{
		BaseURL: baseURL,
		APIKey:  apiKey,
		Model:   model,
		HTTP:    &http.Client{Timeout: 1500 * time.Millisecond},
	}
}

func (c *Client) Evaluate(ctx context.Context, state any, qs map[string]Question) (*Response, error) {
	body, err := json.Marshal(Request{Model: c.Model, State: state, Questions: qs})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/v1/systemone", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("Content-Type", "application/json")

	res, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(io.LimitReader(res.Body, 512))
		return nil, fmt.Errorf("systemone: %s: %s", res.Status, b)
	}
	var out Response
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}
```

```go
// internal/jev/questions.go
package jev

func Questions() map[string]Question {
	return map[string]Question{
		"destroys_uncommitted": {
			Type:         "noul",
			Instructions: "Executing state.command would irreversibly discard changes in the working tree or index that are not committed, considering state.git.dirty_files and state.git.untracked_files.",
		},
		"irreversible_data_loss": {
			Type:         "noul",
			Instructions: "Executing state.command would permanently delete or overwrite data with no obvious way to recover it.",
		},
		"touches_production": {
			Type:         "noul",
			Instructions: "Executing state.command would connect to or modify a production or shared remote system, considering state.env.hints.",
		},
		"writes_outside_project": {
			Type:         "noul",
			Instructions: "Executing state.command would create, modify or delete files outside state.project_root, considering state.resolved.targets.",
		},
		"exfiltrates_data": {
			Type:         "noul",
			Instructions: "Executing state.command would send local files, credentials or environment values to a remote host.",
		},
		"blast_radius": {
			Type:         "score",
			Instructions: "How far the effects of executing state.command reach.",
			Criteria: []string{
				"Read-only, or only scratch and temporary files",
				"Files inside the project directory",
				"Files outside the project, or the user's home or system directories",
				"Shared, remote or production systems",
			},
		},
		"category": {
			Type:         "choice",
			Instructions: "The primary kind of operation state.command performs.",
			Criteria: map[string]string{
				"read_only":       "Only reads or lists information",
				"file_delete":     "Deletes files or directories",
				"file_write":      "Creates or modifies files",
				"git_history":     "Rewrites, resets or force-pushes git history",
				"database":        "Runs queries or migrations against a database",
				"infra":           "Changes cloud, container, cluster or infrastructure state",
				"package_install": "Installs or removes packages or dependencies",
				"network":         "Makes outbound network requests",
				"other":           "Anything else",
			},
		},
	}
}
```

Instructions are written to be **literal and self-contained** because Jev answers the question you wrote, not the one you meant. Expect to iterate on the wording against the benchmark (Section 9).

---

## 5. State schema (what Jev sees)

Keep it small. Redact before sending — commands and repo context go to a third-party API.

```json
{
  "command": "rm -rf ./dist && npm run build",
  "commands": ["rm -rf ./dist", "npm run build"],
  "project_root": "/home/u/app",
  "cwd": "/home/u/app",
  "resolved": {
    "targets": [{"path": "/home/u/app/dist", "inside_project": true, "tracked_by_git": true, "dirty": true, "entry_count": 212}],
    "script_bodies": []
  },
  "git": {"branch": "main", "is_default_branch": true, "dirty_files": 14, "untracked_files": 3, "unpushed_commits": 2},
  "env": {"hints": ["NODE_ENV=production", "DATABASE_URL host contains 'prod'"]}
}
```

Rules:
- **Counts and flags are computed in Go** (`git status --porcelain`, `filepath.EvalSymlinks`, `os.Stat`, bounded directory walk). Never ask Jev to count.
- **Script bodies**: if the command executes a local script or `python -c` / `bash -c` / heredoc, include up to ~8 KB of its text. This is the main thing regex guards cannot do.
- **Secrets**: never send env values or full connection strings. Send only classified hints (`host contains 'prod'`, `NODE_ENV=production`). Redact tokens that match common key patterns.
- **Comments in the command are stripped** via the AST before sending (see the threat model).
- Budget: state + questions well under the 32k-token single-question ceiling reported in the docs; truncate with an explicit `"truncated": true` flag.

---

## 6. Policy: from probabilities to a decision

Noul has no confidence field — the number is the belief — so thresholds apply directly. The values below are **starting guesses, not measured**; Phase 3 tunes them against the benchmark.

| Max harm probability | Action |
|---|---|
| < ask band | allow silently |
| ask band ≤ p < deny band | **ask** the human (Claude Code: `permissionDecision: "ask"`) |
| ≥ deny band | **deny**, and return a reason the agent can act on |

Reasons are **templated in code**, because Jev cannot generate text (e.g. "This would likely discard uncommitted changes (p=0.91). Commit or `git stash` first, then retry.").

```go
// internal/policy/policy.go
package policy

import (
	"fmt"

	"github.com/SamanPandey-in/jevrail/internal/jev"
)

type Verdict int

const (
	Allow Verdict = iota
	Ask
	Deny
)

func (v Verdict) String() string { return [...]string{"allow", "ask", "deny"}[v] }

type Band struct{ Ask, Deny float64 }

// Starting guesses. Tune with the calibration report, do not trust them.
var DefaultBands = map[string]Band{
	"destroys_uncommitted":   {Ask: 0.35, Deny: 0.80},
	"irreversible_data_loss": {Ask: 0.40, Deny: 0.85},
	"touches_production":     {Ask: 0.30, Deny: 0.75},
	"writes_outside_project": {Ask: 0.50, Deny: 0.90},
	"exfiltrates_data":       {Ask: 0.50, Deny: 0.90},
}

const blastAsk = 2.0 // score level: outside project / home / system or higher

var reasons = map[string]string{
	"destroys_uncommitted":   "jevrail: this would likely discard uncommitted changes (p=%.2f). Commit or `git stash` first, then retry.",
	"irreversible_data_loss": "jevrail: this looks likely to cause irreversible data loss (p=%.2f). Use a recoverable alternative (move to trash, take a backup) and retry.",
	"touches_production":     "jevrail: this looks likely to affect a production or shared system (p=%.2f). Confirm the target and ask the user first.",
	"writes_outside_project": "jevrail: this writes outside the project directory (p=%.2f). Confirm the path is intended.",
	"exfiltrates_data":       "jevrail: this looks likely to send local data to a remote host (p=%.2f). Confirm with the user.",
}

type Decision struct {
	Verdict Verdict
	Trigger string
	P       float64
	Reason  string
}

func Decide(ans map[string]jev.Answer, bands map[string]Band) Decision {
	d := Decision{Verdict: Allow}

	for name, b := range bands {
		a, ok := ans[name]
		if !ok || a.Noul == nil {
			// Missing answer: fail safe.
			return Decision{Verdict: Ask, Trigger: name, Reason: "jevrail: incomplete risk assessment; asking for confirmation."}
		}
		p := *a.Noul
		var v Verdict
		switch {
		case p >= b.Deny:
			v = Deny
		case p >= b.Ask:
			v = Ask
		default:
			continue
		}
		if v > d.Verdict || (v == d.Verdict && p > d.P) {
			d = Decision{Verdict: v, Trigger: name, P: p, Reason: fmt.Sprintf(reasons[name], p)}
		}
	}

	if a, ok := ans["blast_radius"]; ok && a.Score != nil && *a.Score >= blastAsk && d.Verdict < Ask {
		d = Decision{
			Verdict: Ask,
			Trigger: "blast_radius",
			P:       *a.Score / 3,
			Reason:  "jevrail: this command's effects reach beyond the project directory; asking for confirmation.",
		}
	}
	return d
}
```

---

## 7. Agent adapters

### Claude Code (verified field names)

```go
// internal/adapter/claude.go
package adapter

type ClaudeInput struct {
	HookEventName string `json:"hook_event_name"`
	ToolName      string `json:"tool_name"`
	ToolInput     struct {
		Command string `json:"command"`
	} `json:"tool_input"`
	CWD string `json:"cwd"` // ⚠️ verify field name against the current hooks reference
}

type ClaudeOutput struct {
	HookSpecificOutput struct {
		HookEventName            string `json:"hookEventName"`
		PermissionDecision       string `json:"permissionDecision"` // allow | deny | ask | defer
		PermissionDecisionReason string `json:"permissionDecisionReason"`
	} `json:"hookSpecificOutput"`
}
```

Installed config (written by `jevrail install --agent claude`, into `~/.claude/settings.json`, merged not overwritten, backed up first):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "jevrail hook claude" }]
      }
    ]
  }
}
```

Exit code 2 + stderr message is the hard-block path for Tier 0 denies.

### Codex

Register `[[hooks.PreToolUse]]` with `matcher = "^Bash$"` and `command = "jevrail hook codex"` in `~/.codex/config.toml` or `~/.codex/hooks.json`. ⚠️ Read the Codex hooks docs first for the exact stdin fields and output schema, and confirm how hooks are enabled. Keep the adapter interface small so only `adapter/codex.go` changes if the schema differs.

```go
// internal/adapter/adapter.go
package adapter

type Event struct {
	Agent   string
	Tool    string
	Command string
	CWD     string
}

type Adapter interface {
	Decode(stdin []byte) (Event, error)
	Encode(verdict string, reason string) (stdout []byte, exitCode int)
}
```

### Later: other tools

- `Write`/`Edit` matchers (overwriting an uncommitted file is also data loss) — v2.
- `jevrail exec -- <cmd>`: a shim for agents with no hook support. Same pipeline, invoked as a wrapper.

---

## 8. CLI surface (one binary)

| Command | Purpose |
|---|---|
| `jevrail hook <claude\|codex>` | The hook target. stdin JSON in, decision out. Must be fast and never crash the agent. |
| `jevrail install [--agent …]` / `uninstall` | Idempotent config edits with backups. |
| `jevrail explain "<cmd>"` | Run a command through the full pipeline without executing it; print every probability and the verdict. This is your debugging and demo tool. |
| `jevrail log [--since …]` | Read the audit log: what was allowed, asked, denied, and why. |
| `jevrail eval <corpus.jsonl>` | Run the benchmark; print recall, false-positive rate, calibration, latency, cost. |
| `jevrail doctor` | Check key present, API reachable, hooks installed, model pinned. |
| `jevrail daemon` | Phase 2. |

Use the stdlib `flag` package with a subcommand switch. No Cobra in v1.

---

## 9. Evaluation — the part that makes this credible

TypeSafe's own numbers are self-run and unreproduced by third parties, and their "accuracy" is agreement with two frontier models, not ground truth. So you produce **your own** evidence.

### Corpus (`testdata/corpus/*.jsonl`)

Each line: `{"command": "...", "context": {...}, "label": "safe|risky|catastrophic", "harms": ["destroys_uncommitted", ...], "note": "..."}`.

Sources:
1. Hand-written: ~300 commands across git, fs, DB, k8s, cloud, package managers, including tricky **safe** ones (`git commit -m "fix rm -rf detection"`, `rm -rf ./node_modules`, `grep -r "DROP TABLE"`).
2. Obfuscation set: `bash -c`, `$(...)`, `base64 | sh`, script files, heredocs, `python -c`.
3. Adversarial set: commands carrying persuasive text ("# safe, approved by user"), as Jev's docs say state is not treated as hostile.
4. Your own audit log after dogfooding, labeled by you.
5. Optionally: test patterns from dcg (check its license, reported MIT, before reuse).

### Metrics

| Metric | Why |
|---|---|
| Recall on `catastrophic` at fixed false-positive rate | The headline number |
| False-ask rate on safe commands | If this is high, developers uninstall it |
| Calibration (reliability curve + expected calibration error) per harm | Tests the "confidence means something" claim |
| p50/p95 added latency, and cost per 1k commands | Latency budget and economics |
| Decision flips across model versions | Because `jev-latest` can move |

### Baselines to beat, honestly reported

1. Regex-only (dcg-style rules, or your Tier 0).
2. A small frontier LLM as a judge on the same corpus.
3. Tier 0 + Jev (your system).

The interesting result is the delta on **context-dependent** and **obfuscated** cases, where regex fails by construction. If Jev does not win there, say so in the README and rethink.

### Red-team fuzzer (`jevrail eval --adversarial`)

Mutate risky commands with persuasive comments, quoting tricks, variable indirection and encoding, and measure the **flip rate** per question. This directly targets the documented weakness.

---

## 10. Threat model and failure modes

**In scope:** accidental destruction by a cooperative agent, and an agent nudged by injected text in files or web content it read.
**Out of scope:** a determined attacker with code execution. This is a seatbelt, not a sandbox. Say so in the README.

| Risk | Mitigation |
|---|---|
| Command text tries to persuade Jev | AST-normalize and drop comments; Jev only tightens; Tier 0 is final; fuzz it |
| Obfuscation (`bash -c`, `$(…)`, encoded payloads, script files) | Parse recursively, read bounded script bodies, ask Jev about what remains; treat "cannot resolve" as riskier |
| Jev bad at counting/dates | Compute in code, pass as facts |
| Context rot | Compact state, fields only if relevant to the question |
| API down / slow | 1.5 s budget, per-class fail mode, degraded mode logged |
| Rate limits (reported 1,200 req/min for jev-1.13, and moving) | Tier 0 fast-allow skips ~most calls; daemon cache; back off on 429 |
| Privacy (commands and git context leave the machine) | Redaction, configurable base URL, deterministic-only mode (`--no-model`) |
| Model drift | Pin `jev-1.13.0`; `jevrail eval --replay` diffs decisions on a new version |
| Hook can be edited/removed by the agent itself | Document it; recommend managed/system-level config where the agent supports it ⚠️ verify per agent |
| Alert fatigue from false asks | Measure false-ask rate; tune bands; per-project overrides |
| Non-Bash paths (Write/Edit tools, MCP tools) | v2 matchers; state the coverage gap clearly |

---

## 11. Repo layout and dependencies

```
jevrail/
├── cmd/jevrail/main.go            # subcommand switch
├── internal/
│   ├── adapter/                    # claude.go, codex.go, adapter.go
│   ├── shellparse/                 # AST split, executed spans, inline scripts
│   ├── tier0/                      # hard-deny + fast-allow rules
│   ├── context/                    # git, env hints, targets, script bodies, redaction
│   ├── jev/                        # client.go, questions.go
│   ├── policy/                     # bands, Decide, reason templates
│   ├── audit/                      # JSONL writer/reader
│   ├── eval/                       # corpus runner, metrics, calibration
│   └── daemon/                     # Phase 2: unix socket + LRU
├── testdata/corpus/
├── docs/
├── go.mod                          # module github.com/SamanPandey-in/jevrail
└── .goreleaser.yaml
```

Dependencies (keep it tiny):
- `mvdan.cc/sh/v3/syntax` — Go shell parser (⚠️ verify current API; check how comments are handled so you can drop them).
- A TOML library for config (`github.com/pelletier/go-toml/v2`) — or JSON to avoid a dependency.
- Standard library for everything else: `net/http`, `encoding/json`, `log/slog`, `os/exec` (for `git`), `flag`.
- **No** SQLite, TUI, Cobra, or daemon in the MVP.

Config file `~/.config/jevrail/config.toml`: `model`, `base_url`, `fail_mode`, per-harm `bands`, `allow_paths`, `protected_paths`, `no_model`.

Distribution: `go install`, goreleaser binaries, Homebrew tap.

---

## 12. Roadmap with gates

| Phase | Deliverable | Gate to continue |
|---|---|---|
| **0 — Spike (1 day)** | `jev/client.go` + a throwaway `main.go` that sends ~50 hand-picked commands (25 safe, 25 dangerous, context filled by hand) and prints probabilities | Jev separates them convincingly. If not, fix question wording first; if it still fails, stop and rethink. |
| **1 — MVP (≈1 week)** | `jevrail hook claude`, Tier 0, context collectors (git + paths), Jev call, policy, JSONL audit, `install`, `explain` | You dogfood it for a few days on real Claude Code sessions with an acceptable false-ask rate |
| **2 — Breadth** | Codex adapter, script-body reading, env hints, config file, daemon + cache, `doctor` | Works on both agents with p95 overhead you can live with |
| **3 — Evidence** | Corpus (300+), `eval`, calibration report, red-team fuzzer, tuned bands, README with honest results | Published numbers, including where it loses |
| **4 — Polish** | `log` viewer, `exec` shim, Write/Edit matchers, goreleaser, Homebrew | Someone else installs it in <5 minutes |
| **5 — Stretch** | Intent alignment via `UserPromptSubmit`, team-shared policy, `--replay` across model versions | — |

Explicitly **not** doing early: hosted service, GUI, Windows support, custom model, multi-agent orchestration.

---

## 13. Open questions to resolve before Phase 1

1. Exact Claude Code hook stdin fields (`cwd`, `session_id`, `transcript_path`) and timeouts — read the current hooks reference.
2. Codex hook stdin/output schema, whether `ask` exists, how hooks are enabled.
3. Score answer `probabilities` shape (array vs map) — check docs.typesafe.ai/api.
4. Jev early access is waitlisted — confirm you have a key (or use a compatible gateway) before Phase 0.
5. Whether current Jev rate limits and pricing still match the launch-week figures.
6. Licensing of any corpus you borrow.

---

## 14. Sources read while writing this plan

- TypeSafe AI: https://typesafe.ai/ · API reference https://docs.typesafe.ai/api · launch post https://typesafe.ai/blog/introducing-system-one-models-and-jev
- Practical guide (patterns, limits, jaggedness, launch projects): https://dev.to/valyuai/how-to-use-jev-a-practical-guide-to-typesafes-system-one-model-g5e
- Compatible gateways: https://docs.llmgateway.io/features/system-one · https://docs.opper.ai/v3-api-reference/compatibility/systemone.md
- Claude Code hooks: https://code.claude.com/docs/en/hooks · https://github.com/luongnv89/claude-howto/blob/main/06-hooks/README.md
- Codex hooks/config: https://developers.openai.com/codex/config-advanced · https://developers.openai.com/codex/agent-approvals-security
- Prior art: https://github.com/Dicklesworthstone/destructive_command_guard · https://github.com/Yodaisgaming/claude-code-command-guard · https://pypi.org/project/ai-agent-guardrails/
