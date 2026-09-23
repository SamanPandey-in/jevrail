package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"github.com/SamanPandey-in/jevrail/internal/config"
)

func cmdConfigure(args []string) error {
	var keyFlag string
	show := false
	clear := false
	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--key":
			if i+1 >= len(args) {
				return fmt.Errorf("usage: jevrail configure [--key <api-key>] [--show] [--clear]")
			}
			keyFlag = args[i+1]
			i++
		case "--show":
			show = true
		case "--clear":
			clear = true
		case "-h", "--help", "help":
			return printConfigureHelp()
		default:
			if strings.HasPrefix(args[i], "-") {
				return fmt.Errorf("unknown flag %q (see jevrail configure --help)", args[i])
			}
			return fmt.Errorf("usage: jevrail configure [--key <api-key>] [--show] [--clear]")
		}
	}
	if show && clear {
		return fmt.Errorf("cannot use --show and --clear together")
	}
	if show {
		return configureShow()
	}
	if clear {
		return configureClear()
	}
	key := strings.TrimSpace(keyFlag)
	if key == "" {
		if envKey := os.Getenv("TYPESAFE_API_KEY"); envKey != "" {
			fmt.Printf("TYPESAFE_API_KEY is set in your environment (%s…).\n", maskKey(envKey))
			fmt.Printf("Press Enter to save that key to %s, or type a different key:\n", mustConfigPath())
			key = readLine("> ")
			key = strings.TrimSpace(key)
			if key == "" {
				key = envKey
			}
		} else {
			fmt.Println("Enter your Jev API key (from https://typesafe.ai or your gateway).")
			fmt.Printf("It will be saved to %s with 0600 permissions.\n", mustConfigPath())
			fmt.Println("Tip: you can also run `jevrail configure --key <key>` non-interactively.")
			key = readPassword("API key: ")
			fmt.Println()
			if strings.TrimSpace(key) == "" {
				return fmt.Errorf("no key entered, aborted")
			}
		}
	}
	key = strings.TrimSpace(key)
	if key == "" {
		return fmt.Errorf("empty key, aborted")
	}
	if len(key) < 10 {
		fmt.Fprintln(os.Stderr, "jevrail: warning: key looks unusually short, saving anyway")
	}
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, "jevrail: warning: could not load existing config:", err)
		cfg, _ = config.Load()
	}
	cfg.APIKey = key
	if err := config.Save(cfg); err != nil {
		return fmt.Errorf("save config: %w", err)
	}
	path, _ := config.Path()
	fmt.Printf("✓ API key saved to %s (0600)\n", path)
	fmt.Println("  It will be used by jevrail hook, explain, eval and exec.")
	fmt.Println("  TYPESAFE_API_KEY env var still overrides it if set.")
	fmt.Println("  Run `jevrail doctor` to verify, `jevrail configure --show` to check, `jevrail configure --clear` to remove.")
	return nil
}

func configureShow() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	path, _ := config.Path()
	if cfg.APIKey == "" {
		fmt.Printf("No API key stored in %s\n", path)
		if os.Getenv("TYPESAFE_API_KEY") != "" {
			fmt.Printf("But TYPESAFE_API_KEY is set in the environment (%s…)\n", maskKey(os.Getenv("TYPESAFE_API_KEY")))
		} else {
			fmt.Println("Run `jevrail configure` to store one, or export TYPESAFE_API_KEY.")
		}
		return nil
	}
	fileKey, envOverriding := "", false
	if p, err := config.Path(); err == nil {
		if data, err := os.ReadFile(p); err == nil {
			if strings.Contains(string(data), "api_key") {
				saved := os.Getenv("TYPESAFE_API_KEY")
				os.Unsetenv("TYPESAFE_API_KEY")
				fCfg, _ := config.Load()
				if saved != "" {
					os.Setenv("TYPESAFE_API_KEY", saved)
				}
				fileKey = fCfg.APIKey
				envOverriding = saved != "" && saved != fileKey
			}
		}
	}
	if fileKey == "" {
		fileKey = cfg.APIKey
	}
	fmt.Printf("API key in %s: %s\n", path, maskKey(fileKey))
	if envOverriding {
		fmt.Printf("Note: TYPESAFE_API_KEY env var is set and overrides the file (%s…)\n", maskKey(os.Getenv("TYPESAFE_API_KEY")))
	} else if os.Getenv("TYPESAFE_API_KEY") != "" {
		fmt.Printf("TYPESAFE_API_KEY env var is also set (%s…); env wins at runtime\n", maskKey(os.Getenv("TYPESAFE_API_KEY")))
	}
	return nil
}

func configureClear() error {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, "jevrail: warning: could not load config:", err)
	}
	if cfg.APIKey == "" && os.Getenv("TYPESAFE_API_KEY") == "" {
		fmt.Println("No API key stored. Nothing to clear.")
		return nil
	}
	cfg.APIKey = ""
	if err := config.Save(cfg); err != nil {
		return fmt.Errorf("save config: %w", err)
	}
	path, _ := config.Path()
	fmt.Printf("✓ API key removed from %s\n", path)
	if os.Getenv("TYPESAFE_API_KEY") != "" {
		fmt.Println("Note: TYPESAFE_API_KEY is still set in your environment. Unset it to fully clear.")
	}
	return nil
}

func printConfigureHelp() error {
	fmt.Print(`jevrail configure: store your Jev API key once

Usage:
  jevrail configure                  Prompt securely and save to ~/.config/jevrail/config.json (0600)
  jevrail configure --key <key>      Save non-interactively (useful in CI)
  jevrail configure --show           Show whether a key is stored (masked)
  jevrail configure --clear          Remove the stored key from the config file

The key is used by: hook, explain, eval, exec. The file is JSON with 0600
permissions. TYPESAFE_API_KEY env var always wins if set.

Examples:
  jevrail configure
  jevrail configure --key sk-jev-...
  jevrail configure --show
  TYPESAFE_API_KEY=sk-... jevrail configure   # will offer to save the env key
`)
	return nil
}

func mustConfigPath() string {
	p, err := config.Path()
	if err != nil {
		return "~/.config/jevrail/config.json"
	}
	return p
}

func maskKey(k string) string {
	if len(k) <= 8 {
		return "****"
	}
	return k[:4] + "…" + k[len(k)-4:]
}

func readLine(prompt string) string {
	fmt.Print(prompt)
	r := bufio.NewReader(os.Stdin)
	line, _ := r.ReadString('\n')
	return strings.TrimRight(line, "\r\n")
}

func readPassword(prompt string) string {
	fmt.Print(prompt)
	r := bufio.NewReader(os.Stdin)
	line, _ := r.ReadString('\n')
	return strings.TrimRight(line, "\r\n")
}
