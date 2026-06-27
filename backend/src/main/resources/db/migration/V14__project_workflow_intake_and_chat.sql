ALTER TABLE projects ADD COLUMN requested_upi VARCHAR(120);
ALTER TABLE projects ADD COLUMN requested_parcel_count INTEGER;
ALTER TABLE projects ADD COLUMN requested_land_use VARCHAR(120);
ALTER TABLE projects ADD COLUMN intake_notes TEXT;
ALTER TABLE projects ADD COLUMN approved_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN surveyor_accepted_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN subdivision_drafted_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN compliance_checked_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN report_ready_at TIMESTAMPTZ;

ALTER TABLE project_communications ADD COLUMN sender_user_id BIGINT;
ALTER TABLE project_communications ADD COLUMN sender_name VARCHAR(255);
ALTER TABLE project_communications ADD COLUMN sender_role VARCHAR(60);
ALTER TABLE project_communications ADD COLUMN system_generated BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_projects_requested_upi ON projects(requested_upi);
CREATE INDEX idx_project_communications_project_timeline ON project_communications(project_id, occurred_at, created_at);
