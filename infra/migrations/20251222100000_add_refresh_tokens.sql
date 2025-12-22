-- Migration: Add refresh tokens for JWT rotation/revocation
-- This enables secure token refresh and logout functionality

-- Refresh tokens table
-- Stores hashed refresh tokens with rotation support and revocation
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    -- Store hash of token, never raw token
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    -- Token family for rotation tracking (detect token reuse)
    family_id UUID NOT NULL,
    -- Previous token in rotation chain (for detecting stolen tokens)
    parent_id UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL,
    -- Expiration (longer than access token, e.g., 7 days)
    expires_at TIMESTAMPTZ NOT NULL,
    -- Revocation timestamp (null if valid)
    revoked_at TIMESTAMPTZ,
    -- Revocation reason for audit
    revoked_reason VARCHAR(100),
    -- Client info for security auditing
    user_agent TEXT,
    ip_address VARCHAR(45),
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_account_id ON refresh_tokens(account_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id ON refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Token blacklist for revoked access tokens (optional, for immediate revocation)
-- This is a lightweight table for critical token revocations
CREATE TABLE IF NOT EXISTS revoked_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- JWT ID (jti) claim for unique identification
    jti VARCHAR(36) NOT NULL UNIQUE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    -- When the access token expires (auto-cleanup after this)
    expires_at TIMESTAMPTZ NOT NULL,
    -- Revocation timestamp
    revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Revocation reason
    reason VARCHAR(100)
);

-- Index for efficient blacklist checking
CREATE INDEX IF NOT EXISTS idx_revoked_access_tokens_jti ON revoked_access_tokens(jti);
CREATE INDEX IF NOT EXISTS idx_revoked_access_tokens_expires_at ON revoked_access_tokens(expires_at);

-- Function to clean up expired tokens (call periodically via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_refresh INTEGER;
    deleted_blacklist INTEGER;
BEGIN
    -- Delete expired refresh tokens
    DELETE FROM refresh_tokens WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_refresh = ROW_COUNT;
    
    -- Delete expired blacklisted access tokens
    DELETE FROM revoked_access_tokens WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_blacklist = ROW_COUNT;
    
    RETURN deleted_refresh + deleted_blacklist;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE refresh_tokens IS 'Stores hashed refresh tokens for JWT rotation and secure logout';
COMMENT ON TABLE revoked_access_tokens IS 'Blacklist for revoked access tokens that need immediate invalidation';
COMMENT ON COLUMN refresh_tokens.family_id IS 'Groups tokens in a rotation chain - all revoked if reuse detected';
COMMENT ON COLUMN refresh_tokens.parent_id IS 'Links to previous token in rotation - enables stolen token detection';
