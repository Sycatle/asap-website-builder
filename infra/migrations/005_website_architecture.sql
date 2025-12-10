-- Migration: 005_website_architecture
-- Description: Refactor from Portfolio to Website architecture with modules and sections

-- ============================================================================
-- STEP 1: Create new tables structure
-- ============================================================================

-- Rename portfolios table to websites (preserving data)
ALTER TABLE portfolios RENAME TO websites;
ALTER TABLE portfolio_data RENAME TO website_data;

-- Rename foreign key columns
ALTER TABLE website_data RENAME COLUMN portfolio_id TO website_id;

-- Add new columns to websites table
ALTER TABLE websites ADD COLUMN creation_mode TEXT NOT NULL DEFAULT 'from_scratch' 
    CHECK (creation_mode IN ('from_scratch', 'from_preset'));
ALTER TABLE websites ADD COLUMN preset_id UUID;

-- Update modules table with new columns for the module catalog
ALTER TABLE modules ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';
ALTER TABLE modules ADD COLUMN IF NOT EXISTS default_settings JSONB NOT NULL DEFAULT '{}';

-- Update existing modules with slugs (if they don't have one)
UPDATE modules SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL;

-- ============================================================================
-- STEP 2: Create website_modules junction table (many-to-many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS website_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT true,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(website_id, module_id)
);

CREATE INDEX idx_website_modules_website_id ON website_modules(website_id);
CREATE INDEX idx_website_modules_module_id ON website_modules(module_id);

-- ============================================================================
-- STEP 3: Create website_sections table
-- ============================================================================

CREATE TABLE IF NOT EXISTS website_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
    section_type TEXT NOT NULL DEFAULT 'custom',
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    "order" INT NOT NULL DEFAULT 0,
    layout TEXT NOT NULL DEFAULT 'full',
    settings JSONB NOT NULL DEFAULT '{}',
    data JSONB NOT NULL DEFAULT '{}',
    visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(website_id, slug)
);

CREATE INDEX idx_website_sections_website_id ON website_sections(website_id);
CREATE INDEX idx_website_sections_order ON website_sections(website_id, "order");

-- ============================================================================
-- STEP 4: Create presets table
-- ============================================================================

CREATE TABLE IF NOT EXISTS presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general',
    config JSONB NOT NULL DEFAULT '{}',
    thumbnail_url TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_presets_enabled ON presets(enabled);
CREATE INDEX idx_presets_category ON presets(category);

-- Add foreign key for preset_id in websites
ALTER TABLE websites 
    ADD CONSTRAINT websites_preset_id_fkey 
    FOREIGN KEY (preset_id) REFERENCES presets(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 5: Insert default modules into catalog
-- ============================================================================

-- Insert or update default modules (using ON CONFLICT for idempotency)
INSERT INTO modules (name, slug, version, description, category, default_settings, enabled) VALUES
    ('GitHub Sync', 'github-sync', '1.0.0', 'Sync projects and repositories from GitHub', 'integration', '{"auto_sync": false, "include_forks": false}', true),
    ('Blog Engine', 'blog-engine', '1.0.0', 'Full-featured blog with posts and categories', 'content', '{"posts_per_page": 10, "enable_comments": false}', true),
    ('Contact Form', 'contact-form', '1.0.0', 'Professional contact form with spam protection', 'engagement', '{"require_captcha": true, "notify_email": true}', true),
    ('Analytics Tracker', 'analytics-tracker', '1.0.0', 'Track page views and user behavior', 'analytics', '{"track_events": true, "anonymous": true}', true),
    ('Theme Engine', 'theme-engine', '1.0.0', 'Customizable themes and styling options', 'appearance', '{"default_theme": "modern", "custom_css": true}', true)
ON CONFLICT (slug) DO UPDATE SET
    version = EXCLUDED.version,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    default_settings = EXCLUDED.default_settings;

-- ============================================================================
-- STEP 6: Insert default presets
-- ============================================================================

INSERT INTO presets (name, slug, description, category, config, enabled) VALUES
    ('Developer Portfolio', 'developer-portfolio', 'Perfect for developers to showcase their projects and skills', 'professional', 
    '{"modules": ["github-sync", "analytics-tracker", "theme-engine"], "sections": [{"section_type": "hero", "slug": "hero", "title": "Welcome", "order": 0, "layout": "full", "settings": {}}, {"section_type": "about", "slug": "about", "title": "About Me", "order": 1, "layout": "split", "settings": {}}, {"section_type": "projects", "slug": "projects", "title": "Projects", "order": 2, "layout": "grid", "settings": {}}, {"section_type": "skills", "slug": "skills", "title": "Skills", "order": 3, "layout": "grid", "settings": {}}, {"section_type": "contact", "slug": "contact", "title": "Contact", "order": 4, "layout": "full", "settings": {}}], "default_settings": {"theme": "modern"}}', true),
    
    ('Personal Blog', 'personal-blog', 'Clean and minimal blog layout for writers and content creators', 'content',
    '{"modules": ["blog-engine", "analytics-tracker", "theme-engine"], "sections": [{"section_type": "hero", "slug": "hero", "title": "Welcome to My Blog", "order": 0, "layout": "full", "settings": {}}, {"section_type": "blog", "slug": "posts", "title": "Latest Posts", "order": 1, "layout": "list", "settings": {}}, {"section_type": "about", "slug": "about", "title": "About", "order": 2, "layout": "split", "settings": {}}], "default_settings": {"theme": "minimal"}}', true),
    
    ('Business Landing Page', 'business-landing', 'Professional landing page for businesses and startups', 'business',
    '{"modules": ["contact-form", "analytics-tracker", "theme-engine"], "sections": [{"section_type": "hero", "slug": "hero", "title": "Welcome", "order": 0, "layout": "full", "settings": {}}, {"section_type": "services", "slug": "services", "title": "Our Services", "order": 1, "layout": "cards", "settings": {}}, {"section_type": "testimonials", "slug": "testimonials", "title": "What Our Clients Say", "order": 2, "layout": "cards", "settings": {}}, {"section_type": "pricing", "slug": "pricing", "title": "Pricing", "order": 3, "layout": "cards", "settings": {}}, {"section_type": "contact", "slug": "contact", "title": "Get in Touch", "order": 4, "layout": "split", "settings": {}}], "default_settings": {"theme": "corporate"}}', true),
    
    ('Creative Portfolio', 'creative-portfolio', 'Visual portfolio for designers, artists and photographers', 'creative',
    '{"modules": ["analytics-tracker", "theme-engine"], "sections": [{"section_type": "hero", "slug": "hero", "title": "Welcome", "order": 0, "layout": "full", "settings": {}}, {"section_type": "gallery", "slug": "work", "title": "My Work", "order": 1, "layout": "grid", "settings": {"columns": 3}}, {"section_type": "about", "slug": "about", "title": "About Me", "order": 2, "layout": "split", "settings": {}}, {"section_type": "contact", "slug": "contact", "title": "Contact", "order": 3, "layout": "full", "settings": {}}], "default_settings": {"theme": "gallery"}}', true),
    
    ('Blank Canvas', 'blank-canvas', 'Start from scratch with a completely empty website', 'other',
    '{"modules": ["theme-engine"], "sections": [], "default_settings": {"theme": "minimal"}}', true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    config = EXCLUDED.config;

-- ============================================================================
-- STEP 7: Migrate existing websites to assign default preset
-- ============================================================================

-- Set default preset for existing websites that don't have one
UPDATE websites 
SET preset_id = (SELECT id FROM presets WHERE slug = 'developer-portfolio'),
    creation_mode = 'from_preset'
WHERE preset_id IS NULL;

-- ============================================================================
-- STEP 8: Update indexes for renamed tables
-- ============================================================================

-- Drop old indexes and create new ones (if they exist with old names)
DROP INDEX IF EXISTS idx_portfolios_tenant_id;
DROP INDEX IF EXISTS idx_portfolios_slug;
DROP INDEX IF EXISTS idx_portfolios_status;

CREATE INDEX IF NOT EXISTS idx_websites_tenant_id ON websites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_websites_slug ON websites(slug);
CREATE INDEX IF NOT EXISTS idx_websites_status ON websites(status);
CREATE INDEX IF NOT EXISTS idx_websites_preset_id ON websites(preset_id);

-- ============================================================================
-- STEP 9: Enable RLS on new tables
-- ============================================================================

ALTER TABLE website_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_sections ENABLE ROW LEVEL SECURITY;
-- Presets are global, no RLS needed

-- ============================================================================
-- STEP 10: Create views for backward compatibility (optional)
-- ============================================================================

-- Create view for legacy portfolio access
CREATE OR REPLACE VIEW portfolios AS
SELECT 
    id,
    tenant_id,
    slug,
    title,
    tagline,
    status,
    metadata,
    created_at,
    updated_at
FROM websites;

CREATE OR REPLACE VIEW portfolio_data AS
SELECT 
    website_id as portfolio_id,
    data,
    updated_at
FROM website_data;
