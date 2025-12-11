-- Migration: 007_tenant_modules
-- Description: Link modules to tenants instead of websites

-- ============================================================================
-- STEP 1: Create tenant_modules table
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT true,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, module_id)
);

CREATE INDEX idx_tenant_modules_tenant_id ON tenant_modules(tenant_id);
CREATE INDEX idx_tenant_modules_module_id ON tenant_modules(module_id);

-- ============================================================================
-- STEP 2: Migrate existing website_modules to tenant_modules
-- ============================================================================

-- Copy existing module activations from website_modules to tenant_modules
-- (using the tenant_id from the website)
INSERT INTO tenant_modules (tenant_id, module_id, settings, enabled, activated_at, updated_at)
SELECT DISTINCT w.tenant_id, wm.module_id, wm.settings, wm.enabled, wm.activated_at, wm.updated_at
FROM website_modules wm
JOIN websites w ON wm.website_id = w.id
ON CONFLICT (tenant_id, module_id) DO NOTHING;

-- ============================================================================
-- STEP 3: Add sidebar_order and sidebar_icon to modules
-- ============================================================================

ALTER TABLE modules ADD COLUMN IF NOT EXISTS sidebar_order INT DEFAULT 100;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS sidebar_label TEXT;

-- Set sidebar labels and order for existing modules
UPDATE modules SET sidebar_label = 'GitHub', sidebar_order = 10 WHERE slug = 'github-sync';
UPDATE modules SET sidebar_label = 'Blog', sidebar_order = 20 WHERE slug = 'blog-engine';
UPDATE modules SET sidebar_label = 'Contact', sidebar_order = 30 WHERE slug = 'contact-form';
UPDATE modules SET sidebar_label = 'Analytics', sidebar_order = 40 WHERE slug = 'analytics-tracker';
UPDATE modules SET sidebar_label = 'Thème', sidebar_order = 50 WHERE slug = 'theme-engine';

-- ============================================================================
-- STEP 4: Enable RLS on tenant_modules
-- ============================================================================

ALTER TABLE tenant_modules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see/modify their own tenant's modules
CREATE POLICY tenant_modules_tenant_isolation ON tenant_modules
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
