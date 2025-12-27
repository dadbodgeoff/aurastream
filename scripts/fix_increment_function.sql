-- ============================================================================
-- Fix: Update increment_user_usage function
-- ============================================================================
-- The original function tries to update subscriptions.assets_used which may
-- not exist. This version only updates the users table.
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_user_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET assets_generated_this_month = assets_generated_this_month + 1,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Note: Removed subscriptions table update since that table
    -- may not have assets_used column in production
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_user_usage IS 'Atomically increments asset usage counter in users table';

-- ============================================================================
-- Sync all users' counters to actual asset counts
-- ============================================================================
-- This fixes any users whose counters are out of sync

UPDATE users 
SET assets_generated_this_month = (
    SELECT COUNT(*) 
    FROM assets 
    WHERE assets.user_id = users.id
),
updated_at = NOW();

-- Verify the fix
SELECT 
    u.email,
    u.assets_generated_this_month as counter,
    (SELECT COUNT(*) FROM assets WHERE user_id = u.id) as actual_assets
FROM users u
ORDER BY u.email;
