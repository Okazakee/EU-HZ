CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS sources (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('official', 'news', 'social', 'manual')),
  trust_weight NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source_cursors (
  source_id BIGINT PRIMARY KEY REFERENCES sources(id) ON DELETE CASCADE,
  last_success_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  next_poll_at TIMESTAMPTZ,
  last_external_cursor TEXT,
  etag TEXT,
  last_modified TEXT,
  high_watermark_published_at TIMESTAMPTZ,
  error_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS raw_reports (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  external_id TEXT,
  raw_url TEXT,
  raw_title TEXT,
  raw_text TEXT NOT NULL,
  raw_payload JSONB,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  content_hash TEXT NOT NULL,
  location_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS raw_reports_source_external_id_unique
ON raw_reports (source_id, external_id)
WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS raw_reports_source_content_hash_unique
ON raw_reports (source_id, content_hash);

CREATE TABLE IF NOT EXISTS incidents (
  id BIGSERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  confidence NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL CHECK (status IN ('unverified', 'corroborated', 'verified', 'rejected')),
  occurred_at TIMESTAMPTZ NOT NULL,
  location_label TEXT NOT NULL,
  geo_precision TEXT NOT NULL DEFAULT 'city',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  country_code TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incidents_occurred_at_idx ON incidents (occurred_at DESC);
CREATE INDEX IF NOT EXISTS incidents_event_type_idx ON incidents (event_type);
CREATE INDEX IF NOT EXISTS incidents_status_idx ON incidents (status);

CREATE TABLE IF NOT EXISTS incident_evidence (
  incident_id BIGINT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  raw_report_id BIGINT NOT NULL REFERENCES raw_reports(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (incident_id, raw_report_id)
);

CREATE TABLE IF NOT EXISTS heat_cells (
  cell_key TEXT NOT NULL,
  range_key TEXT NOT NULL CHECK (range_key IN ('24h', '7d', '30d')),
  label TEXT NOT NULL,
  score NUMERIC(8,4) NOT NULL,
  incident_count INTEGER NOT NULL,
  polygon JSONB NOT NULL,
  centroid_lng DOUBLE PRECISION NOT NULL,
  centroid_lat DOUBLE PRECISION NOT NULL,
  west DOUBLE PRECISION NOT NULL,
  south DOUBLE PRECISION NOT NULL,
  east DOUBLE PRECISION NOT NULL,
  north DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cell_key, range_key)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'heat_cells' AND column_name = 'range_key'
  ) THEN
    CREATE INDEX IF NOT EXISTS heat_cells_range_idx ON heat_cells (range_key);
  END IF;
END;
$$;
