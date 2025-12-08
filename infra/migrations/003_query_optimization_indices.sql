-- Migration: Add missing indices for JOIN performance
-- Created: 2025-12-08

-- Index for portfolio_data lookups (FK + query)
CREATE INDEX IF NOT EXISTS idx_portfolio_data_portfolio_id 
ON portfolio_data(portfolio_id);

-- Index for portfolio lookups by slug (common query)
CREATE INDEX IF NOT EXISTS idx_portfolios_slug 
ON portfolios(slug);

-- Index for portfolio lookups by status (filtering published)
CREATE INDEX IF NOT EXISTS idx_portfolios_status 
ON portfolios(status);

-- Composite index for tenant + status lookups (very common)
CREATE INDEX IF NOT EXISTS idx_portfolios_tenant_status 
ON portfolios(tenant_id, status);

-- Index for events by event_type (useful for cleanup)
CREATE INDEX IF NOT EXISTS idx_events_event_type 
ON events(event_type);

-- Index for events by created_at (for time-based cleanup/queries)
CREATE INDEX IF NOT EXISTS idx_events_created_at 
ON events(created_at DESC);

-- Composite index for finding user events by type and time
CREATE INDEX IF NOT EXISTS idx_events_tenant_type_time 
ON events(tenant_id, event_type, created_at DESC);

COMMENT ON INDEX idx_portfolio_data_portfolio_id IS 'Optimizes LEFT JOIN portfolio_data in list/get queries';
COMMENT ON INDEX idx_portfolios_slug IS 'Optimizes get_public_portfolio queries';
COMMENT ON INDEX idx_portfolios_status IS 'Optimizes filtering by status (published/draft)';
COMMENT ON INDEX idx_portfolios_tenant_status IS 'Optimizes list_portfolios with status filtering';
COMMENT ON INDEX idx_events_event_type IS 'Optimizes event type filtering and cleanup';
COMMENT ON INDEX idx_events_created_at IS 'Optimizes time-based event queries';
COMMENT ON INDEX idx_events_tenant_type_time IS 'Optimizes finding recent events for a tenant';
