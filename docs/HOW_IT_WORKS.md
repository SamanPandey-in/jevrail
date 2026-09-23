# How it works

## Why

Agents occasionally run the wrong command: `git reset --hard` with uncommitted work in the tree, `rm -rf` on the wrong path, a `DROP TABLE` aimed at the wrong database. Nothing sits between the agent and the shell.

Rule-based guards such as [dcg](https://github.com/Dicklesworthstone/destructive_command_guard) already cover the well-known destructive shapes, and you should run one. What a rule can't tell you is anything that depends on **context or meaning**:

- `rm -rf ./dist` is fine in one repo and a disaster in another where `dist/` is tracked and dirty.
- `./cleanup.sh` looks harmless to a regex. jevrail reads the script body (up to 8 KB) and asks what it does.
- `psql $DATABASE_URL -c "DELETE FROM users"` depends on where that variable points.

jevrail is the **semantic layer** on top of deterministic rules, not a replacement for them.

## The pipeline

```
Agent ──PreToolUse hook──▶ jevrail hook <agent>
                             1. adapter: parse agent JSON → Event{tool, command, cwd}
                             2. shellparse: split &&/||/|/;/$(...) / bash -c payloads, strip #comments
                             3. tier0 hard-deny (final) / fast-allow for trivial reads (skips the model)
                             4. context: git state, resolved targets (tracked/dirty/entry_count), env hints, script bodies, redacted
                             5. jev: ONE call with 7 typed questions → probabilities
                             6. policy: per-harm ask/deny bands → allow / ask / deny + templated reason
                             7. audit: append JSONL
                                           │
                                           ▼
                                JSON decision on stdout (or exit 2 to hard-block)
```

The decision model is [Jev](https://typesafe.ai/) from TypeSafe AI, a "System One" model that returns typed probabilities instead of text. Code handles everything it is bad at: parsing, counting files, git statistics, thresholds, and the final verdict.

**One rule is never broken: the model can only tighten a decision, never loosen one.** A hard-deny is final, and "looks safe" never overrides it.

See [WHAT_IT_CHECKS.md](WHAT_IT_CHECKS.md) for the exact questions jevrail asks, and [DECISIONS.md](DECISIONS.md) for how the probabilities turn into allow/ask/deny.

## Acknowledgements

[dcg](https://github.com/Dicklesworthstone/destructive_command_guard) for proving the problem is real and the hook approach works, and [TypeSafe AI](https://typesafe.ai/) for Jev.
