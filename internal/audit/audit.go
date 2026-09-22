// Package audit appends every decision jevrail makes to a JSONL log, so
// `jevrail log` can show what happened and why.
package audit

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// Entry is one line of the audit log.
type Entry struct {
	Time      time.Time      `json:"time"`
	Agent     string         `json:"agent"`
	Command   string         `json:"command"`
	Verdict   string         `json:"verdict"`
	Trigger   string         `json:"trigger,omitempty"`
	P         float64        `json:"p,omitempty"`
	Reason    string         `json:"reason"`
	Source    string         `json:"source"` // "tier0-deny" | "tier0-allow" | "model" | "degraded"
	LatencyMs int64          `json:"latency_ms"`
	Answers   map[string]any `json:"answers,omitempty"`
}

// DefaultPath returns ~/.local/share/jevrail/audit.jsonl, creating its
// parent directory if needed.
func DefaultPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(home, ".local", "share", "jevrail")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return filepath.Join(dir, "audit.jsonl"), nil
}

// Append writes one entry as a JSON line. Failure to audit must never
// block a decision, so callers should log-and-continue on error.
func Append(path string, e Entry) error {
	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer f.Close()
	b, err := json.Marshal(e)
	if err != nil {
		return err
	}
	_, err = f.Write(append(b, '\n'))
	return err
}

// ReadTail returns up to n most recent entries from the log.
func ReadTail(path string, n int) ([]Entry, error) {
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	defer f.Close()

	var all []Entry
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for sc.Scan() {
		var e Entry
		if err := json.Unmarshal(sc.Bytes(), &e); err != nil {
			continue // skip malformed lines rather than failing the whole read
		}
		all = append(all, e)
	}
	if err := sc.Err(); err != nil {
		return nil, fmt.Errorf("audit: scan: %w", err)
	}
	if len(all) > n {
		all = all[len(all)-n:]
	}
	return all, nil
}
