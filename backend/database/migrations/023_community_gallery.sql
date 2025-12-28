-- =============================================================================
-- Migration 023: Community Gallery Schema
-- Social features: posts, likes, comments, follows, reports
-- =============================================================================

-- =============================================================================
-- PART 1: Community Posts
-- =============================================================================

CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
    description TEXT CHECK (char_length(description) <= 500),
    prompt_used TEXT,
    show_prompt BOOLEAN DEFAULT TRUE,
    tags TEXT[] DEFAULT '{}',
    asset_type TEXT NOT NULL,
    asset_url TEXT NOT NULL,
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    inspired_by_post_id UUID REFERENCES community_posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(asset_id)
);

CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_asset_type ON community_posts(asset_type);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_likes ON community_posts(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_featured ON community_posts(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_community_posts_visible ON community_posts(is_hidden) WHERE is_hidden = FALSE;
CREATE INDEX IF NOT EXISTS idx_community_posts_tags ON community_posts USING GIN(tags);


-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_community_posts_search ON community_posts 
    USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- =============================================================================
-- PART 2: Likes
-- =============================================================================

CREATE TABLE IF NOT EXISTS community_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_likes_post ON community_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_likes_user ON community_likes(user_id);

-- =============================================================================
-- PART 3: Comments
-- =============================================================================

CREATE TABLE IF NOT EXISTS community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_community_comments_user ON community_comments(user_id);

-- =============================================================================
-- PART 4: Follows
-- =============================================================================

CREATE TABLE IF NOT EXISTS community_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK(follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_community_follows_follower ON community_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_community_follows_following ON community_follows(following_id);

-- =============================================================================
-- PART 5: Reports
-- =============================================================================

CREATE TABLE IF NOT EXISTS community_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'copyright', 'harassment', 'other')),
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(post_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_community_reports_post ON community_reports(post_id);


-- =============================================================================
-- PART 6: User Community Stats (denormalized)
-- =============================================================================

CREATE TABLE IF NOT EXISTS community_user_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    post_count INT DEFAULT 0,
    total_likes_received INT DEFAULT 0,
    follower_count INT DEFAULT 0,
    following_count INT DEFAULT 0,
    is_banned BOOLEAN DEFAULT FALSE,
    banned_at TIMESTAMPTZ,
    banned_reason TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PART 7: Triggers for Denormalized Counters
-- =============================================================================

-- Like count trigger
CREATE OR REPLACE FUNCTION update_community_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE community_posts SET like_count = like_count + 1, updated_at = NOW() WHERE id = NEW.post_id;
        UPDATE community_user_stats SET total_likes_received = total_likes_received + 1, updated_at = NOW()
        WHERE user_id = (SELECT user_id FROM community_posts WHERE id = NEW.post_id);
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_posts SET like_count = GREATEST(like_count - 1, 0), updated_at = NOW() WHERE id = OLD.post_id;
        UPDATE community_user_stats SET total_likes_received = GREATEST(total_likes_received - 1, 0), updated_at = NOW()
        WHERE user_id = (SELECT user_id FROM community_posts WHERE id = OLD.post_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_community_like_count ON community_likes;
CREATE TRIGGER trigger_update_community_like_count
AFTER INSERT OR DELETE ON community_likes
FOR EACH ROW EXECUTE FUNCTION update_community_post_like_count();

-- Comment count trigger
CREATE OR REPLACE FUNCTION update_community_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE community_posts SET comment_count = comment_count + 1, updated_at = NOW() WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_posts SET comment_count = GREATEST(comment_count - 1, 0), updated_at = NOW() WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_community_comment_count ON community_comments;
CREATE TRIGGER trigger_update_community_comment_count
AFTER INSERT OR DELETE ON community_comments
FOR EACH ROW EXECUTE FUNCTION update_community_post_comment_count();

-- Follow count trigger
CREATE OR REPLACE FUNCTION update_community_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO community_user_stats (user_id, following_count) VALUES (NEW.follower_id, 1)
        ON CONFLICT (user_id) DO UPDATE SET following_count = community_user_stats.following_count + 1, updated_at = NOW();
        INSERT INTO community_user_stats (user_id, follower_count) VALUES (NEW.following_id, 1)
        ON CONFLICT (user_id) DO UPDATE SET follower_count = community_user_stats.follower_count + 1, updated_at = NOW();
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_user_stats SET following_count = GREATEST(following_count - 1, 0), updated_at = NOW() WHERE user_id = OLD.follower_id;
        UPDATE community_user_stats SET follower_count = GREATEST(follower_count - 1, 0), updated_at = NOW() WHERE user_id = OLD.following_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_community_follow_counts ON community_follows;
CREATE TRIGGER trigger_update_community_follow_counts
AFTER INSERT OR DELETE ON community_follows
FOR EACH ROW EXECUTE FUNCTION update_community_follow_counts();

-- Post count trigger
CREATE OR REPLACE FUNCTION update_community_user_post_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO community_user_stats (user_id, post_count) VALUES (NEW.user_id, 1)
        ON CONFLICT (user_id) DO UPDATE SET post_count = community_user_stats.post_count + 1, updated_at = NOW();
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_user_stats SET post_count = GREATEST(post_count - 1, 0), updated_at = NOW() WHERE user_id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_community_post_count ON community_posts;
CREATE TRIGGER trigger_update_community_post_count
AFTER INSERT OR DELETE ON community_posts
FOR EACH ROW EXECUTE FUNCTION update_community_user_post_count();


-- =============================================================================
-- PART 8: RLS Policies
-- =============================================================================

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_user_stats ENABLE ROW LEVEL SECURITY;

-- Service role full access (for backend)
CREATE POLICY "Service role full access on community_posts" ON community_posts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on community_likes" ON community_likes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on community_comments" ON community_comments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on community_follows" ON community_follows FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on community_reports" ON community_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on community_user_stats" ON community_user_stats FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- PART 9: RPC Functions
-- =============================================================================

-- Get trending posts (time-decay algorithm)
CREATE OR REPLACE FUNCTION get_trending_community_posts(
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0,
    p_asset_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    asset_id UUID,
    title TEXT,
    description TEXT,
    prompt_used TEXT,
    show_prompt BOOLEAN,
    tags TEXT[],
    asset_type TEXT,
    asset_url TEXT,
    like_count INT,
    comment_count INT,
    view_count INT,
    is_featured BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    trending_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, p.user_id, p.asset_id, p.title, p.description,
        p.prompt_used, p.show_prompt, p.tags, p.asset_type, p.asset_url,
        p.like_count, p.comment_count, p.view_count, p.is_featured, p.created_at, p.updated_at,
        -- Trending score: likes + comments weighted, with time decay
        (p.like_count + (p.comment_count * 2))::DECIMAL / 
        POWER(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 2, 1.5) as trending_score
    FROM community_posts p
    WHERE p.is_hidden = FALSE
      AND (p_asset_type IS NULL OR p.asset_type = p_asset_type)
    ORDER BY trending_score DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Get following feed
CREATE OR REPLACE FUNCTION get_community_following_feed(
    p_user_id UUID,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS SETOF community_posts AS $$
BEGIN
    RETURN QUERY
    SELECT p.*
    FROM community_posts p
    INNER JOIN community_follows f ON p.user_id = f.following_id
    WHERE f.follower_id = p_user_id
      AND p.is_hidden = FALSE
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Search posts
CREATE OR REPLACE FUNCTION search_community_posts(
    p_query TEXT,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS SETOF community_posts AS $$
BEGIN
    RETURN QUERY
    SELECT p.*
    FROM community_posts p
    WHERE p.is_hidden = FALSE
      AND to_tsvector('english', p.title || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('english', p_query)
    ORDER BY ts_rank(to_tsvector('english', p.title || ' ' || COALESCE(p.description, '')), plainto_tsquery('english', p_query)) DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Increment view count
CREATE OR REPLACE FUNCTION increment_community_post_view(p_post_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE community_posts SET view_count = view_count + 1 WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PART 10: Comments
-- =============================================================================

COMMENT ON TABLE community_posts IS 'User-shared assets in the community gallery';
COMMENT ON TABLE community_likes IS 'Post likes (one per user per post)';
COMMENT ON TABLE community_comments IS 'Comments on community posts';
COMMENT ON TABLE community_follows IS 'User follow relationships';
COMMENT ON TABLE community_reports IS 'Content moderation reports';
COMMENT ON TABLE community_user_stats IS 'Denormalized user community statistics';
