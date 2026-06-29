package llm

import (
	"strings"
	"testing"
)

// TestComposeSystemPromptIdentity locks in §identity: the assistant identifies as
// the model's admin-configured display name, never the hardcoded product name.
func TestComposeSystemPromptIdentity(t *testing.T) {
	s := composeSystemPrompt(systemPromptOpts{ModelLabel: "GPT 5.5"})
	if !strings.Contains(s, "You are GPT 5.5") {
		t.Errorf("identity should be the model label; prompt = %q", s)
	}
	if strings.Contains(s, "Aurelia") {
		t.Error("system prompt must not contain the hardcoded product name")
	}

	// A custom model system prompt is layered ON TOP of the built-in identity.
	s2 := composeSystemPrompt(systemPromptOpts{ModelLabel: "GPT 5.5", ModelSystem: "Be terse."})
	if !strings.Contains(s2, "You are GPT 5.5") || !strings.Contains(s2, "Be terse.") {
		t.Errorf("identity + custom prompt should both appear; got %q", s2)
	}

	// No label → generic fallback, still no product name.
	s3 := composeSystemPrompt(systemPromptOpts{})
	if !strings.Contains(s3, "an AI assistant") || strings.Contains(s3, "Aurelia") {
		t.Errorf("empty label should fall back generically; got %q", s3)
	}
}
