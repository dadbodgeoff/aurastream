-- ============================================================================
-- Migration 031: Monthly Usage Limits System
-- Two-tier rate limiting: Free and Pro
-- ============================================================================

-- Drop old free tier columns (replacing with new system)
ALTER TABLE users 
DROP COLUMN IF EXISTS free_coach_used_at,
DROP COLUMN IF EXISTS free_aura_lab_used_at,
DROP COLUMN IF EXISTS free_vibe_branding_used_at;

-- Add monthly usage tracking columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS monthly_vibe_branding_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_aura_lab_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_coach_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_creations_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS usage_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Index for finding users needing reset
CREATE INDEX IF NOT EXISTS idx_users_usage_reset 
ON users(usage_reset_at);

-- ============================================================================
-- Tier Limits Configuration (stored as function for easy updates)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tier_limits(p_tier TEXT)
RETURNS JSONB AS $$
BEGIN
    CASE p_tier
        WHEN 'pro' THEN
            RETURN jsonb_build_object(
                'vibe_branding', 10,
                'aura_lab', 25,
                'coach', -1,  -- unlimited (counted in creations)
                'creations', 50
            );
        WHEN 'studio' THEN
            -- Studio same as pro for now
            RETURN jsonb_build_object(
                'vibe_branding', 10,
                'aura_lab', 25,
                'coach', -1,
                'creations', 50
            );
        ELSE
            -- Free tier
            RETURN jsonb_build_object(
                'vibe_branding', 1,
                'aura_lab', 2,
                'coach', 1,
                'creations', 3
            );
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Check if user can use a feature
-- ============================================================================

CREATE OR REPLACE FUNCTION check_usage_limit(
    p_user_id UUID,
    p_feature TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_tier TEXT;
    v_limits JSONB;
    v_used INTEGER;
    v_limit INTEGER;
    v_reset_at TIMESTAMPTZ;
    v_can_use BOOLEAN;
BEGIN
    -- Get user tier and current usage
    SELECT 
        COALESCE(subscription_tier, 'free'),
        CASE p_feature
            WHEN 'vibe_branding' THEN COALESCE(monthly_vibe_branding_used, 0)
            WHEN 'aura_lab' THEN COALESCE(monthly_aura_lab_used, 0)
            WHEN 'coach' THEN COALESCE(monthly_coach_used, 0)
            WHEN 'creations' THEN COALESCE(monthly_creations_used, 0)
            ELSE 0
        END,
        COALESCE(usage_reset_at, NOW())
    INTO v_tier, v_used, v_reset_at
    FROM users 
    WHERE id = p_user_id;
    
    IF v_tier IS NULL THEN
        RETURN jsonb_build_object(
            'can_use', FALSE,
            'error', 'User not found'
        );
    END IF;
    
    -- Check if reset is needed (monthly)
    IF v_reset_at < DATE_TRUNC('month', NOW()) THEN
        -- Reset usage
        UPDATE users SET
            monthly_vibe_branding_used = 0,
            monthly_aura_lab_used = 0,
            monthly_coach_used = 0,
            monthly_creations_used = 0,
            usage_reset_at = NOW()
        WHERE id = p_user_id;
        v_used := 0;
    END IF;
    
    -- Get limits for tier
    v_limits := get_tier_limits(v_tier);
    v_limit := (v_limits->>p_feature)::INTEGER;
    
    -- -1 means unlimited
    IF v_limit = -1 THEN
        v_can_use := TRUE;
    ELSE
        v_can_use := v_used < v_limit;
    END IF;
    
    RETURN jsonb_build_object(
        'can_use', v_can_use,
        'used', v_used,
        'limit', v_limit,
        'remaining', CASE WHEN v_limit = -1 THEN -1 ELSE GREATEST(0, v_limit - v_used) END,
        'tier', v_tier,
        'resets_at', DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Increment usage counter
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_usage(
    p_user_id UUID,
    p_feature TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_check JSONB;
BEGIN
    -- First check if allowed
    v_check := check_usage_limit(p_user_id, p_feature);
    
    IF NOT (v_check->>'can_use')::BOOLEAN THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'limit_exceeded',
            'used', v_check->>'used',
            'limit', v_check->>'limit'
        );
    END IF;
    
    -- Increment the appropriate counter
    CASE p_feature
        WHEN 'vibe_branding' THEN
            UPDATE users SET monthly_vibe_branding_used = COALESCE(monthly_vibe_branding_used, 0) + 1 WHERE id = p_user_id;
        WHEN 'aura_lab' THEN
            UPDATE users SET monthly_aura_lab_used = COALESCE(monthly_aura_lab_used, 0) + 1 WHERE id = p_user_id;
        WHEN 'coach' THEN
            UPDATE users SET monthly_coach_used = COALESCE(monthly_coach_used, 0) + 1 WHERE id = p_user_id;
        WHEN 'creations' THEN
            UPDATE users SET monthly_creations_used = COALESCE(monthly_creations_used, 0) + 1 WHERE id = p_user_id;
    END CASE;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'used', (v_check->>'used')::INTEGER + 1,
        'limit', v_check->>'limit',
        'remaining', CASE 
            WHEN (v_check->>'limit')::INTEGER = -1 THEN -1 
            ELSE GREATEST(0, (v_check->>'limit')::INTEGER - (v_check->>'used')::INTEGER - 1) 
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Get full usage status for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_usage_status(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_tier TEXT;
    v_limits JSONB;
    v_vibe INTEGER;
    v_aura INTEGER;
    v_coach INTEGER;
    v_creations INTEGER;
    v_reset_at TIMESTAMPTZ;
BEGIN
    -- Get user data
    SELECT 
        COALESCE(subscription_tier, 'free'),
        COALESCE(monthly_vibe_branding_used, 0),
        COALESCE(monthly_aura_lab_used, 0),
        COALESCE(monthly_coach_used, 0),
        COALESCE(monthly_creations_used, 0),
        COALESCE(usage_reset_at, NOW())
    INTO v_tier, v_vibe, v_aura, v_coach, v_creations, v_reset_at
    FROM users 
    WHERE id = p_user_id;
    
    IF v_tier IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;
    
    -- Check if reset needed
    IF v_reset_at < DATE_TRUNC('month', NOW()) THEN
        UPDATE users SET
            monthly_vibe_branding_used = 0,
            monthly_aura_lab_used = 0,
            monthly_coach_used = 0,
            monthly_creations_used = 0,
            usage_reset_at = NOW()
        WHERE id = p_user_id;
        v_vibe := 0;
        v_aura := 0;
        v_coach := 0;
        v_creations := 0;
    END IF;
    
    v_limits := get_tier_limits(v_tier);
    
    RETURN jsonb_build_object(
        'tier', v_tier,
        'vibe_branding', jsonb_build_object(
            'used', v_vibe,
            'limit', (v_limits->>'vibe_branding')::INTEGER,
            'remaining', GREATEST(0, (v_limits->>'vibe_branding')::INTEGER - v_vibe)
        ),
        'aura_lab', jsonb_build_object(
            'used', v_aura,
            'limit', (v_limits->>'aura_lab')::INTEGER,
            'remaining', GREATEST(0, (v_limits->>'aura_lab')::INTEGER - v_aura)
        ),
        'coach', jsonb_build_object(
            'used', v_coach,
            'limit', (v_limits->>'coach')::INTEGER,
            'remaining', CASE 
                WHEN (v_limits->>'coach')::INTEGER = -1 THEN -1 
                ELSE GREATEST(0, (v_limits->>'coach')::INTEGER - v_coach) 
            END
        ),
        'creations', jsonb_build_object(
            'used', v_creations,
            'limit', (v_limits->>'creations')::INTEGER,
            'remaining', GREATEST(0, (v_limits->>'creations')::INTEGER - v_creations)
        ),
        'resets_at', DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_tier_limits TO authenticated;
GRANT EXECUTE ON FUNCTION get_tier_limits TO service_role;
GRANT EXECUTE ON FUNCTION check_usage_limit TO authenticated;
GRANT EXECUTE ON FUNCTION check_usage_limit TO service_role;
GRANT EXECUTE ON FUNCTION increment_usage TO authenticated;
GRANT EXECUTE ON FUNCTION increment_usage TO service_role;
GRANT EXECUTE ON FUNCTION get_usage_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_usage_status TO service_role;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION get_tier_limits IS 'Returns monthly limits for a subscription tier';
COMMENT ON FUNCTION check_usage_limit IS 'Check if user can use a feature based on monthly limits';
COMMENT ON FUNCTION increment_usage IS 'Increment usage counter for a feature';
COMMENT ON FUNCTION get_usage_status IS 'Get complete usage status for a user';
