create table project_members (
    id uuid not null primary key,
    project_id uuid not null,
    user_id uuid not null,
    role varchar(32) not null,
    added_at timestamp with time zone not null,
    constraint fk_project_members_project foreign key (project_id) references projects (id),
    constraint fk_project_members_user foreign key (user_id) references users (id),
    constraint uq_project_members_project_user unique (project_id, user_id)
);

create index idx_project_members_project_id on project_members (project_id);
create index idx_project_members_user_id on project_members (user_id);

