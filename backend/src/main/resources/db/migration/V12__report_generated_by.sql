ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS generated_by_user_id BIGINT;

ALTER TABLE reports
    ADD CONSTRAINT fk_reports_generated_by_user
    FOREIGN KEY (generated_by_user_id)
    REFERENCES users(id);
