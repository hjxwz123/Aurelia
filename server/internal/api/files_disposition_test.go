package api

import (
	"strings"
	"testing"
)

// Non-ASCII (Chinese) names must round-trip via RFC 5987 `filename*` instead of
// landing as mojibake in the legacy `filename=` parameter.
func TestContentDispositionNonASCII(t *testing.T) {
	h := contentDispositionHeader("attachment", "案例98.pdf")
	if !strings.HasPrefix(h, "attachment; ") {
		t.Fatalf("bad disposition prefix: %q", h)
	}
	if !strings.Contains(h, "filename*=UTF-8''") {
		t.Fatalf("missing RFC 5987 filename*: %q", h)
	}
	if !strings.Contains(h, "%E6%A1%88") { // 案 = E6 A1 88 in UTF-8
		t.Fatalf("CJK not percent-encoded: %q", h)
	}
	if !strings.Contains(h, `filename="`) {
		t.Fatalf("missing ASCII fallback: %q", h)
	}
	// The legacy fallback must not carry raw non-ASCII bytes.
	ascii := h[strings.Index(h, `filename="`)+len(`filename="`):]
	ascii = ascii[:strings.Index(ascii, `"`)]
	for _, r := range ascii {
		if r > 0x7e {
			t.Fatalf("ASCII fallback has non-ASCII rune %q in %q", r, h)
		}
	}
}

// PDFs and plain text become inline (browser preview); office binaries stay
// attachment so a preview pane never silently downloads them.
func TestPreviewableInline(t *testing.T) {
	for _, ct := range []string{"application/pdf", "image/png", "text/plain; charset=utf-8"} {
		if !previewableInline(ct) {
			t.Fatalf("expected inline for %q", ct)
		}
	}
	for _, ct := range []string{
		"application/octet-stream",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"application/vnd.ms-powerpoint",
	} {
		if previewableInline(ct) {
			t.Fatalf("expected attachment for %q", ct)
		}
	}
}
