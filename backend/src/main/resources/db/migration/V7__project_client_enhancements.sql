ALTER TABLE clients ADD COLUMN id_document_reference VARCHAR(255);
ALTER TABLE clients ADD COLUMN land_ownership_reference VARCHAR(255);
ALTER TABLE clients ADD COLUMN kyc_status VARCHAR(50) NOT NULL DEFAULT 'PENDING';
ALTER TABLE clients ADD COLUMN reviewer_notes TEXT;

ALTER TABLE projects ADD COLUMN project_type VARCHAR(120);
ALTER TABLE projects ADD COLUMN location_summary VARCHAR(255);
ALTER TABLE projects ADD COLUMN scope_summary TEXT;
ALTER TABLE projects ADD COLUMN archived_at TIMESTAMPTZ;

CREATE TABLE project_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(120) NOT NULL,
    version_label VARCHAR(80) NOT NULL,
    file_reference VARCHAR(255),
    approval_status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE project_communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    summary TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX idx_project_communications_project_id ON project_communications(project_id);
