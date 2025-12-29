-- ============================================================================
-- Migration 030: Fix Users Table Service Role Policy
-- Adds missing service_role policy to users table for backend operations
-- ============================================================================

-- The users table has RLS enabled but was missing a service_role policy.
-- This caused issues with:
-- 1. Free tier usage tracking (029_free_tier_usage.sql functions)
-- 2. Subscription tier updates from backend services
-- 3. Any backend operation that needs to update user records

-- Add service_role policy for full backend access
DROP POLICY IF EXISTS users_service_role ON users;
CREATE POLICY users_service_role ON users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Also ensure the SECURITY DEFINER functions from 029 can execute properly
-- by granting execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_free_tier_usage TO authenticated;
GRANT EXECUTE ON FUNCTION check_free_tier_usage TO service_role;

GRANT EXECUTE ON FUNCTION mark_free_tier_used TO authenticated;
GRANT EXECUTE ON FUNCTION mark_free_tier_used TO service_role;

GRANT EXECUTE ON FUNCTION get_free_tier_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_free_tier_status TO service_role;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY users_service_role ON users IS 'Allows backend service_role full access to users table for subscription management, free tier tracking, etc.';

