-- Migration: Featured Creators
-- Description: Adds table for manually curated featured creators in community spotlight

-- Table to store manually featured creators
CREATE TABLE IF NOT EXISTS featured_creators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    featured_at TIMESTAMPTZ DEFAULT NOW(),
    featured_by TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index for active featured creators
CREATE INDEX IF NOT EXISTS idx_featured_creators_active 
ON featured_creators (display_order ASC, featured_at DESC)
WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE featured_creators ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read featured creators
CREATE POLICY "Anyone can view featured creators"
ON featured_creators FOR SELECT
USING (is_active = TRUE);

-- Policy: Only service role can modify
CREATE POLICY "Service role can manage featured creators"
ON featured_creators FOR ALL
USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON featured_creators TO authenticated;
GRANT SELECT ON featured_creators TO anon;

-- Drop existing function first (return type is changing)
DROP FUNCTION IF EXISTS get_spotlight_creators(INTEGER);

-- Update the spotlight creators function to prioritize featured creators
CREATE OR REPLACE FUNCTION get_spotlight_creators(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    post_count INTEGER,
    total_likes_received INTEGER,
    follower_count INTEGER,
    following_count INTEGER,
    is_featured BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.display_name,
        u.avatar_url,
        COALESCE(s.post_count, 0)::INTEGER as post_count,
        COALESCE(s.total_likes_received, 0)::INTEGER as total_likes_received,
        COALESCE(s.follower_count, 0)::INTEGER as follower_count,
        COALESCE(s.following_count, 0)::INTEGER as following_count,
        TRUE as is_featured
    FROM featured_creators fc
    JOIN users u ON u.id = fc.user_id
    LEFT JOIN community_user_stats s ON s.user_id = fc.user_id
    WHERE fc.is_active = TRUE
    ORDER BY fc.display_order ASC, fc.featured_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Insert the three featured creators by email
INSERT INTO featured_creators (user_id, display_order, notes)
SELECT id, 1, 'DadBodGeoff - community featured creator'
FROM users WHERE email = 'dadbodgeoff@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET display_order = 1, is_active = TRUE, updated_at = NOW();

INSERT INTO featured_creators (user_id, display_order, notes)
SELECT id, 2, 'Tester15 - community featured creator'
FROM users WHERE email = 'tester15@aurastream.shop'
ON CONFLICT (user_id) DO UPDATE SET display_order = 2, is_active = TRUE, updated_at = NOW();

INSERT INTO featured_creators (user_id, display_order, notes)
SELECT id, 3, 'The Luminescence - community featured creator'
FROM users WHERE email = 'linkedbylight@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET display_order = 3, is_active = TRUE, updated_at = NOW();
