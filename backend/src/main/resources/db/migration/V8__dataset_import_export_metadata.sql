ALTER TABLE datasets
    ADD COLUMN source_format VARCHAR(50),
    ADD COLUMN source_file_name VARCHAR(255),
    ADD COLUMN updated_at TIMESTAMPTZ;

UPDATE datasets
SET source_format = 'GEOJSON',
    source_file_name = CONCAT(name, '.geojson'),
    updated_at = created_at
WHERE source_format IS NULL;

ALTER TABLE datasets
    ALTER COLUMN source_format SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;
