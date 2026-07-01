package main

import (
	"context"
	"strings"
	"time"
)

func (s *store) ping(ctx context.Context) error {
	return s.pool.Ping(ctx)
}

func (s *store) recordIngestRun(ctx context.Context, model string, result ingestResponse, duration time.Duration, timedOut bool) error {
	status := "success"
	if timedOut {
		status = "timeout"
	} else if len(result.Errors) > 0 || result.Rejected > 0 {
		status = "error"
	}

	_, err := s.pool.Exec(ctx, `
		INSERT INTO ingest_runs (
			model, status, accepted, rejected, skipped, timed_out, error_message, duration_ms, started_at, finished_at
		)
		VALUES ($1,$2,$3,$4,$5,$6,NULLIF($7, ''),$8,now() - ($9::text || ' milliseconds')::interval,now())
	`, model, status, result.Accepted, result.Rejected, result.Skipped, timedOut, strings.Join(result.Errors, "; "), duration.Milliseconds(), duration.Milliseconds())
	return err
}
