# Evaluation / Benchmark

TypeSafe's published numbers are self-run and unreproduced, so jevrail ships its own harness. Latest local run (no model, 80-entry corpus):

```
jevrail eval testdata/corpus/corpus.jsonl --no-model
# Recall catastrophic: 100% (22/22), 12 via tier0 hard-deny, rest via degraded ask
# False-ask on safe:   57.7% (15/26), degraded is conservative without a model
# Tier0-only recall:   54.5% (12/22), the delta is context-dependent/obfuscated cases where regex fails by construction
```

Corpus sources: hand-written across git/fs/DB/k8s/cloud (`testdata/corpus/corpus.jsonl:1`), obfuscation (`bash -c`, `$(…)`, `python -c`, `base64 | sh`), adversarial persuasive comments, and the 8-line `sample.jsonl`. This file will keep tracking methodology and results, including where jevrail loses. Until thresholds are tuned against 300+ entries, treat defaults as unproven.

See [DECISIONS.md](DECISIONS.md) for the thresholds these numbers are measuring, and [USAGE.md](USAGE.md#6-jevrail-eval-corpusjsonl--benchmark) for `jevrail eval` usage and corpus format.
