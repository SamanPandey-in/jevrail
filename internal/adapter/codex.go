package adapter

import (
	"encoding/json"
	"fmt"
	"os"
)

// CodexAdapter implements Adapter for the Codex CLI's PreToolUse hook.
//
// ⚠️ UNVERIFIED: Codex's exact hook stdin JSON fields and output schema
// (whether it supports "ask" or only allow/deny) were not confirmed
// against current docs while this was built. This adapter is a
// best-effort guess at a Claude-Code-shaped payload and MUST be checked
// against developers.openai.com/codex/config-advanced and
// developers.openai.com/codex/agent-approvals-security before you rely on
// it. Update the structs below to match; nothing else in jevrail needs to
// change.
type CodexAdapter struct{}

type codexInput struct {
	Tool    string `json:"tool"`
	Command string `json:"command"`
	CWD     string `json:"cwd"`
}

type codexOutput struct {
	Decision string `json:"decision"` // ⚠️ verify: "allow" | "deny" | "ask"?
	Reason   string `json:"reason,omitempty"`
}

func (CodexAdapter) Decode(stdin []byte) (Event, error) {
	var in codexInput
	if err := json.Unmarshal(stdin, &in); err != nil {
		return Event{}, fmt.Errorf("codex adapter (unverified schema): decode stdin: %w", err)
	}
	if in.Command == "" {
		return Event{}, fmt.Errorf("codex adapter: empty command field")
	}
	cwd := in.CWD
	if cwd == "" {
		cwd, _ = os.Getwd()
	}
	return Event{
		Agent:   "codex",
		Tool:    in.Tool,
		Command: in.Command,
		CWD:     cwd,
	}, nil
}

func (CodexAdapter) Encode(verdict, reason string) ([]byte, int) {
	out := codexOutput{Decision: verdict, Reason: visibleReason(verdict, reason)}
	b, _ := json.Marshal(out)
	exitCode := 0
	if verdict == "deny" {
		exitCode = 2
	}
	return b, exitCode
}
