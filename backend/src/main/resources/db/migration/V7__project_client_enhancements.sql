ALTER TABLE clients
    ADD COLUMN id_document_reference VARCHAR(255),
    ADD COLUMN land_ownership_reference VARCHAR(255),
    ADD COLUMN kyc_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN reviewer_notes TEXT;

ALTER TABLE projects
    ADD COLUMN project_type VARCHAR(120),
    ADD COLUMN location_summary VARCHAR(255),
    ADD COLUMN scope_summary TEXT,
    ADD COLUMN archived_at TIMESTAMPTZ;

CREATE TABLE project_documents (
    id BIGSERIAL PRIMARY KEY,
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
    id BIGSERIAL PRIMARY KEY,
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
