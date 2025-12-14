-- Migration: Rename all user columns to account
-- Description: Complete the migration by renaming user_id columns to account_id throughout the database

-- Step 1: Rename user_data table to account_data
ALTER TABLE user_data RENAME TO account_data;
ALTER TABLE account_data RENAME COLUMN user_id TO account_id;

-- Update constraint
ALTER TABLE account_data DROP CONSTRAINT IF EXISTS user_data_user_id_fkey;
ALTER TABLE account_data DROP CONSTRAINT IF EXISTS user_data_pkey;
ALTER TABLE account_data ADD CONSTRAINT account_data_pkey PRIMARY KEY (account_id);
ALTER TABLE account_data ADD CONSTRAINT account_data_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- Step 2: Rename user_id column in files table
ALTER TABLE files RENAME COLUMN user_id TO account_id;

-- Update constraint
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_user_id_fkey;
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_account_id_fkey;
ALTER TABLE files ADD CONSTRAINT files_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- Step 3: Rename user_id column in file_operations_audit table
ALTER TABLE file_operations_audit RENAME COLUMN user_id TO account_id;

-- Update constraint
ALTER TABLE file_operations_audit DROP CONSTRAINT IF EXISTS file_operations_audit_user_id_fkey;
ALTER TABLE file_operations_audit DROP CONSTRAINT IF EXISTS file_operations_audit_account_id_fkey;
ALTER TABLE file_operations_audit ADD CONSTRAINT file_operations_audit_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- Step 4: Update indexes
DROP INDEX IF EXISTS idx_files_user_id;
CREATE INDEX IF NOT EXISTS idx_files_account_id ON files(account_id);

DROP INDEX IF EXISTS idx_file_operations_audit_user_id;
CREATE INDEX IF NOT EXISTS idx_file_operations_audit_account_id ON file_operations_audit(account_id);

-- Step 5: Add comments
COMMENT ON TABLE account_data IS 'Extended account information stored in JSONB format';
COMMENT ON COLUMN account_data.account_id IS 'Account that owns this data';
COMMENT ON COLUMN files.account_id IS 'Account that owns this file';
COMMENT ON COLUMN file_operations_audit.account_id IS 'Account that performed the file operation';
