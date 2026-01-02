-- Migration: Add refinement tracking to coach sessions and usage
-- Date: 2026-01-01
-- Description: Enables multi-turn image refinement in coach sessions

-- ============================================================================
-- Coach Sessions: Add refinement tracking columns
-- ============================================================================

-- Add refinements_used counter
ALTER TABLE coach_sessions
ADD COLUMN IF NOT EXISTS refinements_used INTEGER DEFAULT 0;

-- Add last generated asset reference
ALTER TABLE coach_sessions
ADD COLUMN IF NOT EXISTS last_generated_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;

-- Add gemini conversation history for multi-turn
-- Stores the conversation context for cheaper refinements
ALTER TABLE coach_sessions
ADD COLUMN IF NOT EXISTS gemini_history JSONB DEFAULT '[]'::jsonb;

-- Index for finding sessions with refinements
CREATE INDEX IF NOT EXISTS idx_coach_sessions_refinements 
ON coach_sessions(user_id, refinements_used) 
WHERE refinements_used > 0;

-- ============================================================================
-- User Usage: Add refinements tracking
-- ============================================================================

-- Add refinements_used to user_usage table
ALTER TABLE user_usage
ADD COLUMN IF NOT EXISTS refinements_used INTEGER DEFAULT 0;

-- ============================================================================
-- Update check_usage_limit function to handle refinements
-- ============================================================================

CREATE OR REPLACE FUNCTION check_usage_limit(
    p_user_id UUID,
    p_feature TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tier TEXT;
    v_limit INTEGER;
    v_used INTEGER;
    v_resets_at TIMESTAMPTZ;
    v_can_use BOOLEAN;
BEGIN
    -- Get user's tier
    SELECT COALESCE(subscription_tier, 'free') INTO v_tier
    FROM users
    WHERE id = p_user_id;
    
    IF v_tier IS NULL THEN
        v_tier := 'free';
    END IF;
    
    -- Get limit based on tier and feature
    v_limit := CASE 
        WHEN p_feature = 'vibe_branding' THEN
            CASE v_tier WHEN 'free' THEN 1 WHEN 'pro' THEN 10 WHEN 'studio' THEN 10 ELSE -1 END
        WHEN p_feature = 'aura_lab' THEN
            CASE v_tier WHEN 'free' THEN 2 WHEN 'pro' THEN 25 WHEN 'studio' THEN 25 ELSE -1 END
        WHEN p_feature = 'coach' THEN
            CASE v_tier WHEN 'free' THEN 1 ELSE -1 END
        WHEN p_feature = 'creations' THEN
            CASE v_tier WHEN 'free' THEN 3 WHEN 'pro' THEN 50 WHEN 'studio' THEN 50 ELSE -1 END
        WHEN p_feature = 'profile_creator' THEN
            CASE v_tier WHEN 'free' THEN 1 WHEN 'pro' THEN 5 WHEN 'studio' THEN 10 ELSE -1 END
        WHEN p_feature = 'refinements' THEN
            CASE v_tier WHEN 'free' THEN 0 WHEN 'pro' THEN 5 WHEN 'studio' THEN -1 ELSE -1 END
        ELSE 0
    END;
    
    -- Get or create usage record
    INSERT INTO user_usage (user_id, period_start)
    VALUES (p_user_id, date_trunc('month', NOW()))
    ON CONFLICT (user_id, period_start) DO NOTHING;
    
    -- Get current usage
    SELECT 
        CASE p_feature
            WHEN 'vibe_branding' THEN vibe_branding_used
            WHEN 'aura_lab' THEN aura_lab_used
            WHEN 'coach' THEN coach_used
            WHEN 'creations' THEN creations_used
            WHEN 'profile_creator' THEN profile_creator_used
            WHEN 'refinements' THEN COALESCE(refinements_used, 0)
            ELSE 0
        END,
        period_start + INTERVAL '1 month'
    INTO v_used, v_resets_at
    FROM user_usage
    WHERE user_id = p_user_id
    AND period_start = date_trunc('month', NOW());
    
    -- Default if no record found
    IF v_used IS NULL THEN
        v_used := 0;
        v_resets_at := date_trunc('month', NOW()) + INTERVAL '1 month';
    END IF;
    
    -- Check if can use (-1 means unlimited)
    v_can_use := v_limit = -1 OR v_used < v_limit;
    
    RETURN jsonb_build_object(
        'can_use', v_can_use,
        'used', v_used,
        'limit', v_limit,
        'remaining', CASE WHEN v_limit = -1 THEN -1 ELSE GREATEST(0, v_limit - v_used) END,
        'tier', v_tier,
        'resets_at', v_resets_at
    );
END;
$$;

-- ============================================================================
-- Update increment_usage function to handle refinements
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_usage(
    p_user_id UUID,
    p_feature TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    -- Ensure usage record exists
    INSERT INTO user_usage (user_id, period_start)
    VALUES (p_user_id, date_trunc('month', NOW()))
    ON CONFLICT (user_id, period_start) DO NOTHING;
    
    -- Increment the appropriate counter
    EXECUTE format(
        'UPDATE user_usage SET %I = COALESCE(%I, 0) + 1 WHERE user_id = $1 AND period_start = date_trunc(''month'', NOW()) RETURNING %I',
        p_feature || '_used',
        p_feature || '_used',
        p_feature || '_used'
    ) INTO v_new_count USING p_user_id;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'new_count', v_new_count
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', SQLERRM
    );
END;
$$;

-- ============================================================================
-- Update get_usage_status function to include refinements
-- ============================================================================

CREATE OR REPLACE FUNCTION get_usage_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tier TEXT;
    v_usage RECORD;
    v_resets_at TIMESTAMPTZ;
BEGIN
    -- Get user's tier
    SELECT COALESCE(subscription_tier, 'free') INTO v_tier
    FROM users
    WHERE id = p_user_id;
    
    IF v_tier IS NULL THEN
        v_tier := 'free';
    END IF;
    
    -- Get or create usage record
    INSERT INTO user_usage (user_id, period_start)
    VALUES (p_user_id, date_trunc('month', NOW()))
    ON CONFLICT (user_id, period_start) DO NOTHING;
    
    -- Get current usage
    SELECT 
        COALESCE(vibe_branding_used, 0) as vibe_branding,
        COALESCE(aura_lab_used, 0) as aura_lab,
        COALESCE(coach_used, 0) as coach,
        COALESCE(creations_used, 0) as creations,
        COALESCE(profile_creator_used, 0) as profile_creator,
        COALESCE(refinements_used, 0) as refinements,
        period_start + INTERVAL '1 month' as resets_at
    INTO v_usage
    FROM user_usage
    WHERE user_id = p_user_id
    AND period_start = date_trunc('month', NOW());
    
    RETURN jsonb_build_object(
        'tier', v_tier,
        'vibe_branding', jsonb_build_object(
            'used', v_usage.vibe_branding,
            'limit', CASE v_tier WHEN 'free' THEN 1 WHEN 'pro' THEN 10 WHEN 'studio' THEN 10 ELSE -1 END,
            'remaining', CASE v_tier WHEN 'free' THEN GREATEST(0, 1 - v_usage.vibe_branding) WHEN 'pro' THEN GREATEST(0, 10 - v_usage.vibe_branding) WHEN 'studio' THEN GREATEST(0, 10 - v_usage.vibe_branding) ELSE -1 END
        ),
        'aura_lab', jsonb_build_object(
            'used', v_usage.aura_lab,
            'limit', CASE v_tier WHEN 'free' THEN 2 WHEN 'pro' THEN 25 WHEN 'studio' THEN 25 ELSE -1 END,
            'remaining', CASE v_tier WHEN 'free' THEN GREATEST(0, 2 - v_usage.aura_lab) WHEN 'pro' THEN GREATEST(0, 25 - v_usage.aura_lab) WHEN 'studio' THEN GREATEST(0, 25 - v_usage.aura_lab) ELSE -1 END
        ),
        'coach', jsonb_build_object(
            'used', v_usage.coach,
            'limit', CASE v_tier WHEN 'free' THEN 1 ELSE -1 END,
            'remaining', CASE v_tier WHEN 'free' THEN GREATEST(0, 1 - v_usage.coach) ELSE -1 END
        ),
        'creations', jsonb_build_object(
            'used', v_usage.creations,
            'limit', CASE v_tier WHEN 'free' THEN 3 WHEN 'pro' THEN 50 WHEN 'studio' THEN 50 ELSE -1 END,
            'remaining', CASE v_tier WHEN 'free' THEN GREATEST(0, 3 - v_usage.creations) WHEN 'pro' THEN GREATEST(0, 50 - v_usage.creations) WHEN 'studio' THEN GREATEST(0, 50 - v_usage.creations) ELSE -1 END
        ),
        'profile_creator', jsonb_build_object(
            'used', v_usage.profile_creator,
            'limit', CASE v_tier WHEN 'free' THEN 1 WHEN 'pro' THEN 5 WHEN 'studio' THEN 10 ELSE -1 END,
            'remaining', CASE v_tier WHEN 'free' THEN GREATEST(0, 1 - v_usage.profile_creator) WHEN 'pro' THEN GREATEST(0, 5 - v_usage.profile_creator) WHEN 'studio' THEN GREATEST(0, 10 - v_usage.profile_creator) ELSE -1 END
        ),
        'refinements', jsonb_build_object(
            'used', v_usage.refinements,
            'limit', CASE v_tier WHEN 'free' THEN 0 WHEN 'pro' THEN 5 WHEN 'studio' THEN -1 ELSE -1 END,
            'remaining', CASE v_tier WHEN 'free' THEN 0 WHEN 'pro' THEN GREATEST(0, 5 - v_usage.refinements) WHEN 'studio' THEN -1 ELSE -1 END
        ),
        'resets_at', v_usage.resets_at
    );
END;
$$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN coach_sessions.refinements_used IS 'Number of image refinements used in this session';
COMMENT ON COLUMN coach_sessions.last_generated_asset_id IS 'Most recently generated asset for refinement context';
COMMENT ON COLUMN coach_sessions.gemini_history IS 'Gemini conversation history for multi-turn refinements (JSON array of turns)';
COMMENT ON COLUMN user_usage.refinements_used IS 'Monthly count of image refinements (Pro: 5 free, then counts as creation)';
