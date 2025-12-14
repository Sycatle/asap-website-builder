-- ============================================================================
-- ASAP Platform - Notification Queue Migration
-- Version: 1.0.0
-- Description: Add notification queue for deferred/consolidated notifications
-- ============================================================================

-- ============================================================================
-- NOTIFICATION QUEUE TABLE
-- Temporary storage for notifications before consolidation
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    
    -- Notification content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'system',
    priority TEXT NOT NULL DEFAULT 'normal',
    action_url TEXT,
    icon TEXT,
    metadata JSONB,
    
    -- Deduplication key (e.g., "module:analytics" to group related notifications)
    dedup_key TEXT NOT NULL,
    
    -- Timestamp for ordering and windowing
    queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Processing status
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMPTZ
);

-- Indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending 
    ON notification_queue(account_id, dedup_key, queued_at DESC) 
    WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_notification_queue_cleanup 
    ON notification_queue(processed, processed_at) 
    WHERE processed = true;

-- Comment on table
COMMENT ON TABLE notification_queue IS 'Queue for notification consolidation - stores pending notifications before processing';

-- ============================================================================
-- Function to process notification queue
-- Consolidates notifications by dedup_key and creates final notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION process_notification_queue(consolidation_window_seconds INTEGER DEFAULT 30)
RETURNS TABLE(processed_count INTEGER, created_count INTEGER) AS $$
DECLARE
    v_processed_count INTEGER := 0;
    v_created_count INTEGER := 0;
    v_cutoff TIMESTAMPTZ;
    v_record RECORD;
    v_activated INTEGER;
    v_deactivated INTEGER;
    v_latest RECORD;
BEGIN
    v_cutoff := NOW() - (consolidation_window_seconds || ' seconds')::INTERVAL;
    
    FOR v_record IN
        SELECT DISTINCT nq.account_id, nq.dedup_key
        FROM notification_queue nq
        WHERE nq.processed = false AND nq.queued_at < v_cutoff
    LOOP
        -- Count activated (but NOT deactivated) and deactivated
        SELECT COUNT(*) FILTER (WHERE notification_type LIKE '%_activated' AND notification_type NOT LIKE '%_deactivated'),
               COUNT(*) FILTER (WHERE notification_type LIKE '%_deactivated')
        INTO v_activated, v_deactivated
        FROM notification_queue
        WHERE account_id = v_record.account_id AND dedup_key = v_record.dedup_key AND processed = false;
        
        SELECT * INTO v_latest FROM notification_queue
        WHERE account_id = v_record.account_id AND dedup_key = v_record.dedup_key AND processed = false
        ORDER BY queued_at DESC LIMIT 1;
        
        IF NOT (v_activated > 0 AND v_deactivated > 0 AND v_activated = v_deactivated) THEN
            INSERT INTO notifications (id, account_id, title, message, notification_type, category, priority, action_url, icon, metadata, created_at)
            VALUES (gen_random_uuid(), v_latest.account_id, v_latest.title, v_latest.message, v_latest.notification_type,
                    v_latest.category, v_latest.priority, v_latest.action_url, v_latest.icon,
                    COALESCE(v_latest.metadata, '{}'::jsonb) || jsonb_build_object('dedup_key', v_latest.dedup_key), NOW());
            v_created_count := v_created_count + 1;
        END IF;
        
        UPDATE notification_queue SET processed = true, processed_at = NOW()
        WHERE account_id = v_record.account_id AND dedup_key = v_record.dedup_key AND processed = false;
        
        v_processed_count := v_processed_count + 1;
    END LOOP;
    
    processed_count := v_processed_count;
    created_count := v_created_count;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function to cleanup old processed queue entries
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_notification_queue(hours_to_keep INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notification_queue 
    WHERE processed = true 
    AND processed_at < NOW() - (hours_to_keep || ' hours')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_notification_queue IS 'Process pending notifications, consolidating duplicates and creating final notifications';
COMMENT ON FUNCTION cleanup_notification_queue IS 'Remove old processed queue entries';
