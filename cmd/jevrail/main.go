// Command jevrail is a probability-scored pre-execution guard for
// terminal coding agents. See plan.md and README.md in the repo root.
package main

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/SamanPandey-in/jevrail/internal/adapter"
	"github.com/SamanPandey-in/jevrail/internal/audit"
	"github.com/SamanPandey-in/jevrail/internal/config"
	"github.com/SamanPandey-in/jevrail/internal/pipeline"
)

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(1)
	}

	var err error
	switch os.Args[1] {
	case "hook":
		err = cmdHook(os.Args[2:])
	case "explain":
		err = cmdExplain(os.Args[2:])
	case "install":
		err = cmdInstall(os.Args[2:])
	case "uninstall":
		err = cmdUninstall(os.Args[2:])
	case "log":
		err = cmdLog(os.Args[2:])
	case "doctor":
		err = cmdDoctor(os.Args[2:])
	case "eval":
		err = cmdEval(os.Args[2:])
	case "exec":
		err = cmdExec(os.Args[2:])
	case "configure":
		err = cmdConfigure(os.Args[2:])
	case "config":
		err = cmdConfigure(os.Args[2:])
	case "-h", "--help", "help":
		usage()
		return
	default:
		fmt.Fprintf(os.Stderr, "jevrail: unknown command %q\n\n", os.Args[1])
		usage()
		os.Exit(1)
	}

	if err != nil {
		fmt.Fprintln(os.Stderr, "jevrail:", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprint(os.Stderr, `jevrail â€” a probability-scored pre-execution guard for coding agents

Usage:
  jevrail hook <claude|codex|opencode>   Hook target: reads agent JSON on stdin, writes a decision
  jevrail explain "<cmd>"                Dry-run a command through the full pipeline
  jevrail install --agent NAME           Install the PreToolUse hook for an agent (claude, opencode)
  jevrail uninstall --agent NAME         Remove the hook for an agent
  jevrail log [-n N]                     Show the last N audit log entries (default 20)
  jevrail doctor                         Check config, API key, and hook install
  jevrail eval <corpus.jsonl> [--adversarial] [--no-model]  Run the benchmark corpus
  jevrail exec -- <cmd>                  Evaluate then optionally execute a command (hookless fallback)
  jevrail configure [--key KEY]          Store your Jev API key once (0600) — all commands reuse it

Status: MVP. See plan.md for the full design and open questions.
`)
}

// --- hook ---------------------------------------------------------------

func cmdHook(args []string) error {
	if len(args) < 1 {
		return fmt.Errorf("usage: jevrail hook <claude|codex|opencode>")
	}
	agentName := args[0]
	ad, ok := adapter.ByName(agentName)
	if !ok {
		return fmt.Errorf("unknown agent %q (want claude, codex, or opencode)", agentName)
	}

	stdin, err := io.ReadAll(os.Stdin)
	if err != nil {
		return fmt.Errorf("read stdin: %w", err)
	}

	ev, err := ad.Decode(stdin)
	if err != nil {
		// Fail open on decode errors: an agent-side format change should
		// not brick every command. Log to stderr, exit 0.
		fmt.Fprintln(os.Stderr, "jevrail: hook decode failed, allowing by default:", err)
		return nil
	}

	// Only Bash-shaped tools are in scope for the MVP.
	if !isShellTool(ev.Tool) {
		out, code := ad.Encode("allow", "jevrail: tool not covered by this hook.")
		os.Stdout.Write(out)
		os.Exit(code)
	}

	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, "jevrail: config load failed, using defaults:", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), cfg.Timeout()+500*time.Millisecond)
	defer cancel()

	res := pipeline.Run(ctx, cfg, ev.Command, ev.CWD)

	writeAudit(ev.Agent, res)

	out, code := ad.Encode(res.Verdict, res.Reason)
	os.Stdout.Write(out)
	os.Exit(code)
	return nil
}

func isShellTool(tool string) bool {
	t := strings.ToLower(tool)
	return t == "bash" || t == "shell" || t == "run_command" || t == "exec"
}

// --- explain --------------------------------------------------------------

func cmdExplain(args []string) error {
	if len(args) < 1 {
		return fmt.Errorf("usage: jevrail explain \"<command>\"")
	}
	command := strings.Join(args, " ")

	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, "jevrail: config load failed, using defaults:", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), cfg.Timeout()+500*time.Millisecond)
	defer cancel()

	res := pipeline.Run(ctx, cfg, command, cwd)
	printExplain(res)
	return nil
}

func printExplain(res pipeline.Result) {
	fmt.Println("command  ", res.Command)
	if res.State.Git.InsideRepo {
		fmt.Printf("context   branch=%s  dirty_files=%d  unpushed_commits=%d\n",
			res.State.Git.Branch, res.State.Git.DirtyFiles, res.State.Git.UnpushedCommits)
	}
	fmt.Println()

	if len(res.Answers) == 0 {
		fmt.Println("source   ", res.Source, "(model not consulted)")
	} else {
		for _, name := range []string{
			"destroys_uncommitted", "irreversible_data_loss", "touches_production",
			"writes_outside_project", "exfiltrates_data",
		} {
			a, ok := res.Answers[name]
			if !ok || a.Noul == nil {
				continue
			}
			fmt.Printf("%-24s%s\n", name, bar(*a.Noul))
		}
		if a, ok := res.Answers["blast_radius"]; ok && a.Score != nil {
			fmt.Printf("%-24s%.1f / 3\n", "blast_radius", *a.Score)
		}
		if a, ok := res.Answers["category"]; ok && a.Choice != "" {
			fmt.Printf("%-24s%s\n", "category", a.Choice)
		}
	}

	fmt.Println()
	fmt.Printf("verdict   %s", strings.ToUpper(res.Verdict))
	if res.Trigger != "" {
		fmt.Printf("  (%s, p=%.2f)", res.Trigger, res.P)
	}
	fmt.Println()
	fmt.Println("reason   ", res.Reason)
	if res.LatencyMs > 0 {
		fmt.Printf("latency   %dms\n", res.LatencyMs)
	}
}

func bar(p float64) string {
	const width = 20
	filled := int(p*width + 0.5)
	if filled > width {
		filled = width
	}
	return strings.Repeat("â–ˆ", filled) + strings.Repeat("â–‘", width-filled) + fmt.Sprintf("  %.2f", p)
}

// --- log --------------------------------------------------------------

func cmdLog(args []string) error {
	n := 20
	for i := 0; i < len(args); i++ {
		if args[i] == "-n" && i+1 < len(args) {
			fmt.Sscanf(args[i+1], "%d", &n)
		}
	}

	path, err := audit.DefaultPath()
	if err != nil {
		return err
	}
	entries, err := audit.ReadTail(path, n)
	if err != nil {
		return err
	}
	if len(entries) == 0 {
		fmt.Println("jevrail: no audit log entries yet (log file:", path, ")")
		return nil
	}
	for _, e := range entries {
		fmt.Printf("%s  %-5s  %-6s  %s\n", e.Time.Format(time.RFC3339), e.Verdict, e.Source, e.Command)
		if e.Reason != "" {
			fmt.Printf("           %s\n", e.Reason)
		}
	}
	return nil
}

func writeAudit(agentName string, res pipeline.Result) {
	path, err := audit.DefaultPath()
	if err != nil {
		fmt.Fprintln(os.Stderr, "jevrail: could not resolve audit log path:", err)
		return
	}
	answersAny := map[string]any{}
	for k, v := range res.Answers {
		answersAny[k] = v
	}
	entry := audit.Entry{
		Time:      time.Now(),
		Agent:     agentName,
		Command:   res.Command,
		Verdict:   res.Verdict,
		Trigger:   res.Trigger,
		P:         res.P,
		Reason:    res.Reason,
		Source:    res.Source,
		LatencyMs: res.LatencyMs,
		Answers:   answersAny,
	}
	if err := audit.Append(path, entry); err != nil {
		fmt.Fprintln(os.Stderr, "jevrail: audit write failed:", err)
	}
}

