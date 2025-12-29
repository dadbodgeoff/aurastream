"""
Social Service for AuraStream.
Handles friends management and direct messaging.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from backend.database.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class SocialService:
    """Service for friends and messaging operations."""

    def __init__(self):
        self._supabase = None

    @property
    def supabase(self):
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase

    # ========================================================================
    # Friends Management
    # ========================================================================

    async def get_friends_list(self, user_id: str) -> dict:
        """Get user's friends, pending requests, and sent requests."""
        # Get accepted friends
        friends_result = self.supabase.table("friendships").select(
            "id, user_id, friend_id, created_at"
        ).or_(
            f"user_id.eq.{user_id},friend_id.eq.{user_id}"
        ).eq("status", "accepted").execute()

        friends = []
        for f in friends_result.data or []:
            friend_user_id = f["friend_id"] if f["user_id"] == user_id else f["user_id"]
            profile = await self._get_user_profile(friend_user_id)
            friends.append({
                "friendship_id": f["id"],
                "user_id": friend_user_id,
                "display_name": profile.get("display_name") if profile else None,
                "avatar_url": profile.get("avatar_url") if profile else None,
                "is_online": False,  # Placeholder - implement presence later
                "created_at": f["created_at"],
            })

        # Get pending requests (received)
        pending_result = self.supabase.table("friendships").select(
            "id, user_id, created_at"
        ).eq("friend_id", user_id).eq("status", "pending").execute()

        pending_requests = []
        for r in pending_result.data or []:
            profile = await self._get_user_profile(r["user_id"])
            pending_requests.append({
                "friendship_id": r["id"],
                "user_id": r["user_id"],
                "display_name": profile.get("display_name") if profile else None,
                "avatar_url": profile.get("avatar_url") if profile else None,
                "created_at": r["created_at"],
            })

        # Get sent requests
        sent_result = self.supabase.table("friendships").select(
            "id, friend_id, created_at"
        ).eq("user_id", user_id).eq("status", "pending").execute()

        sent_requests = []
        for r in sent_result.data or []:
            profile = await self._get_user_profile(r["friend_id"])
            sent_requests.append({
                "friendship_id": r["id"],
                "user_id": r["friend_id"],
                "display_name": profile.get("display_name") if profile else None,
                "avatar_url": profile.get("avatar_url") if profile else None,
                "created_at": r["created_at"],
            })

        return {
            "friends": friends,
            "pending_requests": pending_requests,
            "sent_requests": sent_requests,
        }

    async def send_friend_request(self, user_id: str, friend_id: str) -> dict:
        """Send a friend request."""
        if user_id == friend_id:
            raise ValueError("Cannot send friend request to yourself")

        # Check if target user exists
        target = await self._get_user_profile(friend_id)
        if not target:
            raise ValueError("User not found")

        # Check if blocked
        if await self._is_blocked(user_id, friend_id):
            raise ValueError("Cannot send friend request to this user")

        # Check existing relationship
        existing = await self._get_relationship(user_id, friend_id)
        if existing:
            if existing["status"] == "accepted":
                raise ValueError("Already friends with this user")
            elif existing["status"] == "pending":
                if existing["user_id"] == user_id:
                    raise ValueError("Friend request already sent")
                else:
                    # Accept the incoming request
                    return await self.accept_friend_request(existing["id"], user_id)
            elif existing["status"] == "blocked":
                raise ValueError("Cannot send friend request to this user")

        # Create friend request
        now = datetime.now(timezone.utc).isoformat()
        result = self.supabase.table("friendships").insert({
            "user_id": user_id,
            "friend_id": friend_id,
            "status": "pending",
            "created_at": now,
            "updated_at": now,
        }).execute()

        return {
            "friendship_id": result.data[0]["id"],
            "status": "pending",
            "message": "Friend request sent",
        }

    async def accept_friend_request(self, friendship_id: str, user_id: str) -> dict:
        """Accept a friend request."""
        now = datetime.now(timezone.utc).isoformat()
        result = self.supabase.table("friendships").update({
            "status": "accepted",
            "updated_at": now,
        }).eq("id", friendship_id).eq("friend_id", user_id).eq("status", "pending").execute()

        if not result.data:
            raise ValueError("Friend request not found")

        return {
            "friendship_id": friendship_id,
            "status": "accepted",
            "message": "Friend request accepted",
        }

    async def decline_friend_request(self, friendship_id: str, user_id: str) -> dict:
        """Decline a friend request."""
        result = self.supabase.table("friendships").delete().eq(
            "id", friendship_id
        ).eq("friend_id", user_id).eq("status", "pending").execute()

        if not result.data:
            raise ValueError("Friend request not found")

        return {"message": "Friend request declined"}

    async def remove_friend(self, friendship_id: str, user_id: str) -> dict:
        """Remove a friend."""
        result = self.supabase.table("friendships").delete().eq(
            "id", friendship_id
        ).or_(f"user_id.eq.{user_id},friend_id.eq.{user_id}").execute()

        if not result.data:
            raise ValueError("Friendship not found")

        return {"message": "Friend removed"}

    async def search_users(self, user_id: str, query: str, limit: int = 20) -> dict:
        """Search users by display name."""
        if len(query) < 2:
            return {"users": [], "total": 0}

        # Get blocked users to exclude
        blocked = await self.get_blocked_users(user_id)
        blocked_ids = {b["user_id"] for b in blocked.get("blocked_users", [])}

        # Search users
        result = self.supabase.table("users").select(
            "id, display_name, avatar_url"
        ).ilike("display_name", f"%{query}%").neq("id", user_id).limit(limit + 10).execute()

        users = []
        for u in result.data or []:
            if u["id"] in blocked_ids:
                continue
            if await self._is_blocked(user_id, u["id"]):
                continue

            rel = await self._get_relationship(user_id, u["id"])
            users.append({
                "id": u["id"],
                "display_name": u["display_name"],
                "avatar_url": u["avatar_url"],
                "relationship_status": rel["status"] if rel else "none",
            })
            if len(users) >= limit:
                break

        return {"users": users, "total": len(users)}

    # ========================================================================
    # Block Management
    # ========================================================================

    async def block_user(self, user_id: str, block_id: str) -> dict:
        """Block a user."""
        if user_id == block_id:
            raise ValueError("Cannot block yourself")

        # Check if already blocked
        existing = self.supabase.table("blocked_users").select("id").eq(
            "user_id", user_id
        ).eq("blocked_user_id", block_id).execute()

        if existing.data:
            return {"message": "User already blocked"}

        # Remove any existing friendship
        self.supabase.table("friendships").delete().or_(
            f"and(user_id.eq.{user_id},friend_id.eq.{block_id}),and(user_id.eq.{block_id},friend_id.eq.{user_id})"
        ).execute()

        # Create block
        now = datetime.now(timezone.utc).isoformat()
        self.supabase.table("blocked_users").insert({
            "user_id": user_id,
            "blocked_user_id": block_id,
            "created_at": now,
        }).execute()

        return {"message": "User blocked"}

    async def unblock_user(self, user_id: str, block_id: str) -> dict:
        """Unblock a user."""
        result = self.supabase.table("blocked_users").delete().eq(
            "user_id", user_id
        ).eq("blocked_user_id", block_id).execute()

        if not result.data:
            raise ValueError("User not blocked")

        return {"message": "User unblocked"}

    async def get_blocked_users(self, user_id: str) -> dict:
        """Get list of blocked users."""
        result = self.supabase.table("blocked_users").select(
            "blocked_user_id, created_at"
        ).eq("user_id", user_id).execute()

        blocked_users = []
        for b in result.data or []:
            profile = await self._get_user_profile(b["blocked_user_id"])
            blocked_users.append({
                "user_id": b["blocked_user_id"],
                "display_name": profile.get("display_name") if profile else None,
                "avatar_url": profile.get("avatar_url") if profile else None,
                "blocked_at": b["created_at"],
            })

        return {"blocked_users": blocked_users}

    # ========================================================================
    # Helper Methods
    # ========================================================================

    async def _get_user_profile(self, user_id: str) -> Optional[dict]:
        """Get user profile by ID."""
        result = self.supabase.table("users").select(
            "id, display_name, avatar_url"
        ).eq("id", user_id).execute()
        return result.data[0] if result.data else None

    async def _get_relationship(self, user_id: str, other_id: str) -> Optional[dict]:
        """Get relationship between two users."""
        result = self.supabase.table("friendships").select("*").or_(
            f"and(user_id.eq.{user_id},friend_id.eq.{other_id}),and(user_id.eq.{other_id},friend_id.eq.{user_id})"
        ).execute()
        return result.data[0] if result.data else None

    async def _is_blocked(self, user_id: str, by_user_id: str) -> bool:
        """Check if user is blocked by another user."""
        result = self.supabase.table("blocked_users").select("id").eq(
            "user_id", by_user_id
        ).eq("blocked_user_id", user_id).execute()
        return bool(result.data)

    async def _are_friends(self, user_id: str, other_id: str) -> bool:
        """Check if two users are friends."""
        rel = await self._get_relationship(user_id, other_id)
        return rel is not None and rel["status"] == "accepted"


# Singleton
_social_service: Optional[SocialService] = None


def get_social_service() -> SocialService:
    global _social_service
    if _social_service is None:
        _social_service = SocialService()
    return _social_service
