package llm

import (
	"strings"
	"testing"
)

// TestResponsesWebSearchCitations verifies the hosted web_search citation path:
// inline url_citation annotations AND the web_search_call.action.sources list
// (returned via include) both become citations, deduped by URL, and are emitted
// live + returned for persistence.
func TestResponsesWebSearchCitations(t *testing.T) {
	stream := strings.Join([]string{
		`data: {"type":"response.output_item.added","item":{"id":"ws_1","type":"web_search_call"}}`,
		`data: {"type":"response.output_text.delta","delta":"Here is the news."}`,
		`data: {"type":"response.output_text.annotation.added","annotation":{"type":"url_citation","url":"https://a.com","title":"A"}}`,
		`data: {"type":"response.output_item.done","item":{"id":"ws_1","type":"web_search_call","status":"completed","action":{"sources":[{"url":"https://a.com","title":"A dup"},{"url":"https://b.com","title":"B"}]}}}`,
		`data: [DONE]`,
		``,
	}, "\n\n")

	var emitted int
	onEvent := func(ev SseEvent) {
		if ev.Type == "citation" {
			emitted++
		}
	}
	text, _, _, hosted, citations, _, err := readOpenAIResponsesStream(strings.NewReader(stream), onEvent)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(text, "Here is the news.") {
		t.Errorf("missing answer text: %q", text)
	}
	if len(hosted) != 1 || hosted[0].Name != "web_search" {
		t.Errorf("expected one web_search hosted round, got %+v", hosted)
	}
	if len(citations) != 2 {
		t.Fatalf("expected 2 deduped citations (a.com, b.com), got %d: %+v", len(citations), citations)
	}
	if citations[0].URL != "https://a.com" || citations[1].URL != "https://b.com" {
		t.Errorf("unexpected citation URLs: %+v", citations)
	}
	if citations[0].Index != 1 || citations[1].Index != 2 {
		t.Errorf("citations should be 1-indexed in order: %+v", citations)
	}
	if emitted != 2 {
		t.Errorf("expected 2 live citation events, got %d", emitted)
	}
}
