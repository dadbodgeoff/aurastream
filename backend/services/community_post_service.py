"""
Community Post Service for Aurastream.

Handles community post CRUD operations with ownership verification.
"""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from backend.database.supabase_client import get_supabase_client
from backend.api.schemas.community import (
    CreatePostRequest, UpdatePostRequest, CommunityPostResponse,
    CommunityPostWithAuthorResponse, UserSummary,
)
from backend.services.exceptions import (
    CommunityPostNotFoundError, CommunityAssetNotOwnedError,
    CommunityPostNotOwnedError, CommunityAlreadySharedError, CommunityUserBannedError,
)


class CommunityPostService:
    """Service for managing community posts."""
    
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
    
    def _map_post_response(self, post: dict) -> CommunityPostResponse:
        """Map database row to CommunityPostResponse."""
        return CommunityPostResponse(
            id=post["id"], user_id=post["user_id"], asset_id=post["asset_id"],
            title=post["title"], description=post.get("description"),
            prompt_used=post.get("prompt_used") if post.get("show_prompt", True) else None,
            show_prompt=post.get("show_prompt", True), tags=post.get("tags", []),
            asset_type=post["asset_type"], asset_url=post["asset_url"],
            like_count=post.get("like_count", 0), comment_count=post.get("comment_count", 0),
            view_count=post.get("view_count", 0), is_featured=post.get("is_featured", False),
            inspired_by_post_id=post.get("inspired_by_post_id"),
            created_at=datetime.fromisoformat(post["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(post["updated_at"].replace("Z", "+00:00")),
        )
    
    def _map_post_with_author_response(
        self, post: dict, author: UserSummary, is_liked: bool = False
    ) -> CommunityPostWithAuthorResponse:
        """Map database row to CommunityPostWithAuthorResponse."""
        return CommunityPostWithAuthorResponse(
            id=post["id"], user_id=post["user_id"], asset_id=post["asset_id"],
            title=post["title"], description=post.get("description"),
            prompt_used=post.get("prompt_used") if post.get("show_prompt", True) else None,
            show_prompt=post.get("show_prompt", True), tags=post.get("tags", []),
            asset_type=post["asset_type"], asset_url=post["asset_url"],
            like_count=post.get("like_count", 0), comment_count=post.get("comment_count", 0),
            view_count=post.get("view_count", 0), is_featured=post.get("is_featured", False),
            inspired_by_post_id=post.get("inspired_by_post_id"),
            created_at=datetime.fromisoformat(post["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(post["updated_at"].replace("Z", "+00:00")),
            author=author, is_liked=is_liked,
        )
    
    async def create_post(self, user_id: str, data: CreatePostRequest) -> CommunityPostWithAuthorResponse:
        """Create a new community post by sharing an asset."""
        await self._check_user_banned(user_id)
        
        # Verify asset ownership
        asset_result = self.db.table("assets").select("id, user_id, asset_type, url, prompt_used").eq("id", data.asset_id).execute()
        if not asset_result.data:
            raise CommunityAssetNotOwnedError(data.asset_id)
        asset = asset_result.data[0]
        if asset["user_id"] != user_id:
            raise CommunityAssetNotOwnedError(data.asset_id)
        
        # Check if asset is already shared
        existing = self.db.table("community_posts").select("id").eq("asset_id", data.asset_id).execute()
        if existing.data:
            raise CommunityAlreadySharedError(data.asset_id)
        
        now = datetime.utcnow().isoformat() + "Z"
        post_data = {
            "id": str(uuid4()), "user_id": user_id, "asset_id": data.asset_id,
            "title": data.title, "description": data.description, "tags": data.tags,
            "show_prompt": data.show_prompt,
            "prompt_used": asset.get("prompt_used") if data.show_prompt else None,
            "asset_type": asset["asset_type"], "asset_url": asset["url"],
            "inspired_by_post_id": data.inspired_by_post_id,
            "like_count": 0, "comment_count": 0, "view_count": 0,
            "is_featured": False, "created_at": now, "updated_at": now,
        }
        
        result = self.db.table("community_posts").insert(post_data).execute()
        if not result.data:
            raise Exception("Failed to create community post")
        
        author = await self._get_user_summary(user_id)
        return self._map_post_with_author_response(result.data[0], author, is_liked=False)
    
    async def get_post(self, post_id: str, viewer_id: Optional[str] = None) -> CommunityPostWithAuthorResponse:
        """Get a community post by ID and increment view count."""
        result = self.db.table("community_posts").select("*").eq("id", post_id).execute()
        if not result.data:
            raise CommunityPostNotFoundError(post_id)
        post = result.data[0]
        
        # Increment view count via RPC (non-critical)
        try:
            self.db.rpc("increment_post_view_count", {"p_post_id": post_id}).execute()
        except Exception:
            pass
        
        # Check if viewer has liked the post
        is_liked = False
        if viewer_id:
            like_result = self.db.table("community_likes").select("id").eq("post_id", post_id).eq("user_id", viewer_id).execute()
            is_liked = bool(like_result.data)
        
        author = await self._get_user_summary(post["user_id"])
        return self._map_post_with_author_response(post, author, is_liked=is_liked)
    
    async def update_post(self, user_id: str, post_id: str, data: UpdatePostRequest) -> CommunityPostWithAuthorResponse:
        """Update an existing community post."""
        await self._check_user_banned(user_id)
        
        result = self.db.table("community_posts").select("*").eq("id", post_id).execute()
        if not result.data:
            raise CommunityPostNotFoundError(post_id)
        post = result.data[0]
        if post["user_id"] != user_id:
            raise CommunityPostNotOwnedError(post_id)
        
        update_data = {"updated_at": datetime.utcnow().isoformat() + "Z"}
        if data.title is not None:
            update_data["title"] = data.title
        if data.description is not None:
            update_data["description"] = data.description
        if data.tags is not None:
            update_data["tags"] = data.tags
        if data.show_prompt is not None:
            update_data["show_prompt"] = data.show_prompt
        
        updated = self.db.table("community_posts").update(update_data).eq("id", post_id).execute()
        if not updated.data:
            raise CommunityPostNotFoundError(post_id)
        
        author = await self._get_user_summary(user_id)
        return self._map_post_with_author_response(updated.data[0], author, is_liked=False)
    
    async def delete_post(self, user_id: str, post_id: str) -> None:
        """Delete a community post."""
        result = self.db.table("community_posts").select("id, user_id").eq("id", post_id).execute()
        if not result.data:
            raise CommunityPostNotFoundError(post_id)
        if result.data[0]["user_id"] != user_id:
            raise CommunityPostNotOwnedError(post_id)
        
        self.db.table("community_posts").delete().eq("id", post_id).execute()


# Singleton instance
_community_post_service: Optional[CommunityPostService] = None


def get_community_post_service() -> CommunityPostService:
    """Get or create the community post service singleton."""
    global _community_post_service
    if _community_post_service is None:
        _community_post_service = CommunityPostService()
    return _community_post_service
