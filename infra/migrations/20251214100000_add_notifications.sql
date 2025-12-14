-- ============================================================================
-- ASAP Platform - Notifications System Migration
-- Version: 1.0.0
-- Description: Add notifications, push subscriptions, and settings tables
-- ============================================================================

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL DEFAULT 'custom',
    category TEXT NOT NULL DEFAULT 'system' CHECK (category IN ('system', 'account', 'website', 'module', 'billing', 'analytics', 'security')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    read BOOLEAN NOT NULL DEFAULT false,
    action_url TEXT,
    icon TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_account_id ON notifications(account_id);
CREATE INDEX IF NOT EXISTS idx_notifications_account_read ON notifications(account_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_account_created ON notifications(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);

-- ============================================================================
-- PUSH SUBSCRIPTIONS TABLE
-- For Web Push notifications (PWA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    UNIQUE(account_id, endpoint)
);

-- Index for finding subscriptions by account
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_account_id ON push_subscriptions(account_id);

-- ============================================================================
-- NOTIFICATION SETTINGS TABLE
-- Per-account notification preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_settings (
    account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    push_enabled BOOLEAN NOT NULL DEFAULT true,
    email_enabled BOOLEAN NOT NULL DEFAULT false,
    enabled_categories JSONB NOT NULL DEFAULT '["system", "account", "website", "billing", "security"]'::jsonb,
    quiet_hours_start TEXT, -- Time format: "HH:MM"
    quiet_hours_end TEXT,   -- Time format: "HH:MM"
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- VAPID KEYS TABLE
-- For storing Web Push VAPID keys (global)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vapid_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'default' UNIQUE,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comment on tables
COMMENT ON TABLE notifications IS 'Account notifications for in-app and push delivery';
COMMENT ON TABLE push_subscriptions IS 'Web Push subscription data for PWA notifications';
COMMENT ON TABLE notification_settings IS 'Per-account notification preferences';
COMMENT ON TABLE vapid_keys IS 'VAPID keys for Web Push authentication';

-- ============================================================================
-- Function to cleanup old read notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE read = true 
    AND created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_notifications IS 'Removes read notifications older than specified days';
