alter table project_messages add column marker_lat double precision;
alter table project_messages add column marker_lon double precision;

create table project_approvals (
    id uuid not null primary key,
    project_id uuid not null,
    scope varchar(32) not null,
    target_type varchar(32) not null,
    target_id uuid not null,
    status varchar(32) not null,
    request_note text,
    decision_comment text,
    requested_by_user_id uuid,
    decided_by_user_id uuid,
    created_at timestamp with time zone not null,
    decided_at timestamp with time zone,
    constraint fk_project_approvals_project foreign key (project_id) references projects (id),
    constraint fk_project_approvals_requested_by foreign key (requested_by_user_id) references users (id),
    constraint fk_project_approvals_decided_by foreign key (decided_by_user_id) references users (id)
);

create index idx_project_approvals_project_id on project_approvals (project_id);
create index idx_project_approvals_status on project_approvals (status);
create index idx_project_approvals_created_at on project_approvals (created_at);

create table project_meetings (
    id uuid not null primary key,
    project_id uuid not null,
    created_by_user_id uuid,
    title varchar(255) not null,
    scheduled_at timestamp with time zone not null,
    location varchar(255),
    agenda text,
    minutes text,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint fk_project_meetings_project foreign key (project_id) references projects (id),
    constraint fk_project_meetings_user foreign key (created_by_user_id) references users (id)
);

create index idx_project_meetings_project_id on project_meetings (project_id);
create index idx_project_meetings_scheduled_at on project_meetings (scheduled_at);

create table notifications (
    id uuid not null primary key,
    user_id uuid not null,
    type varchar(64) not null,
    message varchar(2000) not null,
    project_id uuid,
    created_at timestamp with time zone not null,
    read_at timestamp with time zone,
    constraint fk_notifications_user foreign key (user_id) references users (id),
    constraint fk_notifications_project foreign key (project_id) references projects (id)
);

create index idx_notifications_user_id on notifications (user_id);
create index idx_notifications_created_at on notifications (created_at);

