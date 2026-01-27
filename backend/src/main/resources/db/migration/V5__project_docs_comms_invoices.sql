alter table projects add column type varchar(64);
alter table projects add column location varchar(255);
alter table projects add column scope varchar(2000);
alter table projects add column start_date date;
alter table projects add column end_date date;
alter table projects add column archived boolean not null default false;

create table project_documents (
    id uuid not null primary key,
    project_id uuid not null,
    uploaded_by_user_id uuid,
    doc_type varchar(64) not null,
    name varchar(255) not null,
    original_filename varchar(255) not null,
    stored_path varchar(512) not null,
    content_type varchar(255),
    size_bytes bigint not null,
    checksum_sha256 varchar(64),
    uploaded_at timestamp with time zone not null,
    constraint fk_project_documents_project foreign key (project_id) references projects (id),
    constraint fk_project_documents_user foreign key (uploaded_by_user_id) references users (id)
);

create index idx_project_documents_project_id on project_documents (project_id);
create index idx_project_documents_uploaded_at on project_documents (uploaded_at);

create table project_messages (
    id uuid not null primary key,
    project_id uuid not null,
    actor_user_id uuid,
    visibility varchar(32) not null,
    message text not null,
    created_at timestamp with time zone not null,
    constraint fk_project_messages_project foreign key (project_id) references projects (id),
    constraint fk_project_messages_actor foreign key (actor_user_id) references users (id)
);

create index idx_project_messages_project_id on project_messages (project_id);
create index idx_project_messages_created_at on project_messages (created_at);

create table invoices (
    id uuid not null primary key,
    project_id uuid not null,
    invoice_number varchar(64) not null,
    status varchar(32) not null,
    currency varchar(8) not null,
    amount double precision not null,
    due_date date,
    notes varchar(2000),
    created_at timestamp with time zone not null,
    constraint fk_invoices_project foreign key (project_id) references projects (id)
);

create index idx_invoices_project_id on invoices (project_id);
create unique index uq_invoices_number on invoices (invoice_number);

create table invoice_payments (
    id uuid not null primary key,
    invoice_id uuid not null,
    amount double precision not null,
    method varchar(64),
    reference varchar(128),
    paid_at timestamp with time zone not null,
    constraint fk_invoice_payments_invoice foreign key (invoice_id) references invoices (id)
);

create index idx_invoice_payments_invoice_id on invoice_payments (invoice_id);

