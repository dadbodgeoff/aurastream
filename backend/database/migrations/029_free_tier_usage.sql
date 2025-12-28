-- ============================================================================
-- Migration 029: Free Tier Premium Feature Usage
-- Gives free users 1 use of Coach, Aura Lab, and Vibe Branding every 28 days
-- ============================================================================

-- Add free tier usage tracking columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS free_coach_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS free_aura_lab_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS free_vibe_branding_used_at TIMESTAMPTZ;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_free_coach_used 
ON users(free_coach_used_at) 
WHERE free_coach_used_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_free_aura_lab_used 
ON users(free_aura_lab_used_at) 
WHERE free_aura_lab_used_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_free_vibe_branding_used 
ON users(free_vibe_branding_used_at) 
WHERE free_vibe_branding_used_at IS NOT NULL;

-- ============================================================================
-- RPC Functions for Free Tier Usage
-- ============================================================================

-- Check if free user can use a premium feature (28-day cooldown)
CREATE OR REPLACE FUNCTION check_free_tier_usage(
    p_user_id UUID, 
    p_feature TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_used_at TIMESTAMPTZ;
    v_cooldown_days INTEGER := 28;
    v_next_available TIMESTAMPTZ;
    v_can_use BOOLEAN;
BEGIN
    -- Get the appropriate used_at timestamp based on feature
    CASE p_feature
        WHEN 'coach' THEN
            SELECT free_coach_used_at INTO v_used_at FROM users WHERE id = p_user_id;
        WHEN 'aura_lab' THEN
            SELECT free_aura_lab_used_at INTO v_used_at FROM users WHERE id = p_user_id;
        WHEN 'vibe_branding' THEN
            SELECT free_vibe_branding_used_at INTO v_used_at FROM users WHERE id = p_user_id;
        ELSE
            RETURN jsonb_build_object(
                'can_use', FALSE,
                'error', 'Invalid feature'
            );
    END CASE;
    
    -- If never used, can use
    IF v_used_at IS NULL THEN
        RETURN jsonb_build_object(
            'can_use', TRUE,
            'used_at', NULL,
            'next_available', NULL,
            'days_remaining', 0
        );
    END IF;
    
    -- Calculate next available time
    v_next_available := v_used_at + (v_cooldown_days || ' days')::INTERVAL;
    v_can_use := NOW() >= v_next_available;
    
    RETURN jsonb_build_object(
        'can_use', v_can_use,
        'used_at', v_used_at,
        'next_available', v_next_available,
        'days_remaining', GREATEST(0, EXTRACT(DAY FROM v_next_available - NOW())::INTEGER)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark a free tier feature as used
CREATE OR REPLACE FUNCTION mark_free_tier_used(
    p_user_id UUID, 
    p_feature TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    CASE p_feature
        WHEN 'coach' THEN
            UPDATE users SET free_coach_used_at = NOW() WHERE id = p_user_id;
        WHEN 'aura_lab' THEN
            UPDATE users SET free_aura_lab_used_at = NOW() WHERE id = p_user_id;
        WHEN 'vibe_branding' THEN
            UPDATE users SET free_vibe_branding_used_at = NOW() WHERE id = p_user_id;
        ELSE
            RETURN FALSE;
    END CASE;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all free tier usage status for a user
CREATE OR REPLACE FUNCTION get_free_tier_status(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_coach JSONB;
    v_aura_lab JSONB;
    v_vibe_branding JSONB;
BEGIN
    SELECT check_free_tier_usage(p_user_id, 'coach') INTO v_coach;
    SELECT check_free_tier_usage(p_user_id, 'aura_lab') INTO v_aura_lab;
    SELECT check_free_tier_usage(p_user_id, 'vibe_branding') INTO v_vibe_branding;
    
    RETURN jsonb_build_object(
        'coach', v_coach,
        'aura_lab', v_aura_lab,
        'vibe_branding', v_vibe_branding,
        'cooldown_days', 28
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN users.free_coach_used_at IS 'Timestamp when free user last used Coach feature (28-day cooldown)';
COMMENT ON COLUMN users.free_aura_lab_used_at IS 'Timestamp when free user last used Aura Lab feature (28-day cooldown)';
COMMENT ON COLUMN users.free_vibe_branding_used_at IS 'Timestamp when free user last used Vibe Branding feature (28-day cooldown)';

COMMENT ON FUNCTION check_free_tier_usage IS 'Check if a free tier user can use a premium feature (28-day cooldown)';
COMMENT ON FUNCTION mark_free_tier_used IS 'Mark a premium feature as used by a free tier user';
COMMENT ON FUNCTION get_free_tier_status IS 'Get all free tier usage status for a user';
