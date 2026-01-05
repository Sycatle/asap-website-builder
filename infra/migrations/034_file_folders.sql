-- Migration: Add file folders and extended file metadata
-- This enables a virtual folder system for organizing files with visibility levels

-- File visibility enum
DO $$ BEGIN
    CREATE TYPE file_visibility AS ENUM ('private', 'public', 'website');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- File folders table (virtual folder hierarchy)
CREATE TABLE IF NOT EXISTS file_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES file_folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    path TEXT NOT NULL, -- Full path for fast lookups: /photos/vacation/2024
    visibility file_visibility NOT NULL DEFAULT 'private',
    website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- A folder can only be website-scoped if visibility is 'website'
    CONSTRAINT folder_website_visibility CHECK (
        (visibility = 'website' AND website_id IS NOT NULL) OR
        (visibility != 'website' AND website_id IS NULL)
    ),
    -- Unique folder name within same parent and tenant
    CONSTRAINT unique_folder_name UNIQUE (tenant_id, parent_id, name)
);

-- Add indexes for file_folders
CREATE INDEX IF NOT EXISTS idx_file_folders_tenant ON file_folders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_file_folders_parent ON file_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_file_folders_path ON file_folders(tenant_id, path);
CREATE INDEX IF NOT EXISTS idx_file_folders_website ON file_folders(website_id) WHERE website_id IS NOT NULL;

-- Add new columns to files table
ALTER TABLE files 
    ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES file_folders(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS visibility file_visibility NOT NULL DEFAULT 'private',
    ADD COLUMN IF NOT EXISTS website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Add constraint for file website visibility
ALTER TABLE files DROP CONSTRAINT IF EXISTS file_website_visibility;
ALTER TABLE files ADD CONSTRAINT file_website_visibility CHECK (
    (visibility = 'website' AND website_id IS NOT NULL) OR
    (visibility != 'website')
);

-- Add indexes for new file columns
CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_visibility ON files(account_id, visibility);
CREATE INDEX IF NOT EXISTS idx_files_website ON files(website_id) WHERE website_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_tags ON files USING GIN(tags);

-- Update trigger for file_folders updated_at
CREATE OR REPLACE FUNCTION update_file_folders_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS file_folders_updated_at ON file_folders;
CREATE TRIGGER file_folders_updated_at
    BEFORE UPDATE ON file_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_file_folders_timestamp();

-- RLS policies for file_folders
ALTER TABLE file_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS file_folders_tenant_isolation ON file_folders;
CREATE POLICY file_folders_tenant_isolation ON file_folders
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Update RLS policies for files to include visibility
-- Note: files table uses account_id instead of tenant_id
DROP POLICY IF EXISTS files_tenant_isolation ON files;
CREATE POLICY files_tenant_isolation ON files
    FOR ALL
    USING (
        account_id = current_setting('app.current_tenant', true)::uuid
        OR visibility = 'public'
    );
