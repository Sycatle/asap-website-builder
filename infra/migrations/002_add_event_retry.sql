-- Add retry support to events table
ALTER TABLE events
ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN failed_at TIMESTAMPTZ,
ADD COLUMN error_message TEXT;

-- Add index for failed events that need retry
CREATE INDEX idx_events_retry ON events(retry_count, failed_at) WHERE processed_at IS NULL AND failed_at IS NOT NULL;

-- Add index for unprocessed events
CREATE INDEX idx_events_unprocessed ON events(created_at) WHERE processed_at IS NULL;
