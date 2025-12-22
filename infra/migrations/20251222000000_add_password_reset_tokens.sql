-- Migration: Add password reset tokens table
-- This table stores temporary tokens for password reset requests

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Index for fast token lookup
    CONSTRAINT unique_active_token UNIQUE (account_id, token_hash)
);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at 
    ON password_reset_tokens(expires_at);

-- Index for looking up tokens by account
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_account_id 
    ON password_reset_tokens(account_id);

-- Comment on table
COMMENT ON TABLE password_reset_tokens IS 'Stores temporary tokens for password reset requests. Tokens are hashed for security.';
