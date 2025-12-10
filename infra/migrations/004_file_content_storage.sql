 a-- File content storage
-- Migration: 004_file_content_storage
-- Stores the actual compressed file data in PostgreSQL

-- File content table (stores compressed binary data)
CREATE TABLE file_content (
    file_id UUID PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
    data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups
COMMENT ON TABLE file_content IS 'Stores compressed file binary data';
COMMENT ON COLUMN file_content.data IS 'Gzip compressed file content';
