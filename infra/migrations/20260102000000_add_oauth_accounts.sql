-- OAuth accounts table for storing linked OAuth providers
-- Supports Google, GitHub, LinkedIn and future providers

CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Provider identification
    provider VARCHAR(50) NOT NULL,           -- 'google', 'github', 'linkedin'
    provider_user_id VARCHAR(255) NOT NULL,  -- User ID from the provider
    
    -- User info from provider (for display/fallback)
    email VARCHAR(255),
    name VARCHAR(255),
    avatar_url TEXT,
    
    -- OAuth tokens (optional - for API access to provider)
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    
    -- Metadata
    raw_user_info JSONB,  -- Full user info response from provider
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Each provider account can only be linked once
    CONSTRAINT unique_provider_user UNIQUE(provider, provider_user_id)
);

-- Indexes for efficient lookups
CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX idx_oauth_accounts_provider ON oauth_accounts(provider, provider_user_id);
CREATE INDEX idx_oauth_accounts_email ON oauth_accounts(email);

-- OAuth state table for CSRF protection during OAuth flow
CREATE TABLE oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state VARCHAR(255) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL,
    redirect_url TEXT,                       -- Where to redirect after OAuth
    user_id UUID REFERENCES accounts(id) ON DELETE CASCADE,  -- For linking to existing account
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes'
);

-- Auto-cleanup of expired states
CREATE INDEX idx_oauth_states_expires ON oauth_states(expires_at);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_oauth_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_oauth_accounts_updated_at
    BEFORE UPDATE ON oauth_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_oauth_accounts_updated_at();

-- Comment for documentation
COMMENT ON TABLE oauth_accounts IS 'Stores linked OAuth provider accounts for SSO login';
COMMENT ON TABLE oauth_states IS 'Temporary storage for OAuth CSRF states (auto-expires after 10 minutes)';
