# Jevrail

**A probability-scored pre-execution guard for terminal coding agents.**

Claude Code and Codex run shell commands on your machine. jevrail sits between the agent's decision and the shell, asks a fast decision model *"how likely is this to destroy something?"*, and blocks, confirms, or allows the command before it runs.

> **Status: MVP implemented.** `jevrail hook`, `explain`, `install`/`uninstall`, `doctor`, `log`, `eval`, and `exec` all work. The policy thresholds are still starting guesses: see [Evaluation](BENCHMARK.md). Design is in [`docs/plan.md`](plan.md); deviations are in [`docs/DEVIATIONS.md`](DEVIATIONS.md). [Demo view](https://drive.google.com/file/d/1ksJ9aENsfMtx9wtLVekHFqu3kjrnCAhj/view?usp=sharing)

```
$ jevrail explain "git reset --hard HEAD~3"

command   git reset --hard HEAD~3
context   branch=main  dirty_files=14  unpushed_commits=2

destroys_uncommitted    ██████████████████░░  0.91
irreversible_data_loss  ███████████████░░░░░  0.78
touches_production      █░░░░░░░░░░░░░░░░░░░  0.04
writes_outside_project  █░░░░░░░░░░░░░░░░░░░  0.03
exfiltrates_data        ░░░░░░░░░░░░░░░░░░░░  0.01
blast_radius            1.1 / 3   (inside project)
category                git_history

verdict   DENY  (destroys_uncommitted, p=0.91)
reason    This would likely discard uncommitted changes. Commit or `git stash` first, then retry.
```

*Illustrative output with a real model key. With `--no-model` or no key, `explain` runs in deterministic + degraded mode. Real probabilities depend on the model version and your repo context.*

Don't take that output on faith: [`PROOFS.md`](PROOFS.md) has screenshots of jevrail actually blocking commands in a live agent session.

---

## Docs

The README covers install, day-to-day commands, and configuration. Everything about *how* jevrail decides, *what* it sends over the network, and where it's headed lives below:

| Doc | Covers |
|---|---|
| [docs/HOW_IT_WORKS.md](HOW_IT_WORKS.md) | Why jevrail exists, the pipeline, the "model can only tighten" rule |
| [docs/WHAT_IT_CHECKS.md](WHAT_IT_CHECKS.md) | The 7 questions asked per command, and the context sent with them |
| [docs/DECISIONS.md](DECISIONS.md) | How probabilities become allow/ask/deny, default bands, degraded fallback |
| [docs/USAGE.md](USAGE.md) | Full worked examples for every command |
| [docs/SUPPORTED_AGENTS.md](SUPPORTED_AGENTS.md) | Per-agent implementation status, including a known opencode subagent gap |
| [docs/PRIVACY.md](PRIVACY.md) | Exactly what does and doesn't leave your machine |
| [docs/BENCHMARK.md](BENCHMARK.md) | Evaluation harness, current numbers, corpus |
| [docs/ROADMAP.md](ROADMAP.md) | What's shipped vs. planned |
| [docs/DEVELOPMENT.md](DEVELOPMENT.md) | Building, testing, project layout |
| [docs/DEVIATIONS.md](DEVIATIONS.md) | Where the shipped MVP differs from [docs/plan.md](plan.md) |
| [PROOFS.md](PROOFS.md) | Screenshots of real commands being blocked |

---

## Install and setup

**Prerequisites:** Go 1.22+, a Jev API key (early access is waitlisted: any gateway exposing a compatible `POST /v1/systemone` also works). For offline/deterministic-only use, no key is needed.

```sh
# from source (recommended while pre-release)
git clone https://github.com/SamanPandey-in/jevrail
cd jevrail
go install ./cmd/jevrail  # installs to $GOPATH/bin or $HOME/go/bin: add that to PATH
jevrail configure         # now works without ./ prefix if PATH is set

# direct install
go install github.com/SamanPandey-in/jevrail/cmd/jevrail@latest

# API key: stored once, reused everywhere (env var still wins if set)
jevrail configure                  # interactive prompt, saved to ~/.config/jevrail/config.json (0600)
# or non-interactive / CI:
jevrail configure --key "sk-jev-..."
# or env var per-session:
export TYPESAFE_API_KEY="..."

# optional self-hosted / gateway endpoint
# Jevrail reads ~/.config/jevrail/config.json → base_url
```

### Quick start

```sh
jevrail configure                  # one-time key setup (0600): all commands reuse it
jevrail install --agent claude   # Claude Code: merges PreToolUse hook into ~/.claude/settings.json (backs up first)
jevrail install --agent opencode # opencode: installs plugin to ~/.config/opencode/plugin/jevrail.ts (global) + registers in opencode.json
# jevrail install --agent opencode --project  # project-local: .opencode/plugin/jevrail.ts (auto-discovered, no config edit)
jevrail doctor                   # checks config, key, API reachability, hook, model pin, timeout
jevrail explain "rm -rf ./dist"  # dry-run any command through the full pipeline
```

From then on, every `Bash` tool call from Claude Code **or** opencode is evaluated before it runs. No shell wrapper, no daemon (Phase 2 will add connection reuse). Restart opencode after install: config is loaded once at startup.

See [docs/SUPPORTED_AGENTS.md](SUPPORTED_AGENTS.md) for per-agent status and [docs/USAGE.md](USAGE.md#3-jevrail-install--uninstall--hook-wiring) for the full `install`/`uninstall` walkthrough.

---

## Commands

| Command | Purpose |
|---|---|
| `jevrail hook <claude\|codex\|opencode>` | Hook target: reads agent JSON on stdin, writes a decision (exit 2 = hard block; opencode plugin throws to block) |
| `jevrail install [--agent claude\|opencode]` / `uninstall` | Idempotent hook setup (claude: `settings.json.bak.<ts>`, opencode: `plugin/jevrail.ts` + `opencode.json`) |
| `jevrail explain "<cmd>"` | Show every probability, context, and verdict without running anything |
| `jevrail log [-n N]` | Last N audit entries (default 20) from `~/.local/share/jevrail/audit.jsonl` |
| `jevrail eval <corpus.jsonl> [--adversarial] [--no-model]` | Benchmark: recall, false-ask, tier0 baseline, latency, flip rate |
| `jevrail exec -- <cmd>` | Guarded execution shim for hookless agents (prompts on `ask`, blocks on `deny`) |
| `jevrail doctor` | Config, key, API reachability, hook, model pin, smoke tests |
| `jevrail configure [--key KEY]` | Store Jev API key once to `~/.config/jevrail/config.json` (0600): `hook`/`explain`/`eval`/`exec` all reuse it (`--show`/`--clear`) |

All commands are `flag`-based subcommands: no Cobra, no SQLite, no daemon in the MVP.

Full worked examples, sample output, and flags for every command above: [docs/USAGE.md](USAGE.md).

---

## Configuration

`~/.config/jevrail/config.json` (JSON today; plan sketches TOML: see [docs/DEVIATIONS.md](DEVIATIONS.md)). Only this file changes if TOML is added later.

```json
{
  "model": "jev-1.13.0",
  "base_url": "https://api.typesafe.ai",
  "fail_mode": "ask",
  "no_model": false,
  "timeout_ms": 1500,
  "protected_paths": ["~/.ssh", "~/.aws"],
  "allow_paths": ["~/scratch"],
  "bands": {
    "destroys_uncommitted": { "ask": 0.35, "deny": 0.80 },
    "touches_production":   { "ask": 0.30, "deny": 0.75 }
  }
}
```

See [`config.example.json`](https://github.com/SamanPandey-in/jevrail/blob/main/config.example.json). Rules:

- `model`: pin a version; `jev-latest` can silently change answers. `doctor` warns if unpinned.
- `base_url`: any compatible `POST /v1/systemone` endpoint (TypeSafe or a gateway). Client is `internal/jev/client.go:54`.
- `jevrail configure` stores the key to `~/.config/jevrail/config.json` (0600): ask once, reused by `hook`/`explain`/`eval`/`exec`. `TYPESAFE_API_KEY` env var **always wins** if set. `config.no_model` distinguished from absent via `*bool` so `false` doesn't clobber defaults.
- `no_model=true` → deterministic-only, nothing leaves the machine. Full data-flow details: [docs/PRIVACY.md](PRIVACY.md).
- `timeout_ms`: Jev HTTP timeout (default 1500). `doctor` warns outside 500–5000.
- `fail_mode`: degraded fallback, one of `ask` (conservative), `allow`, or `deny`.
- `bands`: per-harm overrides merged over `policy.DefaultBands`. Default values and how bands turn into a verdict: [docs/DECISIONS.md](DECISIONS.md).

---

## Limitations

- **A seatbelt, not a sandbox.** Targets accidental damage by a cooperative agent, or one nudged by injected text. It won't stop a determined attacker with code execution.
- **The model can be influenced by text in the command.** Jev's docs say `state` is not treated as hostile. Mitigations: AST-normalize and strip `#comments`, hard rules are final, model can only tighten, `jevrail eval --adversarial` measures the flip rate.
- **Bash only at first.** `Write`/`Edit`/MCP tools are not covered in the MVP (`cmd/jevrail/main.go:isShellTool`).
- **False asks are a real cost.** 57.7% false-ask on safe in `--no-model` degraded mode (see [docs/BENCHMARK.md](BENCHMARK.md)) is conservative by design; with a real model this drops. If jevrail nags too often, people uninstall it: tune bands per project.
- **A hook can be removed by whoever controls the config.** Use managed/system-level config where supported. `doctor` surfaces this.
- **No daemon yet.** Every hook invocation pays a fresh process + TLS handshake. Fine for the MVP; Phase 2 adds a unix-socket daemon with connection reuse.
- **Per-agent gaps.** Codex's schema is unverified; opencode's subagents may currently bypass the hook entirely. See [docs/SUPPORTED_AGENTS.md](SUPPORTED_AGENTS.md).

---

## Contributing

Bug reports with the **exact command** that was wrongly blocked or wrongly allowed are the most useful contribution. Corpus additions via `testdata/corpus/` welcome: each line is `{"command": "...", "label": "safe|risky|catastrophic", "harms": [...], "note": "..."}`.

Found a new interesting block? A screenshot added to [`PROOFS.md`](PROOFS.md) helps other people trust the tool before they install it.

Building and testing from source: [docs/DEVELOPMENT.md](DEVELOPMENT.md). Where things are headed: [docs/ROADMAP.md](ROADMAP.md).

---

MIT: see [LICENSE](https://github.com/SamanPandey-in/jevrail/blob/main/LICENSE).
