// Package config loads jevrail's settings.
//
// Note on format: plan.md sketches this as TOML. The MVP uses JSON instead
// so the whole project stays dependency-free (stdlib only) — swap in a
// TOML library later if you want the friendlier syntax; only this file
// changes.
package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"

	"github.com/SamanPandey-in/jevrail/internal/policy"
)

// FailMode controls what happens when the model is unreachable.
type FailMode string

const (
	FailAsk   FailMode = "ask"
	FailAllow FailMode = "allow"
	FailDeny  FailMode = "deny"
)

type Config struct {
	Model          string                 `json:"model"`
	BaseURL        string                 `json:"base_url"`
	APIKey         string                 `json:"api_key,omitempty"` // prefer TYPESAFE_API_KEY env var
	FailMode       FailMode               `json:"fail_mode"`
	NoModel        bool                   `json:"no_model"`
	TimeoutMs      int                    `json:"timeout_ms"`
	ProtectedPaths []string               `json:"protected_paths"`
	AllowPaths     []string               `json:"allow_paths"`
	Bands          map[string]policy.Band `json:"bands,omitempty"`
}

func defaults() Config {
	return Config{
		Model:     "jev-1.13.0",
		BaseURL:   "https://api.typesafe.ai",
		FailMode:  FailAsk,
		NoModel:   false,
		TimeoutMs: 1500,
	}
}

// Path returns ~/.config/jevrail/config.json.
func Path() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".config", "jevrail", "config.json"), nil
}

// Load reads the config file if present, falling back to defaults for any
// unset field. It never errors on a missing file.
func Load() (Config, error) {
	cfg := defaults()

	path, err := Path()
	if err != nil {
		return cfg, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			// still apply env override even when file missing
			if key := os.Getenv("TYPESAFE_API_KEY"); key != "" {
				cfg.APIKey = key
			}
			return cfg, nil
		}
		return cfg, err
	}

	// Use a raw struct with *bool for NoModel so we can distinguish
	// "absent" from "explicitly false".
	var raw struct {
		Model          *string               `json:"model"`
		BaseURL        *string               `json:"base_url"`
		APIKey         *string               `json:"api_key"`
		FailMode       *FailMode             `json:"fail_mode"`
		NoModel        *bool                 `json:"no_model"`
		TimeoutMs      *int                  `json:"timeout_ms"`
		ProtectedPaths []string              `json:"protected_paths"`
		AllowPaths     []string              `json:"allow_paths"`
		Bands          map[string]policy.Band `json:"bands"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return cfg, err
	}
	if raw.Model != nil && *raw.Model != "" {
		cfg.Model = *raw.Model
	}
	if raw.BaseURL != nil && *raw.BaseURL != "" {
		cfg.BaseURL = *raw.BaseURL
	}
	if raw.APIKey != nil && *raw.APIKey != "" {
		cfg.APIKey = *raw.APIKey
	}
	if raw.FailMode != nil && *raw.FailMode != "" {
		cfg.FailMode = *raw.FailMode
	}
	if raw.TimeoutMs != nil && *raw.TimeoutMs != 0 {
		cfg.TimeoutMs = *raw.TimeoutMs
	}
	if len(raw.ProtectedPaths) > 0 {
		cfg.ProtectedPaths = raw.ProtectedPaths
	}
	if len(raw.AllowPaths) > 0 {
		cfg.AllowPaths = raw.AllowPaths
	}
	if len(raw.Bands) > 0 {
		if cfg.Bands == nil {
			cfg.Bands = map[string]policy.Band{}
		}
		for k, v := range raw.Bands {
			cfg.Bands[k] = v
		}
	}
	if raw.NoModel != nil {
		cfg.NoModel = *raw.NoModel
	}

	if key := os.Getenv("TYPESAFE_API_KEY"); key != "" {
		cfg.APIKey = key
	}
	return cfg, nil
}

// Timeout returns TimeoutMs as a time.Duration.
func (c Config) Timeout() time.Duration {
	return time.Duration(c.TimeoutMs) * time.Millisecond
}

// EffectiveBands returns policy.DefaultBands overridden by any bands set
// in the config file.
func (c Config) EffectiveBands() map[string]policy.Band {
	out := map[string]policy.Band{}
	for k, v := range policy.DefaultBands {
		out[k] = v
	}
	for k, v := range c.Bands {
		out[k] = v
	}
	return out
}

// Save writes cfg to disk as pretty JSON, creating the parent directory.
func Save(cfg Config) error {
	path, err := Path()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}
