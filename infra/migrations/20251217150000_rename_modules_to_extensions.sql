-- ============================================================================
-- Migration: Rename Modules to Extensions
-- Version: 1.0.0
-- Description: Renames all module-related tables, columns and references to extension
-- ============================================================================

-- ============================================================================
-- STEP 1: Rename tables
-- ============================================================================

-- Rename modules -> extensions
ALTER TABLE modules RENAME TO extensions;

-- Rename website_modules -> website_extensions
ALTER TABLE website_modules RENAME TO website_extensions;

-- ============================================================================
-- STEP 2: Rename columns in extensions table
-- ============================================================================

-- The extensions table keeps its columns as-is (id, name, slug, version, etc.)
-- No column renames needed here

-- ============================================================================
-- STEP 3: Rename columns in website_extensions table (formerly website_modules)
-- ============================================================================

ALTER TABLE website_extensions RENAME COLUMN module_id TO extension_id;

-- ============================================================================
-- STEP 4: Rename columns in website_sections table
-- ============================================================================

ALTER TABLE website_sections RENAME COLUMN module_id TO extension_id;

-- ============================================================================
-- STEP 5: Update foreign key constraints
-- ============================================================================

-- Drop old foreign key on website_sections
ALTER TABLE website_sections DROP CONSTRAINT IF EXISTS website_sections_module_id_fkey;

-- Add new foreign key with correct name
ALTER TABLE website_sections ADD CONSTRAINT website_sections_extension_id_fkey
    FOREIGN KEY (extension_id) REFERENCES extensions(id) ON DELETE SET NULL;

-- website_extensions already has the right FK structure, just need to rename the constraint
-- Drop old FK and recreate
ALTER TABLE website_extensions DROP CONSTRAINT IF EXISTS website_modules_module_id_fkey;
ALTER TABLE website_extensions DROP CONSTRAINT IF EXISTS website_modules_website_id_fkey;

ALTER TABLE website_extensions ADD CONSTRAINT website_extensions_extension_id_fkey
    FOREIGN KEY (extension_id) REFERENCES extensions(id) ON DELETE CASCADE;

ALTER TABLE website_extensions ADD CONSTRAINT website_extensions_website_id_fkey
    FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 6: Update unique constraints
-- ============================================================================

-- Drop old unique constraint and create new one
ALTER TABLE website_extensions DROP CONSTRAINT IF EXISTS website_modules_website_id_module_id_key;
ALTER TABLE website_extensions ADD CONSTRAINT website_extensions_website_id_extension_id_key 
    UNIQUE (website_id, extension_id);

-- ============================================================================
-- STEP 7: Rename indexes
-- ============================================================================

-- Rename indexes if they exist
ALTER INDEX IF EXISTS idx_website_modules_website_id RENAME TO idx_website_extensions_website_id;
ALTER INDEX IF EXISTS idx_website_modules_module_id RENAME TO idx_website_extensions_extension_id;
ALTER INDEX IF EXISTS idx_modules_slug RENAME TO idx_extensions_slug;
ALTER INDEX IF EXISTS idx_modules_category RENAME TO idx_extensions_category;

-- ============================================================================
-- STEP 8: Update notification category enum constraint
-- ============================================================================

-- Update the category check constraint to use 'extension' instead of 'module'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_category_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_category_check 
    CHECK (category IN ('system', 'account', 'website', 'extension', 'billing', 'analytics', 'security'));

-- Update existing notifications with 'module' category to 'extension'
UPDATE notifications SET category = 'extension' WHERE category = 'module';

-- ============================================================================
-- STEP 9: Update presets config to use "extensions" instead of "modules"
-- ============================================================================

-- Update the JSON structure in presets to use "extensions" key
UPDATE presets 
SET config = jsonb_set(
    config - 'modules',
    '{extensions}',
    COALESCE(config->'modules', '[]'::jsonb)
)
WHERE config ? 'modules';

-- ============================================================================
-- Done!
-- ============================================================================
