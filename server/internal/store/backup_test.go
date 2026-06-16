package store

import (
	"bytes"
	"context"
	"database/sql"
	"path/filepath"
	"testing"
)

// TestBackupRoundTrip exercises the export → wipe → restore cycle on SQLite,
// covering the three things most likely to break: a binary BLOB column
// (chunks.embedding), a self-referential FK (messages.parent_id), and int/float
// fidelity (token counts vs cost).
func TestBackupRoundTrip(t *testing.T) {
	ctx := context.Background()
	dbPath := filepath.Join(t.TempDir(), "rt.db")
	db, err := Open(dbPath)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	if err := Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	embedding := []byte{0x00, 0x01, 0xff, 0x7f, 0x80, 0xde, 0xad, 0xbe, 0xef}
	seed := []struct {
		q    string
		args []any
	}{
		{`INSERT INTO settings(key,value) VALUES('default_model_id','"m_x"')`, nil},
		{`INSERT INTO users(id,email,password_hash,name,role) VALUES('u1','a@b.c','h','A','user')`, nil},
		{`INSERT INTO conversations(id,user_id,title) VALUES('c1','u1','T')`, nil},
		{`INSERT INTO messages(id,conversation_id,parent_id,role,input_tokens,cost) VALUES('m1','c1',NULL,'user',1234567,0)`, nil},
		{`INSERT INTO messages(id,conversation_id,parent_id,role,input_tokens,cost) VALUES('m2','c1','m1','assistant',42,0.0125)`, nil},
		{`INSERT INTO documents(id,conversation_id,filename,mime_type,size_bytes,status) VALUES('d1','c1','f.txt','text/plain',10,'ready')`, nil},
		{`INSERT INTO chunks(id,document_id,seq,content,embedding,embedding_model) VALUES('ch1','d1',0,'hello',?,'e')`, []any{embedding}},
	}
	for _, s := range seed {
		if _, err := db.ExecContext(ctx, s.q, s.args...); err != nil {
			t.Fatalf("seed %q: %v", s.q, err)
		}
	}

	// Export every table to an in-memory buffer.
	dumps := make(map[string]*bytes.Buffer)
	for _, tbl := range BackupTableOrder() {
		var buf bytes.Buffer
		if _, err := ExportTable(ctx, db, tbl, &buf); err != nil {
			t.Fatalf("export %s: %v", tbl, err)
		}
		dumps[tbl] = &buf
	}

	// Wipe + restore with FK enforcement off (mirrors the import handler).
	if _, err := db.ExecContext(ctx, "PRAGMA foreign_keys=OFF"); err != nil {
		t.Fatalf("fk off: %v", err)
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	if err := WipeAll(ctx, tx); err != nil {
		t.Fatalf("wipe: %v", err)
	}
	for _, tbl := range BackupTableOrder() {
		if _, err := RestoreTable(ctx, tx, tbl, bytes.NewReader(dumps[tbl].Bytes())); err != nil {
			t.Fatalf("restore %s: %v", tbl, err)
		}
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("commit: %v", err)
	}
	if _, err := db.ExecContext(ctx, "PRAGMA foreign_keys=ON"); err != nil {
		t.Fatalf("fk on: %v", err)
	}

	// FK integrity: the self-referential parent_id must still resolve.
	var fkBad int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM pragma_foreign_key_check").Scan(&fkBad); err != nil {
		t.Fatalf("fk check: %v", err)
	}
	if fkBad != 0 {
		t.Fatalf("foreign_key_check reported %d violations after restore", fkBad)
	}

	// Binary fidelity.
	var got []byte
	if err := db.QueryRowContext(ctx, "SELECT embedding FROM chunks WHERE id='ch1'").Scan(&got); err != nil {
		t.Fatalf("read embedding: %v", err)
	}
	if !bytes.Equal(got, embedding) {
		t.Fatalf("embedding mismatch: got %x want %x", got, embedding)
	}

	// Int vs float fidelity.
	var tokens int64
	var cost float64
	if err := db.QueryRowContext(ctx, "SELECT input_tokens, cost FROM messages WHERE id='m2'").Scan(&tokens, &cost); err != nil {
		t.Fatalf("read msg: %v", err)
	}
	if tokens != 42 || cost != 0.0125 {
		t.Fatalf("numeric mismatch: tokens=%d cost=%v", tokens, cost)
	}

	// Self-reference preserved.
	var parent sql.NullString
	if err := db.QueryRowContext(ctx, "SELECT parent_id FROM messages WHERE id='m2'").Scan(&parent); err != nil {
		t.Fatalf("read parent: %v", err)
	}
	if !parent.Valid || parent.String != "m1" {
		t.Fatalf("parent_id not preserved: %+v", parent)
	}

	// Row counts.
	for tbl, want := range map[string]int{"users": 1, "conversations": 1, "messages": 2, "chunks": 1, "documents": 1} {
		var n int
		if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM "+tbl).Scan(&n); err != nil {
			t.Fatalf("count %s: %v", tbl, err)
		}
		if n != want {
			t.Fatalf("count %s = %d, want %d", tbl, n, want)
		}
	}
}
