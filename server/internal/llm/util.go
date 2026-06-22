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
// ~4/3 tokens per word; CJK characters count ~1 token each; other non-ASCII runes
// (emoji, Cyrillic/Greek/Arabic/Thai, CJK Extension B+) count ~0.75 token each so
// a whitespace-free run can't collapse to ~1 word (strings.Fields would otherwise
// estimate 50 emoji as 2 tokens vs a real ~50-150). Used for context budgeting
// (compaction) and usage heuristics — not for billing precision.
func estimateTokens(s string) int {
	if s == "" {
		return 0
	}
	ascii := []rune{}
	cjk := 0   // CJK / no-space ideographic: ~1 token/char
	other := 0 // emoji + other non-ASCII scripts: counted per-rune, not word-glued
	for _, r := range s {
		switch {
		case r < 0x80:
			ascii = append(ascii, r)
		case isCJKRune(r):
			cjk++
		default:
			other++
		}
	}
	w := len(strings.Fields(string(ascii)))
	tot := cjk + w*4/3 + other*3/4
	if tot == 0 {
		return 0
	}
	return tot + 1
}

// isCJKRune reports whether r is a CJK / no-space ideographic character that
// should count ~1 token. Includes CJK Symbols & Punctuation (、。「」) and the
// supplementary ideographic planes (Extension B+) the original list omitted.
func isCJKRune(r rune) bool {
	switch {
	case r >= 0x4E00 && r <= 0x9FFF, // CJK Unified Ideographs
		r >= 0x3400 && r <= 0x4DBF,   // Extension A
		r >= 0x3000 && r <= 0x303F,   // CJK Symbols & Punctuation
		r >= 0xF900 && r <= 0xFAFF,   // Compatibility Ideographs
		r >= 0x3040 && r <= 0x309F,   // Hiragana
		r >= 0x30A0 && r <= 0x30FF,   // Katakana
		r >= 0xAC00 && r <= 0xD7AF,   // Hangul
		r >= 0xFF00 && r <= 0xFFEF,   // Halfwidth/Fullwidth
		r >= 0x20000 && r <= 0x2FA1F: // Extension B–F + Compatibility Supplement
		return true
	}
	return false
}
