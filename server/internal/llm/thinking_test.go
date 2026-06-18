package llm

import (
	"strings"
	"testing"
)

// TestThinkingCapabilityHeuristics locks the model families we default
// chain-of-thought on for the native Claude/Gemini providers.
func TestThinkingCapabilityHeuristics(t *testing.T) {
	anthropicYes := []string{"claude-3-7-sonnet-20250219", "claude-sonnet-4-20250514", "claude-opus-4-1", "claude-haiku-4-5", "claude-4"}
	anthropicNo := []string{"claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"}
	for _, id := range anthropicYes {
		if !anthropicSupportsThinking(id) {
			t.Errorf("anthropicSupportsThinking(%q) = false, want true", id)
		}
	}
	for _, id := range anthropicNo {
		if anthropicSupportsThinking(id) {
			t.Errorf("anthropicSupportsThinking(%q) = true, want false", id)
		}
	}

	geminiYes := []string{"gemini-2.5-flash", "gemini-2.5-pro", "gemini-3-pro"}
	geminiNo := []string{"gemini-2.0-flash", "gemini-1.5-pro"}
	for _, id := range geminiYes {
		if !geminiSupportsThinking(id) {
			t.Errorf("geminiSupportsThinking(%q) = false, want true", id)
		}
	}
	for _, id := range geminiNo {
		if geminiSupportsThinking(id) {
			t.Errorf("geminiSupportsThinking(%q) = true, want false", id)
		}
	}
}

// TestReadAnthropicStreamThinking verifies the official Claude thinking stream
// (content_block_delta → thinking_delta) is surfaced as thinking_delta SSE
// events and captured (with signature) for replay.
func TestReadAnthropicStreamThinking(t *testing.T) {
	stream := strings.Join([]string{
		`data: {"type":"message_start","message":{"usage":{"input_tokens":10}}}`,
		`data: {"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":""}}`,
		`data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Let me "}}`,
		`data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"work it out."}}`,
		`data: {"type":"content_block_delta","index":0,"delta":{"type":"signature_delta","signature":"SIG123"}}`,
		`data: {"type":"content_block_stop","index":0}`,
		`data: {"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}`,
		`data: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Answer."}}`,
		`data: {"type":"content_block_stop","index":1}`,
		`data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":5}}`,
		`data: {"type":"message_stop"}`,
		"",
	}, "\n")

	var thinkingDeltas string
	_, _, text, thinkingBlocks, _, _, err := readAnthropicStream(strings.NewReader(stream), func(ev SseEvent) {
		if ev.Type == "thinking_delta" {
			thinkingDeltas += ev.Text
		}
	})
	if err != nil {
		t.Fatalf("readAnthropicStream: %v", err)
	}
	if thinkingDeltas != "Let me work it out." {
		t.Errorf("thinking_delta events = %q, want %q", thinkingDeltas, "Let me work it out.")
	}
	if text != "Answer." {
		t.Errorf("text = %q, want %q", text, "Answer.")
	}
	if len(thinkingBlocks) != 1 || thinkingBlocks[0].Signature != "SIG123" || thinkingBlocks[0].Text != "Let me work it out." {
		t.Errorf("thinkingBlocks = %+v, want one block with signature SIG123", thinkingBlocks)
	}
}

// TestReadGeminiStreamThinking verifies the official Gemini thought parts
// ({text, thought:true}) are surfaced as thinking_delta and kept out of the
// visible answer.
func TestReadGeminiStreamThinking(t *testing.T) {
	stream := strings.Join([]string{
		`data: {"candidates":[{"content":{"role":"model","parts":[{"text":"Pondering...","thought":true}]}}]}`,
		`data: {"candidates":[{"content":{"role":"model","parts":[{"text":"Final answer."}]}}],"usageMetadata":{"promptTokenCount":7,"candidatesTokenCount":3}}`,
		"",
	}, "\n")

	var thinkingDeltas, textDeltas string
	text, thinking, _, _, _, err := readGeminiStream(strings.NewReader(stream), func(ev SseEvent) {
		switch ev.Type {
		case "thinking_delta":
			thinkingDeltas += ev.Text
		case "text_delta":
			textDeltas += ev.Text
		}
	})
	if err != nil {
		t.Fatalf("readGeminiStream: %v", err)
	}
	if thinking != "Pondering..." || thinkingDeltas != "Pondering..." {
		t.Errorf("thinking = %q / deltas = %q, want %q", thinking, thinkingDeltas, "Pondering...")
	}
	if text != "Final answer." || textDeltas != "Final answer." {
		t.Errorf("text = %q / deltas = %q, want %q", text, textDeltas, "Final answer.")
	}
}
