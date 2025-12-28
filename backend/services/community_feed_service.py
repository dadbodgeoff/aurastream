"""
Community Feed Service - Feed/listing operations for community gallery.
"""

import logging
from typing import List, Optional, Tuple

from backend.database.supabase_client import get_supabase_client
from backend.api.schemas.community import (
    CommunityPostWithAuthorResponse,
    UserSummary,
    POST_SORT_OPTIONS,
)

logger = logging.getLogger(__name__)


class CommunityFeedService:
    """Service for community feed/listing operations."""

    def __init__(self, supabase_client=None):
        self._supabase = supabase_client

    @property
    def db(self):
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase

    async def _get_user_summary(self, user_id: str) -> Optional[UserSummary]:
        """Get minimal user info for display."""
        try:
            result = self.db.table("users").select("id, display_name, avatar_url").eq("id", user_id).single().execute()
            if result.data:
                return UserSummary(id=result.data["id"], display_name=result.data["display_name"], avatar_url=result.data.get("avatar_url"))
        except Exception as e:
            logger.error(f"Error fetching user summary for {user_id}: {e}")
        return None

    async def _batch_get_user_summaries(self, user_ids: List[str]) -> dict[str, UserSummary]:
        """Batch fetch user summaries for multiple users in a single query."""
        if not user_ids:
            return {}
        try:
            result = self.db.table("users").select("id, display_name, avatar_url").in_("id", list(set(user_ids))).execute()
            return {r["id"]: UserSummary(id=r["id"], display_name=r["display_name"], avatar_url=r.get("avatar_url")) 
                    for r in (result.data or [])}
        except Exception as e:
            logger.error(f"Error batch fetching user summaries: {e}")
            return {}

    async def _check_viewer_liked(self, post_id: str, viewer_id: Optional[str]) -> bool:
        """Check if viewer has liked a post."""
        if not viewer_id:
            return False
        try:
            result = self.db.table("community_likes").select("id").eq("post_id", post_id).eq("user_id", viewer_id).execute()
            return bool(result.data)
        except Exception:
            return False

    async def _batch_check_viewer_likes(self, post_ids: List[str], viewer_id: Optional[str]) -> set[str]:
        """Batch check which posts the viewer has liked."""
        if not viewer_id or not post_ids:
            return set()
        try:
            result = self.db.table("community_likes").select("post_id").in_("post_id", post_ids).eq("user_id", viewer_id).execute()
            return {r["post_id"] for r in (result.data or [])}
        except Exception:
            return set()

    async def _enrich_posts(self, posts: List[dict], viewer_id: Optional[str]) -> List[CommunityPostWithAuthorResponse]:
        """Add author info and like status to posts using batch queries."""
        if not posts:
            return []
        
        # Batch fetch all user summaries and like statuses
        user_ids = [post["user_id"] for post in posts]
        post_ids = [post["id"] for post in posts]
        
        user_map = await self._batch_get_user_summaries(user_ids)
        liked_posts = await self._batch_check_viewer_likes(post_ids, viewer_id)
        
        enriched = []
        for post in posts:
            author = user_map.get(post["user_id"])
            if not author:
                continue
            is_liked = post["id"] in liked_posts
            enriched.append(CommunityPostWithAuthorResponse(
                id=post["id"], user_id=post["user_id"], asset_id=post["asset_id"],
                title=post["title"], description=post.get("description"),
                prompt_used=post.get("prompt_used"), show_prompt=post.get("show_prompt", True),
                tags=post.get("tags", []), asset_type=post["asset_type"], asset_url=post["asset_url"],
                like_count=post.get("like_count", 0), comment_count=post.get("comment_count", 0),
                view_count=post.get("view_count", 0), is_featured=post.get("is_featured", False),
                inspired_by_post_id=post.get("inspired_by_post_id"),
                created_at=post["created_at"], updated_at=post["updated_at"],
                author=author, is_liked=is_liked,
            ))
        return enriched

    async def list_posts(
        self, page: int = 1, limit: int = 20, sort: POST_SORT_OPTIONS = "trending",
        asset_type: Optional[str] = None, tags: Optional[List[str]] = None,
        user_id: Optional[str] = None, viewer_id: Optional[str] = None,
    ) -> Tuple[List[CommunityPostWithAuthorResponse], int]:
        """Paginated listing with filters."""
        offset = (page - 1) * limit
        query = self.db.table("community_posts").select("*", count="exact").eq("is_hidden", False)
        if asset_type:
            query = query.eq("asset_type", asset_type)
        if user_id:
            query = query.eq("user_id", user_id)
        if tags:
            query = query.contains("tags", tags)
        order_col = "like_count" if sort == "most_liked" else "created_at"
        result = query.order(order_col, desc=True).range(offset, offset + limit - 1).execute()
        return await self._enrich_posts(result.data or [], viewer_id), result.count or 0

    async def search_posts(
        self, query: str, page: int = 1, limit: int = 20, viewer_id: Optional[str] = None,
    ) -> Tuple[List[CommunityPostWithAuthorResponse], int]:
        """Full-text search using RPC search_community_posts."""
        offset = (page - 1) * limit
        try:
            result = self.db.rpc("search_community_posts", {"p_query": query, "p_limit": limit, "p_offset": offset}).execute()
            posts = result.data or []
            total = len(posts) + offset if len(posts) == limit else len(posts) + offset
            return await self._enrich_posts(posts, viewer_id), total
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return [], 0

    async def get_featured_posts(
        self, limit: int = 10, viewer_id: Optional[str] = None,
    ) -> Tuple[List[CommunityPostWithAuthorResponse], int]:
        """Get featured/spotlight posts."""
        result = self.db.table("community_posts").select("*", count="exact").eq("is_featured", True).eq("is_hidden", False).order("created_at", desc=True).limit(limit).execute()
        return await self._enrich_posts(result.data or [], viewer_id), result.count or 0

    async def get_trending_posts(
        self, limit: int = 20, asset_type: Optional[str] = None, viewer_id: Optional[str] = None,
    ) -> Tuple[List[CommunityPostWithAuthorResponse], int]:
        """Get trending posts using RPC get_trending_community_posts."""
        try:
            params = {"p_limit": limit}
            if asset_type:
                params["p_asset_type"] = asset_type
            result = self.db.rpc("get_trending_community_posts", params).execute()
            posts = result.data or []
            return await self._enrich_posts(posts, viewer_id), len(posts)
        except Exception as e:
            logger.error(f"Trending fetch failed: {e}")
            return [], 0

    async def get_following_feed(
        self, user_id: str, page: int = 1, limit: int = 20,
    ) -> Tuple[List[CommunityPostWithAuthorResponse], int]:
        """Get posts from followed users using RPC get_community_following_feed."""
        offset = (page - 1) * limit
        try:
            result = self.db.rpc("get_community_following_feed", {"p_user_id": user_id, "p_limit": limit, "p_offset": offset}).execute()
            posts = result.data or []
            total = len(posts) + offset if len(posts) == limit else len(posts) + offset
            return await self._enrich_posts(posts, user_id), total
        except Exception as e:
            logger.error(f"Following feed failed: {e}")
            return [], 0

    async def get_user_posts(
        self, target_user_id: str, page: int = 1, limit: int = 20, viewer_id: Optional[str] = None,
    ) -> Tuple[List[CommunityPostWithAuthorResponse], int]:
        """Get posts by a specific user."""
        offset = (page - 1) * limit
        result = self.db.table("community_posts").select("*", count="exact").eq("user_id", target_user_id).eq("is_hidden", False).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return await self._enrich_posts(result.data or [], viewer_id), result.count or 0

    async def get_liked_posts(
        self, user_id: str, page: int = 1, limit: int = 20,
    ) -> Tuple[List[CommunityPostWithAuthorResponse], int]:
        """Get posts the user has liked."""
        offset = (page - 1) * limit
        likes = self.db.table("community_likes").select("post_id", count="exact").eq("user_id", user_id).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        total = likes.count or 0
        if not likes.data:
            return [], total
        post_ids = [like["post_id"] for like in likes.data]
        posts_result = self.db.table("community_posts").select("*").in_("id", post_ids).eq("is_hidden", False).execute()
        posts_map = {p["id"]: p for p in (posts_result.data or [])}
        posts = [posts_map[pid] for pid in post_ids if pid in posts_map]
        return await self._enrich_posts(posts, user_id), total

    async def get_spotlight_creators(
        self, limit: int = 10, viewer_id: Optional[str] = None,
    ) -> List[dict]:
        """
        Get spotlight creators - users with the most engagement.
        Returns creators with their recent assets and follow status.
        """
        try:
            # Get users with most likes received on their posts
            result = self.db.rpc("get_spotlight_creators", {"p_limit": limit}).execute()
            creators = result.data or []
        except Exception as e:
            logger.warning(f"RPC get_spotlight_creators failed, using fallback: {e}")
            # Fallback: get users with most posts
            result = self.db.table("community_user_stats").select("user_id, post_count, total_likes_received, follower_count, following_count").order("total_likes_received", desc=True).limit(limit).execute()
            creators = result.data or []

        enriched = []
        for creator in creators:
            user_id = creator.get("user_id") or creator.get("id")
            if not user_id:
                continue

            # Get user info
            user = await self._get_user_summary(user_id)
            if not user:
                continue

            # Get recent assets
            recent_posts = self.db.table("community_posts").select("id, asset_url, asset_type").eq("user_id", user_id).eq("is_hidden", False).order("created_at", desc=True).limit(4).execute()
            recent_assets = [
                {"id": p["id"], "url": p["asset_url"], "type": p["asset_type"]}
                for p in (recent_posts.data or [])
            ]

            # Check if viewer follows this creator
            is_following = False
            if viewer_id and viewer_id != user_id:
                follow_check = self.db.table("community_follows").select("id").eq("follower_id", viewer_id).eq("followed_id", user_id).execute()
                is_following = bool(follow_check.data)

            enriched.append({
                "id": user_id,
                "display_name": user.display_name,
                "avatar_url": user.avatar_url,
                "follower_count": creator.get("follower_count", 0),
                "following_count": creator.get("following_count", 0),
                "is_following": is_following,
                "recent_assets": recent_assets,
            })

        return enriched

    async def get_user_profile(self, user_id: str, viewer_id: Optional[str] = None) -> dict:
        """Get a user's community profile with stats."""
        user = await self._get_user_summary(user_id)
        if not user:
            raise ValueError("User not found")

        # Get stats
        stats_result = self.db.table("community_user_stats").select("*").eq("user_id", user_id).execute()
        stats = stats_result.data[0] if stats_result.data else {
            "user_id": user_id, "post_count": 0, "total_likes_received": 0,
            "follower_count": 0, "following_count": 0, "is_banned": False
        }

        # Check if viewer follows this user
        is_following = False
        if viewer_id and viewer_id != user_id:
            follow_check = self.db.table("community_follows").select("id").eq("follower_id", viewer_id).eq("followed_id", user_id).execute()
            is_following = bool(follow_check.data)

        # Get joined date from users table
        user_result = self.db.table("users").select("created_at").eq("id", user_id).single().execute()
        joined_at = user_result.data.get("created_at") if user_result.data else None

        return {
            "user": {"id": user.id, "display_name": user.display_name, "avatar_url": user.avatar_url},
            "stats": stats,
            "is_following": is_following,
            "joined_at": joined_at,
        }

    async def follow_user(self, follower_id: str, followed_id: str) -> None:
        """Follow a user."""
        try:
            self.db.table("community_follows").insert({
                "follower_id": follower_id,
                "followed_id": followed_id,
            }).execute()
        except Exception as e:
            # Likely already following (unique constraint)
            logger.debug(f"Follow failed (may already exist): {e}")

    async def unfollow_user(self, follower_id: str, followed_id: str) -> None:
        """Unfollow a user."""
        self.db.table("community_follows").delete().eq("follower_id", follower_id).eq("followed_id", followed_id).execute()


_community_feed_service: Optional[CommunityFeedService] = None


def get_community_feed_service() -> CommunityFeedService:
    """Get or create the community feed service singleton."""
    global _community_feed_service
    if _community_feed_service is None:
        _community_feed_service = CommunityFeedService()
    return _community_feed_service
