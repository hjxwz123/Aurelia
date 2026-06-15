package api

import "errors"

var (
	errAuthRequired = errors.New("auth required")
	// Stable machine code — the client matches this exact string to show the
	// "your account has been suspended" notice + sign the user out.
	errAccountBlocked = errors.New("account_suspended")
	errSessionExpired = errors.New("session expired, please log in again")
	errAdminOnly      = errors.New("admin only")
	errInvalidInput   = errors.New("invalid input")
	errNotFound       = errors.New("not found")

	errUploadRateLimited = errors.New("upload rate limit exceeded — try again shortly")
)
