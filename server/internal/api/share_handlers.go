package api

import (
	"encoding/json"
	"net/http"

	"aurelia/server/internal/store"
)

// Public read-only conversation sharing (§ sharing). The owner creates a share
// (snapshotting the current active path), can revoke it, and the snapshot is
// served to anyone with the token — no auth, no cost, no private fields.

// publicShareMessage is the cost-stripped, identity-free message shape frozen
// into a share snapshot and returned to public viewers.
type publicShareMessage struct {
	Role      string          `json:"role"`
	Blocks    json.RawMessage `json:"blocks"`
	Citations json.RawMessage `json:"citations"`
	CreatedAt int64           `json:"created_at"`
}

// shareInfo is the owner-facing share descriptor (no snapshot payload).
type shareInfo struct {
	ID        string `json:"id"`
	CreatedAt int64  `json:"created_at"`
}

// createShareHandler snapshots the conversation's active path and returns the
// public token. Re-sharing replaces any previous snapshot.
func createShareHandler(d Deps, w http.ResponseWriter, r *http.Request) {
	u := authUser(r)
	id := pathParam(r, "id")
	conv, err := store.GetConversation(r.Context(), d.DB, id, u.ID)
	if err != nil {
		writeError(w, 404, errNotFound)
		return
	}
	msgs, err := store.ListMessages(r.Context(), d.DB, conv.ID, conv.ActiveLeafID)
	if err != nil {
		writeError(w, 500, err)
		return
	}
	snap := make([]publicShareMessage, 0, len(msgs))
	for _, m := range msgs {
		if m.Role != "user" && m.Role != "assistant" {
			continue
		}
		blocks := m.Blocks
		if len(blocks) == 0 {
			blocks = json.RawMessage("[]")
		}
		cites := m.Citations
		if len(cites) == 0 {
			cites = json.RawMessage("[]")
		}
		snap = append(snap, publicShareMessage{Role: m.Role, Blocks: blocks, Citations: cites, CreatedAt: m.CreatedAt})
	}
	payload, _ := json.Marshal(snap)
	share, err := store.CreateShare(r.Context(), d.DB, u.ID, conv.ID, conv.Title, payload)
	if err != nil {
		writeError(w, 500, err)
		return
	}
	writeJSON(w, 201, shareInfo{ID: share.ID, CreatedAt: share.CreatedAt})
}

// getShareHandler reports the current share for a conversation (or null).
func getShareHandler(d Deps, w http.ResponseWriter, r *http.Request) {
	u := authUser(r)
	id := pathParam(r, "id")
	share, err := store.GetShareByConversation(r.Context(), d.DB, id, u.ID)
	if err != nil {
		// Not shared — return an explicit null so the client can distinguish
		// "no share" from a transport error.
		writeJSON(w, 200, map[string]any{"share": nil})
		return
	}
	writeJSON(w, 200, map[string]any{"share": shareInfo{ID: share.ID, CreatedAt: share.CreatedAt}})
}

// deleteShareHandler revokes a conversation's public share.
func deleteShareHandler(d Deps, w http.ResponseWriter, r *http.Request) {
	u := authUser(r)
	id := pathParam(r, "id")
	if err := store.DeleteShareByConversation(r.Context(), d.DB, id, u.ID); err != nil {
		writeError(w, 500, err)
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

// publicSharedHandler serves a share snapshot to anyone with the token. No auth.
func publicSharedHandler(d Deps, w http.ResponseWriter, r *http.Request) {
	token := pathParam(r, "token")
	share, err := store.GetShareByToken(r.Context(), d.DB, token)
	if err != nil {
		writeError(w, 404, errNotFound)
		return
	}
	writeJSON(w, 200, map[string]any{
		"title":      share.Title,
		"messages":   share.Snapshot,
		"created_at": share.CreatedAt,
	})
}
