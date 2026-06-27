CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) NOT NULL,
    contact_email VARCHAR(200),
    phone VARCHAR(100),
    address VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    start_date DATE,
    end_date DATE,
    client_id BIGINT NOT NULL REFERENCES clients(id),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE datasets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id BIGINT NOT NULL REFERENCES projects(id),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,
    geo_json TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE subdivision_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id BIGINT NOT NULL REFERENCES projects(id),
    dataset_id BIGINT NOT NULL REFERENCES datasets(id),
    status VARCHAR(50) NOT NULL,
    optimization_mode VARCHAR(50) NOT NULL,
    parcel_count INT NOT NULL,
    avg_parcel_area_sqm DOUBLE PRECISION NOT NULL,
    result_geo_json TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE compliance_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id BIGINT NOT NULL REFERENCES projects(id),
    subdivision_run_id BIGINT NOT NULL REFERENCES subdivision_runs(id),
    status VARCHAR(50) NOT NULL,
    findings TEXT NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE workflow_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id BIGINT NOT NULL REFERENCES projects(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    assignee_email VARCHAR(200),
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id BIGINT NOT NULL REFERENCES projects(id),
    type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_email VARCHAR(200) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL
);
