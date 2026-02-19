ALTER TABLE users
    ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN professional_license VARCHAR(200),
    ADD COLUMN last_active_at TIMESTAMPTZ;

UPDATE users
SET status = 'ACTIVE'
WHERE status IS NULL;
