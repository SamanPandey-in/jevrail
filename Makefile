.PHONY: build test vet fmt install run-doctor clean

# Windows needs .exe extension; Unix does not.
ifeq ($(OS),Windows_NT)
EXE := .exe
else
EXE :=
endif
BIN := jevrail$(EXE)

build:
	go build -o $(BIN) ./cmd/jevrail

test:
	go test ./...

vet:
	go vet ./...

fmt:
	gofmt -l .

install:
	go install ./cmd/jevrail

run-doctor: build
	./$(BIN) doctor

clean:
	rm -f jevrail jevrail.exe
