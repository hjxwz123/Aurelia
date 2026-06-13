package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"net/url"
	"strings"
	"time"
)

// TOTP (RFC 6238) for optional two-factor login. Self-contained — SHA-1, 6
// digits, 30-second step, which is what Google Authenticator / Authy / 1Password
// and friends default to. No external dependency.

const (
	totpDigits = 6
	totpPeriod = 30 // seconds
)

var totpEnc = base32.StdEncoding.WithPadding(base32.NoPadding)

// GenerateTotpSecret returns a fresh base32-encoded secret (160 bits of
// entropy, the RFC-recommended size for SHA-1).
func GenerateTotpSecret() (string, error) {
	buf := make([]byte, 20)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return totpEnc.EncodeToString(buf), nil
}

// TotpURI builds the otpauth:// provisioning URI an authenticator app imports
// (via QR or manual entry). issuer/account label the entry in the app.
func TotpURI(secret, issuer, account string) string {
	label := url.PathEscape(issuer + ":" + account)
	q := url.Values{}
	q.Set("secret", secret)
	q.Set("issuer", issuer)
	q.Set("algorithm", "SHA1")
	q.Set("digits", fmt.Sprintf("%d", totpDigits))
	q.Set("period", fmt.Sprintf("%d", totpPeriod))
	return "otpauth://totp/" + label + "?" + q.Encode()
}

// VerifyTotp reports whether code is valid for secret at the current time,
// tolerating ±1 step of clock skew. Codes are compared after normalising
// (trim spaces, zero-pad) so "123 456" and "012345" behave as expected.
func VerifyTotp(secret, code string) bool {
	secret = strings.TrimSpace(strings.ToUpper(strings.ReplaceAll(secret, " ", "")))
	code = strings.ReplaceAll(strings.TrimSpace(code), " ", "")
	if secret == "" || len(code) != totpDigits {
		return false
	}
	key, err := totpEnc.DecodeString(secret)
	if err != nil {
		return false
	}
	counter := int64(currentCounter())
	for _, delta := range []int64{0, -1, 1} {
		if hotp(key, uint64(counter+delta)) == code {
			return true
		}
	}
	return false
}

// currentCounter is the TOTP time step for "now".
func currentCounter() uint64 {
	return uint64(time.Now().Unix() / totpPeriod)
}

// hotp computes the RFC 4226 HMAC-SHA1 one-time code for a counter.
func hotp(key []byte, counter uint64) string {
	var buf [8]byte
	binary.BigEndian.PutUint64(buf[:], counter)
	mac := hmac.New(sha1.New, key)
	mac.Write(buf[:])
	sum := mac.Sum(nil)
	offset := sum[len(sum)-1] & 0x0f
	value := (uint32(sum[offset]&0x7f) << 24) |
		(uint32(sum[offset+1]) << 16) |
		(uint32(sum[offset+2]) << 8) |
		uint32(sum[offset+3])
	return fmt.Sprintf("%0*d", totpDigits, value%pow10(totpDigits))
}

func pow10(n int) uint32 {
	r := uint32(1)
	for i := 0; i < n; i++ {
		r *= 10
	}
	return r
}
