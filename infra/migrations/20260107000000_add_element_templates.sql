-- ============================================
-- Element Templates: User-saved section configurations
-- ============================================
-- Allows users to save their configured sections as reusable templates
-- Templates store the section type, variant, and full settings snapshot

-- Element Templates table
CREATE TABLE IF NOT EXISTS element_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Template metadata
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Section configuration snapshot
    element_type VARCHAR(50) NOT NULL,  -- e.g., 'hero', 'features', 'pricing'
    variant VARCHAR(50),                 -- e.g., 'centered', 'split', 'minimal'
    settings JSONB NOT NULL DEFAULT '{}',
    
    -- Optional preview image (base64 or URL)
    preview_image TEXT,
    
    -- Organization
    tags TEXT[] DEFAULT '{}',
    is_favorite BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX idx_element_templates_account_id ON element_templates(account_id);
CREATE INDEX idx_element_templates_element_type ON element_templates(element_type);
CREATE INDEX idx_element_templates_tags ON element_templates USING GIN(tags);
CREATE INDEX idx_element_templates_created_at ON element_templates(created_at DESC);

-- RLS Policies for account isolation
ALTER TABLE element_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own templates
CREATE POLICY element_templates_select_policy ON element_templates
    FOR SELECT
    USING (account_id = current_setting('app.current_account_id', true)::uuid);

-- Policy: Users can only insert their own templates
CREATE POLICY element_templates_insert_policy ON element_templates
    FOR INSERT
    WITH CHECK (account_id = current_setting('app.current_account_id', true)::uuid);

-- Policy: Users can only update their own templates
CREATE POLICY element_templates_update_policy ON element_templates
    FOR UPDATE
    USING (account_id = current_setting('app.current_account_id', true)::uuid);

-- Policy: Users can only delete their own templates
CREATE POLICY element_templates_delete_policy ON element_templates
    FOR DELETE
    USING (account_id = current_setting('app.current_account_id', true)::uuid);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_element_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER element_templates_updated_at_trigger
    BEFORE UPDATE ON element_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_element_templates_updated_at();

-- Comments
COMMENT ON TABLE element_templates IS 'User-saved section configurations for reuse across websites';
COMMENT ON COLUMN element_templates.element_type IS 'Section type identifier (hero, features, pricing, etc.)';
COMMENT ON COLUMN element_templates.variant IS 'Visual variant of the section (centered, split, minimal, etc.)';
COMMENT ON COLUMN element_templates.settings IS 'Complete section settings snapshot as JSONB';
COMMENT ON COLUMN element_templates.preview_image IS 'Optional thumbnail preview (base64 data URL or external URL)';
COMMENT ON COLUMN element_templates.tags IS 'User-defined tags for organization and filtering';
