// Package tier0 holds the deterministic, non-negotiable rules that run
// before (and instead of) any call to the model.
//
// A hard-deny match is final: the model is never consulted and can never
// override it. A fast-allow match skips the model purely as an optimization
// for obviously read-only commands.
package tier0

import (
	"regexp"
	"strings"

	"github.com/SamanPandey-in/jevrail/internal/shellparse"
)

// Verdict is a tier0-only decision. VerdictNone means "tier0 has no
// opinion, continue the pipeline."
type Verdict int

const (
	VerdictNone Verdict = iota
	VerdictHardDeny
	VerdictFastAllow
)

type Result struct {
	Verdict Verdict
	Rule    string
	Reason  string
}

// hardDenyPatterns match against a normalized (lowercased, whitespace
// collapsed) single simple command. Keep this list SHORT and SURGICAL —
// broad destructive-command coverage belongs in a dedicated tool like dcg,
// run alongside jevrail, not duplicated here.
var hardDenyPatterns = []struct {
	name string
	re   *regexp.Regexp
}{
	{"rm-rf-root", regexp.MustCompile(`^(sudo\s+)?rm\s+(-[a-z]*r[a-z]*f[a-z]*|-[a-z]*f[a-z]*r[a-z]*)\s+/\s*$`)},
	{"rm-rf-root-glob", regexp.MustCompile(`^(sudo\s+)?rm\s+(-[a-z]*r[a-z]*f[a-z]*|-[a-z]*f[a-z]*r[a-z]*)\s+/\*\s*$`)},
	{"rm-rf-home", regexp.MustCompile(`^(sudo\s+)?rm\s+(-[a-z]*r[a-z]*f[a-z]*|-[a-z]*f[a-z]*r[a-z]*)\s+(~|\$home)\s*/?\s*$`)},
	{"fork-bomb", regexp.MustCompile(`:\(\)\s*\{\s*:\|\s*:\s*&\s*\}\s*;\s*:`)},
	{"mkfs-device", regexp.MustCompile(`^mkfs(\.[a-z0-9]+)?\s+.*/dev/`)},
	{"dd-to-device", regexp.MustCompile(`^dd\s+.*of=/dev/(sd|nvme|hd|disk|xvd)`)},
	{"force-push-default", regexp.MustCompile(`^git\s+push\s+.*(--force|-f)\b.*\b(origin\s+)?(main|master)\b`)},
	{"drop-database", regexp.MustCompile(`(?i)^\s*drop\s+database\b`)},
	{"pipe-curl-to-shell", regexp.MustCompile(`(curl|wget)\s+.*\|\s*(sudo\s+)?(bash|sh|zsh)\b`)},
}

// DangerousKeywords is used by the caller as the fallback signal when the
// model is unreachable: if any of these appear in a command's argv, treat
// the command as risky (ask) instead of failing open (allow).
var DangerousKeywords = []string{
	"rm", "reset", "clean", "drop", "truncate", "delete", "dd", "mkfs",
	"push", "kubectl", "terraform", "helm", "chmod", "chown", "shred",
}

// fastAllowCommands are read-only builtins/utilities. A command is
// fast-allowed only if EVERY simple command in the line is one of these,
// with no redirects and no substitutions (checked by the caller via
// shellparse before this list is even consulted).
var fastAllowCommands = map[string]bool{
	"ls": true, "pwd": true, "echo": true, "cat": true, "head": true, "tail": true,
	"grep": true, "find": true, "which": true, "whoami": true, "date": true,
	"wc": true, "diff": true, "env": true, "printenv": true, "true": true, "false": true,
}

var fastAllowGitSubcommands = map[string]bool{
	"status": true, "diff": true, "log": true, "show": true, "branch": true,
	"remote": true, "config": true, // note: `git config` can be a write; kept
	// out of fast-allow by requiring no "--" write flags — see IsFastAllow.
}

// Check runs the hard-deny patterns against the full (normalized) command
// line. Call this first, before splitting into simple commands, so
// cross-command patterns like the fork bomb still match.
func CheckHardDeny(rawLine string) (Result, bool) {
	norm := normalize(rawLine)
	for _, p := range hardDenyPatterns {
		if p.re.MatchString(norm) {
			return Result{
				Verdict: VerdictHardDeny,
				Rule:    p.name,
				Reason:  "jevrail: blocked by hard rule `" + p.name + "` — this class of command is never allowed to run.",
			}, true
		}
	}
	return Result{}, false
}

// IsFastAllow reports whether every parsed simple command is a trivial,
// read-only, single-word-argv command with no shell metacharacters and no
// unparsed pieces. If true, the caller can skip the model entirely.
func IsFastAllow(cmds []shellparse.Command) bool {
	if len(cmds) == 0 {
		return false
	}
	for _, c := range cmds {
		if c.Unparsed || len(c.Argv) == 0 {
			return false
		}
		if strings.ContainsAny(c.Raw, ">") { // any redirect disqualifies fast-allow
			return false
		}
		prog := lastElem(c.Argv[0])
		if prog == "git" {
			if len(c.Argv) < 2 || !fastAllowGitSubcommands[c.Argv[1]] {
				return false
			}
			if prog == "git" && c.Argv[1] == "config" && hasWriteFlag(c.Argv) {
				return false
			}
			continue
		}
		if !fastAllowCommands[prog] {
			return false
		}
	}
	return true
}

func hasWriteFlag(argv []string) bool {
	for _, a := range argv[2:] {
		if a == "--global" || a == "--local" || a == "--add" || a == "--unset" {
			// still only disqualifies if followed by a key=value set, but
			// err conservative: any of these on `git config` skips fast-allow.
			return strings.Contains(strings.Join(argv, " "), "=") || true
		}
	}
	return false
}

func normalize(s string) string {
	s = strings.ToLower(s)
	s = strings.Join(strings.Fields(s), " ")
	return s
}

func lastElem(p string) string {
	if idx := strings.LastIndexByte(p, '/'); idx >= 0 {
		return p[idx+1:]
	}
	return p
}
