package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/SamanPandey-in/jevrail/internal/config"
	"github.com/SamanPandey-in/jevrail/internal/pipeline"
)

func cmdExec(args []string) error {
	// Accept both `jevrail exec -- <cmd...>` and `jevrail exec <cmd...>`
	cmdArgs := args
	if len(cmdArgs) > 0 && cmdArgs[0] == "--" {
		cmdArgs = cmdArgs[1:]
	}
	if len(cmdArgs) == 0 {
		return fmt.Errorf("usage: jevrail exec -- <command> [args...]")
	}

	// Reconstruct shell command for pipeline evaluation.
	// If multiple args, join with space; if single arg that already contains spaces, use as-is.
	command := strings.Join(cmdArgs, " ")

	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, "jevrail: config load failed, using defaults:", err)
	}

	cwd, _ := os.Getwd()
	ctx, cancel := context.WithTimeout(context.Background(), cfg.Timeout()+500*time.Millisecond)
	defer cancel()

	res := pipeline.Run(ctx, cfg, command, cwd)

	// Print decision to stderr so stdout is clean for command output.
	fmt.Fprintf(os.Stderr, "jevrail exec: verdict=%s  source=%s  trigger=%s\n", res.Verdict, res.Source, res.Trigger)
	fmt.Fprintf(os.Stderr, "  reason: %s\n", res.Reason)

	switch res.Verdict {
	case "deny":
		return fmt.Errorf("jevrail: blocked (deny) — %s", res.Reason)
	case "ask":
		fmt.Fprint(os.Stderr, "jevrail: this command requires confirmation [y/N]: ")
		var ans string
		fmt.Scanln(&ans)
		ans = strings.ToLower(strings.TrimSpace(ans))
		if ans != "y" && ans != "yes" {
			return fmt.Errorf("jevrail: aborted by user (ask)")
		}
	}

	// Execute the command.
	var cmd *exec.Cmd
	if len(cmdArgs) == 1 {
		// Single string: run via shell so pipelines etc work.
		cmd = exec.Command("sh", "-c", command)
	} else {
		cmd = exec.Command(cmdArgs[0], cmdArgs[1:]...)
	}
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Dir = cwd
	if err := cmd.Run(); err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		return err
	}
	return nil
}
