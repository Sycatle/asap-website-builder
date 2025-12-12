-- ============================================================================
-- Payment Integration - Phase 1: Native SaaS with Stripe
-- Description: Add payment fields to tenants and create payment_events table
-- ============================================================================

-- Add payment fields to tenants table
ALTER TABLE tenants 
    ADD COLUMN stripe_customer_id TEXT,
    ADD COLUMN plan_status TEXT DEFAULT 'inactive' 
        CHECK (plan_status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid', 'inactive')),
    ADD COLUMN current_period_end TIMESTAMPTZ;

-- Add index on stripe_customer_id for fast lookups
CREATE INDEX idx_tenants_stripe_customer_id ON tenants(stripe_customer_id);

-- Add index on plan_status for filtering active/inactive accounts
CREATE INDEX idx_tenants_plan_status ON tenants(plan_status);

-- Create payment_events table for idempotency and webhook tracking
CREATE TABLE payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for payment_events
CREATE INDEX idx_payment_events_event_id ON payment_events(event_id);
CREATE INDEX idx_payment_events_tenant_id ON payment_events(tenant_id);
CREATE INDEX idx_payment_events_processed_at ON payment_events(processed_at);
CREATE INDEX idx_payment_events_unprocessed ON payment_events(created_at) 
    WHERE processed_at IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN tenants.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN tenants.plan_status IS 'Current subscription status from Stripe';
COMMENT ON COLUMN tenants.current_period_end IS 'End of current billing period';
COMMENT ON TABLE payment_events IS 'Webhook events from payment provider for idempotency';
COMMENT ON COLUMN payment_events.event_id IS 'Unique event ID from payment provider';
COMMENT ON COLUMN payment_events.payload_hash IS 'SHA256 hash of event payload for deduplication';
COMMENT ON COLUMN payment_events.processed_at IS 'Timestamp when event was processed';
