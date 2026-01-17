create table users (
    id uuid not null primary key,
    username varchar(64) not null unique,
    email varchar(255) not null unique,
    password_hash varchar(255) not null,
    role varchar(32) not null,
    enabled boolean not null,
    created_at timestamp with time zone not null
);

create table clients (
    id uuid not null primary key,
    name varchar(255) not null,
    email varchar(255),
    phone varchar(64),
    address varchar(512),
    created_at timestamp with time zone not null
);

create table projects (
    id uuid not null primary key,
    client_id uuid not null,
    name varchar(255) not null,
    description varchar(2000),
    status varchar(32) not null,
    created_at timestamp with time zone not null,
    constraint fk_projects_client foreign key (client_id) references clients (id)
);

create index idx_projects_client_id on projects (client_id);

create table datasets (
    id uuid not null primary key,
    project_id uuid not null,
    name varchar(255) not null,
    type varchar(32) not null,
    original_filename varchar(255) not null,
    stored_path varchar(512) not null,
    content_type varchar(255),
    size_bytes bigint not null,
    uploaded_at timestamp with time zone not null,
    constraint fk_datasets_project foreign key (project_id) references projects (id)
);

create index idx_datasets_project_id on datasets (project_id);

create table subdivision_runs (
    id uuid not null primary key,
    project_id uuid not null,
    created_by_user_id uuid not null,
    status varchar(32) not null,
    target_parcels integer not null,
    min_parcel_area double precision not null,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    error_message varchar(1024),
    result_path varchar(512),
    constraint fk_subdivision_runs_project foreign key (project_id) references projects (id),
    constraint fk_subdivision_runs_user foreign key (created_by_user_id) references users (id)
);

create index idx_subdivision_runs_project_id on subdivision_runs (project_id);

create table compliance_checks (
    id uuid not null primary key,
    project_id uuid not null,
    subdivision_run_id uuid not null,
    status varchar(32) not null,
    issues_json text,
    checked_at timestamp with time zone not null,
    constraint fk_compliance_checks_project foreign key (project_id) references projects (id),
    constraint fk_compliance_checks_run foreign key (subdivision_run_id) references subdivision_runs (id)
);

create index idx_compliance_checks_project_id on compliance_checks (project_id);

create table reports (
    id uuid not null primary key,
    project_id uuid not null,
    type varchar(64) not null,
    file_path varchar(512) not null,
    created_at timestamp with time zone not null,
    constraint fk_reports_project foreign key (project_id) references projects (id)
);

create index idx_reports_project_id on reports (project_id);

create table audit_logs (
    id uuid not null primary key,
    actor_user_id uuid,
    action varchar(128) not null,
    entity_type varchar(128) not null,
    entity_id varchar(64),
    details_json text,
    created_at timestamp with time zone not null,
    constraint fk_audit_logs_actor foreign key (actor_user_id) references users (id)
);

create index idx_audit_logs_created_at on audit_logs (created_at);

create table workflow_tasks (
    id uuid not null primary key,
    project_id uuid not null,
    created_by_user_id uuid,
    assigned_to_user_id uuid,
    title varchar(255) not null,
    description varchar(2000),
    status varchar(32) not null,
    due_at timestamp with time zone,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_workflow_tasks_project foreign key (project_id) references projects (id),
    constraint fk_workflow_tasks_created_by foreign key (created_by_user_id) references users (id),
    constraint fk_workflow_tasks_assigned_to foreign key (assigned_to_user_id) references users (id)
);

create index idx_workflow_tasks_project_id on workflow_tasks (project_id);

