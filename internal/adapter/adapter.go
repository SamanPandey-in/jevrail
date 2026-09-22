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

// visibleReason decides whether a verdict's reason should be surfaced to the
// person at the keyboard, not just fed back to the model. Centralized here
// so every adapter — the three below and any added later — shares one
// policy instead of each reimplementing the verdict check: "allow" stays
// silent by design (see README: below-threshold harms allow silently),
// "ask" and "deny" always carry an explanation.
//
// This only decides *whether* a reason is user-visible, not *where* it goes
// in the wire format — that's still each adapter's job, because agents
// disagree on shape. Claude Code splits model-facing (permissionDecisionReason)
// and user-facing (systemMessage) text into separate JSON fields; codex and
// opencode currently have just one "reason" field carrying both. If a future
// agent also splits the two audiences, its adapter calls this once per field;
// if it has one field like codex/opencode, it calls this once.
func visibleReason(verdict, reason string) string {
	if verdict == "ask" || verdict == "deny" {
		return reason
	}
	return ""
}

// ByName returns the adapter for a given agent name ("claude", "codex", "opencode").
func ByName(name string) (Adapter, bool) {
	switch name {
	case "claude":
		return ClaudeAdapter{}, true
	case "codex":
		return CodexAdapter{}, true
	case "opencode":
		return OpenCodeAdapter{}, true
	default:
		return nil, false
	}
}
