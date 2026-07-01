package main

import (
	"testing"
	"time"
)

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

func TestLoadConfigIngestDefaultsAndBounds(t *testing.T) {
	t.Setenv("INGEST_INTERVAL", "bad")
	t.Setenv("INGEST_TIMEOUT", "48h")
	t.Setenv("INGEST_FAILURE_THRESHOLD", "0")
	t.Setenv("INGEST_FAILURE_COOLDOWN", "-1m")

	cfg := loadConfig()

	if cfg.ingestInterval != 24*time.Hour {
		t.Fatalf("expected default interval, got %s", cfg.ingestInterval)
	}
	if cfg.ingestTimeout != cfg.ingestInterval {
		t.Fatalf("expected timeout capped to interval, got timeout=%s interval=%s", cfg.ingestTimeout, cfg.ingestInterval)
	}
	if cfg.ingestFailureThreshold != 3 {
		t.Fatalf("expected default failure threshold, got %d", cfg.ingestFailureThreshold)
	}
	if cfg.ingestFailureCooldown != time.Hour {
		t.Fatalf("expected default cooldown, got %s", cfg.ingestFailureCooldown)
	}
}

func TestLoadConfigIngestOverrides(t *testing.T) {
	t.Setenv("INGEST_INTERVAL", "2h")
	t.Setenv("INGEST_TIMEOUT", "30m")
	t.Setenv("INGEST_FAILURE_THRESHOLD", "5")
	t.Setenv("INGEST_FAILURE_COOLDOWN", "90m")

	cfg := loadConfig()

	if cfg.ingestInterval != 2*time.Hour {
		t.Fatalf("expected interval override, got %s", cfg.ingestInterval)
	}
	if cfg.ingestTimeout != 30*time.Minute {
		t.Fatalf("expected timeout override, got %s", cfg.ingestTimeout)
	}
	if cfg.ingestFailureThreshold != 5 {
		t.Fatalf("expected failure threshold override, got %d", cfg.ingestFailureThreshold)
	}
	if cfg.ingestFailureCooldown != 90*time.Minute {
		t.Fatalf("expected cooldown override, got %s", cfg.ingestFailureCooldown)
	}
}
