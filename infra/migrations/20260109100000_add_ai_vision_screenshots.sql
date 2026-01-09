-- AI Vision Screenshots
-- Temporary storage for preview screenshots used in AI visual analysis
-- Screenshots are stored with a TTL and automatically cleaned up

CREATE TABLE IF NOT EXISTS ai_screenshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    
    -- Screenshot metadata
    viewport VARCHAR(20) NOT NULL DEFAULT 'desktop', -- desktop, tablet, mobile
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL DEFAULT 'image/png',
    
    -- Image data (stored as bytea for simplicity)
    -- In production, consider moving to R2/S3 for large files
    data BYTEA NOT NULL,
    
    -- TTL management
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cleanup job
CREATE INDEX idx_ai_screenshots_expires_at ON ai_screenshots(expires_at);

-- Index for user lookups
CREATE INDEX idx_ai_screenshots_account ON ai_screenshots(account_id);

-- Index for website lookups
CREATE INDEX idx_ai_screenshots_website ON ai_screenshots(website_id);

-- RLS policy: Users can only access their own screenshots
ALTER TABLE ai_screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_screenshots_isolation ON ai_screenshots
    USING (account_id = current_setting('app.current_account_id', true)::UUID);

-- Cleanup function to remove expired screenshots
CREATE OR REPLACE FUNCTION cleanup_expired_ai_screenshots()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ai_screenshots WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON TABLE ai_screenshots IS 'Temporary storage for AI vision analysis screenshots with automatic expiration';
