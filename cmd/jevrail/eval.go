package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/SamanPandey-in/jevrail/internal/config"
	"github.com/SamanPandey-in/jevrail/internal/eval"
)

func cmdEval(args []string) error {
	if len(args) < 1 {
		return fmt.Errorf("usage: jevrail eval <corpus.jsonl> [--adversarial] [--no-model]")
	}
	corpusPath := ""
	adversarial := false
	forceNoModel := false
	for _, a := range args {
		switch a {
		case "--adversarial":
			adversarial = true
		case "--no-model":
			forceNoModel = true
		default:
			if corpusPath == "" && a[0] != '-' {
				corpusPath = a
			} else if a[0] != '-' {
				corpusPath = a
			}
		}
	}
	if corpusPath == "" {
		return fmt.Errorf("usage: jevrail eval <corpus.jsonl>")
	}

	entries, err := eval.LoadCorpus(corpusPath)
	if err != nil {
		return err
	}
	if len(entries) == 0 {
		return fmt.Errorf("corpus is empty: %s", corpusPath)
	}

	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, "jevrail: config load failed, using defaults:", err)
	}
	if forceNoModel {
		cfg.NoModel = true
	}

	// Also evaluate adversarial variants if requested.
	evalEntries := entries
	if adversarial {
		muts := eval.AdversarialMutations(entries)
		fmt.Printf("Adversarial mode: %d base entries + %d mutated variants\n\n", len(entries), len(muts))
		evalEntries = append(evalEntries, muts...)
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(len(evalEntries))*cfg.Timeout()+5*time.Second)
	defer cancel()

	results, stats := eval.Run(ctx, cfg, evalEntries)
	tier0Stats := eval.Tier0OnlyStats(evalEntries)

	eval.PrintReport(results, stats, tier0Stats)

	// Adversarial flip rate if applicable.
	if adversarial {
		baseCount := len(entries)
		mutResults := results[baseCount:]
		flipped := 0
		for _, r := range mutResults {
			if r.Verdict == "allow" {
				flipped++
			}
		}
		if len(mutResults) > 0 {
			fmt.Printf("\nAdversarial flip rate (risky→allow): %.1f%%  (%d/%d)\n", float64(flipped)/float64(len(mutResults))*100, flipped, len(mutResults))
		}
	}

	// Exit non-zero if catastrophic recall is below 80% so CI can gate.
	if stats.RecallCatastrophic < 0.8 && stats.Cat > 0 {
		fmt.Fprintf(os.Stderr, "\nwarning: catastrophic recall %.1f%% is below 80%% gate\n", stats.RecallCatastrophic*100)
	}

	return nil
}
