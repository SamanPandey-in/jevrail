# Installation

Get jevrail installed, configured, and wired into your coding agent.

## Prerequisites

- Go 1.22 or newer
- A Jev API key ([early access is waitlisted](https://typesafe.ai)). Or skip this and run fully offline in deterministic-only mode
- Claude Code, opencode, or Codex, if you want the hook wired in automatically

## 1. Install the binary

**Direct install** (simplest):

```sh
go install github.com/SamanPandey-in/jevrail/cmd/jevrail@latest
```

**From source** (recommended while pre-release):

```sh
git clone https://github.com/SamanPandey-in/jevrail
cd jevrail
go install ./cmd/jevrail
```

Either way, the binary lands in `$GOPATH/bin` or `$HOME/go/bin`. Make sure that directory is on your `PATH`.

## 2. Configure your API key

```sh
jevrail configure
```

Prompts interactively and saves the key to `~/.config/jevrail/config.json` with `0600` permissions. Every other command (`hook`, `explain`, `eval`, `exec`) reuses it.

Non-interactive / CI:

```sh
jevrail configure --key "sk-jev-..."
```

Or set an environment variable per session. This always wins over the saved config if set:

```sh
export TYPESAFE_API_KEY="sk-jev-..."
```

No key yet, or want to stay fully offline? Set `"no_model": true` in the config and jevrail runs in deterministic-only mode. Nothing leaves your machine. See [Privacy](PRIVACY.md) for the full data-flow breakdown.

## 3. Wire it into your agent

```sh
jevrail install --agent claude   # Claude Code
jevrail install --agent opencode # opencode (global)
jevrail install --agent opencode --project  # opencode (project-local, no config edit)
```

- **Claude Code**: merges a `PreToolUse` hook into `~/.claude/settings.json` (your existing settings are backed up first, as `settings.json.bak.<timestamp>`).
- **opencode**: installs the plugin to `~/.config/opencode/plugin/jevrail.ts` and registers it in `opencode.json`. Restart opencode afterward. Config is only read at startup.
- **Codex**: wired through `jevrail hook codex` directly; schema support is still unverified against every Codex release. See [Supported Agents](SUPPORTED_AGENTS.md).

## 4. Verify with `jevrail doctor`

```sh
jevrail doctor
```

```
Jevrail doctor

✓ config:      loaded (model = jev-1.13.0, base_url = https://api.typesafe.ai)
✓ api key:     present
✓ api reach:   https://api.typesafe.ai reachable
✓ claude hook: installed in /home/u/.claude/settings.json

Smoke test (no-model fast paths):
  "git status"       → allow (tier0)
  "rm -rf /"         → deny (tier0)
  "echo hi"          → allow (tier0)
```

`doctor` checks that config loads, the model is pinned (warns on `jev-latest`), `timeout_ms` sits in the 500–5000 range, the key is present, the base URL is reachable, and the hook is installed. It never prints the key itself.

## 5. Take it for a dry run

```sh
jevrail explain "rm -rf ./dist"
```

Runs any command through the full pipeline and prints every probability, the context that was sent, and the verdict without actually running the command. Good first thing to try after install.

From here, every `Bash` tool call from Claude Code or opencode is evaluated before it runs. No shell wrapper, no daemon required.

## Uninstalling

```sh
jevrail uninstall --agent claude
jevrail uninstall --agent opencode
jevrail uninstall --agent opencode --project
```

Removes the hook and restores your previous settings from the backup jevrail made on install.

## Troubleshooting

- **`jevrail: command not found`**: your Go bin directory isn't on `PATH`. Run `go env GOPATH` and add `$GOPATH/bin` (or `$HOME/go/bin`) to your shell profile.
- **`doctor` reports the API unreachable**: check `base_url` in `~/.config/jevrail/config.json`, and confirm outbound HTTPS isn't blocked on your network.
- **Hook isn't firing**: restart your agent after `install` (opencode in particular only loads plugins at startup), then re-run `jevrail doctor` to confirm it's still registered.
- **Too many `ask` prompts**: the default bands are conservative starting guesses. Tune `bands` in the config; see [Decisions](DECISIONS.md) for how probabilities map to verdicts.

## Next steps

- [How It Works](HOW_IT_WORKS.md): the pipeline and the "model can only tighten" rule
- [Usage Guide](USAGE.md): full worked examples for every command
- [Configuration](README.md#configuration): every config field, explained
