-- Migration: Add Collections & Variables System
-- 
-- This migration introduces the Collections & Variables architecture that bridges
-- extensions (data providers) and the Studio (visual editor).
--
-- Collections: Typed arrays of items produced by extensions (e.g., github_repos)
-- Variables: Single values that can be manual, synced from extensions, or computed

-- ============================================================================
-- COLLECTIONS TABLE
-- ============================================================================

CREATE TABLE website_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    collection_slug VARCHAR(100) NOT NULL,
    
    -- Data stored as JSONB array of CollectionItem
    -- Each item: { "id": "...", "data": {...}, "_created_at": "...", "_updated_at": "...", "_source_id": "..." }
    items JSONB NOT NULL DEFAULT '[]',
    
    -- Metadata
    source_extension VARCHAR(100) NOT NULL,
    source_version VARCHAR(20),
    total_count INTEGER NOT NULL DEFAULT 0,
    
    -- Sync tracking
    sync_status VARCHAR(20) NOT NULL DEFAULT 'idle' 
        CHECK (sync_status IN ('idle', 'syncing', 'error')),
    sync_error TEXT,
    synced_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique collection per website
    CONSTRAINT unique_website_collection UNIQUE(website_id, collection_slug)
);

-- Indexes for collections
CREATE INDEX idx_collections_website_id ON website_collections(website_id);
CREATE INDEX idx_collections_slug ON website_collections(collection_slug);
CREATE INDEX idx_collections_source ON website_collections(source_extension);
CREATE INDEX idx_collections_sync_status ON website_collections(sync_status) 
    WHERE sync_status != 'idle';

-- GIN index for JSONB queries on items (enables filtering within items array)
CREATE INDEX idx_collections_items ON website_collections USING GIN (items jsonb_path_ops);

-- ============================================================================
-- VARIABLES TABLE
-- ============================================================================

CREATE TABLE website_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    
    -- Value stored as JSONB for flexibility (string, number, boolean, date, etc.)
    value JSONB NOT NULL,
    
    -- Type hint for the frontend
    value_type VARCHAR(20) NOT NULL DEFAULT 'string'
        CHECK (value_type IN ('string', 'number', 'boolean', 'date', 'datetime', 'json')),
    
    -- Source tracking
    source VARCHAR(20) NOT NULL DEFAULT 'manual'
        CHECK (source IN ('manual', 'extension', 'computed')),
    source_ref VARCHAR(200),  -- Extension slug or collection reference
    
    -- For computed variables
    stale BOOLEAN NOT NULL DEFAULT FALSE,
    computation JSONB,  -- Computation definition: { "operation": "sum", "collection": "...", "field": "..." }
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique variable key per website
    CONSTRAINT unique_website_variable UNIQUE(website_id, key)
);

-- Indexes for variables
CREATE INDEX idx_variables_website_id ON website_variables(website_id);
CREATE INDEX idx_variables_key ON website_variables(key);
CREATE INDEX idx_variables_source ON website_variables(source);
CREATE INDEX idx_variables_stale ON website_variables(stale) WHERE stale = TRUE;

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================

-- Trigger function (reuse if exists, otherwise create)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Collections updated_at trigger
CREATE TRIGGER trigger_collections_updated_at
    BEFORE UPDATE ON website_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Variables updated_at trigger
CREATE TRIGGER trigger_variables_updated_at
    BEFORE UPDATE ON website_variables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (Defense in depth)
-- ============================================================================

-- Enable RLS on collections
ALTER TABLE website_collections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access collections for websites they own
CREATE POLICY collections_account_isolation ON website_collections
    FOR ALL
    USING (
        website_id IN (
            SELECT id FROM websites WHERE account_id = current_setting('app.current_account_id', true)::uuid
        )
    );

-- Enable RLS on variables
ALTER TABLE website_variables ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access variables for websites they own
CREATE POLICY variables_account_isolation ON website_variables
    FOR ALL
    USING (
        website_id IN (
            SELECT id FROM websites WHERE account_id = current_setting('app.current_account_id', true)::uuid
        )
    );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE website_collections IS 'Stores typed data collections produced by extensions for each website';
COMMENT ON COLUMN website_collections.items IS 'JSONB array of collection items with structure: [{ id, data, _created_at, _updated_at, _source_id }]';
COMMENT ON COLUMN website_collections.sync_status IS 'Current sync state: idle (ready), syncing (in progress), error (failed)';

COMMENT ON TABLE website_variables IS 'Stores single-value variables for interpolation in website content';
COMMENT ON COLUMN website_variables.computation IS 'For computed variables: { operation, collection, field, filter }';
COMMENT ON COLUMN website_variables.stale IS 'TRUE when source collection changed and variable needs recomputation';
