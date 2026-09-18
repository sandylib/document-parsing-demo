ALTER TABLE ingestion_jobs
  ADD COLUMN IF NOT EXISTS progress smallint NOT NULL DEFAULT 0
  CHECK (progress BETWEEN 0 AND 100);

ALTER TABLE ingestion_jobs
  DROP COLUMN IF EXISTS available_at,
  DROP COLUMN IF EXISTS lease_expires_at;
