// Package pipeline runs a command through jevrail's full decision
// process: tier0 rules, context collection, the model call, and policy.
// It is shared by `jevrail hook` and `jevrail explain` so the two never
// drift apart.
package pipeline

import (
	"context"
	"strings"
	"time"

	"github.com/SamanPandey-in/jevrail/internal/config"
	"github.com/SamanPandey-in/jevrail/internal/ctxinfo"
	"github.com/SamanPandey-in/jevrail/internal/jev"
	"github.com/SamanPandey-in/jevrail/internal/policy"
	"github.com/SamanPandey-in/jevrail/internal/shellparse"
	"github.com/SamanPandey-in/jevrail/internal/tier0"
)

// Result is everything about how a decision was reached, used both to
// render `explain` output and to write the audit log.
type Result struct {
	Command   string
	Verdict   string // allow | ask | deny
	Reason    string
	Source    string // tier0-deny | tier0-allow | model | degraded
	Trigger   string
	P         float64
	State     ctxinfo.State
	Answers   map[string]jev.Answer
	LatencyMs int64
}

// Run executes the full pipeline for one command line.
func Run(ctx context.Context, cfg config.Config, rawCommand, cwd string) Result {
	start := time.Now()

	if res, hit := tier0.CheckHardDeny(rawCommand); hit {
		return Result{
			Command: rawCommand,
			Verdict: "deny",
			Reason:  res.Reason,
			Source:  "tier0-deny",
			Trigger: res.Rule,
		}
	}

	cmds := shellparse.Parse(rawCommand)

	if tier0.IsFastAllow(cmds) {
		return Result{
			Command: rawCommand,
			Verdict: "allow",
			Reason:  "jevrail: read-only command, skipped model evaluation.",
			Source:  "tier0-allow",
		}
	}

	state := ctxinfo.Collect(rawCommand, cwd, cmds)

	if cfg.NoModel {
		return degradedResult(rawCommand, state, cfg, start)
	}

	client := jev.New(cfg.BaseURL, cfg.APIKey, cfg.Model, cfg.Timeout())
	resp, err := client.Evaluate(ctx, state, jev.Questions())
	if err != nil {
		res := degradedResult(rawCommand, state, cfg, start)
		res.Reason = "jevrail (degraded — model call failed: " + err.Error() + "): " + res.Reason
		return res
	}

	d := policy.Decide(resp.Answers, cfg.EffectiveBands())
	return Result{
		Command:   rawCommand,
		Verdict:   d.Verdict.String(),
		Reason:    d.Reason,
		Source:    "model",
		Trigger:   d.Trigger,
		P:         d.P,
		State:     state,
		Answers:   resp.Answers,
		LatencyMs: time.Since(start).Milliseconds(),
	}
}

// degradedResult applies the configured fail mode when the model can't be
// consulted (either --no-model or a failed API call).
func degradedResult(rawCommand string, state ctxinfo.State, cfg config.Config, start time.Time) Result {
	verdict := string(cfg.FailMode)
	if looksDangerous(rawCommand) && cfg.FailMode == config.FailAllow {
		// Never silently allow a keyword-flagged command just because the
		// configured default is "allow" — that default is meant for calm
		// commands, not ones already showing a red flag.
		verdict = "ask"
	}
	reason := "jevrail: model unavailable; falling back to '" + verdict + "' per fail_mode."
	return Result{
		Command:   rawCommand,
		Verdict:   verdict,
		Reason:    reason,
		Source:    "degraded",
		State:     state,
		LatencyMs: time.Since(start).Milliseconds(),
	}
}

func looksDangerous(raw string) bool {
	cmds := shellparse.Parse(raw)
	for _, c := range cmds {
		if len(c.Argv) == 0 {
			continue
		}
		// Only inspect program name + first 2 args — commit messages and
			// free-form strings should not trigger dangerous detection.
		inspect := c.Argv
		if len(inspect) > 3 {
			inspect = inspect[:3]
		}
		for _, arg := range inspect {
			lower := strings.ToLower(arg)
			// strip path prefix so /usr/bin/rm still matches
			if idx := strings.LastIndexByte(lower, '/'); idx >= 0 {
				lower = lower[idx+1:]
			}
			for _, kw := range tier0.DangerousKeywords {
				if lower == kw || strings.Contains(lower, kw) {
					return true
				}
			}
		}
		// also check raw of the simple command for composite flags like
		// "push --force" which spans two tokens
		lowerRaw := strings.ToLower(c.Raw)
		if strings.Contains(lowerRaw, "push") && strings.Contains(lowerRaw, "--force") {
			return true
		}
		if strings.Contains(lowerRaw, "push") && strings.Contains(lowerRaw, " -f ") {
			return true
		}
	}
	// fallback for unparsed commands: conservative substring check
	if len(cmds) == 1 && cmds[0].Unparsed {
		lower := strings.ToLower(raw)
		for _, kw := range tier0.DangerousKeywords {
			if strings.Contains(lower, kw) {
				return true
			}
		}
	}
	return false
}
