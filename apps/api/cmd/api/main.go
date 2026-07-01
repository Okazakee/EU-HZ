package main

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/time/rate"
)

type point struct {
	Lng float64 `json:"lng"`
	Lat float64 `json:"lat"`
}

type heatCell struct {
	ID                string  `json:"id"`
	Label             string  `json:"label"`
	Score             float64 `json:"score"`
	IncidentCount     int     `json:"incidentCount"`
	DominantEventType string  `json:"dominantEventType"`
	Polygon           []point `json:"polygon"`
}

type report struct {
	PublicID      string `json:"publicId"`
	Title         string `json:"title"`
	EventType     string `json:"eventType"`
	Status        string `json:"status"`
	OccurredAt    string `json:"occurredAt"`
	LocationLabel string `json:"locationLabel"`
}

type heatResponse struct {
	Cells []heatCell `json:"cells"`
}

type reportsResponse struct {
	Reports    []report `json:"reports"`
	NextCursor string   `json:"nextCursor,omitempty"`
}

type placesResponse struct {
	Places []placeItem `json:"places"`
}

type sourcesResponse struct {
	Sources []sourceRecord `json:"sources"`
}

func main() {
	loadDotEnv()
	cfg := loadConfig()
	mode := "serve"
	if len(os.Args) > 1 {
		mode = os.Args[1]
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	db, err := openStore(ctx, cfg)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.close()

	switch mode {
	case "serve":
		serve(cfg, db)
	case "migrate-up":
		if err := db.migrate(ctx); err != nil {
			log.Fatal(err)
		}
	case "seed":
		if err := db.seed(ctx); err != nil {
			log.Fatal(err)
		}
	case "cleanup":
		if err := db.cleanup(ctx); err != nil {
			log.Fatal(err)
		}
	case "aggregate":
		if err := aggregateHeat(ctx, db); err != nil {
			log.Fatal(err)
		}
	case "ingest-once":
		if err := runIngestOnce(ctx, cfg); err != nil {
			log.Fatal(err)
		}
	case "ingest-loop":
		ingestLoop(ctx, cfg)
	default:
		log.Fatalf("unknown mode: %s", mode)
	}
}

func aggregateHeat(ctx context.Context, db *store) error {
	incidents, err := db.recentIncidents(ctx)
	if err != nil {
		return err
	}
	aggregates := buildHeatAggregates(incidents, time.Now().UTC())
	if err := db.replaceHeatCells(ctx, aggregates); err != nil {
		return err
	}
	log.Printf("aggregate: cells=%d incidents=%d", len(aggregates), len(incidents))
	if err := db.cleanup(ctx); err != nil {
		return err
	}
	log.Printf("cleanup: done")
	return nil
}

// runIngestOnce shells out to `opencode run --command x-ingest`. The opencode
// agent runtime has working web access (webfetch/bash) and loads the x-ingest
// skill, which instructs it to gather, filter, format, and POST to /v1/ingest.
// The Go process never calls an LLM or search engine directly — those are
// blocked from server-side contexts.
func runIngestOnce(ctx context.Context, cfg config) error {
	err, _, _ := runIngestAttempt(ctx, cfg)
	return err
}

func ingestLoop(ctx context.Context, cfg config) {
	consecutiveFailures := 0
	for {
		err, duration, timedOut := runIngestAttempt(ctx, cfg)
		delay := cfg.ingestInterval
		if err != nil {
			consecutiveFailures++
			if timedOut {
				log.Printf("ingest-loop timeout after %s (consecutive_failures=%d)", duration.Round(time.Second), consecutiveFailures)
			} else {
				log.Printf("ingest-loop error after %s: %v (consecutive_failures=%d)", duration.Round(time.Second), err, consecutiveFailures)
			}
			if consecutiveFailures >= cfg.ingestFailureThreshold {
				delay = cfg.ingestFailureCooldown
				log.Printf("ingest-loop cooldown for %s after %d consecutive failures", delay, consecutiveFailures)
			}
		} else {
			if consecutiveFailures > 0 {
				log.Printf("ingest-loop recovered after %d consecutive failures", consecutiveFailures)
			}
			consecutiveFailures = 0
			log.Printf("ingest-loop success in %s; next run in %s", duration.Round(time.Second), delay)
		}
		if err := sleepContext(ctx, delay); err != nil {
			if !errors.Is(err, context.Canceled) {
				log.Printf("ingest-loop sleep interrupted: %v", err)
			}
			return
		}
	}
}

func execIngestCommand(ctx context.Context, cfg config) error {
	cmd := exec.CommandContext(ctx, "opencode", "run", "--model", cfg.ingestModel, "--command", "x-ingest")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(),
		"INGEST_KEY="+cfg.ingestKey,
		"INGEST_API_URL=http://localhost:"+cfg.port,
	)
	log.Printf("ingest: launching opencode run --model %s --command x-ingest", cfg.ingestModel)
	return cmd.Run()
}

func runIngestAttempt(ctx context.Context, cfg config) (error, time.Duration, bool) {
	runCtx, cancel := context.WithTimeout(ctx, cfg.ingestTimeout)
	defer cancel()

	start := time.Now()
	err := execIngestCommand(runCtx, cfg)
	duration := time.Since(start)
	timedOut := errors.Is(runCtx.Err(), context.DeadlineExceeded)
	if timedOut {
		return context.DeadlineExceeded, duration, true
	}
	return err, duration, false
}

func sleepContext(ctx context.Context, delay time.Duration) error {
	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

func serve(cfg config, db *store) {
	trustedProxyNetworks = cfg.trustedProxyNetworks
	mux := http.NewServeMux()
	mux.Handle("/health", withSecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})))
	mux.Handle("/v1/heat", withCORS(cfg, rateLimit("heat", 0.5, 12, withSecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		params := readFilters(r.URL.Query())
		cells, err := db.heat(r.Context(), params)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, heatResponse{
			Cells: cells,
		})
	})))))
	mux.Handle("/v1/reports", withCORS(cfg, rateLimit("reports", 0.5, 12, withSecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		params := readFilters(r.URL.Query())
		reports, nextCursor, err := db.reports(r.Context(), params)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, reportsResponse{
			Reports:    reports,
			NextCursor: nextCursor,
		})
	})))))
	mux.Handle("/v1/places", withCORS(cfg, rateLimit("places", 0.2, 4, withSecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		query := strings.TrimSpace(r.URL.Query().Get("q"))
		if len(query) > 80 {
			query = query[:80]
		}
		writeJSON(w, http.StatusOK, placesResponse{Places: searchPlaces(query)})
	})))))
	mux.Handle("/v1/sources", withCORS(cfg, rateLimit("sources", 0.2, 4, withSecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sources, err := db.sources(r.Context())
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, sourcesResponse{Sources: sources})
	})))))
	mux.Handle("/v1/incidents/", withCORS(cfg, rateLimit("incidents", 0.33, 8, withSecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		publicID := strings.TrimPrefix(r.URL.Path, "/v1/incidents/")
		if publicID == "" {
			http.NotFound(w, r)
			return
		}
		if !uuidLike.MatchString(publicID) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid incident id"})
			return
		}
		detail, err := db.incident(r.Context(), publicID)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, detail)
	})))))
	mux.Handle("/v1/ingest/filter", withIngestKey(cfg, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		req, err := decodeIngestRequest(r.Body)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		items := dedupeIngestItems(req.Items)
		validated := make([]ingestItem, 0, len(items))
		for _, item := range items {
			if validateIngestItem(item) {
				validated = append(validated, item)
			}
		}
		writeJSON(w, http.StatusOK, ingestFilterResponse{
			Items:   validated,
			Removed: len(req.Items) - len(validated),
		})
	})))
	mux.Handle("/v1/ingest", withIngestKey(cfg, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		req, err := decodeIngestRequest(r.Body)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}

		items := dedupeIngestItems(req.Items)
		if len(items) > maxItemsPerBatch {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "too many items"})
			return
		}
		result := ingestResponse{Errors: []string{}}
		result.Skipped = len(req.Items) - len(items)
		for _, item := range items {
			if !validateIngestItem(item) {
				result.Rejected++
				continue
			}
			source, err := db.sourceByHandle(r.Context(), strings.TrimPrefix(item.XHandle, "@"))
			if err != nil {
				result.Skipped++
				result.Errors = append(result.Errors, "unknown handle: "+item.XHandle)
				continue
			}
			incident, ok := normalizeIngestItem(item)
			if !ok {
				result.Rejected++
				continue
			}
			rawReportID, err := db.upsertRawReport(r.Context(), source, rawSourceItem{
				ExternalID:   item.XPostID,
				URL:          item.XPostURL,
				Title:        item.Title,
				Text:         item.Summary,
				PublishedAt:  incident.OccurredAt,
				LocationText: item.Location,
				ContentHash:  hashText(source.Slug + "|" + item.XPostID + "|" + item.Title),
			})
			if err != nil {
				result.Errors = append(result.Errors, err.Error())
				result.Rejected++
				continue
			}
			if err := db.upsertIncidentForRawReport(r.Context(), rawReportID, *incident); err != nil {
				result.Errors = append(result.Errors, err.Error())
				result.Rejected++
				continue
			}
			result.Accepted++
		}
		if result.Accepted > 0 {
			if err := aggregateHeat(r.Context(), db); err != nil {
				result.Errors = append(result.Errors, "aggregate: "+err.Error())
			}
		}
		if len(result.Errors) == 0 {
			result.Errors = nil
		}
		writeJSON(w, http.StatusOK, result)
	})))

	addr := ":" + cfg.port
	log.Printf("api listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func decodeIngestRequest(body io.Reader) (ingestRequest, error) {
	raw, err := io.ReadAll(io.LimitReader(body, maxIngestBodyBytes))
	if err != nil {
		return ingestRequest{}, err
	}
	if len(raw) >= maxIngestBodyBytes {
		return ingestRequest{}, errors.New("request body too large")
	}
	var req ingestRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		return ingestRequest{}, errors.New("invalid json")
	}
	return req, nil
}

func withIngestKey(cfg config, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if cfg.ingestKey == "" {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "ingest not configured"})
			return
		}
		if subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Ingest-Key")), []byte(cfg.ingestKey)) != 1 {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("encode error: %v", err)
	}
}

func writeError(w http.ResponseWriter, err error) {
	if errors.Is(err, context.Canceled) {
		writeJSON(w, http.StatusRequestTimeout, map[string]string{"error": "request cancelled"})
		return
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request"})
		return
	}
	if errors.Is(err, pgx.ErrNoRows) {
		http.NotFound(w, nil)
		return
	}
	writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
}

func withCORS(cfg config, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := strings.TrimRight(strings.TrimSpace(r.Header.Get("Origin")), "/")
		if origin != "" {
			if !originAllowed(cfg.corsOrigins, origin) {
				writeJSON(w, http.StatusForbidden, map[string]string{"error": "origin not allowed"})
				return
			}
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.Header().Set("Access-Control-Max-Age", "600")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func originAllowed(allowed []string, origin string) bool {
	for _, candidate := range allowed {
		if origin == candidate {
			return true
		}
	}
	return false
}

type limiterEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type rateLimitConfig struct {
	requestsPerSecond float64
	burst             int
	windowSeconds     int
}

var (
	limiterMu    sync.Mutex
	limiterStore = map[string]*limiterEntry{}
)

const maxIngestBodyBytes = 1 << 20

var trustedProxyNetworks []*net.IPNet

func rateLimit(bucket string, requestsPerSecond float64, burst int, next http.Handler) http.Handler {
	cfg := rateLimitConfig{
		requestsPerSecond: requestsPerSecond,
		burst:             burst,
		windowSeconds:     maxInt(60, int(float64(burst)/requestsPerSecond)),
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := clientIP(r)
		key := bucket + ":" + ip
		limiterMu.Lock()
		entry, ok := limiterStore[key]
		if !ok {
			entry = &limiterEntry{
				limiter:  rate.NewLimiter(rate.Limit(requestsPerSecond), burst),
				lastSeen: time.Now(),
			}
			limiterStore[key] = entry
		}
		entry.lastSeen = time.Now()
		for storedKey, storedEntry := range limiterStore {
			if time.Since(storedEntry.lastSeen) > 10*time.Minute {
				delete(limiterStore, storedKey)
			}
		}
		limiter := entry.limiter
		limiterMu.Unlock()

		setRateLimitHeaders(w, limiter, cfg)
		if !limiter.Allow() {
			w.Header().Set("Retry-After", strconv.Itoa(cfg.windowSeconds))
			writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "rate limit exceeded"})
			return
		}
		setRateLimitHeaders(w, limiter, cfg)
		next.ServeHTTP(w, r)
	})
}

func setRateLimitHeaders(w http.ResponseWriter, limiter *rate.Limiter, cfg rateLimitConfig) {
	remaining := int(limiter.Tokens())
	if remaining < 0 {
		remaining = 0
	}
	w.Header().Set("RateLimit-Limit", strconv.Itoa(cfg.burst))
	w.Header().Set("RateLimit-Remaining", strconv.Itoa(remaining))
	w.Header().Set("RateLimit-Reset", strconv.Itoa(cfg.windowSeconds))
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

var uuidLike = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func withSecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		next.ServeHTTP(w, r)
	})
}

func clientIP(r *http.Request) string {
	remoteHost, _, _ := net.SplitHostPort(r.RemoteAddr)
	for _, cidr := range trustedProxyNetworks {
		if cidr.Contains(net.ParseIP(remoteHost)) {
			if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
				return strings.TrimSpace(strings.Split(forwarded, ",")[0])
			}
			break
		}
	}
	if remoteHost != "" {
		return remoteHost
	}
	return r.RemoteAddr
}

type bbox struct {
	west  float64
	south float64
	east  float64
	north float64
	valid bool
}

func parseBBox(value string) bbox {
	parts := strings.Split(value, ",")
	if len(parts) != 4 {
		return bbox{west: -15, south: 33, east: 35, north: 64, valid: true}
	}
	coords := [4]float64{}
	for i, part := range parts {
		number, err := strconv.ParseFloat(strings.TrimSpace(part), 64)
		if err != nil {
			return bbox{west: -15, south: 33, east: 35, north: 64, valid: true}
		}
		coords[i] = number
	}
	return bbox{west: coords[0], south: coords[1], east: coords[2], north: coords[3], valid: true}
}
