create table field_observations (
    id uuid not null primary key,
    project_id uuid not null,
    created_by_user_id uuid,
    title varchar(255),
    latitude double precision not null,
    longitude double precision not null,
    altitude_m double precision,
    accuracy_m double precision,
    observed_at timestamp with time zone,
    notes text,
    photo_original_filename varchar(255),
    photo_stored_path varchar(512),
    photo_content_type varchar(255),
    photo_size_bytes bigint,
    photo_checksum_sha256 varchar(64),
    created_at timestamp with time zone not null,
    constraint fk_field_observations_project foreign key (project_id) references projects (id),
    constraint fk_field_observations_user foreign key (created_by_user_id) references users (id)
);

create index idx_field_observations_project_id on field_observations (project_id);
create index idx_field_observations_created_at on field_observations (created_at);

create table equipment_logs (
    id uuid not null primary key,
    project_id uuid not null,
    created_by_user_id uuid,
    equipment_name varchar(255) not null,
    serial_number varchar(128),
    calibration_date date,
    status varchar(32) not null,
    notes varchar(2000),
    created_at timestamp with time zone not null,
    constraint fk_equipment_logs_project foreign key (project_id) references projects (id),
    constraint fk_equipment_logs_user foreign key (created_by_user_id) references users (id)
);

create index idx_equipment_logs_project_id on equipment_logs (project_id);
create index idx_equipment_logs_created_at on equipment_logs (created_at);

