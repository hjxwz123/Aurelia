package rag

import (
	"strings"
	"testing"
)

func containsTok(ss []string, want string) bool {
	for _, s := range ss {
		if s == want {
			return true
		}
	}
	return false
}

// CJK runs are segmented into overlapping bigrams + embedded digits, so a
// reference buried in a spaceless phrase (案例98) becomes a matchable unit.
func TestTokenizeCJKBigrams(t *testing.T) {
	got := tokenize("案例98及相关知识点")
	for _, want := range []string{"案例", "98", "相关", "知识"} {
		if !containsTok(got, want) {
			t.Fatalf("tokenize CJK missing %q in %v", want, got)
		}
	}
}

// Latin/alphanumeric tokenization must be byte-for-byte unchanged so existing
// (non-CJK) indexes and local embeddings keep matching.
func TestTokenizeLatinUnchanged(t *testing.T) {
	got := tokenize("Hello VAT_2024 world")
	want := []string{"Hello", "VAT_2024", "world"}
	if strings.Join(got, "|") != strings.Join(want, "|") {
		t.Fatalf("Latin tokenize changed: got %v want %v", got, want)
	}
}

// Regression for the reported bug: a 2nd-turn query referencing 案例98 must
// keyword-match the chunk that contains it, even though the query phrasing
// differs from the document — and must outscore an unrelated chunk.
func TestKeywordScoreCJKReference(t *testing.T) {
	terms := tokenize(strings.ToLower("按照模块三的标准，重点讲解案例98及相关知识点"))
	hit := "三、特殊业务核算。案例98：某企业增值税的会计处理及相关知识点说明。"
	miss := "第一章 概述：本课程的学习目标与考核方式。"
	hitScore := keywordScore(terms, hit)
	missScore := keywordScore(terms, miss)
	if hitScore <= 0 {
		t.Fatalf("expected the 案例98 chunk to keyword-match across phrasings, got %v", hitScore)
	}
	if hitScore <= missScore {
		t.Fatalf("案例98 chunk (%v) should outscore an unrelated chunk (%v)", hitScore, missScore)
	}
}
