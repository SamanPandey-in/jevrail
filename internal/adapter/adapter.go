// Package adapter translates between an agent's hook JSON format and
// jevrail's internal Event/decision types. Each agent gets its own file
// implementing Adapter; internal/policy and everything upstream of it stays
// agent-agnostic.
package adapter

// Event is the agent-agnostic representation of "an agent is about to run
// a shell command."
type Event struct {
	Agent   string
	Tool    string
	Command string
	CWD     string
}

// Adapter decodes an agent's hook stdin payload into an Event, and encodes
// a verdict back into that agent's expected hook output.
type Adapter interface {
	// Decode parses the raw stdin bytes from the hook invocation.
	Decode(stdin []byte) (Event, error)
	// Encode returns the JSON to write to stdout and the process exit code.
	// verdict is one of "allow", "ask", "deny".
	Encode(verdict, reason string) (stdout []byte, exitCode int)
}

// ByName returns the adapter for a given agent name ("claude", "codex").
func ByName(name string) (Adapter, bool) {
	switch name {
	case "claude":
		return ClaudeAdapter{}, true
	case "codex":
		return CodexAdapter{}, true
	default:
		return nil, false
	}
}
