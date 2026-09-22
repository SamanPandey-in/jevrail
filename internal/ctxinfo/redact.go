package ctxinfo

import "regexp"

var secretPatterns = []*regexp.Regexp{
	// Generic key=value with secret-like key names.
	regexp.MustCompile(`(?i)(api[_-]?key|secret|password|passwd|token|aws_secret_access_key|github_token)\s*=\s*['"]?[^'"\s]+['"]?`),
	// Bearer tokens, AWS keys, etc.
	regexp.MustCompile(`(?i)bearer\s+[A-Za-z0-9_\-\.=]+`),
	regexp.MustCompile(`AKIA[0-9A-Z]{16}`),
	regexp.MustCompile(`ghp_[A-Za-z0-9]{20,}`),
	regexp.MustCompile(`ghs_[A-Za-z0-9]{20,}`),
	// Connection strings with password.
	regexp.MustCompile(`(?i)(postgres|postgresql|mysql|mongodb)(\+srv)?://[^\s]+`),
}

// RedactString replaces secret-like substrings with [REDACTED].
func RedactString(s string) string {
	for _, re := range secretPatterns {
		s = re.ReplaceAllString(s, "[REDACTED]")
	}
	return s
}
