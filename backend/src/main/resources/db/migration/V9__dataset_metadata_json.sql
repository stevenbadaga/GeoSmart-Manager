ALTER TABLE datasets
    ADD COLUMN metadata_json TEXT;

UPDATE datasets
SET metadata_json = '{}'
WHERE metadata_json IS NULL;

ALTER TABLE datasets
    ALTER COLUMN metadata_json SET NOT NULL;
