// Package shellparse does a lightweight, dependency-free split of a shell
// command line into its constituent simple commands.
//
// It is NOT a full POSIX shell parser. It is good enough to:
//   - split on top-level `;`, `&&`, `||`, `|`, `&` (respecting quotes)
//   - tokenize each simple command into argv-style words (respecting quotes,
//     stripping unescaped '#' comments)
//   - pull out `$(...)` and “ `...` “ command substitutions as their own
//     sub-commands, so they get evaluated too
//   - recognize `bash -c "..."` / `sh -c "..."` and recurse into the string
//
// Anything it can't confidently parse is returned as a single opaque
// command with Unparsed=true, so callers can treat it as higher risk rather
// than silently ignoring it.
package shellparse

import "strings"

// Command is one simple command extracted from a larger command line.
type Command struct {
	Raw      string   // the command text as it appeared
	Argv     []string // best-effort tokenization
	Unparsed bool     // true if Argv could not be confidently produced
}

// Parse splits a full command line (as an agent would hand to `bash -c`)
// into its simple commands, recursing into command substitutions and
// `bash -c` / `sh -c` payloads.
func Parse(line string) []Command {
	var out []Command
	parseInto(line, &out, 0)
	return out
}

const maxDepth = 6

func parseInto(line string, out *[]Command, depth int) {
	if depth > maxDepth {
		*out = append(*out, Command{Raw: line, Unparsed: true})
		return
	}
	line = stripComment(line)
	for _, piece := range splitTopLevel(line) {
		piece = strings.TrimSpace(piece)
		if piece == "" {
			continue
		}
		// Pull out command substitutions found anywhere in this piece and
		// recurse into them; they run regardless of the outer command.
		for _, sub := range extractSubstitutions(piece) {
			parseInto(sub, out, depth+1)
		}

		argv, ok := tokenize(piece)
		if !ok {
			*out = append(*out, Command{Raw: piece, Unparsed: true})
			continue
		}
		*out = append(*out, Command{Raw: piece, Argv: argv})

		if script, ok := shDashCPayload(argv); ok {
			parseInto(script, out, depth+1)
		}
	}
}

// stripComment removes a trailing unquoted `#...` comment.
func stripComment(s string) string {
	inSingle, inDouble := false, false
	for i, r := range s {
		switch r {
		case '\'':
			if !inDouble {
				inSingle = !inSingle
			}
		case '"':
			if !inSingle {
				inDouble = !inDouble
			}
		case '#':
			if !inSingle && !inDouble && (i == 0 || s[i-1] == ' ' || s[i-1] == '\t') {
				return s[:i]
			}
		}
	}
	return s
}

// splitTopLevel splits on ; && || | & that are not inside quotes or
// parens/backticks, and not part of a substitution.
func splitTopLevel(s string) []string {
	var parts []string
	var cur strings.Builder
	inSingle, inDouble := false, false
	parenDepth := 0
	inBacktick := false

	flush := func() {
		parts = append(parts, cur.String())
		cur.Reset()
	}

	runes := []rune(s)
	for i := 0; i < len(runes); i++ {
		r := runes[i]
		switch {
		case r == '\'' && !inDouble && !inBacktick:
			inSingle = !inSingle
			cur.WriteRune(r)
		case r == '"' && !inSingle && !inBacktick:
			inDouble = !inDouble
			cur.WriteRune(r)
		case r == '`' && !inSingle && !inDouble:
			inBacktick = !inBacktick
			cur.WriteRune(r)
		case r == '\\' && i+1 < len(runes) && !inSingle:
			cur.WriteRune(r)
			cur.WriteRune(runes[i+1])
			i++
		case r == '(' && !inSingle && !inDouble && !inBacktick:
			parenDepth++
			cur.WriteRune(r)
		case r == ')' && !inSingle && !inDouble && !inBacktick:
			if parenDepth > 0 {
				parenDepth--
			}
			cur.WriteRune(r)
		case inSingle || inDouble || inBacktick || parenDepth > 0:
			cur.WriteRune(r)
		case r == ';':
			flush()
		case r == '&' && i+1 < len(runes) && runes[i+1] == '&':
			flush()
			i++
		case r == '|' && i+1 < len(runes) && runes[i+1] == '|':
			flush()
			i++
		case r == '|':
			flush()
		case r == '&':
			flush()
		default:
			cur.WriteRune(r)
		}
	}
	flush()
	return parts
}

// extractSubstitutions finds $(...) and `...` spans and returns their inner
// text as separate command strings.
func extractSubstitutions(s string) []string {
	var subs []string
	runes := []rune(s)
	for i := 0; i < len(runes); i++ {
		if runes[i] == '$' && i+1 < len(runes) && runes[i+1] == '(' {
			depth := 1
			j := i + 2
			for ; j < len(runes) && depth > 0; j++ {
				switch runes[j] {
				case '(':
					depth++
				case ')':
					depth--
				}
			}
			if depth == 0 {
				subs = append(subs, string(runes[i+2:j-1]))
				i = j - 1
			}
		} else if runes[i] == '`' {
			j := i + 1
			for ; j < len(runes) && runes[j] != '`'; j++ {
			}
			if j < len(runes) {
				subs = append(subs, string(runes[i+1:j]))
				i = j
			}
		}
	}
	return subs
}

// tokenize splits a single simple command into argv-style words, honoring
// quotes. Returns ok=false if quoting looks unbalanced (safer to treat as
// unparsed than to guess).
func tokenize(s string) ([]string, bool) {
	var words []string
	var cur strings.Builder
	haveWord := false
	inSingle, inDouble := false, false

	runes := []rune(s)
	for i := 0; i < len(runes); i++ {
		r := runes[i]
		switch {
		case r == '\\' && i+1 < len(runes) && !inSingle:
			cur.WriteRune(runes[i+1])
			haveWord = true
			i++
		case r == '\'' && !inDouble:
			inSingle = !inSingle
			haveWord = true
		case r == '"' && !inSingle:
			inDouble = !inDouble
			haveWord = true
		case (r == ' ' || r == '\t' || r == '\n') && !inSingle && !inDouble:
			if haveWord {
				words = append(words, cur.String())
				cur.Reset()
				haveWord = false
			}
		default:
			cur.WriteRune(r)
			haveWord = true
		}
	}
	if inSingle || inDouble {
		return nil, false
	}
	if haveWord {
		words = append(words, cur.String())
	}
	return words, true
}

// shDashCPayload returns the script string if argv looks like
// `bash -c '...'`, `sh -c "..."`, `zsh -c ...`, etc.
func shDashCPayload(argv []string) (string, bool) {
	if len(argv) < 3 {
		return "", false
	}
	shell := lastPathElem(argv[0])
	switch shell {
	case "bash", "sh", "zsh", "dash", "ksh":
	default:
		return "", false
	}
	for i := 1; i < len(argv)-1; i++ {
		if argv[i] == "-c" {
			return argv[i+1], true
		}
	}
	return "", false
}

func lastPathElem(p string) string {
	if idx := strings.LastIndexByte(p, '/'); idx >= 0 {
		return p[idx+1:]
	}
	return p
}
