-- ============================================================================
-- Migration: Add Website Administrators
-- Version: 1.0.0
-- Description: Adds multi-user administration for websites with roles & permissions
-- ============================================================================

-- ============================================================================
-- STEP 1: Create administrators table
-- ============================================================================

CREATE TABLE IF NOT EXISTS website_administrators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    permissions JSONB NOT NULL DEFAULT '{
        "website": {
            "edit_settings": false,
            "publish": false,
            "delete": false
        },
        "content": {
            "create": false,
            "edit": false,
            "delete": false
        },
        "extensions": {
            "manage": false,
            "configure": false
        },
        "administrators": {
            "view": false,
            "invite": false,
            "remove": false
        }
    }',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'revoked')),
    invited_by UUID REFERENCES accounts(id) ON DELETE SET NULL,
    invitation_token UUID DEFAULT gen_random_uuid(),
    invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    last_access_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Unique constraint: one entry per email per website
    UNIQUE(website_id, email)
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

CREATE INDEX idx_website_administrators_website_id ON website_administrators(website_id);
CREATE INDEX idx_website_administrators_account_id ON website_administrators(account_id);
CREATE INDEX idx_website_administrators_email ON website_administrators(email);
CREATE INDEX idx_website_administrators_status ON website_administrators(status);
CREATE INDEX idx_website_administrators_invitation_token ON website_administrators(invitation_token);

-- ============================================================================
-- STEP 3: Create function to auto-create owner when website is created
-- ============================================================================

CREATE OR REPLACE FUNCTION create_website_owner()
RETURNS TRIGGER AS $$
DECLARE
    owner_email TEXT;
BEGIN
    -- Get the owner's email from the account
    SELECT a.email INTO owner_email
    FROM accounts a
    WHERE a.id = NEW.account_id;
    
    -- Insert the owner as administrator
    INSERT INTO website_administrators (
        website_id,
        account_id,
        email,
        role,
        permissions,
        status,
        invited_by,
        accepted_at
    )
    VALUES (
        NEW.id,
        NEW.account_id,
        owner_email,
        'owner',
        '{
            "website": {
                "edit_settings": true,
                "publish": true,
                "delete": true
            },
            "content": {
                "create": true,
                "edit": true,
                "delete": true
            },
            "extensions": {
                "manage": true,
                "configure": true
            },
            "administrators": {
                "view": true,
                "invite": true,
                "remove": true
            }
        }'::jsonb,
        'active',
        NEW.account_id,
        now()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Create trigger to auto-create owner
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_create_website_owner ON websites;
CREATE TRIGGER trigger_create_website_owner
    AFTER INSERT ON websites
    FOR EACH ROW
    EXECUTE FUNCTION create_website_owner();

-- ============================================================================
-- STEP 5: Backfill owners for existing websites
-- ============================================================================

INSERT INTO website_administrators (
    website_id,
    account_id,
    email,
    role,
    permissions,
    status,
    invited_by,
    accepted_at
)
SELECT 
    w.id,
    w.account_id,
    a.email,
    'owner',
    '{
        "website": {
            "edit_settings": true,
            "publish": true,
            "delete": true
        },
        "content": {
            "create": true,
            "edit": true,
            "delete": true
        },
        "extensions": {
            "manage": true,
            "configure": true
        },
        "administrators": {
            "view": true,
            "invite": true,
            "remove": true
        }
    }'::jsonb,
    'active',
    w.account_id,
    now()
FROM websites w
JOIN accounts a ON a.id = w.account_id
WHERE NOT EXISTS (
    SELECT 1 FROM website_administrators wa 
    WHERE wa.website_id = w.id AND wa.role = 'owner'
);

-- ============================================================================
-- STEP 6: Create audit log table for administrator actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS administrator_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    administrator_id UUID REFERENCES website_administrators(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('invited', 'accepted', 'permissions_changed', 'role_changed', 'revoked', 'reactivated', 'removed')),
    details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_administrator_audit_log_website_id ON administrator_audit_log(website_id);
CREATE INDEX idx_administrator_audit_log_administrator_id ON administrator_audit_log(administrator_id);
CREATE INDEX idx_administrator_audit_log_created_at ON administrator_audit_log(created_at);

-- ============================================================================
-- STEP 7: Helper function to get role permissions template
-- ============================================================================

CREATE OR REPLACE FUNCTION get_role_permissions(role_name TEXT)
RETURNS JSONB AS $$
BEGIN
    RETURN CASE role_name
        WHEN 'owner' THEN '{
            "website": {"edit_settings": true, "publish": true, "delete": true},
            "content": {"create": true, "edit": true, "delete": true},
            "extensions": {"manage": true, "configure": true},
            "administrators": {"view": true, "invite": true, "remove": true}
        }'::jsonb
        WHEN 'admin' THEN '{
            "website": {"edit_settings": true, "publish": true, "delete": false},
            "content": {"create": true, "edit": true, "delete": true},
            "extensions": {"manage": true, "configure": true},
            "administrators": {"view": true, "invite": true, "remove": false}
        }'::jsonb
        WHEN 'editor' THEN '{
            "website": {"edit_settings": false, "publish": false, "delete": false},
            "content": {"create": true, "edit": true, "delete": false},
            "extensions": {"manage": false, "configure": false},
            "administrators": {"view": true, "invite": false, "remove": false}
        }'::jsonb
        WHEN 'viewer' THEN '{
            "website": {"edit_settings": false, "publish": false, "delete": false},
            "content": {"create": false, "edit": false, "delete": false},
            "extensions": {"manage": false, "configure": false},
            "administrators": {"view": true, "invite": false, "remove": false}
        }'::jsonb
        ELSE '{}'::jsonb
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
