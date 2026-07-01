package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log"
	"log/slog"
	"net/http"
	"os"
	"runtime/debug"
	"strconv"
	"strings"
	"time"
)

var appLog = slog.Default()

type contextKey string

const requestIDContextKey contextKey = "request_id"

const (
	cachePublicHot      = "public, max-age=60, stale-while-revalidate=300"
	cachePublicWarm     = "public, max-age=300, stale-while-revalidate=900"
	cachePublicLong     = "public, max-age=3600, stale-while-revalidate=86400"
	cachePublicIncident = "public, max-age=600, stale-while-revalidate=1800"
)

func initLogger(cfg config) {
	level := slog.LevelInfo
	switch strings.ToLower(strings.TrimSpace(cfg.logLevel)) {
	case "debug":
		level = slog.LevelDebug
	case "warn", "warning":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	}

	appLog = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level}))
	slog.SetDefault(appLog)
	log.SetFlags(0)
}

func withOperationalMiddleware(cfg config, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		startedAt := time.Now()
		requestID := requestIDFromHeader(r.Header.Get("X-Request-ID"))
		if requestID == "" {
			requestID = newRequestID()
		}

		ctx := context.WithValue(r.Context(), requestIDContextKey, requestID)
		var cancel context.CancelFunc
		if cfg.requestTimeout > 0 {
			ctx, cancel = context.WithTimeout(ctx, cfg.requestTimeout)
		} else {
			cancel = func() {}
		}
		defer cancel()

		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		recorder.Header().Set("X-Request-ID", requestID)
		r = r.WithContext(ctx)

		defer func() {
			if recovered := recover(); recovered != nil {
				appLog.Error("request panic",
					"request_id", requestID,
					"method", r.Method,
					"path", r.URL.Path,
					"panic", recovered,
					"stack", string(debug.Stack()),
				)
				if !recorder.wroteHeader {
					writeJSON(recorder, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
				}
			}

			duration := time.Since(startedAt)
			level := slog.LevelInfo
			if recorder.status >= 500 {
				level = slog.LevelError
			} else if recorder.status >= 400 {
				level = slog.LevelWarn
			}
			if errors.Is(ctx.Err(), context.DeadlineExceeded) {
				level = slog.LevelWarn
			}

			appLog.Log(context.Background(), level, "http request",
				"request_id", requestID,
				"method", r.Method,
				"path", r.URL.Path,
				"query", r.URL.RawQuery,
				"status", recorder.status,
				"duration_ms", duration.Milliseconds(),
				"client_ip", clientIP(r),
				"user_agent", r.UserAgent(),
				"timed_out", errors.Is(ctx.Err(), context.DeadlineExceeded),
			)
		}()

		next.ServeHTTP(recorder, r)
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
}

func (w *statusRecorder) WriteHeader(status int) {
	if w.wroteHeader {
		return
	}
	w.status = status
	w.wroteHeader = true
	w.ResponseWriter.WriteHeader(status)
}

func (w *statusRecorder) Write(body []byte) (int, error) {
	if !w.wroteHeader {
		w.WriteHeader(http.StatusOK)
	}
	return w.ResponseWriter.Write(body)
}

func withCacheControl(value string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet && value != "" {
			w.Header().Set("Cache-Control", value)
		}
		next.ServeHTTP(w, r)
	})
}

func withMethods(method string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != method {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func requestIDFromHeader(value string) string {
	value = strings.TrimSpace(value)
	if value == "" || len(value) > 80 || strings.ContainsAny(value, "\r\n") {
		return ""
	}
	return value
}

func newRequestID() string {
	var bytes [12]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return strconv.FormatInt(time.Now().UnixNano(), 36)
	}
	return hex.EncodeToString(bytes[:])
}

func requestIDFromContext(ctx context.Context) string {
	requestID, _ := ctx.Value(requestIDContextKey).(string)
	return requestID
}
