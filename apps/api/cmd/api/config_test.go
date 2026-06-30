package main

import "testing"

func TestOriginHelpers(t *testing.T) {
	origins := normalizeOrigins([]string{" https://eu-hz.vercel.app/ ", "", "https://heatzones.example.com"})

	if len(origins) != 2 {
		t.Fatalf("expected 2 normalized origins, got %d", len(origins))
	}
	if origins[0] != "https://eu-hz.vercel.app" {
		t.Fatalf("unexpected normalized origin %q", origins[0])
	}
	if !originAllowed(origins, "https://heatzones.example.com") {
		t.Fatal("expected exact origin to be allowed")
	}
	if originAllowed(origins, "https://other.vercel.app") {
		t.Fatal("did not expect unrelated origin to be allowed")
	}
}
