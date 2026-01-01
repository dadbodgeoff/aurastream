-- ============================================================================
-- Migration 040: Unlimited User Access
-- Adds support for unlimited tier for VIP users
-- ============================================================================

-- First, drop the existing check constraint and add 'unlimited' as valid tier
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_tier_check;

ALTER TABLE users ADD CONSTRAINT users_subscription_tier_check 
CHECK (subscription_tier IN ('free', 'pro', 'studio', 'unlimited'));

-- Add unlimited tier to get_tier_limits function
CREATE OR REPLACE FUNCTION get_tier_limits(p_tier TEXT)
RETURNS JSONB AS $$
BEGIN
    CASE p_tier
        WHEN 'unlimited' THEN
            -- VIP users with unlimited access
            RETURN jsonb_build_object(
                'vibe_branding', -1,
                'aura_lab', -1,
                'coach', -1,
                'creations', -1,
                'profile_creator', -1
            );
        WHEN 'pro' THEN
            RETURN jsonb_build_object(
                'vibe_branding', 10,
                'aura_lab', 25,
                'coach', -1,
                'creations', 50,
                'profile_creator', 5
            );
        WHEN 'studio' THEN
            RETURN jsonb_build_object(
                'vibe_branding', 10,
                'aura_lab', 25,
                'coach', -1,
                'creations', 50,
                'profile_creator', 10
            );
        ELSE
            -- Free tier
            RETURN jsonb_build_object(
                'vibe_branding', 1,
                'aura_lab', 2,
                'coach', 1,
                'creations', 3,
                'profile_creator', 1
            );
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant dadbodgeoff@gmail.com unlimited access
UPDATE users 
SET subscription_tier = 'unlimited',
    subscription_status = 'active'
WHERE email = 'dadbodgeoff@gmail.com';

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION get_tier_limits IS 'Returns monthly limits for a subscription tier. -1 means unlimited.';
