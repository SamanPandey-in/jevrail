// Package ctxinfo gathers the small, factual context object that gets sent
// to the model alongside the command: git state, resolved file targets,
// classified environment hints, and bounded script bodies. Everything here
// is deterministic — no model calls.
package ctxinfo

import (
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/SamanPandey-in/jevrail/internal/shellparse"
)

// GitState is a compact summary of the repo's working tree.
type GitState struct {
	Branch          string `json:"branch"`
	IsDefaultBranch bool   `json:"is_default_branch"`
	DirtyFiles      int    `json:"dirty_files"`
	UntrackedFiles  int    `json:"untracked_files"`
	UnpushedCommits int    `json:"unpushed_commits"`
	InsideRepo      bool   `json:"inside_repo"`
}

// Target is a file or directory a command appears to reference.
type Target struct {
	Path          string `json:"path"`
	InsideProject bool   `json:"inside_project"`
	TrackedByGit  bool   `json:"tracked_by_git"`
	Dirty         bool   `json:"dirty"`
	Exists        bool   `json:"exists"`
	EntryCount    int    `json:"entry_count,omitempty"`
}

// State is the full object sent to the model as `state`.
type State struct {
	Command     string   `json:"command"`
	Commands    []string `json:"commands"`
	ProjectRoot string   `json:"project_root"`
	CWD         string   `json:"cwd"`
	Resolved    struct {
		Targets      []Target `json:"targets"`
		ScriptBodies []string `json:"script_bodies"`
	} `json:"resolved"`
	Git GitState `json:"git"`
	Env struct {
		Hints []string `json:"hints"`
	} `json:"env"`
	Truncated bool `json:"truncated"`
}

const scriptBodyBudget = 8 * 1024 // bytes, total across all script bodies

// Collect builds a State for the given raw command line, run with the
// agent's reported cwd.
func Collect(rawCommand, cwd string, cmds []shellparse.Command) State {
	var st State
	st.Command = RedactString(rawCommand)
	st.CWD = cwd
	for _, c := range cmds {
		st.Commands = append(st.Commands, RedactString(c.Raw))
	}

	st.ProjectRoot = findProjectRoot(cwd)
	st.Git = collectGit(cwd)
	targets, truncatedTargets := collectTargets(cmds, st.ProjectRoot, cwd, st.Git)
	st.Resolved.Targets = targets
	bodies, truncatedBodies := collectScriptBodies(cmds, cwd)
	st.Resolved.ScriptBodies = bodies
	for i, b := range st.Resolved.ScriptBodies {
		st.Resolved.ScriptBodies[i] = RedactString(b)
	}
	st.Env.Hints = collectEnvHints()
	st.Truncated = truncatedTargets || truncatedBodies

	return st
}

func findProjectRoot(cwd string) string {
	dir := cwd
	for i := 0; i < 40; i++ {
		if _, err := os.Stat(filepath.Join(dir, ".git")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return cwd
}

func collectGit(cwd string) GitState {
	var g GitState
	if !runGitOK(cwd, "rev-parse", "--is-inside-work-tree") {
		return g
	}
	g.InsideRepo = true

	if out, ok := runGit(cwd, "branch", "--show-current"); ok {
		g.Branch = strings.TrimSpace(out)
	}
	g.IsDefaultBranch = g.Branch == "main" || g.Branch == "master"

	if out, ok := runGit(cwd, "status", "--porcelain"); ok {
		lines := nonEmptyLines(out)
		for _, l := range lines {
			if strings.HasPrefix(l, "??") {
				g.UntrackedFiles++
			} else {
				g.DirtyFiles++
			}
		}
	}

	if out, ok := runGit(cwd, "rev-list", "--count", "@{u}..HEAD"); ok {
		if n, err := strconv.Atoi(strings.TrimSpace(out)); err == nil {
			g.UnpushedCommits = n
		}
	}

	return g
}

func runGit(cwd string, args ...string) (string, bool) {
	cmd := exec.Command("git", args...)
	cmd.Dir = cwd
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	out, err := runWithTimeout(cmd, 800*time.Millisecond)
	if err != nil {
		return "", false
	}
	return out, true
}

func runGitOK(cwd string, args ...string) bool {
	_, ok := runGit(cwd, args...)
	return ok
}

func runWithTimeout(cmd *exec.Cmd, d time.Duration) (string, error) {
	done := make(chan struct{})
	var out []byte
	var err error
	go func() {
		out, err = cmd.Output()
		close(done)
	}()
	select {
	case <-done:
		return string(out), err
	case <-time.After(d):
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
		return "", exec.ErrNotFound
	}
}

func nonEmptyLines(s string) []string {
	var out []string
	for _, l := range strings.Split(s, "\n") {
		if strings.TrimSpace(l) != "" {
			out = append(out, l)
		}
	}
	return out
}

// pathLikeArg heuristics: an argv element that looks like a filesystem
// path rather than a flag or a bare word.
var flagRe = regexp.MustCompile(`^-`)

func collectTargets(cmds []shellparse.Command, projectRoot, cwd string, git GitState) ([]Target, bool) {
	seen := map[string]bool{}
	var targets []Target
	truncated := false
	// Build a set of dirty/untracked relative paths for quick lookup.
	dirtySet := buildDirtySet(cwd)
	for _, c := range cmds {
		if c.Unparsed || len(c.Argv) < 2 {
			continue
		}
		prog := lastElem(c.Argv[0])
		if !targetBearingCommands[prog] {
			continue
		}
		for _, a := range c.Argv[1:] {
			if flagRe.MatchString(a) || strings.Contains(a, "=") {
				continue
			}
			if !looksLikePath(a) {
				continue
			}
			abs := resolvePath(a, cwd)
			if seen[abs] {
				continue
			}
			seen[abs] = true
			t := Target{Path: abs}
			t.InsideProject = strings.HasPrefix(abs, projectRoot+string(filepath.Separator)) || abs == projectRoot
			if info, err := os.Stat(abs); err == nil {
				t.Exists = true
				if info.IsDir() {
					t.EntryCount = countEntries(abs, 5000)
				} else {
					t.EntryCount = 1
				}
			}
			if git.InsideRepo {
				t.TrackedByGit = isTrackedByGit(abs, cwd)
				t.Dirty = isDirty(abs, projectRoot, dirtySet)
			}
			targets = append(targets, t)
			if len(targets) >= 12 {
				truncated = true
				return targets, truncated
			}
		}
	}
	return targets, truncated
}

func buildDirtySet(cwd string) map[string]bool {
	out, ok := runGit(cwd, "status", "--porcelain")
	if !ok {
		return nil
	}
	m := map[string]bool{}
	for _, line := range nonEmptyLines(out) {
		if len(line) < 4 {
			continue
		}
		// porcelain format: XY<space>path
		rel := strings.TrimSpace(line[3:])
		// handle renames "old -> new"
		if idx := strings.Index(rel, " -> "); idx >= 0 {
			rel = rel[idx+4:]
		}
		rel = strings.Trim(rel, `"`)
		m[rel] = true
		// also add parent dirs so `rm -rf ./dist` detects dirty under dist
		for d := filepath.Dir(rel); d != "." && d != "/"; d = filepath.Dir(d) {
			m[d] = true
		}
	}
	return m
}

func isTrackedByGit(absPath, cwd string) bool {
	rel, err := filepath.Rel(cwd, absPath)
	if err != nil {
		rel = absPath
	}
	// git ls-files --error-unmatch exits 0 if tracked
	cmd := exec.Command("git", "ls-files", "--error-unmatch", "--", rel)
	cmd.Dir = cwd
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	out, err := runWithTimeout(cmd, 500*time.Millisecond)
	if err == nil && strings.TrimSpace(out) != "" {
		return true
	}
	// also check parent: directory tracked if any file under it is tracked
	cmd2 := exec.Command("git", "ls-files", "--", rel)
	cmd2.Dir = cwd
	cmd2.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")
	out2, err2 := runWithTimeout(cmd2, 500*time.Millisecond)
	if err2 == nil && strings.TrimSpace(out2) != "" {
		return true
	}
	return false
}

func isDirty(absPath, projectRoot string, dirtySet map[string]bool) bool {
	if dirtySet == nil {
		return false
	}
	rel, err := filepath.Rel(projectRoot, absPath)
	if err != nil {
		return false
	}
	rel = filepath.ToSlash(rel)
	if dirtySet[rel] {
		return true
	}
	// check if any dirty file is under this directory
	prefix := rel + "/"
	for k := range dirtySet {
		if strings.HasPrefix(k, prefix) {
			return true
		}
	}
	return false
}

func countEntries(dir string, limit int) int {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return 0
	}
	if len(entries) > limit {
		return limit
	}
	return len(entries)
}

var targetBearingCommands = map[string]bool{
	"rm": true, "mv": true, "cp": true, "chmod": true, "chown": true,
	"truncate": true, "shred": true, "unlink": true, "rmdir": true,
}

func looksLikePath(a string) bool {
	if a == "" {
		return false
	}
	if strings.HasPrefix(a, "/") || strings.HasPrefix(a, "./") || strings.HasPrefix(a, "../") || strings.HasPrefix(a, "~") {
		return true
	}
	return strings.Contains(a, "/") || strings.Contains(a, ".")
}

func resolvePath(p, cwd string) string {
	if strings.HasPrefix(p, "~") {
		home, err := os.UserHomeDir()
		if err == nil {
			p = filepath.Join(home, strings.TrimPrefix(p, "~"))
		}
	}
	if !filepath.IsAbs(p) {
		p = filepath.Join(cwd, p)
	}
	return filepath.Clean(p)
}

func lastElem(p string) string {
	if idx := strings.LastIndexByte(p, '/'); idx >= 0 {
		return p[idx+1:]
	}
	return p
}

// collectScriptBodies reads local script files invoked directly (e.g.
// `./cleanup.sh`, `bash deploy.sh`) up to a total byte budget, so the model
// can be asked about what they actually do.
func collectScriptBodies(cmds []shellparse.Command, cwd string) ([]string, bool) {
	var bodies []string
	budget := scriptBodyBudget
	truncated := false
	for _, c := range cmds {
		if c.Unparsed || len(c.Argv) == 0 {
			continue
		}
		candidate := scriptCandidate(c.Argv)
		if candidate == "" {
			// also check for heredoc-like inline: python -c "code" etc
			if inline := inlineScriptBody(c.Argv); inline != "" {
				if len(inline) > budget {
					inline = inline[:budget]
					truncated = true
				}
				budget -= len(inline)
				bodies = append(bodies, inline)
				if budget <= 0 {
					truncated = true
					break
				}
			}
			continue
		}
		abs := resolvePath(candidate, cwd)
		data, err := os.ReadFile(abs)
		if err != nil {
			continue
		}
		if len(data) > budget {
			data = data[:budget]
			truncated = true
		}
		budget -= len(data)
		bodies = append(bodies, string(data))
		if budget <= 0 {
			truncated = true
			break
		}
	}
	return bodies, truncated
}

func inlineScriptBody(argv []string) string {
	if len(argv) < 3 {
		return ""
	}
	prog := lastElem(argv[0])
	if prog == "python" || prog == "python3" || prog == "node" {
		for i := 1; i < len(argv)-1; i++ {
			if argv[i] == "-c" && i+1 < len(argv) {
				return argv[i+1]
			}
		}
	}
	return ""
}

func scriptCandidate(argv []string) string {
	first := argv[0]
	if strings.HasSuffix(first, ".sh") || strings.HasPrefix(first, "./") || strings.HasPrefix(first, "../") {
		return first
	}
	interp := lastElem(first)
	if (interp == "bash" || interp == "sh" || interp == "zsh" || interp == "python" || interp == "python3" || interp == "node") && len(argv) > 1 {
		for _, a := range argv[1:] {
			if !strings.HasPrefix(a, "-") {
				return a
			}
		}
	}
	return ""
}

// envHintPatterns classify (never leak) environment values that suggest
// the command is pointed at something production-like.
var envHintPatterns = []struct {
	label string
	re    *regexp.Regexp
}{
	{"NODE_ENV=production", regexp.MustCompile(`(?i)^production$`)},
	{"host contains 'prod'", regexp.MustCompile(`(?i)prod`)},
}

var envKeysOfInterest = []string{
	"NODE_ENV", "APP_ENV", "ENVIRONMENT", "RAILS_ENV",
	"DATABASE_URL", "DB_HOST", "REDIS_URL", "KUBE_CONTEXT", "AWS_PROFILE",
}

func collectEnvHints() []string {
	var hints []string
	for _, key := range envKeysOfInterest {
		val := os.Getenv(key)
		if val == "" {
			continue
		}
		for _, p := range envHintPatterns {
			if p.re.MatchString(val) {
				hints = append(hints, key+": "+p.label)
				break
			}
		}
	}
	return hints
}
