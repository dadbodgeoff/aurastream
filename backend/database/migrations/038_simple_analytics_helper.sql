-- ============================================================================
-- Migration 038: Add missing helper function for simple analytics
-- ============================================================================
-- 
-- Adds the increment_session_page_count function that was added after
-- the initial migration was run.
-- ============================================================================

-- Helper function for incrementing session page count
CREATE OR REPLACE FUNCTION increment_session_page_count(p_session_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE analytics_sessions
    SET page_count = page_count + 1,
        last_activity_at = NOW()
    WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Migration Complete
-- ============================================================================
