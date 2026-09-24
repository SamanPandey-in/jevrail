# What it checks

One Jev call, seven questions. Each asks exactly one thing (wording is literal: see `internal/jev/questions.go:8`):

| Question | Type | Meaning |
|---|---|---|
| `destroys_uncommitted` | Noul (0–1) | Would discard uncommitted or staged changes (`git.dirty_files`/`untracked_files`) |
| `irreversible_data_loss` | Noul | Deletes or overwrites data with no obvious recovery |
| `touches_production` | Noul | Connects to or changes a production or shared system (`env.hints`) |
| `writes_outside_project` | Noul | Writes or deletes outside `project_root` (`resolved.targets`) |
| `exfiltrates_data` | Noul | Sends local files or secrets to a remote host |
| `blast_radius` | Score 0–3 | Scratch → project → outside project → shared/prod |
| `category` | Choice | Kind of operation, for logs and per-category tuning |

Context sent to the model (`internal/ctxinfo/collect.go:39`): `command`/`commands` (comments stripped, secrets redacted), `project_root`/`cwd`, `resolved.targets[]` (`path`, `inside_project`, `tracked_by_git`, `dirty`, `entry_count`, `exists`), `resolved.script_bodies[]` (bounded 8 KB), `git` (`branch`, `is_default_branch`, `dirty_files`, `untracked_files`, `unpushed_commits`), `env.hints`, `truncated`.

See [PRIVACY.md](PRIVACY.md) for exactly what does and doesn't leave the machine, and [DECISIONS.md](DECISIONS.md) for how these probabilities become a verdict.
