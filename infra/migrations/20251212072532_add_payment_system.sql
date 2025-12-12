-- ============================================================================
-- Payment System - Stripe Integration
-- Description: Adds tables for user balance management and Stripe integration
-- ============================================================================

-- User balances table (in cents for precision)
CREATE TABLE user_balances (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance_cents BIGINT NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'EUR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT balance_non_negative CHECK (balance_cents >= 0)
);

-- Stripe customers table (links users to Stripe)
CREATE TABLE stripe_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment transactions table
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'refund')),
    amount_cents BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_charge_id TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT amount_positive CHECK (amount_cents > 0)
);

-- Indexes for performance
CREATE INDEX idx_user_balances_user_id ON user_balances(user_id);
CREATE INDEX idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);
CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX idx_payment_transactions_stripe_payment_intent ON payment_transactions(stripe_payment_intent_id);

-- Initialize balance for existing users
INSERT INTO user_balances (user_id, balance_cents, currency)
SELECT id, 0, 'EUR' FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Comment documentation
COMMENT ON TABLE user_balances IS 'Stores user credit balances in cents for precision';
COMMENT ON TABLE stripe_customers IS 'Maps ASAP users to Stripe customer IDs';
COMMENT ON TABLE payment_transactions IS 'Tracks all payment transactions (deposits, withdrawals, refunds)';
COMMENT ON COLUMN user_balances.balance_cents IS 'Balance in cents (100 cents = 1 EUR)';
COMMENT ON COLUMN payment_transactions.amount_cents IS 'Transaction amount in cents';
