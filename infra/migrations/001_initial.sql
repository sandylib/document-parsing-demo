CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  visibility text NOT NULL CHECK (visibility IN ('public', 'staff')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  checksum text NOT NULL,
  mime_type text NOT NULL,
  original_name text NOT NULL,
  storage_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','failed','superseded')),
  is_current boolean NOT NULL DEFAULT false,
  pipeline_revision text NOT NULL,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id, version_number),
  UNIQUE(checksum)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_current_version_per_document ON document_versions(document_id) WHERE is_current;
CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed')),
  attempts integer NOT NULL DEFAULT 0,
  progress smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  last_error text,
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS canonical_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  block_order integer NOT NULL,
  type text NOT NULL,
  text_content text NOT NULL,
  page integer,
  section_path text[] NOT NULL DEFAULT '{}',
  source_start integer,
  source_end integer,
  confidence real NOT NULL DEFAULT 1,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE TABLE IF NOT EXISTS chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  chunk_order integer NOT NULL,
  text_content text NOT NULL,
  section_path text[] NOT NULL DEFAULT '{}',
  page integer,
  block_ids uuid[] NOT NULL DEFAULT '{}',
  visibility text NOT NULL CHECK (visibility IN ('public','staff')),
  embedding_model text NOT NULL,
  embedding vector(1024),
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', text_content)) STORED
);
CREATE INDEX IF NOT EXISTS chunks_search_idx ON chunks USING gin(search_vector);
CREATE INDEX IF NOT EXISTS chunks_version_idx ON chunks(version_id);
CREATE TABLE IF NOT EXISTS answer_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  role text NOT NULL,
  question text NOT NULL,
  pipeline_revision text NOT NULL,
  model_profile text NOT NULL,
  evidence_ids uuid[] NOT NULL DEFAULT '{}',
  tool_calls jsonb NOT NULL DEFAULT '[]'::jsonb,
  outcome text NOT NULL,
  duration_ms integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
