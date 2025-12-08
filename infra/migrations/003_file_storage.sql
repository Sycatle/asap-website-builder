-- File storage tables
-- Migration: 003_file_storage

-- Files table to track uploaded files
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    original_size BIGINT NOT NULL,
    compressed_size BIGINT NOT NULL,
    file_hash TEXT NOT NULL UNIQUE,
    storage_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on user_id for faster queries
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_created_at ON files(created_at);

-- User storage quota table
CREATE TABLE user_storage_quota (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_size_used BIGINT NOT NULL DEFAULT 0,
    quota_limit BIGINT NOT NULL DEFAULT 1073741824, -- 1 GB
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit table for file operations (optional but recommended)
CREATE TABLE file_operations_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_id UUID REFERENCES files(id) ON DELETE SET NULL,
    operation TEXT NOT NULL CHECK (operation IN ('upload', 'delete', 'download')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on user_id for audit queries
CREATE INDEX idx_file_operations_audit_user_id ON file_operations_audit(user_id);
CREATE INDEX idx_file_operations_audit_created_at ON file_operations_audit(created_at);

-- Create trigger to automatically update updated_at in user_storage_quota
CREATE OR REPLACE FUNCTION update_user_storage_quota_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_storage_quota_updated_at
BEFORE UPDATE ON user_storage_quota
FOR EACH ROW
EXECUTE FUNCTION update_user_storage_quota_timestamp();
