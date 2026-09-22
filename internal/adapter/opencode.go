package adapter

import (
	"encoding/json"
	"fmt"
	"os"
)

// OpenCodeAdapter implements Adapter for OpenCode's plugin hook.
//
// OpenCode does not use a JSON-over-stdin shell hook like Claude Code.
// Instead it runs a TypeScript plugin that intercepts tool calls via
// "tool.execute.before". The plugin spawns `jevrail hook opencode` and
// pipes a small JSON payload to stdin:
//
//	{"tool":"bash","command":"rm -rf /","cwd":"/home/u/app"}
//
// The adapter mirrors the Claude/Codex adapters so the rest of jevrail
// (pipeline, policy, audit) stays agent-agnostic. Exit code 2 is the
// hard-block signal reused for the plugin (throwing blocks the tool).

type OpenCodeAdapter struct{}

type opencodeInput struct {
	Tool    string `json:"tool"`
	Command string `json:"command"`
	CWD     string `json:"cwd"`
}

type opencodeOutput struct {
	Decision string `json:"decision"` // allow | ask | deny
	Reason   string `json:"reason,omitempty"`
}

func (OpenCodeAdapter) Decode(stdin []byte) (Event, error) {
	var in opencodeInput
	if err := json.Unmarshal(stdin, &in); err != nil {
		return Event{}, fmt.Errorf("opencode adapter: decode stdin: %w", err)
	}
	if in.Command == "" {
		return Event{}, fmt.Errorf("opencode adapter: empty command field (tool=%q)", in.Tool)
	}
	cwd := in.CWD
	if cwd == "" {
		cwd, _ = os.Getwd()
	}
	tool := in.Tool
	if tool == "" {
		tool = "bash"
	}
	return Event{
		Agent:   "opencode",
		Tool:    tool,
		Command: in.Command,
		CWD:     cwd,
	}, nil
}

func (OpenCodeAdapter) Encode(verdict, reason string) ([]byte, int) {
	out := opencodeOutput{Decision: verdict, Reason: visibleReason(verdict, reason)}
	b, _ := json.Marshal(out)
	exitCode := 0
	if verdict == "deny" {
		exitCode = 2
	}
	return b, exitCode
}
