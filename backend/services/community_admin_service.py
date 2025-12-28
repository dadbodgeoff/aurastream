"""
Community Admin Service for Aurastream.

Handles admin/moderation operations for community posts and users.
"""

from datetime import datetime
from typing import List, Optional, Tuple
from uuid import uuid4

from backend.database.supabase_client import get_supabase_client
from backend.api.schemas.community import (
    CommunityPostResponse, ReportPostRequest, ReportResponse,
)
from backend.services.exceptions import (
    CommunityPostNotFoundError, CommunityAlreadyReportedError, CommunityUserBannedError,
)


class CommunityAdminService:
    """Service for community admin/moderation operations."""
    
    def __init__(self, supabase_client=None):
        self._supabase = supabase_client
    
    @property
    def db(self):
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
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
    
    async def _get_or_create_user_stats(self, user_id: str) -> dict:
        """Get or create community user stats record."""
        result = self.db.table("community_user_stats").select("*").eq("user_id", user_id).execute()
        if result.data:
            return result.data[0]
        # Create new stats record
        now = datetime.utcnow().isoformat() + "Z"
        new_stats = {
            "user_id": user_id, "post_count": 0, "total_likes_received": 0,
            "follower_count": 0, "following_count": 0, "is_banned": False,
            "ban_reason": None, "created_at": now, "updated_at": now,
        }
        insert_result = self.db.table("community_user_stats").insert(new_stats).execute()
        return insert_result.data[0] if insert_result.data else new_stats
    
    async def toggle_featured(self, post_id: str, is_featured: bool) -> CommunityPostResponse:
        """Toggle featured status of a post."""
        result = self.db.table("community_posts").select("*").eq("id", post_id).execute()
        if not result.data:
            raise CommunityPostNotFoundError(post_id)
        
        update_data = {"is_featured": is_featured, "updated_at": datetime.utcnow().isoformat() + "Z"}
        updated = self.db.table("community_posts").update(update_data).eq("id", post_id).execute()
        return self._map_post_response(updated.data[0])
    
    async def toggle_hidden(self, post_id: str, is_hidden: bool) -> CommunityPostResponse:
        """Toggle hidden status of a post."""
        result = self.db.table("community_posts").select("*").eq("id", post_id).execute()
        if not result.data:
            raise CommunityPostNotFoundError(post_id)
        
        update_data = {"is_hidden": is_hidden, "updated_at": datetime.utcnow().isoformat() + "Z"}
        updated = self.db.table("community_posts").update(update_data).eq("id", post_id).execute()
        return self._map_post_response(updated.data[0])
    
    async def ban_user(self, user_id: str, reason: str) -> None:
        """Ban a user from community features."""
        stats = await self._get_or_create_user_stats(user_id)
        if stats.get("is_banned"):
            raise CommunityUserBannedError(user_id)
        
        update_data = {
            "is_banned": True, "ban_reason": reason,
            "updated_at": datetime.utcnow().isoformat() + "Z",
        }
        self.db.table("community_user_stats").update(update_data).eq("user_id", user_id).execute()
    
    async def unban_user(self, user_id: str) -> None:
        """Unban a user from community features."""
        await self._get_or_create_user_stats(user_id)
        update_data = {
            "is_banned": False, "ban_reason": None,
            "updated_at": datetime.utcnow().isoformat() + "Z",
        }
        self.db.table("community_user_stats").update(update_data).eq("user_id", user_id).execute()
    
    async def report_post(
        self, reporter_id: str, post_id: str, data: ReportPostRequest
    ) -> ReportResponse:
        """Create a report for a post."""
        # Verify post exists
        post_result = self.db.table("community_posts").select("id").eq("id", post_id).execute()
        if not post_result.data:
            raise CommunityPostNotFoundError(post_id)
        
        # Check if already reported by this user
        existing = self.db.table("community_reports").select("id").eq(
            "post_id", post_id
        ).eq("reporter_id", reporter_id).execute()
        if existing.data:
            raise CommunityAlreadyReportedError(post_id)
        
        now = datetime.utcnow().isoformat() + "Z"
        report_data = {
            "id": str(uuid4()), "post_id": post_id, "reporter_id": reporter_id,
            "reason": data.reason, "details": data.details, "status": "pending",
            "reviewed_by": None, "reviewed_at": None, "created_at": now,
        }
        result = self.db.table("community_reports").insert(report_data).execute()
        r = result.data[0]
        return ReportResponse(
            id=r["id"], post_id=r["post_id"], reporter_id=r["reporter_id"],
            reason=r["reason"], details=r.get("details"), status=r["status"],
            reviewed_by=r.get("reviewed_by"), reviewed_at=None, created_at=datetime.fromisoformat(r["created_at"].replace("Z", "+00:00")),
        )
    
    async def list_reports(
        self, status: Optional[str] = None, page: int = 1, limit: int = 20
    ) -> Tuple[List[ReportResponse], int]:
        """List reports with optional status filter."""
        query = self.db.table("community_reports").select("*", count="exact")
        if status:
            query = query.eq("status", status)
        
        offset = (page - 1) * limit
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        result = query.execute()
        
        reports = []
        for r in result.data:
            reviewed_at = None
            if r.get("reviewed_at"):
                reviewed_at = datetime.fromisoformat(r["reviewed_at"].replace("Z", "+00:00"))
            reports.append(ReportResponse(
                id=r["id"], post_id=r["post_id"], reporter_id=r["reporter_id"],
                reason=r["reason"], details=r.get("details"), status=r["status"],
                reviewed_by=r.get("reviewed_by"), reviewed_at=reviewed_at,
                created_at=datetime.fromisoformat(r["created_at"].replace("Z", "+00:00")),
            ))
        
        total = result.count if result.count is not None else len(reports)
        return reports, total
    
    async def review_report(
        self, admin_id: str, report_id: str, status: str, hide_post: bool = False
    ) -> ReportResponse:
        """Review a report and optionally hide the post."""
        result = self.db.table("community_reports").select("*").eq("id", report_id).execute()
        if not result.data:
            raise CommunityPostNotFoundError(report_id)
        
        now = datetime.utcnow().isoformat() + "Z"
        update_data = {"status": status, "reviewed_by": admin_id, "reviewed_at": now}
        updated = self.db.table("community_reports").update(update_data).eq("id", report_id).execute()
        
        # Optionally hide the post
        if hide_post:
            post_id = result.data[0]["post_id"]
            self.db.table("community_posts").update(
                {"is_hidden": True, "updated_at": now}
            ).eq("id", post_id).execute()
        
        r = updated.data[0]
        reviewed_at = datetime.fromisoformat(r["reviewed_at"].replace("Z", "+00:00")) if r.get("reviewed_at") else None
        return ReportResponse(
            id=r["id"], post_id=r["post_id"], reporter_id=r["reporter_id"],
            reason=r["reason"], details=r.get("details"), status=r["status"],
            reviewed_by=r.get("reviewed_by"), reviewed_at=reviewed_at,
            created_at=datetime.fromisoformat(r["created_at"].replace("Z", "+00:00")),
        )


# Singleton instance
_community_admin_service: Optional[CommunityAdminService] = None


def get_community_admin_service() -> CommunityAdminService:
    """Get or create the community admin service singleton."""
    global _community_admin_service
    if _community_admin_service is None:
        _community_admin_service = CommunityAdminService()
    return _community_admin_service
