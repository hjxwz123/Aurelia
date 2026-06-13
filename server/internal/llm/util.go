package llm

import (
	"strings"
	"unicode/utf8"
)

// truncate caps a string at n bytes, backing up to a UTF-8 rune boundary so a
// multibyte character (e.g. CJK) is never split mid-rune. n is a byte budget.
func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	cut := n - 1
	for cut > 0 && !utf8.RuneStart(s[cut]) {
		cut--
	}
	return s[:cut] + "…"
}

// estimateTokens is a cheap, provider-agnostic token estimate. ASCII text is
// ~4/3 tokens per word; CJK characters count ~1 token each. Used for context
// budgeting (compaction) and usage heuristics — not for billing precision.
func estimateTokens(s string) int {
	if s == "" {
		return 0
	}
	ascii := []rune{}
	cjk := 0
	for _, r := range s {
		switch {
		case r >= 0x4E00 && r <= 0x9FFF, // CJK Unified Ideographs
			r >= 0x3400 && r <= 0x4DBF, // Extension A
			r >= 0xF900 && r <= 0xFAFF, // Compatibility Ideographs
			r >= 0x3040 && r <= 0x309F, // Hiragana
			r >= 0x30A0 && r <= 0x30FF, // Katakana
			r >= 0xAC00 && r <= 0xD7AF, // Hangul
			r >= 0xFF00 && r <= 0xFFEF: // Halfwidth/Fullwidth
			cjk++
		default:
			ascii = append(ascii, r)
		}
	}
	w := len(strings.Fields(string(ascii)))
	tot := cjk + w*4/3
	if tot == 0 {
		return 0
	}
	return tot + 1
}
