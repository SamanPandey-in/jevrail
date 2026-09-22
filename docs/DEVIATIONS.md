# Where this starter repo deviates from plan.md

`plan.md` is the design doc. This is what actually got built for the MVP,
and where the two disagree.

1. **Config is JSON, not TOML.** `plan.md` §6/§11 sketches a `config.toml`.
   The code uses `~/.config/jevrail/config.json` instead, so the MVP has
   zero external dependencies — `go.mod` has no `require` lines at all.
   Swap in `github.com/pelletier/go-toml/v2` later; only
   `internal/config/config.go` needs to change.

2. **No `mvdan.cc/sh` dependency.** `plan.md` §11 names it as the shell
   parser. `internal/shellparse` is a small hand-rolled tokenizer instead:
   good enough to split on `; && || |`, honor quotes, strip comments, pull
   out `$(...)`/backtick substitutions, and recurse into `bash -c` /
   `sh -c` payloads — but it is *not* a full POSIX parser. Exotic shell
   syntax (process substitution, complex heredocs, brace expansion) falls
   through to `Unparsed: true`, which `tier0.IsFastAllow` and the policy's
   fail-safe handling both treat as non-trivial rather than silently
   ignoring.

3. **`jevrail eval` is now implemented** (`internal/eval`, `cmd/jevrail/eval.go`). `jevrail eval <corpus.jsonl> [--adversarial] [--no-model]` prints recall on catastrophic, false-ask rate on safe, tier0-only baseline, latency, and per-entry triggers. `testdata/corpus/corpus.jsonl` now has 80 entries covering safe/risky/catastrophic, obfuscation (`bash -c`, `$(…)`, `python -c`) and adversarial persuasive comments; `sample.jsonl` (8 lines) is kept as a minimal example. Thresholds in `internal/policy/policy.go` are still *starting guesses* — tune them against a larger labeled corpus before trusting them.

4. **`jevrail daemon` (Phase 2) does not exist.** Every `jevrail hook`
   invocation pays a fresh process start and, when the model is consulted,
   a fresh TLS handshake. Fine for an MVP; worth fixing before this is on
   the hot path of every command.

5. **Codex adapter is a schema guess.** `internal/adapter/codex.go` is
   explicitly marked unverified and `jevrail install --agent codex`
   refuses to run until someone confirms the real hook payload shape
   against Codex's docs and fills it in.

6. **No Write/Edit tool coverage.** Only `Bash`-shaped tool calls are
   evaluated (`cmd/jevrail/main.go`'s `isShellTool`). Overwriting an
   uncommitted file via a `Write`/`Edit` tool call is out of scope for v1,
   as plan.md §7 notes.

7. **Corpus is now 80 entries** in `testdata/corpus/corpus.jsonl` plus adversarial expansion (`--adversarial` adds ~216 variants). Still short of the 300+ target in plan.md §9, but enough for local smoke metrics. `sample.jsonl` remains as the 8-line shape example.

8. **Ctxinfo now enriches targets** with `tracked_by_git`, `dirty`, `entry_count`, `truncated`, and redacts secrets (`internal/ctxinfo/redact.go`) before sending state to the model. Earlier the targets were stubs. `collectScriptBodies` also now captures `python -c` / `node -e` inline bodies within the 8 KB budget.

9. **`jevrail exec` shim exists** (`cmd/jevrail/exec.go`) as the hookless-agent fallback from plan.md §7/§8. `jevrail exec -- <cmd>` evaluates then optionally executes with a y/N prompt on `ask` and a hard block on `deny`.

10. **Doctor now checks** model pinning (`jev-latest` warning), timeout range, API reachability (HEAD `base_url`), hook install, and a tier0 smoke table, not just key presence.

11. **Config `no_model` merge fixed** to distinguish absent vs. explicit `false` via `*bool` raw struct, and `TYPESAFE_API_KEY` always wins over file. Earlier `merge` unconditionally overwrote `NoModel`.
