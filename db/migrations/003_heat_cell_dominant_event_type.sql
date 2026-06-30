ALTER TABLE heat_cells
ADD COLUMN IF NOT EXISTS dominant_event_type TEXT NOT NULL DEFAULT 'violence';
