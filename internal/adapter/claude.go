package adapter

import (
	"encoding/json"
	"fmt"
	"os"
)

// ClaudeAdapter implements Adapter for Claude Code's PreToolUse hook.
//
// ⚠️ Field names follow Claude Code's hooks reference as read while
// building this (hook_event_name, tool_name, tool_input.command, cwd).
// Re-check https://code.claude.com/docs/en/hooks if decoding ever fails —
// hook payloads have grown fields across releases.
type ClaudeAdapter struct{}

type claudeInput struct {
	HookEventName string `json:"hook_event_name"`
	ToolName      string `json:"tool_name"`
	ToolInput     struct {
		Command string `json:"command"`
	} `json:"tool_input"`
	CWD string `json:"cwd"`
}

type claudeHookSpecificOutput struct {
	HookEventName            string `json:"hookEventName"`
	PermissionDecision       string `json:"permissionDecision"` // allow | deny | ask
	PermissionDecisionReason string `json:"permissionDecisionReason"`
}

type claudeOutput struct {
	// SystemMessage is rendered to the user in the terminal. permissionDecisionReason
	// (inside HookSpecificOutput) is what Claude Code feeds back to the model — the two
	// audiences are different, and Claude Code does not automatically mirror one to the
	// other. Without this field, an "ask"/"deny" verdict can go out with a reason that
	// only the model sees, leaving the person at the keyboard with no explanation.
	SystemMessage      string                   `json:"systemMessage,omitempty"`
	HookSpecificOutput claudeHookSpecificOutput `json:"hookSpecificOutput"`
}

func (ClaudeAdapter) Decode(stdin []byte) (Event, error) {
	var in claudeInput
	if err := json.Unmarshal(stdin, &in); err != nil {
		return Event{}, fmt.Errorf("claude adapter: decode stdin: %w", err)
	}
	if in.ToolInput.Command == "" {
		return Event{}, fmt.Errorf("claude adapter: empty tool_input.command (tool=%q)", in.ToolName)
	}
	cwd := in.CWD
	if cwd == "" {
		cwd, _ = os.Getwd()
	}
	return Event{
		Agent:   "claude",
		Tool:    in.ToolName,
		Command: in.ToolInput.Command,
		CWD:     cwd,
	}, nil
}

func (ClaudeAdapter) Encode(verdict, reason string) ([]byte, int) {
	out := claudeOutput{
		SystemMessage: visibleReason(verdict, reason),
		HookSpecificOutput: claudeHookSpecificOutput{
			HookEventName:            "PreToolUse",
			PermissionDecision:       verdict,
			PermissionDecisionReason: reason,
		},
	}
	b, _ := json.Marshal(out)
	// Exit code 2 is Claude Code's unconditional block signal — used as a
	// belt-and-braces on top of the JSON verdict for hard denies.
	exitCode := 0
	if verdict == "deny" {
		exitCode = 2
	}
	return b, exitCode
}
