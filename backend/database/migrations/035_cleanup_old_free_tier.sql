-- ============================================================================
-- Migration 035: Cleanup Old Free Tier System
-- Removes deprecated RPC functions from migration 029 that were replaced by 031
-- ============================================================================

-- Drop the old free tier RPC functions (replaced by check_usage_limit, increment_usage, get_usage_status)
DROP FUNCTION IF EXISTS check_free_tier_usage(UUID, TEXT);
DROP FUNCTION IF EXISTS mark_free_tier_used(UUID, TEXT);
DROP FUNCTION IF EXISTS get_free_tier_status(UUID);

-- Note: The columns (free_coach_used_at, free_aura_lab_used_at, free_vibe_branding_used_at)
-- were already dropped by migration 031_monthly_usage_limits.sql

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION check_usage_limit IS 'Check if user can use a feature based on monthly limits (replaces check_free_tier_usage)';
COMMENT ON FUNCTION increment_usage IS 'Increment usage counter for a feature (replaces mark_free_tier_used)';
COMMENT ON FUNCTION get_usage_status IS 'Get complete usage status for a user (replaces get_free_tier_status)';
