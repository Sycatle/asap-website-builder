-- ============================================================================
-- Architecture Simplification Migration
-- Description: Remove tenants, rename users to accounts, simplify structure
-- ============================================================================

-- Step 1: Drop all RLS policies that reference tenant_id
DROP POLICY IF EXISTS tenant_modules_tenant_isolation ON tenant_modules;

-- Step 2: Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE websites DISABLE ROW LEVEL SECURITY;
ALTER TABLE website_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE website_modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE website_sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE module_configs DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop tenant-specific tables
DROP TABLE IF EXISTS tenant_modules CASCADE;
DROP TABLE IF EXISTS module_configs CASCADE;

-- Step 4: Drop foreign key constraints that reference tenants
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tenant_id_fkey;
ALTER TABLE websites DROP CONSTRAINT IF EXISTS websites_tenant_id_fkey;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_tenant_id_fkey;
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_owner_id_fkey;

-- Step 5: Rename users table to accounts
ALTER TABLE users RENAME TO accounts;

-- Step 6: Add payment fields to accounts (if not exist)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plan_status TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- Step 7: Remove tenant_id from accounts
ALTER TABLE accounts DROP COLUMN IF EXISTS tenant_id;

-- Step 8: Rename user_data table to account_data
ALTER TABLE user_data RENAME TO account_data;
ALTER TABLE account_data RENAME COLUMN user_id TO account_id;
ALTER TABLE account_data DROP CONSTRAINT IF EXISTS user_data_user_id_fkey;
ALTER TABLE account_data DROP CONSTRAINT IF EXISTS user_data_pkey;
ALTER TABLE account_data ADD CONSTRAINT account_data_pkey PRIMARY KEY (account_id);
ALTER TABLE account_data ADD CONSTRAINT account_data_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- Step 9: Update websites table to use account_id
ALTER TABLE websites RENAME COLUMN tenant_id TO account_id;
ALTER TABLE websites ADD CONSTRAINT websites_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- Step 10: Update events table to use account_id
ALTER TABLE events RENAME COLUMN tenant_id TO account_id;
ALTER TABLE events ADD CONSTRAINT events_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- Step 11: Update files table constraint
-- Note: Column name stays as user_id for minimal changes, but now references accounts
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_user_id_fkey;
ALTER TABLE files ADD CONSTRAINT files_account_id_fkey 
    FOREIGN KEY (user_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- Step 12: Update user_storage_quota table
ALTER TABLE user_storage_quota RENAME TO account_storage_quota;
ALTER TABLE account_storage_quota RENAME COLUMN user_id TO account_id;
ALTER TABLE account_storage_quota DROP CONSTRAINT IF EXISTS user_storage_quota_user_id_fkey;
ALTER TABLE account_storage_quota DROP CONSTRAINT IF EXISTS user_storage_quota_pkey;
ALTER TABLE account_storage_quota ADD CONSTRAINT account_storage_quota_pkey PRIMARY KEY (account_id);
ALTER TABLE account_storage_quota ADD CONSTRAINT account_storage_quota_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- Step 13: Update file_operations_audit constraint
-- Note: Column name stays as user_id for minimal changes, but now references accounts
ALTER TABLE file_operations_audit DROP CONSTRAINT IF EXISTS file_operations_audit_user_id_fkey;
ALTER TABLE file_operations_audit ADD CONSTRAINT file_operations_audit_account_id_fkey 
    FOREIGN KEY (user_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- Step 14: Drop payment_events tenant_id constraint
ALTER TABLE payment_events DROP CONSTRAINT IF EXISTS payment_events_tenant_id_fkey;
ALTER TABLE payment_events RENAME COLUMN tenant_id TO account_id;
ALTER TABLE payment_events ADD CONSTRAINT payment_events_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- Step 15: Drop the tenants table completely
DROP TABLE IF EXISTS tenants CASCADE;

-- Step 16: Recreate indexes with new names
DROP INDEX IF EXISTS idx_users_tenant_id;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_websites_tenant_id;
DROP INDEX IF EXISTS idx_websites_tenant_status;
DROP INDEX IF EXISTS idx_events_tenant_id;
DROP INDEX IF EXISTS idx_events_tenant_type_time;
DROP INDEX IF EXISTS idx_tenant_modules_tenant_id;
DROP INDEX IF EXISTS idx_tenant_modules_module_id;
DROP INDEX IF EXISTS idx_module_configs_tenant_id;
DROP INDEX IF EXISTS idx_tenants_stripe_customer_id;
DROP INDEX IF EXISTS idx_tenants_plan_status;
DROP INDEX IF EXISTS idx_payment_events_tenant_id;

-- Create new indexes for accounts
CREATE INDEX idx_accounts_email ON accounts(email);
CREATE INDEX idx_accounts_stripe_customer_id ON accounts(stripe_customer_id);
CREATE INDEX idx_accounts_plan_status ON accounts(plan_status);

-- Update website indexes
CREATE INDEX idx_websites_account_id ON websites(account_id);
CREATE INDEX idx_websites_account_status ON websites(account_id, status);

-- Update event indexes
CREATE INDEX idx_events_account_id ON events(account_id);
CREATE INDEX idx_events_account_type_time ON events(account_id, event_type, created_at DESC);

-- Update payment_events indexes
CREATE INDEX idx_payment_events_account_id ON payment_events(account_id);

-- Step 17: Update trigger function name
DROP TRIGGER IF EXISTS trigger_user_storage_quota_updated_at ON user_storage_quota;
CREATE TRIGGER trigger_account_storage_quota_updated_at
BEFORE UPDATE ON account_storage_quota
FOR EACH ROW
EXECUTE FUNCTION update_user_storage_quota_timestamp();

-- Step 18: Add comments for documentation
COMMENT ON TABLE accounts IS 'User accounts with authentication and billing information';
COMMENT ON COLUMN accounts.plan IS 'Subscription plan (free, pro, etc.)';
COMMENT ON COLUMN accounts.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN accounts.plan_status IS 'Current subscription status';
COMMENT ON COLUMN accounts.current_period_end IS 'End of current billing period';
COMMENT ON TABLE account_data IS 'Extended account information stored as JSONB';
COMMENT ON TABLE websites IS 'Websites owned by accounts';
COMMENT ON COLUMN websites.account_id IS 'Account that owns this website';
COMMENT ON TABLE events IS 'System events for accounts';
COMMENT ON COLUMN events.account_id IS 'Account associated with this event';

-- Step 19: Re-enable RLS on relevant tables (with updated policies if needed)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
