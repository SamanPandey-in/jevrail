# Privacy

Unless `no_model=true`, the **redacted** command and compact context are sent to the model API. jevrail never sends env values or full connection strings. It sends only classified hints (`host contains 'prod'`, `NODE_ENV=production` from `internal/ctxinfo/collect.go:292`), and it redacts tokens matching `api_key|secret|password|token`, `bearer …`, `AKIA…`, `ghp_…`, and DB URLs (`internal/ctxinfo/redact.go:1`).

**RISK: commands and git context still leave the machine.** Use `no_model=true` or a self-hosted compatible endpoint if that is unacceptable.

Script bodies are bounded to 8 KB and redacted; `truncated=true` is set when truncated.

See [WHAT_IT_CHECKS.md](WHAT_IT_CHECKS.md) for the full list of fields sent to the model.
