package auth

import "testing"

// RFC 4226 Appendix D test vectors: secret "12345678901234567890" (ASCII).
func TestHOTPVectors(t *testing.T) {
	key := []byte("12345678901234567890")
	want := []string{"755224", "287082", "359152", "969429", "338314", "254676", "287922", "162583", "399871", "520489"}
	for i, w := range want {
		if got := hotp(key, uint64(i)); got != w {
			t.Errorf("hotp counter %d = %s, want %s", i, got, w)
		}
	}
}

func TestVerifyTotpRoundTrip(t *testing.T) {
	secret, err := GenerateTotpSecret()
	if err != nil {
		t.Fatal(err)
	}
	// A freshly generated secret should reject a clearly wrong code and accept a
	// code computed for the current step.
	if VerifyTotp(secret, "000000") && VerifyTotp(secret, "111111") && VerifyTotp(secret, "222222") {
		t.Error("verify accepted three arbitrary codes — not discriminating")
	}
	key, err := totpEnc.DecodeString(secret)
	if err != nil {
		t.Fatal(err)
	}
	// Build the current code the same way the verifier does and confirm it passes.
	// (We reuse hotp at the current step via VerifyTotp's own window.)
	now := currentCounter()
	if got := hotp(key, now); !VerifyTotp(secret, got) {
		t.Errorf("verify rejected a valid current code %s", got)
	}
}
