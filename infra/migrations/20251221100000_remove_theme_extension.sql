-- Migration: Remove theme-engine extension and make administrators a core extension
-- Date: 2024-12-21

-- ============================================================================
-- 1. Remove theme-engine extension
-- ============================================================================

-- First remove any website_extensions referencing theme-engine
DELETE FROM website_extensions 
WHERE extension_id IN (SELECT id FROM extensions WHERE slug = 'theme-engine');

-- Then remove the extension itself
DELETE FROM extensions WHERE slug = 'theme-engine';

-- ============================================================================
-- 2. Update administrators to be a system extension (not user activatable)
-- ============================================================================

-- Mark administrators as a system extension
UPDATE extensions 
SET 
    category = 'system',
    updated_at = now()
WHERE slug = 'administrators';

-- Note: Core extensions like administrators should always be available
-- The frontend will check user_configurable flag from the catalog
-- to determine if extension appears in the "Add Extensions" list
