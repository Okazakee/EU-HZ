CREATE TABLE IF NOT EXISTS ingest_runs (
  id BIGSERIAL PRIMARY KEY,
  model TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  accepted INTEGER NOT NULL DEFAULT 0,
  rejected INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  timed_out BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ingest_runs_started_at_idx
ON ingest_runs (started_at DESC);

CREATE INDEX IF NOT EXISTS ingest_runs_status_started_at_idx
ON ingest_runs (status, started_at DESC);

CREATE INDEX IF NOT EXISTS incidents_occurred_lng_lat_idx
ON incidents (occurred_at DESC, lng, lat);

CREATE INDEX IF NOT EXISTS incidents_lng_lat_occurred_at_idx
ON incidents (lng, lat, occurred_at DESC);

CREATE INDEX IF NOT EXISTS incidents_event_time_idx
ON incidents (event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS incidents_country_city_idx
ON incidents (country_code, city);

CREATE INDEX IF NOT EXISTS heat_cells_bounds_idx
ON heat_cells (west, east, south, north);
