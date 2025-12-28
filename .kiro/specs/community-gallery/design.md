# Community Gallery — Design Document

## Overview

This design document provides the architectural blueprint, implementation patterns, and correctness properties for the Community Gallery system. All implementations MUST conform to the patterns defined in the master schema.

**Master Schema Reference:** `.kiro/steering/AURASTREAM_MASTER_SCHEMA.md`

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│   Next.js Web                    │           React Native Mobile            │
│   /community (gallery)           │           CommunityScreen                │
│   /community/[id] (post detail)  │           PostDetailScreen               │
│   /community/create (share)      │           ShareAssetSheet                │
└────────────────────┬─────────────┴──────────────────┬───────────────────────┘
                     │                                │
                     └────────────────┬───────────────┘
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FASTAPI APPLICATION                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    /api/v1/community/*                                │   │
│  │  Posts: GET/POST/PUT/DELETE  │  Likes: POST/DELETE                   │   │
│  │  Comments: GET/POST/PUT/DELETE  │  Follows: POST/DELETE/GET          │   │
│  │  Reports: POST  │  Admin: PUT (feature/hide/ban)                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                 │                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       CommunityService                                │   │
│  │  posts: create/get/list/update/delete/search/trending                │   │
│  │  likes: like/unlike/get_liked                                        │   │
│  │  comments: create/edit/delete/list                                   │   │
│  │  follows: follow/unfollow/get_followers/get_following                │   │
│  │  reports: create/review                                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│    SUPABASE     │   │      REDIS      │   │       CDN       │
│   (PostgreSQL)  │   │   (Trending)    │   │   (Assets)      │
│                 │   │                 │   │                 │
│  community_*    │   │  trending_scores│   │  Asset URLs     │
│  tables         │   │  rate_limits    │   │                 │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```


---

## Database Schema

### Migration: 022_community_gallery.sql

```sql
-- =============================================================================
-- Migration 022: Community Gallery Schema
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
    tags TEXT[] DEFAULT '{}' CHECK (array_length(tags, 1) <= 5),
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
    UNIQUE(asset_id)  -- Each asset can only be shared once
);

CREATE INDEX idx_community_posts_user ON community_posts(user_id);
CREATE INDEX idx_community_posts_asset_type ON community_posts(asset_type);
CREATE INDEX idx_community_posts_created ON community_posts(created_at DESC);
CREATE INDEX idx_community_posts_likes ON community_posts(like_count DESC);
CREATE INDEX idx_community_posts_featured ON community_posts(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_community_posts_tags ON community_posts USING GIN(tags);
CREATE INDEX idx_community_posts_search ON community_posts USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- =============================================================================
-- PART 2: Likes
-- =============================================================================

CREATE TABLE IF NOT EXISTS community_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(post_id, user_id)  -- One like per user per post
);

CREATE INDEX idx_community_likes_post ON community_likes(post_id);
CREATE INDEX idx_community_likes_user ON community_likes(user_id);

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

CREATE INDEX idx_community_comments_post ON community_comments(post_id, created_at);
CREATE INDEX idx_community_comments_user ON community_comments(user_id);

-- =============================================================================
-- PART 4: Follows
-- =============================================================================

CREATE TABLE IF NOT EXISTS community_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK(follower_id != following_id)  -- Cannot follow yourself
);

CREATE INDEX idx_community_follows_follower ON community_follows(follower_id);
CREATE INDEX idx_community_follows_following ON community_follows(following_id);

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
    UNIQUE(post_id, reporter_id)  -- One report per user per post
);

CREATE INDEX idx_community_reports_status ON community_reports(status) WHERE status = 'pending';
CREATE INDEX idx_community_reports_post ON community_reports(post_id);

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
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
        UPDATE community_user_stats SET total_likes_received = total_likes_received + 1 
        WHERE user_id = (SELECT user_id FROM community_posts WHERE id = NEW.post_id);
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
        UPDATE community_user_stats SET total_likes_received = total_likes_received - 1 
        WHERE user_id = (SELECT user_id FROM community_posts WHERE id = OLD.post_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_like_count
AFTER INSERT OR DELETE ON community_likes
FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- Comment count trigger
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_count
AFTER INSERT OR DELETE ON community_comments
FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Follow count trigger
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE community_user_stats SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
        UPDATE community_user_stats SET follower_count = follower_count + 1 WHERE user_id = NEW.following_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_user_stats SET following_count = following_count - 1 WHERE user_id = OLD.follower_id;
        UPDATE community_user_stats SET follower_count = follower_count - 1 WHERE user_id = OLD.following_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_follow_counts
AFTER INSERT OR DELETE ON community_follows
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Post count trigger
CREATE OR REPLACE FUNCTION update_user_post_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO community_user_stats (user_id, post_count) VALUES (NEW.user_id, 1)
        ON CONFLICT (user_id) DO UPDATE SET post_count = community_user_stats.post_count + 1;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_user_stats SET post_count = post_count - 1 WHERE user_id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_count
AFTER INSERT OR DELETE ON community_posts
FOR EACH ROW EXECUTE FUNCTION update_user_post_count();


-- =============================================================================
-- PART 8: RLS Policies
-- =============================================================================

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_user_stats ENABLE ROW LEVEL SECURITY;

-- Posts: Public read (non-hidden), owner write
CREATE POLICY "Public can view non-hidden posts" ON community_posts FOR SELECT USING (is_hidden = FALSE);
CREATE POLICY "Users can create own posts" ON community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON community_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON community_posts FOR DELETE USING (auth.uid() = user_id);

-- Likes: Authenticated users
CREATE POLICY "Users can view likes" ON community_likes FOR SELECT USING (TRUE);
CREATE POLICY "Users can create own likes" ON community_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON community_likes FOR DELETE USING (auth.uid() = user_id);

-- Comments: Public read, authenticated write
CREATE POLICY "Public can view comments" ON community_comments FOR SELECT USING (TRUE);
CREATE POLICY "Users can create comments" ON community_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON community_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON community_comments FOR DELETE USING (auth.uid() = user_id);

-- Follows: Authenticated users
CREATE POLICY "Users can view follows" ON community_follows FOR SELECT USING (TRUE);
CREATE POLICY "Users can create own follows" ON community_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can delete own follows" ON community_follows FOR DELETE USING (auth.uid() = follower_id);

-- Reports: Users can create, admins can view
CREATE POLICY "Users can create reports" ON community_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- User stats: Public read
CREATE POLICY "Public can view user stats" ON community_user_stats FOR SELECT USING (TRUE);

-- Service role full access
CREATE POLICY "Service role full access posts" ON community_posts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access likes" ON community_likes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access comments" ON community_comments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access follows" ON community_follows FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access reports" ON community_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access stats" ON community_user_stats FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- PART 9: RPC Functions
-- =============================================================================

-- Get trending posts (time-decay algorithm)
CREATE OR REPLACE FUNCTION get_trending_posts(
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
    trending_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, p.user_id, p.asset_id, p.title, p.description,
        p.prompt_used, p.show_prompt, p.tags, p.asset_type, p.asset_url,
        p.like_count, p.comment_count, p.view_count, p.is_featured, p.created_at,
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
CREATE OR REPLACE FUNCTION get_following_feed(
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

COMMENT ON TABLE community_posts IS 'User-shared assets in the community gallery';
COMMENT ON TABLE community_likes IS 'Post likes (one per user per post)';
COMMENT ON TABLE community_comments IS 'Comments on community posts';
COMMENT ON TABLE community_follows IS 'User follow relationships';
COMMENT ON TABLE community_reports IS 'Content moderation reports';
COMMENT ON TABLE community_user_stats IS 'Denormalized user community statistics';
```


---

## Service Interfaces

### CommunityPostService Interface

```python
class CommunityPostService:
    """
    Service for managing community posts.
    All operations require authenticated user context.
    """
    
    async def create(self, user_id: str, data: CreatePostRequest) -> CommunityPost:
        """
        Share an asset to the community gallery.
        
        Args:
            user_id: Authenticated user's ID
            data: Post creation data including asset_id, title, description, tags
            
        Returns:
            Created CommunityPost
            
        Raises:
            CommunityAssetNotOwnedError: If user doesn't own the asset
            CommunityAlreadySharedError: If asset already shared
            CommunityUserBannedError: If user is banned from community
        """
        pass
    
    async def get(self, post_id: str, viewer_id: str | None = None) -> CommunityPostWithAuthor:
        """
        Get a single post with author info.
        Increments view count if viewer_id provided.
        
        Args:
            post_id: Post UUID
            viewer_id: Optional viewer user ID for view tracking
            
        Returns:
            CommunityPostWithAuthor including author display_name, avatar_url
            
        Raises:
            CommunityPostNotFoundError: If post doesn't exist or is hidden
        """
        pass
    
    async def list(
        self,
        page: int = 1,
        limit: int = 20,
        sort: str = 'trending',
        asset_type: str | None = None,
        tags: list[str] | None = None,
        user_id: str | None = None
    ) -> PaginatedResponse[CommunityPostWithAuthor]:
        """
        List posts with pagination and filters.
        
        Args:
            page: Page number (1-indexed)
            limit: Items per page (max 50)
            sort: 'trending', 'recent', or 'most_liked'
            asset_type: Filter by asset type
            tags: Filter by tags (OR logic)
            user_id: Filter by creator
            
        Returns:
            Paginated list of posts with author info
        """
        pass
    
    async def search(self, query: str, page: int = 1, limit: int = 20) -> PaginatedResponse[CommunityPostWithAuthor]:
        """Full-text search on title and description."""
        pass
    
    async def get_featured(self, limit: int = 10) -> list[CommunityPostWithAuthor]:
        """Get featured/spotlight posts."""
        pass
    
    async def get_trending(self, limit: int = 20, asset_type: str | None = None) -> list[CommunityPostWithAuthor]:
        """Get trending posts using time-decay algorithm."""
        pass
    
    async def update(self, user_id: str, post_id: str, data: UpdatePostRequest) -> CommunityPost:
        """Update post (owner only)."""
        pass
    
    async def delete(self, user_id: str, post_id: str) -> None:
        """Delete post (owner only)."""
        pass
    
    async def get_user_posts(self, user_id: str, page: int = 1, limit: int = 20) -> PaginatedResponse[CommunityPost]:
        """Get all posts by a specific user."""
        pass
    
    async def get_liked_posts(self, user_id: str, page: int = 1, limit: int = 20) -> PaginatedResponse[CommunityPost]:
        """Get posts the user has liked."""
        pass
    
    async def get_following_feed(self, user_id: str, page: int = 1, limit: int = 20) -> PaginatedResponse[CommunityPostWithAuthor]:
        """Get posts from users the current user follows."""
        pass
```

### CommunityLikeService Interface

```python
class CommunityLikeService:
    """Service for managing post likes."""
    
    async def like(self, user_id: str, post_id: str) -> None:
        """
        Like a post (idempotent).
        
        Args:
            user_id: User liking the post
            post_id: Post to like
            
        Raises:
            CommunityPostNotFoundError: If post doesn't exist
            CommunityUserBannedError: If user is banned
        """
        pass
    
    async def unlike(self, user_id: str, post_id: str) -> None:
        """Unlike a post (no error if not liked)."""
        pass
    
    async def is_liked(self, user_id: str, post_id: str) -> bool:
        """Check if user has liked a post."""
        pass
    
    async def get_likers(self, post_id: str, limit: int = 50) -> list[UserSummary]:
        """Get users who liked a post."""
        pass
```

### CommunityCommentService Interface

```python
class CommunityCommentService:
    """Service for managing post comments."""
    
    async def create(self, user_id: str, post_id: str, content: str) -> CommunityComment:
        """
        Add a comment to a post.
        
        Args:
            user_id: Commenting user
            post_id: Post to comment on
            content: Comment text (1-1000 chars)
            
        Raises:
            CommunityPostNotFoundError: If post doesn't exist
            CommunityUserBannedError: If user is banned
        """
        pass
    
    async def edit(self, user_id: str, comment_id: str, content: str) -> CommunityComment:
        """
        Edit a comment (owner only, within 15 minutes).
        
        Raises:
            CommunityCommentNotFoundError: If comment doesn't exist
            CommunityCommentNotOwnedError: If user doesn't own comment
            CommunityEditWindowExpiredError: If >15 minutes since creation
        """
        pass
    
    async def delete(self, user_id: str, comment_id: str) -> None:
        """
        Delete a comment (owner or post owner).
        
        Raises:
            CommunityCommentNotFoundError: If comment doesn't exist
            CommunityCommentNotOwnedError: If user doesn't own comment or post
        """
        pass
    
    async def list(self, post_id: str, page: int = 1, limit: int = 20) -> PaginatedResponse[CommentWithAuthor]:
        """List comments on a post with author info."""
        pass
```

### CommunityFollowService Interface

```python
class CommunityFollowService:
    """Service for managing user follows."""
    
    async def follow(self, follower_id: str, following_id: str) -> None:
        """
        Follow a user.
        
        Raises:
            CommunitySelfFollowError: If trying to follow self
            CommunityUserBannedError: If user is banned
        """
        pass
    
    async def unfollow(self, follower_id: str, following_id: str) -> None:
        """Unfollow a user (no error if not following)."""
        pass
    
    async def is_following(self, follower_id: str, following_id: str) -> bool:
        """Check if user A follows user B."""
        pass
    
    async def get_followers(self, user_id: str, page: int = 1, limit: int = 50) -> PaginatedResponse[UserSummary]:
        """Get users who follow this user."""
        pass
    
    async def get_following(self, user_id: str, page: int = 1, limit: int = 50) -> PaginatedResponse[UserSummary]:
        """Get users this user follows."""
        pass
    
    async def get_stats(self, user_id: str) -> CommunityUserStats:
        """Get user's community stats (post count, likes received, followers, following)."""
        pass
```


---

## Pydantic Schemas

### Request Schemas

```python
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal
import re

TAG_PATTERN = re.compile(r'^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$|^[a-z0-9]$')


class CreatePostRequest(BaseModel):
    """Request body for sharing an asset to community."""
    asset_id: str = Field(..., description="UUID of asset to share")
    title: str = Field(..., min_length=1, max_length=100, description="Post title")
    description: Optional[str] = Field(None, max_length=500, description="Post description")
    tags: List[str] = Field(default=[], max_length=5, description="Tags (max 5)")
    show_prompt: bool = Field(default=True, description="Show generation prompt publicly")
    inspired_by_post_id: Optional[str] = Field(None, description="Post that inspired this creation")
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else v
    
    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v: List[str]) -> List[str]:
        validated = []
        for tag in v:
            tag = tag.lower().strip()
            if not TAG_PATTERN.match(tag):
                raise ValueError(f'Invalid tag format: {tag}. Use lowercase alphanumeric with hyphens.')
            validated.append(tag)
        return validated
    
    model_config = {
        "json_schema_extra": {
            "examples": [{
                "asset_id": "550e8400-e29b-41d4-a716-446655440000",
                "title": "Retro Gaming Emote Pack",
                "description": "Pixel art emotes inspired by 80s arcade games",
                "tags": ["retro", "pixel-art", "gaming"],
                "show_prompt": True
            }]
        }
    }


class UpdatePostRequest(BaseModel):
    """Request body for updating a post."""
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = Field(None, max_length=5)
    show_prompt: Optional[bool] = None
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else v
    
    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return v
        validated = []
        for tag in v:
            tag = tag.lower().strip()
            if not TAG_PATTERN.match(tag):
                raise ValueError(f'Invalid tag format: {tag}')
            validated.append(tag)
        return validated


class CreateCommentRequest(BaseModel):
    """Request body for adding a comment."""
    content: str = Field(..., min_length=1, max_length=1000)
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v: str) -> str:
        return v.strip()


class UpdateCommentRequest(BaseModel):
    """Request body for editing a comment."""
    content: str = Field(..., min_length=1, max_length=1000)
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v: str) -> str:
        return v.strip()


class ReportPostRequest(BaseModel):
    """Request body for reporting a post."""
    reason: Literal['spam', 'inappropriate', 'copyright', 'harassment', 'other']
    details: Optional[str] = Field(None, max_length=500)


class ReviewReportRequest(BaseModel):
    """Admin request for reviewing a report."""
    status: Literal['reviewed', 'dismissed', 'actioned']
    hide_post: bool = Field(default=False, description="Hide the reported post")
```

### Response Schemas

```python
from datetime import datetime


class UserSummary(BaseModel):
    """Minimal user info for display."""
    id: str
    display_name: str
    avatar_url: Optional[str]


class CommunityPostResponse(BaseModel):
    """Community post in API responses."""
    id: str
    user_id: str
    asset_id: str
    title: str
    description: Optional[str]
    prompt_used: Optional[str]  # Only included if show_prompt=True
    show_prompt: bool
    tags: List[str]
    asset_type: str
    asset_url: str
    like_count: int
    comment_count: int
    view_count: int
    is_featured: bool
    inspired_by_post_id: Optional[str]
    created_at: datetime
    updated_at: datetime


class CommunityPostWithAuthorResponse(CommunityPostResponse):
    """Post with author info for display."""
    author: UserSummary
    is_liked: bool = False  # Whether current user has liked (if authenticated)


class CommentResponse(BaseModel):
    """Comment in API responses."""
    id: str
    post_id: str
    user_id: str
    content: str
    is_edited: bool
    created_at: datetime
    updated_at: datetime


class CommentWithAuthorResponse(CommentResponse):
    """Comment with author info."""
    author: UserSummary
    can_edit: bool = False  # Whether current user can edit (owner + within window)
    can_delete: bool = False  # Whether current user can delete


class CommunityUserStatsResponse(BaseModel):
    """User's community statistics."""
    user_id: str
    post_count: int
    total_likes_received: int
    follower_count: int
    following_count: int


class CreatorProfileResponse(BaseModel):
    """Public creator profile."""
    user: UserSummary
    stats: CommunityUserStatsResponse
    is_following: bool = False  # Whether current user follows
    joined_at: datetime


class PaginatedPostsResponse(BaseModel):
    """Paginated posts response."""
    items: List[CommunityPostWithAuthorResponse]
    total: int
    page: int
    limit: int
    has_more: bool
```


---

## Frontend Patterns

### TSX API Client Extension

```typescript
// packages/api-client/src/community.ts

community = {
  // Posts
  listPosts: (params?: PostsQueryParams) => 
    this.request<PaginatedPosts>('GET', '/community/posts', { params }),
  
  createPost: (data: CreatePostRequest) => 
    this.request<CommunityPost>('POST', '/community/posts', { body: data }),
  
  getPost: (id: string) => 
    this.request<CommunityPostWithAuthor>('GET', `/community/posts/${id}`),
  
  updatePost: (id: string, data: UpdatePostRequest) => 
    this.request<CommunityPost>('PUT', `/community/posts/${id}`, { body: data }),
  
  deletePost: (id: string) => 
    this.request<void>('DELETE', `/community/posts/${id}`),
  
  getFeatured: () => 
    this.request<CommunityPostWithAuthor[]>('GET', '/community/posts/featured'),
  
  getTrending: (assetType?: string) => 
    this.request<CommunityPostWithAuthor[]>('GET', '/community/posts/trending', { 
      params: assetType ? { asset_type: assetType } : undefined 
    }),
  
  searchPosts: (query: string, page?: number) => 
    this.request<PaginatedPosts>('GET', '/community/posts/search', { 
      params: { q: query, page } 
    }),
  
  getMyPosts: (page?: number) => 
    this.request<PaginatedPosts>('GET', '/community/posts/mine', { params: { page } }),
  
  getLikedPosts: (page?: number) => 
    this.request<PaginatedPosts>('GET', '/community/posts/liked', { params: { page } }),
  
  getFollowingFeed: (page?: number) => 
    this.request<PaginatedPosts>('GET', '/community/posts/following', { params: { page } }),
  
  // Likes
  likePost: (postId: string) => 
    this.request<void>('POST', `/community/posts/${postId}/like`),
  
  unlikePost: (postId: string) => 
    this.request<void>('DELETE', `/community/posts/${postId}/like`),
  
  // Comments
  listComments: (postId: string, page?: number) => 
    this.request<PaginatedComments>('GET', `/community/posts/${postId}/comments`, { 
      params: { page } 
    }),
  
  createComment: (postId: string, content: string) => 
    this.request<Comment>('POST', `/community/posts/${postId}/comments`, { 
      body: { content } 
    }),
  
  updateComment: (commentId: string, content: string) => 
    this.request<Comment>('PUT', `/community/comments/${commentId}`, { 
      body: { content } 
    }),
  
  deleteComment: (commentId: string) => 
    this.request<void>('DELETE', `/community/comments/${commentId}`),
  
  // Follows
  followUser: (userId: string) => 
    this.request<void>('POST', `/community/users/${userId}/follow`),
  
  unfollowUser: (userId: string) => 
    this.request<void>('DELETE', `/community/users/${userId}/follow`),
  
  getFollowers: (userId: string, page?: number) => 
    this.request<PaginatedUsers>('GET', `/community/users/${userId}/followers`, { 
      params: { page } 
    }),
  
  getFollowing: (userId: string, page?: number) => 
    this.request<PaginatedUsers>('GET', `/community/users/${userId}/following`, { 
      params: { page } 
    }),
  
  getCreatorProfile: (userId: string) => 
    this.request<CreatorProfile>('GET', `/community/users/${userId}`),
  
  getUserPosts: (userId: string, page?: number) => 
    this.request<PaginatedPosts>('GET', `/community/users/${userId}/posts`, { 
      params: { page } 
    }),
  
  // Reports
  reportPost: (postId: string, data: ReportPostRequest) => 
    this.request<void>('POST', `/community/posts/${postId}/report`, { body: data }),
};
```

### TSX Hooks (TanStack Query)

```typescript
// packages/api-client/src/hooks/useCommunity.ts

// Posts
export function useCommunityPosts(params?: PostsQueryParams) {
  return useInfiniteQuery({
    queryKey: ['community', 'posts', params],
    queryFn: ({ pageParam = 1 }) => 
      apiClient.community.listPosts({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) => 
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });
}

export function useCommunityPost(id: string) {
  return useQuery({
    queryKey: ['community', 'posts', id],
    queryFn: () => apiClient.community.getPost(id),
    enabled: !!id,
  });
}

export function useFeaturedPosts() {
  return useQuery({
    queryKey: ['community', 'featured'],
    queryFn: () => apiClient.community.getFeatured(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTrendingPosts(assetType?: string) {
  return useQuery({
    queryKey: ['community', 'trending', assetType],
    queryFn: () => apiClient.community.getTrending(assetType),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreatePostRequest) => apiClient.community.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'posts'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'mine'] });
    },
  });
}

// Likes with optimistic updates
export function useLikePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (postId: string) => apiClient.community.likePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['community', 'posts', postId] });
      const previous = queryClient.getQueryData(['community', 'posts', postId]);
      
      queryClient.setQueryData(['community', 'posts', postId], (old: any) => ({
        ...old,
        isLiked: true,
        likeCount: old.likeCount + 1,
      }));
      
      return { previous };
    },
    onError: (err, postId, context) => {
      queryClient.setQueryData(['community', 'posts', postId], context?.previous);
    },
    onSettled: (_, __, postId) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'posts', postId] });
    },
  });
}

export function useUnlikePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (postId: string) => apiClient.community.unlikePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['community', 'posts', postId] });
      const previous = queryClient.getQueryData(['community', 'posts', postId]);
      
      queryClient.setQueryData(['community', 'posts', postId], (old: any) => ({
        ...old,
        isLiked: false,
        likeCount: Math.max(0, old.likeCount - 1),
      }));
      
      return { previous };
    },
    onError: (err, postId, context) => {
      queryClient.setQueryData(['community', 'posts', postId], context?.previous);
    },
    onSettled: (_, __, postId) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'posts', postId] });
    },
  });
}

// Comments
export function useComments(postId: string) {
  return useInfiniteQuery({
    queryKey: ['community', 'comments', postId],
    queryFn: ({ pageParam = 1 }) => 
      apiClient.community.listComments(postId, pageParam),
    getNextPageParam: (lastPage) => 
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: !!postId,
  });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (content: string) => apiClient.community.createComment(postId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'posts', postId] });
    },
  });
}

// Follows
export function useFollowUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: string) => apiClient.community.followUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'users', userId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'following'] });
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: string) => apiClient.community.unfollowUser(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'users', userId] });
      queryClient.invalidateQueries({ queryKey: ['community', 'following'] });
    },
  });
}

export function useCreatorProfile(userId: string) {
  return useQuery({
    queryKey: ['community', 'users', userId],
    queryFn: () => apiClient.community.getCreatorProfile(userId),
    enabled: !!userId,
  });
}
```


---

## TypeScript Types

```typescript
// packages/api-client/src/types/community.ts

export type AssetType = 
  | 'twitch_emote' 
  | 'youtube_thumbnail' 
  | 'twitch_banner' 
  | 'twitch_badge' 
  | 'overlay'
  | 'twitch_panel'
  | 'twitch_offline';

export type ReportReason = 'spam' | 'inappropriate' | 'copyright' | 'harassment' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned';
export type PostSortOption = 'trending' | 'recent' | 'most_liked';

export interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface CommunityPost {
  id: string;
  userId: string;
  assetId: string;
  title: string;
  description: string | null;
  promptUsed: string | null;
  showPrompt: boolean;
  tags: string[];
  assetType: AssetType;
  assetUrl: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isFeatured: boolean;
  inspiredByPostId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityPostWithAuthor extends CommunityPost {
  author: UserSummary;
  isLiked: boolean;
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommentWithAuthor extends CommunityComment {
  author: UserSummary;
  canEdit: boolean;
  canDelete: boolean;
}

export interface CommunityUserStats {
  userId: string;
  postCount: number;
  totalLikesReceived: number;
  followerCount: number;
  followingCount: number;
}

export interface CreatorProfile {
  user: UserSummary;
  stats: CommunityUserStats;
  isFollowing: boolean;
  joinedAt: string;
}

export interface CreatePostRequest {
  assetId: string;
  title: string;
  description?: string;
  tags?: string[];
  showPrompt?: boolean;
  inspiredByPostId?: string;
}

export interface UpdatePostRequest {
  title?: string;
  description?: string;
  tags?: string[];
  showPrompt?: boolean;
}

export interface ReportPostRequest {
  reason: ReportReason;
  details?: string;
}

export interface PostsQueryParams {
  page?: number;
  limit?: number;
  sort?: PostSortOption;
  assetType?: AssetType;
  tags?: string[];
  search?: string;
  userId?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export type PaginatedPosts = PaginatedResponse<CommunityPostWithAuthor>;
export type PaginatedComments = PaginatedResponse<CommentWithAuthor>;
export type PaginatedUsers = PaginatedResponse<UserSummary>;
```

---

## Error Handling

### Backend Exception Classes

```python
# services/exceptions.py (extend existing)

class CommunityError(StreamerStudioError):
    """Base class for community errors."""
    pass

class CommunityPostNotFoundError(CommunityError):
    def __init__(self, post_id: str):
        super().__init__(
            code="COMMUNITY_POST_NOT_FOUND",
            message="Community post not found",
            details={"post_id": post_id},
            status_code=404
        )

class CommunityCommentNotFoundError(CommunityError):
    def __init__(self, comment_id: str):
        super().__init__(
            code="COMMUNITY_COMMENT_NOT_FOUND",
            message="Comment not found",
            details={"comment_id": comment_id},
            status_code=404
        )

class CommunityAssetNotOwnedError(CommunityError):
    def __init__(self, asset_id: str):
        super().__init__(
            code="COMMUNITY_ASSET_NOT_OWNED",
            message="You don't own this asset",
            details={"asset_id": asset_id},
            status_code=403
        )

class CommunityPostNotOwnedError(CommunityError):
    def __init__(self, post_id: str):
        super().__init__(
            code="COMMUNITY_POST_NOT_OWNED",
            message="You don't own this post",
            details={"post_id": post_id},
            status_code=403
        )

class CommunityCommentNotOwnedError(CommunityError):
    def __init__(self, comment_id: str):
        super().__init__(
            code="COMMUNITY_COMMENT_NOT_OWNED",
            message="You don't own this comment",
            details={"comment_id": comment_id},
            status_code=403
        )

class CommunityEditWindowExpiredError(CommunityError):
    def __init__(self, comment_id: str, window_minutes: int = 15):
        super().__init__(
            code="COMMUNITY_EDIT_WINDOW_EXPIRED",
            message=f"Comment edit window ({window_minutes} minutes) has expired",
            details={"comment_id": comment_id, "window_minutes": window_minutes},
            status_code=403
        )

class CommunityAlreadySharedError(CommunityError):
    def __init__(self, asset_id: str):
        super().__init__(
            code="COMMUNITY_ALREADY_SHARED",
            message="This asset has already been shared to the community",
            details={"asset_id": asset_id},
            status_code=409
        )

class CommunityUserBannedError(CommunityError):
    def __init__(self, user_id: str):
        super().__init__(
            code="COMMUNITY_USER_BANNED",
            message="You are banned from community features",
            details={"user_id": user_id},
            status_code=403
        )

class CommunitySelfFollowError(CommunityError):
    def __init__(self):
        super().__init__(
            code="COMMUNITY_SELF_FOLLOW",
            message="You cannot follow yourself",
            details={},
            status_code=422
        )

class CommunityAlreadyReportedError(CommunityError):
    def __init__(self, post_id: str):
        super().__init__(
            code="COMMUNITY_ALREADY_REPORTED",
            message="You have already reported this post",
            details={"post_id": post_id},
            status_code=409
        )

class CommunityInvalidTagError(CommunityError):
    def __init__(self, tag: str):
        super().__init__(
            code="COMMUNITY_INVALID_TAG",
            message=f"Invalid tag format: {tag}",
            details={"tag": tag, "expected_format": "lowercase alphanumeric with hyphens"},
            status_code=422
        )

class CommunityTooManyTagsError(CommunityError):
    def __init__(self, count: int, max_count: int = 5):
        super().__init__(
            code="COMMUNITY_TOO_MANY_TAGS",
            message=f"Maximum {max_count} tags allowed",
            details={"count": count, "max_count": max_count},
            status_code=422
        )
```

---

## File Structure

### Backend Files to Create

```
backend/
├── api/
│   ├── routes/
│   │   ├── community.py           # Post, like, comment routes
│   │   └── community_admin.py     # Admin moderation routes
│   └── schemas/
│       └── community.py           # Pydantic schemas
├── services/
│   ├── community_service.py       # Post CRUD, search, trending
│   ├── community_like_service.py  # Like operations
│   ├── community_comment_service.py  # Comment operations
│   └── community_follow_service.py   # Follow operations
├── database/
│   └── migrations/
│       └── 022_community_gallery.sql
└── tests/
    ├── properties/
    │   └── test_community_properties.py
    ├── unit/
    │   ├── test_community_posts.py
    │   ├── test_community_likes.py
    │   ├── test_community_comments.py
    │   └── test_community_follows.py
    └── integration/
        └── test_community_flow.py
```

### TSX Files to Create

```
tsx/
├── packages/
│   ├── api-client/
│   │   └── src/
│   │       ├── types/
│   │       │   └── community.ts
│   │       └── hooks/
│   │           └── useCommunity.ts
│   └── shared/
│       └── src/
│           └── stores/
│               └── communityStore.ts
└── apps/
    └── web/
        └── src/
            ├── app/
            │   └── community/
            │       ├── page.tsx              # Gallery feed
            │       ├── [id]/
            │       │   └── page.tsx          # Post detail
            │       └── share/
            │           └── page.tsx          # Share asset form
            └── components/
                └── community/
                    ├── PostCard.tsx          # Gallery card
                    ├── PostGrid.tsx          # Masonry grid
                    ├── PostDetail.tsx        # Full post view
                    ├── CommentSection.tsx    # Comments list + form
                    ├── LikeButton.tsx        # Like/unlike button
                    ├── ShareAssetModal.tsx   # Share to community modal
                    ├── CreatorProfile.tsx    # Profile card
                    ├── FollowButton.tsx      # Follow/unfollow button
                    ├── FeaturedSpotlight.tsx # Spotlight carousel
                    ├── FilterBar.tsx         # Sort/filter controls
                    └── TagInput.tsx          # Tag input component
```

---

## Rate Limiting

```python
# Rate limits for community endpoints
COMMUNITY_RATE_LIMITS = {
    "posts_create": {"limit": 10, "window": 3600},      # 10 posts/hour
    "comments_create": {"limit": 100, "window": 3600},  # 100 comments/hour
    "likes": {"limit": 500, "window": 3600},            # 500 likes/hour
    "follows": {"limit": 100, "window": 3600},          # 100 follows/hour
    "reports": {"limit": 10, "window": 3600},           # 10 reports/hour
}
```

---

## Trending Algorithm

The trending score uses a time-decay algorithm:

```
trending_score = (likes + comments * 2) / (hours_since_post + 2)^1.5
```

- Recent posts with engagement rank higher
- Comments weighted 2x likes (more valuable engagement)
- +2 offset prevents division issues for very new posts
- 1.5 exponent provides moderate decay rate

Trending is recalculated:
- Real-time for individual post views
- Batch job every hour for feed ordering
- Redis cache for hot posts (5-minute TTL)
