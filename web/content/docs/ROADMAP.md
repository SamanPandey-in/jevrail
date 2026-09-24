# Roadmap

1. ✅ Spike: does the model separate dangerous from safe at all?
2. ✅ MVP: Claude Code hook, Tier 0, context (git + paths + redaction), Jev client, policy, audit, `install`, `explain`
3. ✅ Breadth: eval harness + corpus (80), adversarial fuzzer, `exec` shim, enriched targets, `doctor` hardening
4. ◻️ Tuning: 300-entry corpus, calibration report, tuned bands, [BENCHMARK.md](BENCHMARK.md)
5. ◻️ Phase 2: Codex adapter verification, daemon with LRU cache, `goreleaser` + Homebrew
6. ◻️ Polish: `log` viewer, Write/Edit matchers, `exec` coverage

Explicitly **not** doing early: hosted service, GUI, Windows support, custom model, multi-agent orchestration.

Design doc: [plan.md](plan.md). Where the shipped MVP deviates from it: [DEVIATIONS.md](DEVIATIONS.md).
