ALTER TABLE subdivision_runs ADD COLUMN parent_upi VARCHAR(100);
ALTER TABLE subdivision_runs ADD COLUMN parent_parcel_geo_json TEXT;
ALTER TABLE subdivision_runs ADD COLUMN proposed_land_use VARCHAR(100);
ALTER TABLE subdivision_runs ADD COLUMN validation_summary_json TEXT;
ALTER TABLE subdivision_runs ADD COLUMN layer_snapshot_json TEXT;
