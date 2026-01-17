create table compliance_configs (
    id uuid not null primary key,
    project_id uuid not null unique,
    min_parcel_area double precision not null,
    max_parcel_area double precision,
    expected_parcel_count integer,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_compliance_configs_project foreign key (project_id) references projects (id)
);

create index idx_compliance_configs_project_id on compliance_configs (project_id);

