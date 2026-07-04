package api

import "testing"

// TestImagesBypassAllowlist locks in the product rule: common image formats are
// always uploadable, even when the admin's extension allowlist omits them (the
// allowlist gates document/code/data formats only).
func TestImagesBypassAllowlist(t *testing.T) {
	// Admin configured a list that deliberately excludes jpg/jpeg (and every
	// other image) — only documents.
	exts := parseExtensionList("pdf, docx, txt")
	applyExtAliases(exts)
	applyImageFamily(exts)

	// Every common image extension must be allowed regardless.
	for _, e := range []string{"jpg", "jpeg", "png", "gif", "webp", "bmp", "heic", "tiff"} {
		if !exts[e] {
			t.Errorf("image extension %q should always be allowed, but was rejected", e)
		}
	}
	// The admin's document choices survive.
	for _, e := range []string{"pdf", "docx", "txt"} {
		if !exts[e] {
			t.Errorf("configured extension %q should remain allowed", e)
		}
	}
	// A genuinely-blocked format stays blocked (allowlist still works for non-images).
	if exts["exe"] {
		t.Error("exe must not be allowed")
	}
}

// TestValidateUploadAcceptsJpgWithoutJpgInList proves the end-to-end fix: an
// allowlist without any jpg spelling still accepts photo.jpg.
func TestValidateUploadAcceptsJpgWithoutJpgInList(t *testing.T) {
	exts := parseExtensionList("pdf")
	applyExtAliases(exts)
	applyImageFamily(exts)
	p := uploadPolicy{AllowedExt: exts}
	if _, ext, err := p.validateUpload("vacation-photo.JPG"); err != nil || ext != "jpg" {
		t.Fatalf("photo.JPG should validate to ext=jpg with no error; got ext=%q err=%v", ext, err)
	}
}
