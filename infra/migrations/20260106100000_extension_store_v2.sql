-- ============================================================================
-- Migration: Extension Store v2 - New Schema (Coexistence)
-- Version: 2.0.0
-- Description: Creates new Extension Store tables alongside existing ones
--              for safe migration. Old tables remain functional.
-- ============================================================================

-- ============================================================================
-- STEP 1: Create extensions_v2 table (Extension catalog)
-- ============================================================================

CREATE TABLE IF NOT EXISTS extensions_v2 (
    -- Identity
    slug VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL,
    
    -- Display info
    description TEXT NOT NULL,
    long_description TEXT,
    icon VARCHAR(255),
    banner VARCHAR(255),
    
    -- Classification
    category VARCHAR(50) NOT NULL DEFAULT 'utility',
    tags TEXT[] DEFAULT '{}',
    
    -- Requirements
    min_plan VARCHAR(20) NOT NULL DEFAULT 'free',
    min_core_version VARCHAR(20),
    
    -- Author info
    author_name VARCHAR(100),
    author_email VARCHAR(255),
    author_url VARCHAR(255),
    author_verified BOOLEAN DEFAULT FALSE,
    
    -- URLs
    repository VARCHAR(255),
    homepage VARCHAR(255),
    documentation VARCHAR(255),
    
    -- Store metadata
    featured BOOLEAN DEFAULT FALSE,
    beta BOOLEAN DEFAULT FALSE,
    deprecated BOOLEAN DEFAULT FALSE,
    successor_slug VARCHAR(64) REFERENCES extensions_v2(slug),
    
    -- Stats (denormalized for performance)
    install_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    
    -- Full manifest as JSONB (single source of truth)
    manifest JSONB NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT extensions_v2_category_check CHECK (
        category IN ('utility', 'integration', 'analytics', 'marketing', 
                     'design', 'seo', 'security', 'performance', 'social', 'ai')
    ),
    CONSTRAINT extensions_v2_min_plan_check CHECK (
        min_plan IN ('free', 'starter', 'pro', 'business')
    ),
    CONSTRAINT extensions_v2_status_check CHECK (
        status IN ('draft', 'active', 'deprecated', 'archived')
    )
);

-- ============================================================================
-- STEP 2: Create account_extensions table (Installed extensions per account)
-- ============================================================================

CREATE TABLE IF NOT EXISTS account_extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    extension_slug VARCHAR(64) NOT NULL REFERENCES extensions_v2(slug) ON DELETE CASCADE,
    
    -- Installation info
    installed_version VARCHAR(20) NOT NULL,
    
    -- Account-level settings (global config for this extension)
    settings JSONB NOT NULL DEFAULT '{}',
    
    -- Permissions granted at install time
    granted_permissions TEXT[] DEFAULT '{}',
    
    -- Status
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Timestamps
    installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique: one installation per account per extension
    CONSTRAINT account_extensions_unique UNIQUE (account_id, extension_slug)
);

-- ============================================================================
-- STEP 3: Create website_extensions_v2 table (Activated extensions per website)
-- ============================================================================

CREATE TABLE IF NOT EXISTS website_extensions_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    account_extension_id UUID NOT NULL REFERENCES account_extensions(id) ON DELETE CASCADE,
    
    -- Website-specific settings (overrides account-level)
    settings JSONB NOT NULL DEFAULT '{}',
    
    -- Status
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Timestamps
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique: one activation per website per extension
    CONSTRAINT website_extensions_v2_unique UNIQUE (website_id, account_extension_id)
);

-- ============================================================================
-- STEP 4: Create extension_settings_migrations table (Track migrations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS extension_settings_migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- What was migrated
    account_extension_id UUID NOT NULL REFERENCES account_extensions(id) ON DELETE CASCADE,
    
    -- Version transition
    from_version VARCHAR(20) NOT NULL,
    to_version VARCHAR(20) NOT NULL,
    
    -- Backup of old settings
    old_settings JSONB NOT NULL,
    new_settings JSONB NOT NULL,
    
    -- Migration metadata
    migration_script TEXT,
    
    -- Timestamp
    migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- STEP 5: Create extension_reviews table (User reviews)
-- ============================================================================

CREATE TABLE IF NOT EXISTS extension_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    extension_slug VARCHAR(64) NOT NULL REFERENCES extensions_v2(slug) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    body TEXT,
    
    -- Moderation
    status VARCHAR(20) NOT NULL DEFAULT 'published',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One review per account per extension
    CONSTRAINT extension_reviews_unique UNIQUE (extension_slug, account_id),
    CONSTRAINT extension_reviews_status_check CHECK (
        status IN ('pending', 'published', 'hidden', 'flagged')
    )
);

-- ============================================================================
-- STEP 6: Create indexes for performance
-- ============================================================================

-- extensions_v2 indexes
CREATE INDEX IF NOT EXISTS idx_extensions_v2_category ON extensions_v2(category);
CREATE INDEX IF NOT EXISTS idx_extensions_v2_status ON extensions_v2(status);
CREATE INDEX IF NOT EXISTS idx_extensions_v2_featured ON extensions_v2(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_extensions_v2_tags ON extensions_v2 USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_extensions_v2_min_plan ON extensions_v2(min_plan);
CREATE INDEX IF NOT EXISTS idx_extensions_v2_install_count ON extensions_v2(install_count DESC);
CREATE INDEX IF NOT EXISTS idx_extensions_v2_rating ON extensions_v2(rating_average DESC);

-- account_extensions indexes
CREATE INDEX IF NOT EXISTS idx_account_extensions_account ON account_extensions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_extensions_slug ON account_extensions(extension_slug);
CREATE INDEX IF NOT EXISTS idx_account_extensions_enabled ON account_extensions(enabled) WHERE enabled = TRUE;

-- website_extensions_v2 indexes
CREATE INDEX IF NOT EXISTS idx_website_extensions_v2_website ON website_extensions_v2(website_id);
CREATE INDEX IF NOT EXISTS idx_website_extensions_v2_account_ext ON website_extensions_v2(account_extension_id);
CREATE INDEX IF NOT EXISTS idx_website_extensions_v2_enabled ON website_extensions_v2(enabled) WHERE enabled = TRUE;

-- extension_reviews indexes
CREATE INDEX IF NOT EXISTS idx_extension_reviews_slug ON extension_reviews(extension_slug);
CREATE INDEX IF NOT EXISTS idx_extension_reviews_account ON extension_reviews(account_id);
CREATE INDEX IF NOT EXISTS idx_extension_reviews_rating ON extension_reviews(rating);

-- ============================================================================
-- STEP 7: Create helper functions
-- ============================================================================

-- Function to update extension stats after review changes
CREATE OR REPLACE FUNCTION update_extension_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE extensions_v2
        SET 
            rating_average = (
                SELECT COALESCE(AVG(rating), 0)
                FROM extension_reviews
                WHERE extension_slug = NEW.extension_slug
                AND status = 'published'
            ),
            rating_count = (
                SELECT COUNT(*)
                FROM extension_reviews
                WHERE extension_slug = NEW.extension_slug
                AND status = 'published'
            ),
            updated_at = NOW()
        WHERE slug = NEW.extension_slug;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE extensions_v2
        SET 
            rating_average = (
                SELECT COALESCE(AVG(rating), 0)
                FROM extension_reviews
                WHERE extension_slug = OLD.extension_slug
                AND status = 'published'
            ),
            rating_count = (
                SELECT COUNT(*)
                FROM extension_reviews
                WHERE extension_slug = OLD.extension_slug
                AND status = 'published'
            ),
            updated_at = NOW()
        WHERE slug = OLD.extension_slug;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update install count
CREATE OR REPLACE FUNCTION update_extension_install_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE extensions_v2
        SET install_count = install_count + 1, updated_at = NOW()
        WHERE slug = NEW.extension_slug;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE extensions_v2
        SET install_count = GREATEST(0, install_count - 1), updated_at = NOW()
        WHERE slug = OLD.extension_slug;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 8: Create triggers
-- ============================================================================

-- Trigger for review stats
DROP TRIGGER IF EXISTS trigger_update_extension_stats ON extension_reviews;
CREATE TRIGGER trigger_update_extension_stats
    AFTER INSERT OR UPDATE OR DELETE ON extension_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_extension_stats();

-- Trigger for install count
DROP TRIGGER IF EXISTS trigger_update_install_count ON account_extensions;
CREATE TRIGGER trigger_update_install_count
    AFTER INSERT OR DELETE ON account_extensions
    FOR EACH ROW
    EXECUTE FUNCTION update_extension_install_count();

-- Triggers for updated_at auto-update
DROP TRIGGER IF EXISTS trigger_extensions_v2_updated ON extensions_v2;
CREATE TRIGGER trigger_extensions_v2_updated
    BEFORE UPDATE ON extensions_v2
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_account_extensions_updated ON account_extensions;
CREATE TRIGGER trigger_account_extensions_updated
    BEFORE UPDATE ON account_extensions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_website_extensions_v2_updated ON website_extensions_v2;
CREATE TRIGGER trigger_website_extensions_v2_updated
    BEFORE UPDATE ON website_extensions_v2
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 9: Seed initial extensions from existing catalog
-- ============================================================================

-- Insert github-sync extension
INSERT INTO extensions_v2 (
    slug, name, version, description, long_description, icon, category, tags,
    min_plan, author_name, featured, manifest
) VALUES (
    'github-sync',
    'GitHub Sync',
    '1.0.0',
    'Synchronise vos projets GitHub pour les afficher sur votre site',
    'Import automatiquement vos repositories GitHub et affichez-les sur votre portfolio. Supporte le filtrage par langage, le tri par étoiles, et la synchronisation automatique.',
    'github',
    'integration',
    ARRAY['github', 'developer', 'portfolio', 'git', 'repositories'],
    'free',
    'ASAP Team',
    true,
    '{
        "extension": {
            "slug": "github-sync",
            "name": "GitHub Sync",
            "version": "1.0.0",
            "description": "Synchronise vos projets GitHub pour les afficher sur votre site",
            "category": "integration",
            "icon": "github",
            "user_configurable": true,
            "sidebar_order": 10,
            "sidebar_label": "GitHub Sync"
        },
        "permissions": {
            "scopes": ["website:read", "website:write"],
            "external_services": ["api.github.com"]
        },
        "default_settings": {
            "github_username": "",
            "auto_sync": false,
            "include_forks": false,
            "max_repos": 10
        },
        "fields": [
            {
                "id": "github_username",
                "type": "text",
                "label": "Nom d'\''utilisateur GitHub",
                "description": "Votre nom d'\''utilisateur GitHub pour synchroniser vos projets",
                "placeholder": "ex: octocat",
                "required": true
            },
            {
                "id": "auto_sync",
                "type": "boolean",
                "label": "Synchronisation automatique",
                "description": "Synchroniser automatiquement vos projets toutes les 24h",
                "default": false
            },
            {
                "id": "include_forks",
                "type": "boolean",
                "label": "Inclure les forks",
                "description": "Inclure les repositories forkés dans la liste",
                "default": false
            },
            {
                "id": "max_repos",
                "type": "number",
                "label": "Nombre maximum de repos",
                "description": "Limite du nombre de projets à afficher",
                "default": 10,
                "validation": {"min": 1, "max": 50}
            }
        ],
        "sections": [
            {
                "id": "github_config",
                "title": "Configuration GitHub",
                "description": "Connectez votre compte GitHub pour synchroniser vos projets",
                "fields": ["github_username", "auto_sync", "include_forks", "max_repos"]
            }
        ],
        "actions": [
            {
                "id": "sync",
                "label": "Synchroniser maintenant",
                "endpoint": "/sync",
                "description": "Récupérer les dernières données depuis GitHub",
                "method": "POST",
                "primary": true,
                "refresh_after": true
            }
        ]
    }'::jsonb
) ON CONFLICT (slug) DO UPDATE SET
    version = EXCLUDED.version,
    manifest = EXCLUDED.manifest,
    updated_at = NOW();

-- Insert analytics extension
INSERT INTO extensions_v2 (
    slug, name, version, description, long_description, icon, category, tags,
    min_plan, author_name, featured, manifest
) VALUES (
    'analytics',
    'Analytics',
    '1.0.0',
    'Suivez les visites et performances de votre site',
    'Tableau de bord complet pour analyser le trafic de votre site. Visualisez les pages vues, visiteurs uniques, sources de trafic et plus encore.',
    'bar-chart-2',
    'analytics',
    ARRAY['analytics', 'statistics', 'tracking', 'visitors', 'metrics'],
    'free',
    'ASAP Team',
    true,
    '{
        "extension": {
            "slug": "analytics",
            "name": "Analytics",
            "version": "1.0.0",
            "description": "Suivez les visites et performances de votre site",
            "category": "analytics",
            "icon": "bar-chart-2",
            "user_configurable": true,
            "sidebar_order": 20,
            "sidebar_label": "Analytics"
        },
        "permissions": {
            "scopes": ["analytics:read", "analytics:write", "website:read"]
        },
        "default_settings": {
            "tracking_enabled": true,
            "anonymize_ip": true,
            "track_outbound_links": false
        },
        "fields": [
            {
                "id": "tracking_enabled",
                "type": "boolean",
                "label": "Activer le suivi",
                "description": "Collecter les données de visite",
                "default": true
            },
            {
                "id": "anonymize_ip",
                "type": "boolean",
                "label": "Anonymiser les IP",
                "description": "Masquer les adresses IP des visiteurs (RGPD)",
                "default": true
            },
            {
                "id": "track_outbound_links",
                "type": "boolean",
                "label": "Suivre les liens sortants",
                "description": "Enregistrer les clics sur les liens externes",
                "default": false
            }
        ],
        "sections": [
            {
                "id": "tracking_config",
                "title": "Configuration du suivi",
                "description": "Paramétrez la collecte de données",
                "fields": ["tracking_enabled", "anonymize_ip", "track_outbound_links"]
            }
        ]
    }'::jsonb
) ON CONFLICT (slug) DO UPDATE SET
    version = EXCLUDED.version,
    manifest = EXCLUDED.manifest,
    updated_at = NOW();

-- ============================================================================
-- DONE: Schema ready for Extension Store v2
-- Old tables (extensions, website_extensions) remain intact
-- ============================================================================
