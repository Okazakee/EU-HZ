package main

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"
)

func serveHardened(cfg config, db *store) {
	trustedProxyNetworks = cfg.trustedProxyNetworks
	mux := http.NewServeMux()

	mux.Handle("/health", withSecurityHeaders(http.HandlerFunc(handleHealth)))
	mux.Handle("/healthz", withSecurityHeaders(http.HandlerFunc(handleHealth)))
	mux.Handle("/readyz", withSecurityHeaders(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handleReady(w, r, db)
	})))

	mux.Handle("/v1/heat", withPublicGET(cfg, "heat", 0.5, 12, cachePublicHot, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		params := readFilters(r.URL.Query())
		cells, err := db.heat(r.Context(), params)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, heatResponse{Cells: cells})
	})))

	mux.Handle("/v1/reports", withPublicGET(cfg, "reports", 0.5, 12, cachePublicHot, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		params := readFilters(r.URL.Query())
		reports, nextCursor, err := db.reports(r.Context(), params)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, reportsResponse{Reports: reports, NextCursor: nextCursor})
	})))

	mux.Handle("/v1/places", withPublicGET(cfg, "places", 0.2, 4, cachePublicLong, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		query := strings.TrimSpace(r.URL.Query().Get("q"))
		if len(query) > 80 {
			query = query[:80]
		}
		writeJSON(w, http.StatusOK, placesResponse{Places: searchPlaces(query)})
	})))

	mux.Handle("/v1/sources", withPublicGET(cfg, "sources", 0.2, 4, cachePublicWarm, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sources, err := db.sources(r.Context())
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, sourcesResponse{Sources: sources})
	})))

	mux.Handle("/v1/incidents/", withPublicGET(cfg, "incidents", 0.33, 8, cachePublicIncident, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
	})))

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
		writeJSON(w, http.StatusOK, ingestFilterResponse{Items: validated, Removed: len(req.Items) - len(validated)})
	})))

	mux.Handle("/v1/ingest", withIngestKey(cfg, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handleIngest(w, r, cfg, db)
	})))

	addr := ":" + cfg.port
	appLog.Info("api listening", "addr", addr, "env", cfg.appEnv)
	log.Fatal(http.ListenAndServe(addr, withOperationalMiddleware(cfg, mux)))
}

func withPublicGET(cfg config, bucket string, requestsPerSecond float64, burst int, cacheControl string, next http.Handler) http.Handler {
	return withCORS(cfg, rateLimit(bucket, requestsPerSecond, burst, withMethods(http.MethodGet, withCacheControl(cacheControl, withSecurityHeaders(next)))))
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func handleReady(w http.ResponseWriter, r *http.Request, db *store) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := db.ping(ctx); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

func handleIngest(w http.ResponseWriter, r *http.Request, cfg config, db *store) {
	startedAt := time.Now()
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
	if err := db.recordIngestRun(r.Context(), cfg.ingestModel, result, time.Since(startedAt), false); err != nil {
		appLog.Error("ingest run record failed", "request_id", requestIDFromContext(r.Context()), "error", err)
	}
	appLog.Info("ingest request completed",
		"request_id", requestIDFromContext(r.Context()),
		"accepted", result.Accepted,
		"rejected", result.Rejected,
		"skipped", result.Skipped,
		"errors", len(result.Errors),
		"duration_ms", time.Since(startedAt).Milliseconds(),
	)
	if len(result.Errors) == 0 {
		result.Errors = nil
	}
	writeJSON(w, http.StatusOK, result)
}
