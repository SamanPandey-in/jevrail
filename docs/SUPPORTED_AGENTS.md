# Supported agents

| Agent | Status |
|---|---|
| Claude Code `PreToolUse` hook | ✅ Implemented (`jevrail hook claude`, `install --agent claude`) |
| opencode `tool.execute.before` plugin | ✅ Implemented (`jevrail hook opencode`, `install --agent opencode [--project]`, `plugin/opencode/jevrail.ts:1`). Global: `~/.config/opencode/plugin/jevrail.ts`. Project: `.opencode/plugin/jevrail.ts` |
| Codex CLI `PreToolUse` hook | 🚧 Adapter exists but schema is unverified: `install --agent codex` refuses until confirmed against `developers.openai.com/codex` (`internal/adapter/codex.go:1`) |
| Agents without hooks | ✅ `jevrail exec -- <cmd>` |

Hook facts verified during build: Claude Code matcher `Bash`, `hookSpecificOutput.permissionDecision` in `allow|deny|ask|defer`, exit 2 blocks regardless of JSON; Codex loads from `~/.codex/hooks.json` / `config.toml`. Re-verify against current docs: hook config has changed across releases before.

**Known upstream gap (opencode):** `tool.execute.before` fires for tool calls from the primary agent but has been reported not to fire for tool calls made by subagents spawned via opencode's `task` tool: meaning a subagent can currently bypass the jevrail plugin entirely. This is an opencode-side issue, not something jevrail's plugin can work around from inside `tool.execute.before`. Re-check upstream status before relying on opencode coverage being complete for subagent-heavy workflows.
