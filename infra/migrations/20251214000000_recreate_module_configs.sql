-- Migration: Recreate module_configs table with account_id
-- Description: Recreate module_configs table that was removed, using account_id instead of tenant_id

-- Recreate module_configs table
CREATE TABLE IF NOT EXISTS module_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    config JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT module_configs_account_module_unique UNIQUE(account_id, module_id)
);

-- Create index on account_id
CREATE INDEX IF NOT EXISTS idx_module_configs_account_id ON module_configs(account_id);

-- Create index on module_id
CREATE INDEX IF NOT EXISTS idx_module_configs_module_id ON module_configs(module_id);

-- Add comment
COMMENT ON TABLE module_configs IS 'Module configuration per account';
COMMENT ON COLUMN module_configs.account_id IS 'Account that owns this module configuration';
COMMENT ON COLUMN module_configs.module_id IS 'Module being configured';
COMMENT ON COLUMN module_configs.config IS 'JSON configuration for the module';
