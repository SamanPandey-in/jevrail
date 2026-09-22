// Package policy turns model answers into a final verdict. All the
// judgment calls about wording and severity live here in code — the model
// only supplies probabilities.
package policy

import (
	"fmt"

	"github.com/SamanPandey-in/jevrail/internal/jev"
)

type Verdict int

const (
	Allow Verdict = iota
	Ask
	Deny
)

func (v Verdict) String() string {
	switch v {
	case Allow:
		return "allow"
	case Ask:
		return "ask"
	case Deny:
		return "deny"
	default:
		return "unknown"
	}
}

// Band is the [ask, deny) threshold pair for one Noul question.
type Band struct {
	Ask  float64
	Deny float64
}

// DefaultBands are starting guesses, not measured values. Tune these
// against a labeled corpus (see plan.md §9) before trusting them on a
// real project.
var DefaultBands = map[string]Band{
	"destroys_uncommitted":   {Ask: 0.35, Deny: 0.80},
	"irreversible_data_loss": {Ask: 0.40, Deny: 0.85},
	"touches_production":     {Ask: 0.30, Deny: 0.75},
	"writes_outside_project": {Ask: 0.50, Deny: 0.90},
	"exfiltrates_data":       {Ask: 0.50, Deny: 0.90},
}

// blastAskLevel: a blast_radius score at or above this (on the 0-3 scale
// from jev.Questions) is enough to trigger "ask" on its own, even if no
// individual harm probability crossed its band.
const blastAskLevel = 2.0

var reasonTemplates = map[string]string{
	"destroys_uncommitted": "jevrail: this would likely discard uncommitted changes (p=%.2f). " +
		"Commit or `git stash` first, then retry.",
	"irreversible_data_loss": "jevrail: this looks likely to cause irreversible data loss (p=%.2f). " +
		"Use a recoverable alternative (move to trash, take a backup) and retry.",
	"touches_production": "jevrail: this looks likely to affect a production or shared system (p=%.2f). " +
		"Confirm the target and ask the user first.",
	"writes_outside_project": "jevrail: this writes outside the project directory (p=%.2f). " +
		"Confirm the path is intended.",
	"exfiltrates_data": "jevrail: this looks likely to send local data to a remote host (p=%.2f). " +
		"Confirm with the user.",
}

// Decision is the final output of the policy step.
type Decision struct {
	Verdict Verdict
	Trigger string
	P       float64
	Reason  string
}

// Decide applies bands to the model's answers and returns the strictest
// verdict triggered. Ties break toward the higher probability.
func Decide(answers map[string]jev.Answer, bands map[string]Band) Decision {
	d := Decision{Verdict: Allow, Reason: "jevrail: no elevated risk detected."}

	for name, band := range bands {
		a, ok := answers[name]
		if !ok || a.Noul == nil {
			// The model didn't answer a question we asked for — fail safe
			// rather than silently treating it as zero risk.
			return Decision{
				Verdict: Ask,
				Trigger: name,
				Reason:  "jevrail: incomplete risk assessment from the model; asking for confirmation.",
			}
		}
		p := *a.Noul
		var v Verdict
		switch {
		case p >= band.Deny:
			v = Deny
		case p >= band.Ask:
			v = Ask
		default:
			continue
		}
		if v > d.Verdict || (v == d.Verdict && p > d.P) {
			d = Decision{
				Verdict: v,
				Trigger: name,
				P:       p,
				Reason:  fmt.Sprintf(reasonTemplates[name], p),
			}
		}
	}

	if a, ok := answers["blast_radius"]; ok && a.Score != nil && *a.Score >= blastAskLevel && d.Verdict < Ask {
		d = Decision{
			Verdict: Ask,
			Trigger: "blast_radius",
			P:       *a.Score / 3,
			Reason:  "jevrail: this command's effects reach beyond the project directory; asking for confirmation.",
		}
	}

	return d
}
