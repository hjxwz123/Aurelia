package store

import (
	"context"
	"database/sql"
	"errors"
	"path/filepath"
	"strings"
	"testing"
)

// TestDeleteRound covers the branch-safe semantics: deleting a round removes the
// user turn + ALL its answers, splices the continuation onto the round's parent,
// and leaves earlier turns, later turns, and sibling branches intact.
func TestDeleteRound(t *testing.T) {
	ctx := context.Background()
	db, err := Open(filepath.Join(t.TempDir(), "dr.db"))
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	if err := Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	exec(t, db, `INSERT INTO users(id,email,password_hash,role) VALUES('u1','a@b.c','h','user')`)
	exec(t, db, `INSERT INTO conversations(id,user_id,title) VALUES('c1','u1','T')`)

	// Linear thread U1→A1→U2→A2→U3→A3 with monotonic created_at.
	rows := []struct{ id, parent, role string }{
		{"U1", "", "user"}, {"A1", "U1", "assistant"},
		{"U2", "A1", "user"}, {"A2", "U2", "assistant"},
		{"U3", "A2", "user"}, {"A3", "U3", "assistant"},
	}
	for i, r := range rows {
		insMsg(t, db, r.id, r.parent, r.role, 1000+int64(i))
	}
	exec(t, db, `UPDATE conversations SET active_leaf_id='A3' WHERE id='c1'`)

	// Delete the MIDDLE round via its answer A2 → removes U2+A2, re-parents U3
	// onto A1 (U2's parent). Active leaf A3 still exists → unchanged.
	leaf, err := DeleteRound(ctx, db, "c1", "u1", "A2")
	if err != nil {
		t.Fatalf("DeleteRound A2: %v", err)
	}
	assertGone(t, db, "U2")
	assertGone(t, db, "A2")
	assertParent(t, db, "U3", "A1")
	assertParent(t, db, "U1", "")
	assertParent(t, db, "A1", "U1")
	if leaf != "A3" {
		t.Fatalf("leaf should stay A3, got %q", leaf)
	}
	if got := join(idsOf(listMsgs(t, db, ""))); got != "U1,A1,U3,A3" {
		t.Fatalf("active path = %s, want U1,A1,U3,A3", got)
	}

	// Branch-safety: U3 gets a 2nd answer A3b (regeneration) + a continuation U4
	// under A3. Deleting the round (click U3) removes U3+A3+A3b; U4 re-parents
	// onto A1; earlier turns survive.
	insMsg(t, db, "A3b", "U3", "assistant", 2000)
	insMsg(t, db, "U4", "A3", "user", 2001)
	exec(t, db, `UPDATE conversations SET active_leaf_id='U4' WHERE id='c1'`)
	if _, err := DeleteRound(ctx, db, "c1", "u1", "U3"); err != nil {
		t.Fatalf("DeleteRound U3: %v", err)
	}
	assertGone(t, db, "U3")
	assertGone(t, db, "A3")
	assertGone(t, db, "A3b")
	assertParent(t, db, "U4", "A1")
	assertParent(t, db, "A1", "U1")

	// Wrong owner → not found, no mutation.
	if _, err := DeleteRound(ctx, db, "c1", "intruder", "U1"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("wrong owner: want ErrNotFound, got %v", err)
	}

	// Delete the ROOT round (U1) → U1+A1 go; U4 (continuation) becomes a root.
	if _, err := DeleteRound(ctx, db, "c1", "u1", "U1"); err != nil {
		t.Fatalf("DeleteRound U1: %v", err)
	}
	assertGone(t, db, "U1")
	assertGone(t, db, "A1")
	assertParent(t, db, "U4", "") // re-anchored to root
}

// --- helpers ---------------------------------------------------------------

func exec(t *testing.T, db *sql.DB, q string, args ...any) {
	t.Helper()
	if _, err := db.ExecContext(context.Background(), q, args...); err != nil {
		t.Fatalf("exec %q: %v", q, err)
	}
}

func insMsg(t *testing.T, db *sql.DB, id, parent, role string, ts int64) {
	t.Helper()
	var p any
	if parent != "" {
		p = parent
	}
	exec(t, db, `INSERT INTO messages(id,conversation_id,parent_id,role,created_at) VALUES(?,?,?,?,?)`,
		id, "c1", p, role, ts)
}

func assertGone(t *testing.T, db *sql.DB, id string) {
	t.Helper()
	var x string
	err := db.QueryRowContext(context.Background(), `SELECT id FROM messages WHERE id=?`, id).Scan(&x)
	if !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("message %s should be deleted (err=%v)", id, err)
	}
}

func assertParent(t *testing.T, db *sql.DB, id, wantParent string) {
	t.Helper()
	var got string
	err := db.QueryRowContext(context.Background(), `SELECT COALESCE(parent_id,'') FROM messages WHERE id=?`, id).Scan(&got)
	if err != nil {
		t.Fatalf("read parent of %s: %v", id, err)
	}
	if got != wantParent {
		t.Fatalf("parent of %s = %q, want %q", id, got, wantParent)
	}
}

func listMsgs(t *testing.T, db *sql.DB, leaf string) []Message {
	t.Helper()
	m, err := ListMessages(context.Background(), db, "c1", leaf)
	if err != nil {
		t.Fatalf("ListMessages: %v", err)
	}
	return m
}

func idsOf(msgs []Message) []string {
	out := make([]string, len(msgs))
	for i, m := range msgs {
		out[i] = m.ID
	}
	return out
}

func join(ss []string) string { return strings.Join(ss, ",") }
