-- Performance optimization indexes
-- Created: 2025-12-31

-- Index for case-insensitive email lookups (used in forgot_password, signup)
-- The existing idx_accounts_email doesn't work with LOWER(email) queries
CREATE INDEX IF NOT EXISTS idx_accounts_email_lower ON accounts(LOWER(email));

-- Index for public website lookups by slug + status
-- Hot path: every public site visit
CREATE INDEX IF NOT EXISTS idx_websites_slug_published ON websites(slug) WHERE status = 'published';

-- Index for refresh token lookups by token hash (used in token refresh)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash) WHERE revoked_at IS NULL;

-- Index for notification queue processing
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending ON notification_queue(created_at) WHERE processed_at IS NULL;

-- Index for push subscriptions by account (used in web_push)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_account ON push_subscriptions(account_id);
