-- Migration: Fix folder visibility constraint
-- Allow website_id to be set regardless of visibility level
-- This enables organizing files per-website while keeping them private

-- Drop the old restrictive constraint
ALTER TABLE file_folders DROP CONSTRAINT IF EXISTS folder_website_visibility;

-- Add a more flexible constraint:
-- website_id can be set for any visibility level to scope folders to a website
-- This allows:
-- - Private folders scoped to a website (for site-specific organization)
-- - Public folders not tied to a specific website (global assets)
-- - Website-visible folders (accessible from that website only)
ALTER TABLE file_folders ADD CONSTRAINT folder_website_visibility CHECK (
    -- If visibility is 'website', website_id MUST be set
    (visibility = 'website' AND website_id IS NOT NULL) OR
    -- For other visibility levels, website_id is optional
    (visibility != 'website')
);

-- Also fix the files constraint to be consistent
ALTER TABLE files DROP CONSTRAINT IF EXISTS file_website_visibility;
ALTER TABLE files ADD CONSTRAINT file_website_visibility CHECK (
    (visibility = 'website' AND website_id IS NOT NULL) OR
    (visibility != 'website')
);
