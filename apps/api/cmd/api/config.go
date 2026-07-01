package main

import (
	"net"
	"os"
	"strconv"
	"strings"
	"time"
)

type config struct {
	databaseURL            string
	port                   string
	ingestKey              string
	ingestModel            string
	ingestInterval         time.Duration
	ingestTimeout          time.Duration
	ingestFailureThreshold int
	ingestFailureCooldown  time.Duration
	corsOrigins            []string
	trustedProxyNetworks   []*net.IPNet
}

func loadConfig() config {
	interval := durationEnvOr("INGEST_INTERVAL", 24*time.Hour)
	timeout := durationEnvOr("INGEST_TIMEOUT", 15*time.Minute)
	if timeout > interval {
		timeout = interval
	}
	cfg := config{
		databaseURL:            envOr("DATABASE_URL", "postgres://heatmap:heatmap@localhost:5432/heatmap?sslmode=disable"),
		port:                   envOr("PORT", "8080"),
		ingestKey:              envOr("INGEST_KEY", ""),
		ingestModel:            envOr("INGEST_MODEL", "opencode/deepseek-v4-flash-free"),
		ingestInterval:         interval,
		ingestTimeout:          timeout,
		ingestFailureThreshold: intEnvOr("INGEST_FAILURE_THRESHOLD", 3),
		ingestFailureCooldown:  durationEnvOr("INGEST_FAILURE_COOLDOWN", time.Hour),
		corsOrigins:            normalizeOrigins(splitCSV(envOr("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"))),
	}
	for _, cidrStr := range splitCSV(envOr("TRUSTED_PROXY_CIDRS", "")) {
		_, cidr, err := net.ParseCIDR(cidrStr)
		if err != nil {
			continue
		}
		cfg.trustedProxyNetworks = append(cfg.trustedProxyNetworks, cidr)
	}
	return cfg
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func durationEnvOr(key string, fallback time.Duration) time.Duration {
	value := envOr(key, "")
	if value == "" {
		return fallback
	}
	duration, err := time.ParseDuration(value)
	if err != nil || duration <= 0 {
		return fallback
	}
	return duration
}

func intEnvOr(key string, fallback int) int {
	value := envOr(key, "")
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
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
