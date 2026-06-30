package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type store struct {
	pool *pgxpool.Pool
}

type incidentDetail struct {
	PublicID   string         `json:"publicId"`
	Title      string         `json:"title"`
	Summary    string         `json:"summary"`
	EventType  string         `json:"eventType"`
	Confidence float64        `json:"confidence"`
	Status     string         `json:"status"`
	OccurredAt string         `json:"occurredAt"`
	Location   detailLocation `json:"location"`
	Evidence   []evidenceItem `json:"evidence"`
}

type placeItem struct {
	Key         string  `json:"key"`
	Label       string  `json:"label"`
	Kind        string  `json:"kind"`
	City        string  `json:"city"`
	CountryCode string  `json:"countryCode"`
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
	Zoom        float64 `json:"zoom"`
	West        float64 `json:"west,omitempty"`
	South       float64 `json:"south,omitempty"`
	East        float64 `json:"east,omitempty"`
	North       float64 `json:"north,omitempty"`
}

type detailLocation struct {
	Label     string  `json:"label"`
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	Precision string  `json:"precision"`
}

type evidenceItem struct {
	SourceName  string `json:"sourceName"`
	Title       string `json:"title"`
	URL         string `json:"url"`
	PublishedAt string `json:"publishedAt"`
}

func openStore(ctx context.Context, cfg config) (*store, error) {
	pool, err := pgxpool.New(ctx, cfg.databaseURL)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &store{pool: pool}, nil
}

func (s *store) close() {
	s.pool.Close()
}

func (s *store) migrate(ctx context.Context) error {
	return applySQLDir(ctx, s.pool, migrationDir())
}

func (s *store) seed(ctx context.Context) error {
	return applySQLDir(ctx, s.pool, seedDir())
}

func (s *store) cleanup(ctx context.Context) error {
	cutoff := time.Now().UTC().Add(-5 * 365 * 24 * time.Hour)
	queries := []string{
		`DELETE FROM incident_evidence WHERE incident_id IN (SELECT id FROM incidents WHERE occurred_at < $1)`,
		`DELETE FROM raw_reports WHERE published_at < $1`,
		`DELETE FROM incidents WHERE occurred_at < $1`,
		`DELETE FROM heat_cells WHERE updated_at < $1`,
	}
	for _, query := range queries {
		if _, err := s.pool.Exec(ctx, query, cutoff); err != nil {
			return err
		}
	}
	return nil
}

func (s *store) sourceByHandle(ctx context.Context, handle string) (sourceRecord, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, slug, name, COALESCE(x_handle, ''), COALESCE(country_code, '')
		FROM sources
		WHERE x_handle = $1 AND enabled = true
	`, handle)

	var source sourceRecord
	err := row.Scan(
		&source.ID,
		&source.Slug,
		&source.Name,
		&source.XHandle,
		&source.CountryCode,
	)
	return source, err
}

func (s *store) sources(ctx context.Context) ([]sourceRecord, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, slug, name, COALESCE(x_handle, ''), COALESCE(country_code, '')
		FROM sources
		WHERE enabled = true AND x_handle IS NOT NULL AND x_handle <> ''
		ORDER BY country_code, slug
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []sourceRecord
	for rows.Next() {
		var src sourceRecord
		if err := rows.Scan(&src.ID, &src.Slug, &src.Name, &src.XHandle, &src.CountryCode); err != nil {
			return nil, err
		}
		out = append(out, src)
	}
	return out, rows.Err()
}

func (s *store) upsertRawReport(ctx context.Context, source sourceRecord, item rawSourceItem) (int64, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO raw_reports (source_id, external_id, raw_url, raw_title, raw_text, published_at, fetched_at, content_hash, location_text)
		VALUES ($1,$2,$3,$4,$5,$6,now(),$7,$8)
		ON CONFLICT (source_id, content_hash) DO UPDATE
		SET raw_url = EXCLUDED.raw_url,
		    raw_title = EXCLUDED.raw_title,
		    raw_text = EXCLUDED.raw_text,
		    published_at = EXCLUDED.published_at,
		    location_text = EXCLUDED.location_text,
		    fetched_at = now()
		RETURNING id
	`, source.ID, item.ExternalID, normalizeURL(item.URL), item.Title, item.Text, item.PublishedAt, item.ContentHash, item.LocationText)

	var rawReportID int64
	return rawReportID, row.Scan(&rawReportID)
}

func (s *store) upsertIncidentForRawReport(ctx context.Context, rawReportID int64, incident normalizedIncident) error {
	row := s.pool.QueryRow(ctx, `
		SELECT i.id
		FROM incident_evidence ie
		JOIN incidents i ON i.id = ie.incident_id
		WHERE ie.raw_report_id = $1
	`, rawReportID)

	var incidentID int64
	err := row.Scan(&incidentID)
	switch {
	case err == nil:
		_, err = s.pool.Exec(ctx, `
			UPDATE incidents
			SET title = $2,
			    summary = $3,
			    event_type = $4,
			    confidence = $5,
			    status = $6,
			    occurred_at = $7,
			    location_label = $8,
			    geo_precision = $9,
			    lat = $10,
			    lng = $11,
			    country_code = $12,
			    city = $13,
			    updated_at = now()
			WHERE id = $1
		`, incidentID, incident.Title, incident.Summary, incident.EventType, incident.Confidence, incident.Status, incident.OccurredAt, incident.LocationLabel, incident.GeoPrecision, incident.Lat, incident.Lng, incident.CountryCode, incident.City)
		return err
	case err != pgx.ErrNoRows:
		return err
	}

	row = s.pool.QueryRow(ctx, `
		INSERT INTO incidents (title, summary, event_type, confidence, status, occurred_at, location_label, geo_precision, lat, lng, country_code, city, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
		RETURNING id
	`, incident.Title, incident.Summary, incident.EventType, incident.Confidence, incident.Status, incident.OccurredAt, incident.LocationLabel, incident.GeoPrecision, incident.Lat, incident.Lng, incident.CountryCode, incident.City)
	if err := row.Scan(&incidentID); err != nil {
		return err
	}

	_, err = s.pool.Exec(ctx, `
		INSERT INTO incident_evidence (incident_id, raw_report_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, incidentID, rawReportID)
	return err
}

func (s *store) recentIncidents(ctx context.Context) ([]normalizedIncident, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT title, summary, event_type, confidence, status, occurred_at, location_label, geo_precision, lat, lng, country_code, city
		FROM incidents
		WHERE status <> 'rejected'
		  AND occurred_at >= now() - interval '6 months'
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []normalizedIncident
	for rows.Next() {
		var incident normalizedIncident
		if err := rows.Scan(
			&incident.Title,
			&incident.Summary,
			&incident.EventType,
			&incident.Confidence,
			&incident.Status,
			&incident.OccurredAt,
			&incident.LocationLabel,
			&incident.GeoPrecision,
			&incident.Lat,
			&incident.Lng,
			&incident.CountryCode,
			&incident.City,
		); err != nil {
			return nil, err
		}
		out = append(out, incident)
	}
	return out, rows.Err()
}

func (s *store) replaceHeatCells(ctx context.Context, aggregates map[string]aggregateCell) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM heat_cells`); err != nil {
		return err
	}

	for _, key := range orderedGeoKeys(aggregates) {
		cell := aggregates[key]
		polygonBytes, err := json.Marshal(cell.Polygon)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO heat_cells (
				cell_key, label, score, incident_count, dominant_event_type, polygon, centroid_lng, centroid_lat, west, south, east, north, updated_at
			)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
		`, key, cell.Label, cell.Score, cell.Count, cell.DominantEventType, polygonBytes, cell.CentroidLng, cell.CentroidLat, cell.West, cell.South, cell.East, cell.North); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func applySQLDir(ctx context.Context, pool *pgxpool.Pool, dir string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			names = append(names, entry.Name())
		}
	}
	slices.Sort(names)
	for _, name := range names {
		body, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			return err
		}
		if _, err := pool.Exec(ctx, string(body)); err != nil {
			return fmt.Errorf("%s: %w", name, err)
		}
	}
	return nil
}

func migrationDir() string {
	return filepath.Clean(filepath.Join(projectRoot(), "db", "migrations"))
}

func seedDir() string {
	return filepath.Clean(filepath.Join(projectRoot(), "db", "seeds"))
}

func projectRoot() string {
	wd, _ := os.Getwd()
	return filepath.Clean(filepath.Join(wd, "..", ".."))
}

func (s *store) heat(ctx context.Context, params queryFilters) ([]heatCell, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT cell_key, label, score, incident_count, dominant_event_type, polygon
		FROM heat_cells
		WHERE west <= $1 AND east >= $2
		  AND south <= $3 AND north >= $4
		ORDER BY score DESC, incident_count DESC
	`, params.east, params.west, params.north, params.south)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []heatCell
	for rows.Next() {
		var cell heatCell
		var polygonBytes []byte
		if err := rows.Scan(&cell.ID, &cell.Label, &cell.Score, &cell.IncidentCount, &cell.DominantEventType, &polygonBytes); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(polygonBytes, &cell.Polygon); err != nil {
			return nil, err
		}
		out = append(out, cell)
	}
	return out, rows.Err()
}

func (s *store) reports(ctx context.Context, params queryFilters) ([]report, string, error) {
	limit := params.limit
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	var (
		rows   pgx.Rows
		err    error
		cursor *time.Time
	)
	if params.cursor != "" {
		parsed, parseErr := time.Parse(time.RFC3339, params.cursor)
		if parseErr == nil {
			cursor = &parsed
		}
	}

	if cursor == nil {
		rows, err = s.pool.Query(ctx, `
			SELECT
				i.public_id::text,
				i.title,
				i.event_type,
				i.status,
				i.occurred_at,
				i.location_label
			FROM incidents i
			WHERE i.occurred_at >= now() - interval '6 months'
			  AND i.lng BETWEEN $1 AND $2
			  AND i.lat BETWEEN $3 AND $4
			  AND ($5::float8 <= 0 OR i.confidence >= $5)
			  AND ($6::text[] IS NULL OR i.event_type = ANY($6))
			ORDER BY i.occurred_at DESC
			LIMIT $7
		`, params.west, params.east, params.south, params.north, params.minConfidence, params.eventTypes, limit)
	} else {
		rows, err = s.pool.Query(ctx, `
			SELECT
				i.public_id::text,
				i.title,
				i.event_type,
				i.status,
				i.occurred_at,
				i.location_label
			FROM incidents i
			WHERE i.occurred_at >= now() - interval '6 months'
			  AND i.occurred_at < $1
			  AND i.lng BETWEEN $2 AND $3
			  AND i.lat BETWEEN $4 AND $5
			  AND ($6::float8 <= 0 OR i.confidence >= $6)
			  AND ($7::text[] IS NULL OR i.event_type = ANY($7))
			ORDER BY i.occurred_at DESC
			LIMIT $8
		`, *cursor, params.west, params.east, params.south, params.north, params.minConfidence, params.eventTypes, limit)
	}
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	var out []report
	var lastOccurredAt time.Time
	for rows.Next() {
		var item report
		var occurredAt time.Time
		if err := rows.Scan(
			&item.PublicID,
			&item.Title,
			&item.EventType,
			&item.Status,
			&occurredAt,
			&item.LocationLabel,
		); err != nil {
			return nil, "", err
		}
		item.OccurredAt = occurredAt.UTC().Format(time.RFC3339)
		out = append(out, item)
		lastOccurredAt = occurredAt
	}
	if err := rows.Err(); err != nil {
		return nil, "", err
	}

	nextCursor := ""
	if limit > 0 && len(out) == limit {
		nextCursor = lastOccurredAt.UTC().Format(time.RFC3339)
	}
	return out, nextCursor, nil
}

func (s *store) incident(ctx context.Context, publicID string) (incidentDetail, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT public_id::text, title, summary, event_type, confidence, status, occurred_at, location_label, lat, lng, geo_precision
		FROM incidents
		WHERE public_id = $1::uuid
	`, publicID)

	var out incidentDetail
	var occurredAt time.Time
	if err := row.Scan(
		&out.PublicID,
		&out.Title,
		&out.Summary,
		&out.EventType,
		&out.Confidence,
		&out.Status,
		&occurredAt,
		&out.Location.Label,
		&out.Location.Lat,
		&out.Location.Lng,
		&out.Location.Precision,
	); err != nil {
		return out, err
	}
	out.OccurredAt = occurredAt.UTC().Format(time.RFC3339)

	rows, err := s.pool.Query(ctx, `
		SELECT COALESCE(s.name, s.slug), rr.raw_title, rr.raw_url, rr.published_at
		FROM incidents i
		JOIN incident_evidence ie ON ie.incident_id = i.id
		JOIN raw_reports rr ON rr.id = ie.raw_report_id
		JOIN sources s ON s.id = rr.source_id
		WHERE i.public_id = $1::uuid
		ORDER BY rr.published_at DESC
	`, publicID)
	if err != nil {
		return out, err
	}
	defer rows.Close()

	for rows.Next() {
		var item evidenceItem
		var publishedAt time.Time
		if err := rows.Scan(&item.SourceName, &item.Title, &item.URL, &publishedAt); err != nil {
			return out, err
		}
		item.PublishedAt = publishedAt.UTC().Format(time.RFC3339)
		out.Evidence = append(out.Evidence, item)
	}
	return out, rows.Err()
}

type queryFilters struct {
	minConfidence float64
	eventTypes    []string
	cursor        string
	limit         int
	west          float64
	south         float64
	east          float64
	north         float64
}

func readFilters(rawQuery map[string][]string) queryFilters {
	bounds := parseBBox(strings.Join(rawQuery["bbox"], ""))
	minConfidence, _ := strconv.ParseFloat(first(rawQuery["minConfidence"]), 64)
	limit, _ := strconv.Atoi(first(rawQuery["limit"]))
	return queryFilters{
		minConfidence: minConfidence,
		eventTypes:    nilIfEmpty(splitCSV(first(rawQuery["eventTypes"]))),
		cursor:        first(rawQuery["cursor"]),
		limit:         limit,
		west:          bounds.west,
		south:         bounds.south,
		east:          bounds.east,
		north:         bounds.north,
	}
}

func nilIfEmpty(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	return values
}

func first(values []string) string {
	if len(values) == 0 {
		return ""
	}
	return values[0]
}
