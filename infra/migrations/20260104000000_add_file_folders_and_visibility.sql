-- Migration: Add file folders and visibility system
-- Part of the enhanced cloud storage architecture

-- =====================================================
-- 1. Create file_folders table for virtual folder structure
-- =====================================================
CREATE TABLE file_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
    parent_folder_id UUID REFERENCES file_folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    path TEXT NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- No duplicate folder names in same parent
    CONSTRAINT unique_folder_in_parent UNIQUE (account_id, parent_folder_id, name),
    -- Website folders must be at root level
    CONSTRAINT website_folders_at_root CHECK (
        website_id IS NULL OR parent_folder_id IS NULL
    )
);

-- Indexes for file_folders
CREATE INDEX idx_file_folders_account ON file_folders(account_id);
CREATE INDEX idx_file_folders_website ON file_folders(website_id);
CREATE INDEX idx_file_folders_parent ON file_folders(parent_folder_id);
CREATE INDEX idx_file_folders_path ON file_folders(path);

-- =====================================================
-- 2. Add new columns to files table
-- =====================================================

-- Add folder reference
ALTER TABLE files ADD COLUMN folder_id UUID REFERENCES file_folders(id) ON DELETE SET NULL;

-- Add visibility: private (default), public, website (inherits from website)
ALTER TABLE files ADD COLUMN visibility VARCHAR(20) NOT NULL DEFAULT 'private';
ALTER TABLE files ADD CONSTRAINT files_visibility_check CHECK (visibility IN ('private', 'public', 'website'));

-- Add website reference for website-specific files
ALTER TABLE files ADD COLUMN website_id UUID REFERENCES websites(id) ON DELETE SET NULL;

-- Add description/alt text for images
ALTER TABLE files ADD COLUMN description TEXT;

-- Add tags for organization
ALTER TABLE files ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Indexes for new columns
CREATE INDEX idx_files_folder ON files(folder_id);
CREATE INDEX idx_files_visibility ON files(visibility);
CREATE INDEX idx_files_website ON files(website_id);
CREATE INDEX idx_files_tags ON files USING GIN(tags);

-- =====================================================
-- 3. Update triggers for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_file_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_file_folders_updated_at
    BEFORE UPDATE ON file_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_file_folders_updated_at();

-- =====================================================
-- 4. Create system folders for existing accounts
-- =====================================================
-- This will be handled by the application on first access
-- to avoid blocking migration

-- =====================================================
-- 5. Add RLS policies for multi-tenant isolation
-- =====================================================
ALTER TABLE file_folders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own folders
CREATE POLICY file_folders_tenant_isolation ON file_folders
    FOR ALL
    USING (account_id = current_setting('app.current_account_id', true)::uuid)
    WITH CHECK (account_id = current_setting('app.current_account_id', true)::uuid);

-- Note: RLS is backup protection, main isolation is done in application layer

-- =====================================================
-- 6. Comments for documentation
-- =====================================================
COMMENT ON TABLE file_folders IS 'Virtual folder structure for organizing files in user cloud storage';
COMMENT ON COLUMN file_folders.website_id IS 'If set, this folder belongs to a specific website';
COMMENT ON COLUMN file_folders.path IS 'Full path from root, e.g., /Photos/Vacations';
COMMENT ON COLUMN files.visibility IS 'private: auth required, public: no auth, website: follows website visibility';
COMMENT ON COLUMN files.website_id IS 'If set, file belongs to a specific website';
