"""
Message Service for AuraStream.
Handles direct messaging between users.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List
from backend.database.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class MessageService:
    """Service for direct messaging operations."""

    def __init__(self):
        self._supabase = None

    @property
    def supabase(self):
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase

    # ========================================================================
    # Conversations
    # ========================================================================

    async def get_or_create_conversation(self, user1_id: str, user2_id: str) -> dict:
        """Get or create a conversation between two users."""
        # Ensure consistent ordering (smaller UUID first)
        if user1_id < user2_id:
            smaller, larger = user1_id, user2_id
        else:
            smaller, larger = user2_id, user1_id

        # Try to find existing conversation
        result = self.supabase.table("conversations").select("*").eq(
            "user1_id", smaller
        ).eq("user2_id", larger).execute()

        if result.data:
            return result.data[0]

        # Create new conversation
        now = datetime.now(timezone.utc).isoformat()
        result = self.supabase.table("conversations").insert({
            "user1_id": smaller,
            "user2_id": larger,
            "created_at": now,
            "updated_at": now,
        }).execute()

        return result.data[0]

    async def get_conversations(self, user_id: str) -> dict:
        """Get all conversations for a user."""
        result = self.supabase.table("conversations").select("*").or_(
            f"user1_id.eq.{user_id},user2_id.eq.{user_id}"
        ).order("updated_at", desc=True).execute()

        conversations = []
        total_unread = 0

        for conv in result.data or []:
            other_user_id = conv["user2_id"] if conv["user1_id"] == user_id else conv["user1_id"]

            # Get other user's profile
            profile = await self._get_user_profile(other_user_id)

            # Get last message
            last_msg_result = self.supabase.table("messages").select(
                "id, content, sender_id, created_at"
            ).eq("conversation_id", conv["id"]).order("created_at", desc=True).limit(1).execute()

            last_message = None
            if last_msg_result.data:
                lm = last_msg_result.data[0]
                last_message = {
                    "id": lm["id"],
                    "content": lm["content"],
                    "sender_id": lm["sender_id"],
                    "created_at": lm["created_at"],
                }

            # Get unread count
            unread_result = self.supabase.table("messages").select(
                "id", count="exact"
            ).eq("conversation_id", conv["id"]).eq(
                "sender_id", other_user_id
            ).is_("read_at", "null").execute()

            unread_count = unread_result.count or 0
            total_unread += unread_count

            conversations.append({
                "conversation_id": conv["id"],
                "other_user_id": other_user_id,
                "other_user_display_name": profile.get("display_name") if profile else None,
                "other_user_avatar_url": profile.get("avatar_url") if profile else None,
                "is_online": False,  # Placeholder
                "last_message": last_message,
                "unread_count": unread_count,
                "updated_at": conv["updated_at"],
            })

        return {"conversations": conversations, "total_unread": total_unread}

    # ========================================================================
    # Messages
    # ========================================================================

    async def get_messages(
        self, user_id: str, other_user_id: str, limit: int = 50, before_id: Optional[str] = None
    ) -> dict:
        """Get message history between two users."""
        # Check if blocked
        if await self._is_blocked(user_id, other_user_id):
            raise ValueError("Cannot view messages with this user")

        conv = await self.get_or_create_conversation(user_id, other_user_id)

        query = self.supabase.table("messages").select("*").eq(
            "conversation_id", conv["id"]
        ).order("created_at", desc=True).limit(limit + 1)

        if before_id:
            before_msg = self.supabase.table("messages").select(
                "created_at"
            ).eq("id", before_id).execute()
            if before_msg.data:
                query = query.lt("created_at", before_msg.data[0]["created_at"])

        result = query.execute()
        messages = result.data or []

        has_more = len(messages) > limit
        if has_more:
            messages = messages[:limit]

        # Reverse to get chronological order
        messages.reverse()

        return {
            "messages": messages,
            "has_more": has_more,
            "oldest_id": messages[0]["id"] if messages else None,
        }

    async def send_message(self, sender_id: str, recipient_id: str, content: str) -> dict:
        """Send a message to another user."""
        content = content.strip()
        if not content:
            raise ValueError("Message cannot be empty")
        if len(content) > 2000:
            raise ValueError("Message too long (max 2000 characters)")

        # Check if blocked
        if await self._is_blocked(sender_id, recipient_id):
            raise ValueError("Cannot send message to this user")
        if await self._is_blocked(recipient_id, sender_id):
            raise ValueError("Cannot send message to this user")

        # Get or create conversation
        conv = await self.get_or_create_conversation(sender_id, recipient_id)

        # Create message
        now = datetime.now(timezone.utc).isoformat()
        result = self.supabase.table("messages").insert({
            "conversation_id": conv["id"],
            "sender_id": sender_id,
            "content": content,
            "created_at": now,
        }).execute()

        # Update conversation timestamp
        self.supabase.table("conversations").update({
            "updated_at": now
        }).eq("id", conv["id"]).execute()

        return result.data[0]

    async def mark_as_read(self, user_id: str, other_user_id: str) -> dict:
        """Mark all messages from other user as read."""
        conv = await self.get_or_create_conversation(user_id, other_user_id)

        now = datetime.now(timezone.utc).isoformat()
        result = self.supabase.table("messages").update({
            "read_at": now
        }).eq("conversation_id", conv["id"]).eq(
            "sender_id", other_user_id
        ).is_("read_at", "null").execute()

        return {"marked_count": len(result.data) if result.data else 0}

    async def get_unread_count(self, user_id: str) -> int:
        """Get total unread message count for a user."""
        # Get all conversations
        convs = self.supabase.table("conversations").select("id, user1_id, user2_id").or_(
            f"user1_id.eq.{user_id},user2_id.eq.{user_id}"
        ).execute()

        if not convs.data:
            return 0

        total = 0
        for conv in convs.data:
            other_user_id = conv["user2_id"] if conv["user1_id"] == user_id else conv["user1_id"]
            result = self.supabase.table("messages").select(
                "id", count="exact"
            ).eq("conversation_id", conv["id"]).eq(
                "sender_id", other_user_id
            ).is_("read_at", "null").execute()
            total += result.count or 0

        return total

    # ========================================================================
    # Helper Methods
    # ========================================================================

    async def _get_user_profile(self, user_id: str) -> Optional[dict]:
        """Get user profile by ID."""
        result = self.supabase.table("users").select(
            "id, display_name, avatar_url"
        ).eq("id", user_id).execute()
        return result.data[0] if result.data else None

    async def _is_blocked(self, user_id: str, by_user_id: str) -> bool:
        """Check if user is blocked by another user."""
        result = self.supabase.table("blocked_users").select("id").eq(
            "user_id", by_user_id
        ).eq("blocked_user_id", user_id).execute()
        return bool(result.data)


# Singleton
_message_service: Optional[MessageService] = None


def get_message_service() -> MessageService:
    global _message_service
    if _message_service is None:
        _message_service = MessageService()
    return _message_service
