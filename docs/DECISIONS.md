# Decisions

How the probabilities from [WHAT_IT_CHECKS.md](WHAT_IT_CHECKS.md) turn into `allow` / `ask` / `deny`.

Thresholds (see `internal/policy/policy.go:42`; **starting guesses, not tuned**):

| Highest harm probability | Action |
|---|---|
| Below the *ask* threshold | Allow silently |
| Between *ask* and *deny* | Ask you to confirm (`ask`) |
| At or above *deny* | Block, and tell the agent why so it can pick a safer alternative |

Default bands:

| Harm | ask | deny |
|---|---|---|
| `destroys_uncommitted` | 0.35 | 0.80 |
| `irreversible_data_loss` | 0.40 | 0.85 |
| `touches_production` | 0.30 | 0.75 |
| `writes_outside_project` | 0.50 | 0.90 |
| `exfiltrates_data` | 0.50 | 0.90 |

`blast_radius >= 2.0` alone triggers `ask`. Reasons are templated in code (the model never generates text). Missing answers → fail-safe `ask`. Tune bands via `jevrail eval`: do not trust the defaults on a real project.

If Jev is unreachable (1.5 s budget, `timeout_ms`): degraded fallback. Commands whose parsed argv looks dangerous (`rm`, `reset`, `clean`, `drop`, `truncate`, `delete`, `dd`, `mkfs`, `push --force`, `kubectl`, `terraform`, …; full list in `internal/tier0/tier0.go:54`) → `ask`; otherwise `allow` (or per `fail_mode`). Logged as `degraded`. Configurable via `fail_mode = "ask" | "allow" | "deny"`.

Bands are overridden per-project in `~/.config/jevrail/config.json`: see the [Configuration](../README.md#configuration) section of the README for the file format.
