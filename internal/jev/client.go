// Package jev is a minimal client for TypeSafe AI's System One (Jev) API.
//
// ⚠️ The request/response shapes here follow docs.typesafe.ai/api as read
// while building this. Jev is early-access and the schema may have moved —
// verify against the current API reference before relying on this in
// anything that matters, and pin a model version rather than "jev-latest".
package jev

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Question is one typed question sent alongside `state`.
type Question struct {
	Type         string `json:"type"` // "noul" | "choice" | "score"
	Instructions string `json:"instructions"`
	Criteria     any    `json:"criteria,omitempty"`
}

// Request is the full POST body for /v1/systemone.
type Request struct {
	Model     string              `json:"model"`
	State     any                 `json:"state"`
	Questions map[string]Question `json:"questions"`
}

// Answer covers all three question types; only the field matching the
// question's type will be populated.
type Answer struct {
	Type          string          `json:"type"`
	Noul          *float64        `json:"noul,omitempty"`
	Choice        string          `json:"choice,omitempty"`
	Score         *float64        `json:"score,omitempty"`
	Probabilities json.RawMessage `json:"probabilities,omitempty"`
	Confidence    *float64        `json:"confidence,omitempty"`
}

// Response is the full response body.
type Response struct {
	Model   string            `json:"model"`
	Answers map[string]Answer `json:"answers"`
	Usage   struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}

// Client talks to a System One-compatible endpoint. BaseURL is
// configurable because several gateways expose a compatible
// /v1/systemone route in addition to api.typesafe.ai itself.
type Client struct {
	BaseURL string
	APIKey  string
	Model   string
	HTTP    *http.Client
}

func New(baseURL, apiKey, model string, timeout time.Duration) *Client {
	if timeout <= 0 {
		timeout = 1500 * time.Millisecond
	}
	return &Client{
		BaseURL: baseURL,
		APIKey:  apiKey,
		Model:   model,
		HTTP:    &http.Client{Timeout: timeout},
	}
}

// Evaluate sends state + questions in one call and returns the answers.
func (c *Client) Evaluate(ctx context.Context, state any, qs map[string]Question) (*Response, error) {
	if c.APIKey == "" {
		return nil, fmt.Errorf("jev: no API key configured (set TYPESAFE_API_KEY or config.api_key)")
	}
	body, err := json.Marshal(Request{Model: c.Model, State: state, Questions: qs})
	if err != nil {
		return nil, fmt.Errorf("jev: encode request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/v1/systemone", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("jev: build request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("Content-Type", "application/json")

	res, err := c.HTTP.Do(req)
	if err != nil {
		return nil, fmt.Errorf("jev: request failed: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(io.LimitReader(res.Body, 1024))
		return nil, fmt.Errorf("jev: %s: %s", res.Status, string(b))
	}

	var out Response
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("jev: decode response: %w", err)
	}
	return &out, nil
}
