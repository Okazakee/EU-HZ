ALTER TABLE heat_cells
  DROP CONSTRAINT IF EXISTS heat_cells_pkey;

DELETE FROM heat_cells
WHERE ctid NOT IN (
  SELECT min(ctid)
  FROM heat_cells
  GROUP BY cell_key
);

ALTER TABLE heat_cells
  DROP COLUMN IF EXISTS range_key;

ALTER TABLE heat_cells
  DROP CONSTRAINT IF EXISTS heat_cells_range_key_check;

ALTER TABLE heat_cells
  ADD PRIMARY KEY (cell_key);

DROP INDEX IF EXISTS heat_cells_range_idx;
