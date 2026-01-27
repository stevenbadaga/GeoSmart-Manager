alter table datasets add column version integer not null default 1;
alter table datasets add column format varchar(32);
alter table datasets add column preview_geojson_path varchar(512);
alter table datasets add column checksum_sha256 varchar(64);

create index idx_datasets_project_name_type_version on datasets (project_id, name, type, version);
