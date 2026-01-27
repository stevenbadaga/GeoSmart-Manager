alter table users add column full_name varchar(255);
alter table users add column phone varchar(64);
alter table users add column license_number varchar(64);
alter table users add column certification varchar(255);
alter table users add column specialization varchar(255);
alter table users add column mfa_enabled boolean not null default false;
alter table users add column mfa_secret varchar(128);
alter table users add column last_login_at timestamp with time zone;

create index idx_users_role on users (role);

create table user_sessions (
    id uuid not null primary key,
    user_id uuid not null,
    created_at timestamp with time zone not null,
    last_seen_at timestamp with time zone not null,
    user_agent varchar(512),
    ip_address varchar(64),
    revoked_at timestamp with time zone,
    constraint fk_user_sessions_user foreign key (user_id) references users (id)
);

create index idx_user_sessions_user_id on user_sessions (user_id);
create index idx_user_sessions_revoked_at on user_sessions (revoked_at);

alter table clients add column user_id uuid;
alter table clients add constraint fk_clients_user foreign key (user_id) references users (id);
create unique index uq_clients_user_id on clients (user_id);

alter table clients add column kyc_id_type varchar(64);
alter table clients add column kyc_id_number varchar(128);
alter table clients add column kyc_notes varchar(1000);
alter table clients add column land_ownership_details varchar(2000);

