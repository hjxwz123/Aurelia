package api

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"
	"time"

	"aurelia/server/internal/auth"
	"aurelia/server/internal/store"
)

// Two-factor (TOTP) login (§ 2FA). Setup hands the user a secret; enable proves
// possession with a code; once enabled, password login returns a short-lived
// ticket instead of a session, and the code must be supplied to finish.

const twofaIssuer = "Aurelia"

// twofaSetupHandler generates a fresh (not yet enabled) secret and returns the
// provisioning URI for the user's authenticator app.
func twofaSetupHandler(d Deps, w http.ResponseWriter, r *http.Request) {
	u := authUser(r)
	if u.TotpEnabled {
		writeError(w, 400, errors.New("two-factor is already enabled"))
		return
	}
	secret, err := auth.GenerateTotpSecret()
	if err != nil {
		writeError(w, 500, err)
		return
	}
	if err := store.SetUserTotp(r.Context(), d.DB, u.ID, secret, false); err != nil {
		writeError(w, 500, err)
		return
	}
	writeJSON(w, 200, map[string]string{
		"secret":      secret,
		"otpauth_url": auth.TotpURI(secret, twofaIssuer, u.Email),
	})
}

type twofaCodeReq struct {
	Code string `json:"code"`
}

// twofaEnableHandler turns 2FA on after verifying a code against the pending
// secret created by setup.
func twofaEnableHandler(d Deps, w http.ResponseWriter, r *http.Request) {
	u := authUser(r)
	var req twofaCodeReq
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, 400, errInvalidInput)
		return
	}
	if u.TotpSecret == "" {
		writeError(w, 400, errors.New("start setup first"))
		return
	}
	if !auth.VerifyTotp(u.TotpSecret, req.Code) {
		writeError(w, 400, errors.New("invalid code"))
		return
	}
	if err := store.SetUserTotp(r.Context(), d.DB, u.ID, u.TotpSecret, true); err != nil {
		writeError(w, 500, err)
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

// twofaDisableHandler turns 2FA off after verifying a current code.
func twofaDisableHandler(d Deps, w http.ResponseWriter, r *http.Request) {
	u := authUser(r)
	var req twofaCodeReq
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, 400, errInvalidInput)
		return
	}
	if !u.TotpEnabled {
		writeError(w, 400, errors.New("two-factor is not enabled"))
		return
	}
	if !auth.VerifyTotp(u.TotpSecret, req.Code) {
		writeError(w, 400, errors.New("invalid code"))
		return
	}
	if err := store.DisableUserTotp(r.Context(), d.DB, u.ID); err != nil {
		writeError(w, 500, err)
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

// adminDisableTwofaHandler lets an admin reset a user's 2FA — the recovery path
// for a member who lost their authenticator device.
func adminDisableTwofaHandler(d Deps, w http.ResponseWriter, r *http.Request) {
	id := pathParam(r, "id")
	if err := store.DisableUserTotp(r.Context(), d.DB, id); err != nil {
		writeError(w, 500, err)
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

type login2faReq struct {
	Ticket string `json:"ticket"`
	Code   string `json:"code"`
}

// login2faHandler completes a 2FA-gated login: it exchanges the ticket from the
// password step plus a valid code for a real session.
func login2faHandler(d Deps, w http.ResponseWriter, r *http.Request) {
	var req login2faReq
	if err := decodeJSON(r, &req); err != nil || req.Ticket == "" {
		writeError(w, 400, errInvalidInput)
		return
	}
	uid, ok := d.Cache.Get("2fa:" + req.Ticket)
	if !ok {
		writeError(w, 401, errors.New("login session expired, please sign in again"))
		return
	}
	user, err := store.FindUserByID(r.Context(), d.DB, uid)
	if err != nil || user.Status != "active" {
		writeError(w, 401, errors.New("invalid login session"))
		return
	}
	if !auth.VerifyTotp(user.TotpSecret, req.Code) {
		writeError(w, 401, errors.New("invalid code"))
		return
	}
	d.Cache.Delete("2fa:" + req.Ticket)
	finaliseSession(d, w, user)
}

// issueTwofaTicket mints a short-lived ticket that stands in for a verified
// password until the user supplies their 2FA code.
func issueTwofaTicket(d Deps, userID string) string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return ""
	}
	ticket := hex.EncodeToString(buf)
	d.Cache.Set("2fa:"+ticket, userID, 5*time.Minute)
	return ticket
}
