-- Migration: Spotlight Creators RPC Function
-- Description: Adds RPC function to get top creators for community spotlight

-- Function to get spotlight creators (users with most engagement)
CREATE OR REPLACE FUNCTION get_spotlight_creators(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    post_count INTEGER,
    total_likes_received INTEGER,
    follower_count INTEGER,
    following_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.user_id,
        u.display_name,
        u.avatar_url,
        s.post_count,
        s.total_likes_received,
        s.follower_count,
        s.following_count
    FROM community_user_stats s
    JOIN users u ON u.id = s.user_id
    WHERE s.is_banned = FALSE
      AND s.post_count > 0
    ORDER BY 
        s.total_likes_received DESC,
        s.follower_count DESC,
        s.post_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_spotlight_creators(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_spotlight_creators(INTEGER) TO anon;

-- Add index for better performance on community_user_stats
CREATE INDEX IF NOT EXISTS idx_community_user_stats_engagement 
ON community_user_stats (total_likes_received DESC, follower_count DESC, post_count DESC)
WHERE is_banned = FALSE AND post_count > 0;
