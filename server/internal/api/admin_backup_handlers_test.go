package api

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"aurelia/server/internal/config"
	"aurelia/server/internal/store"
)

// TestBackupExportImportEndToEnd drives the real export + import handlers across
// two deployments with DIFFERENT upload/artifact dirs, verifying the zip round
// trip, file bundling, and storage_path rewrite.
func TestBackupExportImportEndToEnd(t *testing.T) {
	// --- Source deployment ---------------------------------------------------
	srcRoot := t.TempDir()
	srcUploads := filepath.Join(srcRoot, "uploads")
	srcArtifacts := filepath.Join(srcRoot, "artifacts")
	srcDB := openMigrated(t, filepath.Join(srcRoot, "src.db"))
	defer srcDB.Close()

	// A user, a conversation, a message, an uploaded file + a generated artifact.
	mustExec(t, srcDB, `INSERT INTO users(id,email,password_hash,role) VALUES('u1','a@b.c','h','user')`)
	mustExec(t, srcDB, `INSERT INTO conversations(id,user_id,title) VALUES('c1','u1','T')`)
	mustExec(t, srcDB, `INSERT INTO messages(id,conversation_id,role) VALUES('m1','c1','assistant')`)
	upPath := filepath.Join(srcUploads, "u1", "f_test.txt")
	artPath := filepath.Join(srcArtifacts, "m1_img.png")
	writeFile(t, upPath, []byte("hello-upload"))
	writeFile(t, artPath, []byte("PNGDATA"))
	mustExec(t, srcDB, `INSERT INTO files(id,user_id,filename,storage_path) VALUES('file1','u1','f_test.txt',?)`, upPath)
	mustExec(t, srcDB, `INSERT INTO artifacts(id,message_id,filename,storage_path) VALUES('art1','m1','img.png',?)`, artPath)

	srcDeps := Deps{
		DB:     srcDB,
		Config: config.Config{UploadDir: srcUploads, ArtifactDir: srcArtifacts},
		Logger: log.New(io.Discard, "", 0),
	}

	// Export with files=1.
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/admin/backup/export?files=1", nil)
	exportBackupAdmin(srcDeps, rec, req)
	if rec.Code != 200 {
		t.Fatalf("export status = %d, body=%s", rec.Code, rec.Body.String())
	}
	if ct := rec.Header().Get("content-type"); ct != "application/zip" {
		t.Fatalf("export content-type = %q", ct)
	}
	archive := rec.Body.Bytes()
	if len(archive) < 200 {
		t.Fatalf("archive suspiciously small: %d bytes", len(archive))
	}

	// --- Target deployment (different dirs) ----------------------------------
	tgtRoot := t.TempDir()
	tgtUploads := filepath.Join(tgtRoot, "up2")
	tgtArtifacts := filepath.Join(tgtRoot, "art2")
	_ = os.MkdirAll(tgtUploads, 0o755)
	_ = os.MkdirAll(tgtArtifacts, 0o755)
	tgtDB := openMigrated(t, filepath.Join(tgtRoot, "tgt.db"))
	defer tgtDB.Close()
	// Pre-existing junk that import must wipe.
	mustExec(t, tgtDB, `INSERT INTO users(id,email,password_hash,role) VALUES('old','x@y.z','h','user')`)

	tgtDeps := Deps{
		DB:     tgtDB,
		Config: config.Config{UploadDir: tgtUploads, ArtifactDir: tgtArtifacts},
		Logger: log.New(io.Discard, "", 0),
	}

	// Build the multipart import request.
	body, contentType := multipartArchive(t, archive)
	irec := httptest.NewRecorder()
	ireq := httptest.NewRequest("POST", "/api/admin/backup/import", body)
	ireq.Header.Set("content-type", contentType)
	importBackupAdmin(tgtDeps, irec, ireq)
	if irec.Code != 200 {
		t.Fatalf("import status = %d, body=%s", irec.Code, irec.Body.String())
	}
	var res struct {
		OK            bool             `json:"ok"`
		Tables        map[string]int64 `json:"tables"`
		FilesRestored int              `json:"files_restored"`
	}
	if err := json.Unmarshal(irec.Body.Bytes(), &res); err != nil {
		t.Fatalf("decode import response: %v (%s)", err, irec.Body.String())
	}
	if !res.OK || res.Tables["users"] != 1 || res.Tables["messages"] != 1 {
		t.Fatalf("unexpected import result: %+v", res)
	}
	if res.FilesRestored != 2 {
		t.Fatalf("files_restored = %d, want 2", res.FilesRestored)
	}

	// The wiped junk is gone; the imported user is present.
	var userCount int
	mustQuery(t, tgtDB, "SELECT COUNT(*) FROM users").Scan(&userCount)
	if userCount != 1 {
		t.Fatalf("target users = %d, want 1 (junk should be wiped)", userCount)
	}
	var email string
	mustQuery(t, tgtDB, "SELECT email FROM users WHERE id='u1'").Scan(&email)
	if email != "a@b.c" {
		t.Fatalf("imported user email = %q", email)
	}

	// storage_path rewritten to the TARGET dirs, and the bytes exist there.
	var fPath, aPath string
	mustQuery(t, tgtDB, "SELECT storage_path FROM files WHERE id='file1'").Scan(&fPath)
	mustQuery(t, tgtDB, "SELECT storage_path FROM artifacts WHERE id='art1'").Scan(&aPath)
	if !strings.HasPrefix(filepath.Clean(fPath), filepath.Clean(tgtUploads)) {
		t.Fatalf("file storage_path not rewritten to target: %q", fPath)
	}
	if !strings.HasPrefix(filepath.Clean(aPath), filepath.Clean(tgtArtifacts)) {
		t.Fatalf("artifact storage_path not rewritten to target: %q", aPath)
	}
	if b, err := os.ReadFile(fPath); err != nil || string(b) != "hello-upload" {
		t.Fatalf("uploaded file not restored at %q: %v", fPath, err)
	}
	if b, err := os.ReadFile(aPath); err != nil || string(b) != "PNGDATA" {
		t.Fatalf("artifact not restored at %q: %v", aPath, err)
	}
}

// TestBackupImportRequiresConfirm rejects an import without the confirm token.
func TestBackupImportRequiresConfirm(t *testing.T) {
	db := openMigrated(t, filepath.Join(t.TempDir(), "x.db"))
	defer db.Close()
	d := Deps{DB: db, Config: config.Config{UploadDir: t.TempDir(), ArtifactDir: t.TempDir()}, Logger: log.New(io.Discard, "", 0)}

	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	fw, _ := mw.CreateFormFile("file", "b.zip")
	_, _ = fw.Write([]byte("not-a-zip"))
	_ = mw.Close()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/admin/backup/import", &body)
	req.Header.Set("content-type", mw.FormDataContentType())
	importBackupAdmin(d, rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("missing-confirm import status = %d, want 400", rec.Code)
	}
}

// --- helpers ---------------------------------------------------------------

func openMigrated(t *testing.T, path string) *sql.DB {
	t.Helper()
	db, err := store.Open(path)
	if err != nil {
		t.Fatalf("open %s: %v", path, err)
	}
	if err := store.Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func mustExec(t *testing.T, db *sql.DB, q string, args ...any) {
	t.Helper()
	if _, err := db.ExecContext(context.Background(), q, args...); err != nil {
		t.Fatalf("exec %q: %v", q, err)
	}
}

func mustQuery(t *testing.T, db *sql.DB, q string) *sql.Row {
	t.Helper()
	return db.QueryRowContext(context.Background(), q)
}

func writeFile(t *testing.T, path string, data []byte) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

func multipartArchive(t *testing.T, archive []byte) (*bytes.Buffer, string) {
	t.Helper()
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	_ = mw.WriteField("confirm", "REPLACE")
	fw, err := mw.CreateFormFile("file", "backup.zip")
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	if _, err := fw.Write(archive); err != nil {
		t.Fatalf("write archive: %v", err)
	}
	if err := mw.Close(); err != nil {
		t.Fatalf("close mw: %v", err)
	}
	return &body, mw.FormDataContentType()
}
