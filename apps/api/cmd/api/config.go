package main

import (
	"os"
	"strings"
	"time"
)

type config struct {
	databaseURL    string
	port           string
	ingestKey      string
	ingestModel    string
	ingestInterval time.Duration
	corsOrigins    []string
}

func loadConfig() config {
	interval, _ := time.ParseDuration(envOr("INGEST_INTERVAL", "24h"))
	if interval <= 0 {
		interval = 24 * time.Hour
	}
	return config{
		databaseURL:    envOr("DATABASE_URL", "postgres://heatmap:heatmap@localhost:5432/heatmap?sslmode=disable"),
		port:           envOr("PORT", "8080"),
		ingestKey:      envOr("INGEST_KEY", ""),
		ingestModel:    envOr("INGEST_MODEL", "opencode/deepseek-v4-flash-free"),
		ingestInterval: interval,
		corsOrigins:    normalizeOrigins(splitCSV(envOr("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"))),
	}
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func splitCSV(value string) []string {
	raw := strings.Split(value, ",")
	out := make([]string, 0, len(raw))
	for _, item := range raw {
		item = strings.TrimSpace(item)
		if item != "" {
			out = append(out, item)
		}
	}
	return out
}

func normalizeOrigins(origins []string) []string {
	out := make([]string, 0, len(origins))
	for _, origin := range origins {
		origin = strings.TrimRight(strings.TrimSpace(origin), "/")
		if origin != "" {
			out = append(out, origin)
		}
	}
	return out
}
