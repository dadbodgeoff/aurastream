-- Migration: 015_sync_usage_counters
-- Description: Sync assets_generated_this_month with actual asset counts
-- Created: 2025-12-27

-- ============================================================================
-- Sync usage counters with actual asset counts
-- This fixes any desync between the counter and actual assets
-- ============================================================================

-- Update all users' counters to match their actual asset count
UPDATE users u
SET assets_generated_this_month = (
    SELECT COUNT(*)
    FROM assets a
    WHERE a.user_id = u.id
    AND a.created_at >= date_trunc('month', CURRENT_TIMESTAMP)
);

-- ============================================================================
-- Create a function to sync a single user's counter (for manual fixes)
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_user_usage_counter(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Count assets created this month
    SELECT COUNT(*) INTO v_count
    FROM assets
    WHERE user_id = p_user_id
    AND created_at >= date_trunc('month', CURRENT_TIMESTAMP);
    
    -- Update the user's counter
    UPDATE users
    SET assets_generated_this_month = v_count
    WHERE id = p_user_id;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_user_usage_counter IS 'Syncs a user''s assets_generated_this_month counter with actual asset count for current month';
