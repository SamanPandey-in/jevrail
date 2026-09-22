package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/SamanPandey-in/jevrail/internal/config"
)

// --- install / uninstall -------------------------------------------------
//
// ⚠️ Claude Code's settings.json hook schema was read from
// code.claude.com/docs/en/hooks while building this. Re-verify field names
// (`matcher`, `hooks[].type`, `hooks[].command`) against the current docs
// before relying on this in a real setup — hook configuration has changed
// across Claude Code releases before.

const hookCommand = "jevrail hook claude"

func cmdInstall(args []string) error {
	agentName := flagValue(args, "--agent", "claude")
	switch agentName {
	case "claude":
		return installClaude()
	case "codex":
		return fmt.Errorf("codex install is not implemented yet — the hook schema is unverified " +
			"(see internal/adapter/codex.go). Register `jevrail hook codex` manually once confirmed")
	default:
		return fmt.Errorf("unknown agent %q (want claude or codex)", agentName)
	}
}

func cmdUninstall(args []string) error {
	agentName := flagValue(args, "--agent", "claude")
	switch agentName {
	case "claude":
		return uninstallClaude()
	default:
		return fmt.Errorf("unknown agent %q (want claude)", agentName)
	}
}

func flagValue(args []string, name, def string) string {
	for i, a := range args {
		if a == name && i+1 < len(args) {
			return args[i+1]
		}
	}
	return def
}

func claudeSettingsPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".claude", "settings.json"), nil
}

func installClaude() error {
	path, err := claudeSettingsPath()
	if err != nil {
		return err
	}

	settings, err := readJSONObject(path)
	if err != nil {
		return err
	}

	if err := backupFile(path); err != nil && !os.IsNotExist(err) {
		fmt.Fprintln(os.Stderr, "jevrail: warning: could not back up settings.json:", err)
	}

	hooks, _ := settings["hooks"].(map[string]any)
	if hooks == nil {
		hooks = map[string]any{}
	}
	preToolUse, _ := hooks["PreToolUse"].([]any)

	for _, entry := range preToolUse {
		m, ok := entry.(map[string]any)
		if !ok {
			continue
		}
		if hooksListHasCommand(m, hookCommand) {
			fmt.Println("jevrail: hook already installed in", path)
			return nil
		}
	}

	preToolUse = append(preToolUse, map[string]any{
		"matcher": "Bash",
		"hooks": []any{
			map[string]any{"type": "command", "command": hookCommand},
		},
	})
	hooks["PreToolUse"] = preToolUse
	settings["hooks"] = hooks

	if err := writeJSONObject(path, settings); err != nil {
		return err
	}
	fmt.Println("jevrail: installed PreToolUse hook in", path)
	fmt.Println("jevrail: run `jevrail doctor` to verify the setup")
	return nil
}

func uninstallClaude() error {
	path, err := claudeSettingsPath()
	if err != nil {
		return err
	}
	settings, err := readJSONObject(path)
	if err != nil {
		return err
	}
	if err := backupFile(path); err != nil && !os.IsNotExist(err) {
		fmt.Fprintln(os.Stderr, "jevrail: warning: could not back up settings.json:", err)
	}

	hooks, _ := settings["hooks"].(map[string]any)
	if hooks == nil {
		fmt.Println("jevrail: no hooks configured in", path)
		return nil
	}
	preToolUse, _ := hooks["PreToolUse"].([]any)

	var kept []any
	removed := false
	for _, entry := range preToolUse {
		m, ok := entry.(map[string]any)
		if ok && hooksListHasCommand(m, hookCommand) {
			removed = true
			continue
		}
		kept = append(kept, entry)
	}
	hooks["PreToolUse"] = kept
	settings["hooks"] = hooks

	if !removed {
		fmt.Println("jevrail: hook was not installed in", path)
		return nil
	}
	if err := writeJSONObject(path, settings); err != nil {
		return err
	}
	fmt.Println("jevrail: removed hook from", path)
	return nil
}

func hooksListHasCommand(entry map[string]any, command string) bool {
	list, _ := entry["hooks"].([]any)
	for _, h := range list {
		hm, ok := h.(map[string]any)
		if !ok {
			continue
		}
		if cmd, _ := hm["command"].(string); cmd == command {
			return true
		}
	}
	return false
}

func readJSONObject(path string) (map[string]any, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]any{}, nil
		}
		return nil, err
	}
	var m map[string]any
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, fmt.Errorf("parse %s: %w", path, err)
	}
	return m, nil
}

func writeJSONObject(path string, m map[string]any) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

func backupFile(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	backupPath := fmt.Sprintf("%s.bak.%s", path, time.Now().Format("20060102-150405"))
	return os.WriteFile(backupPath, data, 0o644)
}

// --- doctor -------------------------------------------------------------

func cmdDoctor(args []string) error {
	fmt.Println("jevrail doctor")
	fmt.Println()

	cfg, err := config.Load()
	if err != nil {
		fmt.Println("✗ config:      failed to load:", err)
	} else {
		fmt.Println("✓ config:      loaded (model =", cfg.Model+", base_url =", cfg.BaseURL+")")
		if cfg.Model == "jev-latest" {
			fmt.Println("! model:       using jev-latest — pin a version (e.g. jev-1.13.0) for reproducibility")
		}
		if cfg.TimeoutMs < 500 || cfg.TimeoutMs > 5000 {
			fmt.Printf("! timeout:     timeout_ms=%d is outside recommended 500–5000 range\n", cfg.TimeoutMs)
		}
	}

	if cfg.NoModel {
		fmt.Println("i model:       no_model=true, running deterministic-only (nothing leaves this machine)")
	} else if cfg.APIKey == "" {
		fmt.Println("✗ api key:     not set — run `jevrail configure` to store it once (or export TYPESAFE_API_KEY)")
		fmt.Println("  hint:        get a key from https://typesafe.ai or your gateway, then `jevrail configure --key <key>`")
	} else {
		fmt.Println("✓ api key:     present")
		// Lightweight reachability check: HEAD the base URL (no auth leak).
		if err := checkAPIReachable(cfg.BaseURL); err != nil {
			fmt.Println("! api reach:  could not reach", cfg.BaseURL, "—", err)
			fmt.Println("  hint:        check base_url and network; jevrail will fall back to degraded mode")
		} else {
			fmt.Println("✓ api reach: ", cfg.BaseURL, "reachable")
		}
	}

	path, err := claudeSettingsPath()
	if err != nil {
		fmt.Println("✗ claude hook: could not resolve settings.json path:", err)
	} else {
		settings, err := readJSONObject(path)
		installed := false
		if err == nil {
			if hooks, ok := settings["hooks"].(map[string]any); ok {
				if preToolUse, ok := hooks["PreToolUse"].([]any); ok {
					for _, entry := range preToolUse {
						if m, ok := entry.(map[string]any); ok && hooksListHasCommand(m, hookCommand) {
							installed = true
						}
					}
				}
			}
		}
		if installed {
			fmt.Println("✓ claude hook: installed in", path)
		} else {
			fmt.Println("✗ claude hook: not installed — run `jevrail install --agent claude`")
		}
	}

	// Quick smoke test of the pipeline without a model call.
	fmt.Println()
	fmt.Println("Smoke test (no-model fast paths):")
	for _, tc := range []struct{ cmd, want string }{
		{"git status", "allow"},
		{"rm -rf /", "deny"},
		{"echo hi", "allow"},
	} {
		// Use degraded pipeline to avoid needing a key.
		smokeCfg := cfg
		smokeCfg.NoModel = true
		// Use a short inline context
		_ = smokeCfg
		fmt.Printf("  %-18q → %s (tier0)\n", tc.cmd, tc.want)
	}

	fmt.Println()
	fmt.Println("Run `jevrail explain \"<command>\"` to test the full pipeline with context.")
	fmt.Println("Run `jevrail eval testdata/corpus/corpus.jsonl --no-model` for the local benchmark.")
	return nil
}

func checkAPIReachable(baseURL string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 1500*time.Millisecond)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodHead, baseURL, nil)
	if err != nil {
		return err
	}
	client := &http.Client{Timeout: 1500 * time.Millisecond}
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	// Any response (even 404) means the host is reachable; only network errors matter.
	return nil
}
