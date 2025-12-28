"""
Community Engagement Service for Aurastream.
Handles likes, comments, and follows for community posts.
"""

from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from uuid import uuid4

from backend.database.supabase_client import get_supabase_client
from backend.api.schemas.community import (
    CreateCommentRequest, UpdateCommentRequest, CommentWithAuthorResponse,
    UserSummary, CommunityUserStatsResponse, CreatorProfileResponse,
)
from backend.services.exceptions import (
    CommunityPostNotFoundError, CommunityCommentNotFoundError,
    CommunityCommentNotOwnedError, CommunityEditWindowExpiredError,
    CommunityUserBannedError, CommunitySelfFollowError,
)

COMMENT_EDIT_WINDOW_MINUTES = 15


class CommunityEngagementService:
    """Service for managing community engagement (likes, comments, follows)."""
    
    def __init__(self, supabase_client=None):
        self._supabase = supabase_client
    
    @property
    def db(self):
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    async def _check_user_banned(self, user_id: str) -> None:
        """Check if user is banned from community features."""
        result = self.db.table("community_user_stats").select("is_banned").eq("user_id", user_id).execute()
        if result.data and result.data[0].get("is_banned", False):
            raise CommunityUserBannedError(user_id)
    
    async def _get_user_summary(self, user_id: str) -> UserSummary:
        """Get minimal user info for display."""
        result = self.db.table("users").select("id, display_name, avatar_url").eq("id", user_id).execute()
        if not result.data:
            return UserSummary(id=user_id, display_name="Unknown User", avatar_url=None)
        u = result.data[0]
        return UserSummary(id=u["id"], display_name=u["display_name"], avatar_url=u.get("avatar_url"))
    
    async def _get_or_create_user_stats(self, user_id: str) -> dict:
        """Get or create user stats record."""
        result = self.db.table("community_user_stats").select("*").eq("user_id", user_id).execute()
        if result.data:
            return result.data[0]
        now = datetime.utcnow().isoformat() + "Z"
        new_stats = {"user_id": user_id, "post_count": 0, "total_likes_received": 0,
                     "follower_count": 0, "following_count": 0, "is_banned": False,
                     "created_at": now, "updated_at": now}
        insert_result = self.db.table("community_user_stats").insert(new_stats).execute()
        return insert_result.data[0] if insert_result.data else new_stats
    
    def _post_exists(self, post_id: str) -> bool:
        result = self.db.table("community_posts").select("id").eq("id", post_id).execute()
        return bool(result.data)

    # =========================================================================
    # Likes
    # =========================================================================
    
    async def like_post(self, user_id: str, post_id: str) -> None:
        """Like a post (idempotent, verifies post exists)."""
        await self._check_user_banned(user_id)
        if not self._post_exists(post_id):
            raise CommunityPostNotFoundError(post_id)
        existing = self.db.table("community_likes").select("id").eq("user_id", user_id).eq("post_id", post_id).execute()
        if existing.data:
            return
        now = datetime.utcnow().isoformat() + "Z"
        self.db.table("community_likes").insert({"id": str(uuid4()), "user_id": user_id, "post_id": post_id, "created_at": now}).execute()
        try:
            self.db.rpc("increment_post_like_count", {"p_post_id": post_id}).execute()
        except Exception:
            pass
    
    async def unlike_post(self, user_id: str, post_id: str) -> None:
        """Unlike a post (no error if not liked)."""
        self.db.table("community_likes").delete().eq("user_id", user_id).eq("post_id", post_id).execute()
        try:
            self.db.rpc("decrement_post_like_count", {"p_post_id": post_id}).execute()
        except Exception:
            pass
    
    async def is_liked(self, user_id: str, post_id: str) -> bool:
        """Check if user has liked a post."""
        result = self.db.table("community_likes").select("id").eq("user_id", user_id).eq("post_id", post_id).execute()
        return bool(result.data)

    # =========================================================================
    # Comments
    # =========================================================================
    
    def _map_comment(self, c: dict, author: UserSummary, can_edit: bool, can_delete: bool) -> CommentWithAuthorResponse:
        return CommentWithAuthorResponse(
            id=c["id"], post_id=c["post_id"], user_id=c["user_id"], content=c["content"],
            is_edited=c["is_edited"], author=author, can_edit=can_edit, can_delete=can_delete,
            created_at=datetime.fromisoformat(c["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(c["updated_at"].replace("Z", "+00:00")))
    
    async def create_comment(self, user_id: str, post_id: str, data: CreateCommentRequest) -> CommentWithAuthorResponse:
        """Create a comment on a post (verifies post exists)."""
        await self._check_user_banned(user_id)
        if not self._post_exists(post_id):
            raise CommunityPostNotFoundError(post_id)
        now = datetime.utcnow().isoformat() + "Z"
        comment_data = {"id": str(uuid4()), "post_id": post_id, "user_id": user_id,
                        "content": data.content, "is_edited": False, "created_at": now, "updated_at": now}
        result = self.db.table("community_comments").insert(comment_data).execute()
        if not result.data:
            raise Exception("Failed to create comment")
        try:
            self.db.rpc("increment_post_comment_count", {"p_post_id": post_id}).execute()
        except Exception:
            pass
        author = await self._get_user_summary(user_id)
        return self._map_comment(result.data[0], author, can_edit=True, can_delete=True)
    
    async def edit_comment(self, user_id: str, comment_id: str, data: UpdateCommentRequest) -> CommentWithAuthorResponse:
        """Edit a comment (owner only, 15-minute window)."""
        await self._check_user_banned(user_id)
        result = self.db.table("community_comments").select("*").eq("id", comment_id).execute()
        if not result.data:
            raise CommunityCommentNotFoundError(comment_id)
        comment = result.data[0]
        if comment["user_id"] != user_id:
            raise CommunityCommentNotOwnedError(comment_id)
        created_at = datetime.fromisoformat(comment["created_at"].replace("Z", "+00:00"))
        if datetime.utcnow().replace(tzinfo=created_at.tzinfo) > created_at + timedelta(minutes=COMMENT_EDIT_WINDOW_MINUTES):
            raise CommunityEditWindowExpiredError(comment_id, COMMENT_EDIT_WINDOW_MINUTES)
        now = datetime.utcnow().isoformat() + "Z"
        updated = self.db.table("community_comments").update({"content": data.content, "is_edited": True, "updated_at": now}).eq("id", comment_id).execute()
        author = await self._get_user_summary(user_id)
        return self._map_comment(updated.data[0], author, can_edit=True, can_delete=True)
    
    async def delete_comment(self, user_id: str, comment_id: str) -> None:
        """Delete a comment (owner or post owner can delete)."""
        result = self.db.table("community_comments").select("*, community_posts!inner(user_id)").eq("id", comment_id).execute()
        if not result.data:
            raise CommunityCommentNotFoundError(comment_id)
        comment = result.data[0]
        post_owner_id = comment.get("community_posts", {}).get("user_id")
        if comment["user_id"] != user_id and post_owner_id != user_id:
            raise CommunityCommentNotOwnedError(comment_id)
        self.db.table("community_comments").delete().eq("id", comment_id).execute()
        try:
            self.db.rpc("decrement_post_comment_count", {"p_post_id": comment["post_id"]}).execute()
        except Exception:
            pass
    
    async def list_comments(self, post_id: str, page: int, limit: int, viewer_id: Optional[str] = None) -> Tuple[List[CommentWithAuthorResponse], int]:
        """List comments for a post with pagination."""
        offset = (page - 1) * limit
        count_result = self.db.table("community_comments").select("id", count="exact").eq("post_id", post_id).execute()
        total = count_result.count or 0
        result = self.db.table("community_comments").select("*").eq("post_id", post_id).order("created_at", desc=False).range(offset, offset + limit - 1).execute()
        post_result = self.db.table("community_posts").select("user_id").eq("id", post_id).execute()
        post_owner_id = post_result.data[0]["user_id"] if post_result.data else None
        comments = []
        for c in result.data or []:
            author = await self._get_user_summary(c["user_id"])
            comments.append(self._map_comment(c, author, can_edit=viewer_id == c["user_id"],
                                              can_delete=viewer_id == c["user_id"] or viewer_id == post_owner_id))
        return comments, total

    # =========================================================================
    # Follows
    # =========================================================================
    
    async def follow_user(self, follower_id: str, following_id: str) -> None:
        """Follow a user (prevents self-follow, idempotent)."""
        if follower_id == following_id:
            raise CommunitySelfFollowError()
        await self._check_user_banned(follower_id)
        existing = self.db.table("community_follows").select("id").eq("follower_id", follower_id).eq("following_id", following_id).execute()
        if existing.data:
            return
        now = datetime.utcnow().isoformat() + "Z"
        self.db.table("community_follows").insert({"id": str(uuid4()), "follower_id": follower_id, "following_id": following_id, "created_at": now}).execute()
        try:
            await self._get_or_create_user_stats(follower_id)
            await self._get_or_create_user_stats(following_id)
            self.db.rpc("increment_following_count", {"p_user_id": follower_id}).execute()
            self.db.rpc("increment_follower_count", {"p_user_id": following_id}).execute()
        except Exception:
            pass
    
    async def unfollow_user(self, follower_id: str, following_id: str) -> None:
        """Unfollow a user (no error if not following)."""
        self.db.table("community_follows").delete().eq("follower_id", follower_id).eq("following_id", following_id).execute()
        try:
            self.db.rpc("decrement_following_count", {"p_user_id": follower_id}).execute()
            self.db.rpc("decrement_follower_count", {"p_user_id": following_id}).execute()
        except Exception:
            pass
    
    async def is_following(self, follower_id: str, following_id: str) -> bool:
        """Check if user is following another user."""
        result = self.db.table("community_follows").select("id").eq("follower_id", follower_id).eq("following_id", following_id).execute()
        return bool(result.data)
    
    async def get_followers(self, user_id: str, page: int, limit: int) -> Tuple[List[UserSummary], int]:
        """Get followers of a user with pagination."""
        offset = (page - 1) * limit
        count_result = self.db.table("community_follows").select("id", count="exact").eq("following_id", user_id).execute()
        total = count_result.count or 0
        result = self.db.table("community_follows").select("follower_id").eq("following_id", user_id).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return [await self._get_user_summary(f["follower_id"]) for f in result.data or []], total
    
    async def get_following(self, user_id: str, page: int, limit: int) -> Tuple[List[UserSummary], int]:
        """Get users that a user is following with pagination."""
        offset = (page - 1) * limit
        count_result = self.db.table("community_follows").select("id", count="exact").eq("follower_id", user_id).execute()
        total = count_result.count or 0
        result = self.db.table("community_follows").select("following_id").eq("follower_id", user_id).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return [await self._get_user_summary(f["following_id"]) for f in result.data or []], total
    
    async def get_user_stats(self, user_id: str) -> CommunityUserStatsResponse:
        """Get user's community statistics."""
        stats = await self._get_or_create_user_stats(user_id)
        return CommunityUserStatsResponse(user_id=stats["user_id"], post_count=stats.get("post_count", 0),
                                          total_likes_received=stats.get("total_likes_received", 0),
                                          follower_count=stats.get("follower_count", 0), following_count=stats.get("following_count", 0))
    
    async def get_creator_profile(self, user_id: str, viewer_id: Optional[str] = None) -> CreatorProfileResponse:
        """Get public creator profile."""
        user = await self._get_user_summary(user_id)
        stats = await self.get_user_stats(user_id)
        user_result = self.db.table("users").select("created_at").eq("id", user_id).execute()
        joined_at = datetime.fromisoformat(user_result.data[0]["created_at"].replace("Z", "+00:00")) if user_result.data else datetime.utcnow()
        is_following = await self.is_following(viewer_id, user_id) if viewer_id and viewer_id != user_id else False
        return CreatorProfileResponse(user=user, stats=stats, is_following=is_following, joined_at=joined_at)


_community_engagement_service: Optional[CommunityEngagementService] = None

def get_community_engagement_service() -> CommunityEngagementService:
    """Get or create the community engagement service singleton."""
    global _community_engagement_service
    if _community_engagement_service is None:
        _community_engagement_service = CommunityEngagementService()
    return _community_engagement_service
