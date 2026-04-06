ALTER TABLE compliance_checks
    ADD COLUMN details_json TEXT,
    ADD COLUMN framework_version VARCHAR(120);
