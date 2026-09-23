# Development

```sh
make build   # go build -o jevrail ./cmd/jevrail
make test    # go test ./...
make vet     # go vet ./...
make fmt     # gofmt -l .
```

Test the parser/policy in isolation without a key:

```sh
go test ./...   # shellparse + tier0; vet is clean
go vet ./...
```

Project layout: `cmd/jevrail/*`, `internal/adapter`, `shellparse`, `tier0`, `ctxinfo`, `jev`, `policy`, `audit`, `eval`, `config`. Zero external dependencies (stdlib only).

See [ROADMAP.md](ROADMAP.md) for what's planned, and [DEVIATIONS.md](DEVIATIONS.md) for where the shipped code differs from [plan.md](plan.md).
