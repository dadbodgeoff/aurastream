"""Pydantic schemas for promo chatroom endpoints."""

from typing import Optional, List, Dict, Literal
from pydantic import BaseModel, Field
from datetime import datetime


# ============================================================================
# Type Definitions
# ============================================================================

PromoPaymentStatus = Literal["pending", "completed", "failed", "refunded"]
SubscriptionTier = Literal["free", "pro", "studio"]


# ============================================================================
# Request Schemas
# ============================================================================

class PromoCheckoutRequest(BaseModel):
    """Request body for creating a promo checkout session."""
    content: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Promo message content"
    )
    link_url: Optional[str] = Field(
        None,
        description="Optional link URL to include"
    )
    success_url: Optional[str] = Field(
        None,
        description="URL to redirect on successful payment"
    )
    cancel_url: Optional[str] = Field(
        None,
        description="URL to redirect on cancelled payment"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [{"content": "Check out my stream!", "link_url": "https://twitch.tv/example"}]
        }
    }


# ============================================================================
# Response Schemas
# ============================================================================

class PromoCheckoutResponse(BaseModel):
    """Response from creating a promo checkout session."""
    checkout_url: str = Field(..., description="Stripe checkout URL")
    session_id: str = Field(..., description="Stripe session ID")
    pending_message_id: str = Field(..., description="ID of the pending promo message")


class UserBadges(BaseModel):
    """User badge information for promo messages."""
    tier: SubscriptionTier = Field(..., description="User subscription tier")
    is_king: bool = Field(default=False, description="Top donor badge")
    is_top_ten: bool = Field(default=False, description="Top 10 donor badge")
    is_verified: bool = Field(default=False, description="Verified creator badge")
    message_count_badge: Optional[int] = Field(
        None,
        description="Badge for message count milestones (10, 50, 100)"
    )


class PromoMessageAuthor(BaseModel):
    """Author information for a promo message."""
    id: str = Field(..., description="User ID")
    display_name: str = Field(..., description="Display name")
    avatar_url: Optional[str] = Field(None, description="Avatar URL")
    badges: UserBadges = Field(..., description="User badges")


class LinkPreview(BaseModel):
    """Link preview metadata."""
    url: str = Field(..., description="Original URL")
    title: Optional[str] = Field(None, description="Page title")
    description: Optional[str] = Field(None, description="Page description")
    image_url: Optional[str] = Field(None, description="Preview image URL")


class PromoMessageResponse(BaseModel):
    """Response schema for a promo message."""
    id: str = Field(..., description="Message ID")
    author: PromoMessageAuthor = Field(..., description="Message author")
    content: str = Field(..., description="Message content")
    link_url: Optional[str] = Field(None, description="Attached link URL")
    link_preview: Optional[LinkPreview] = Field(None, description="Link preview data")
    is_pinned: bool = Field(default=False, description="Whether message is pinned")
    reactions: Dict[str, int] = Field(
        default_factory=dict,
        description="Reaction emoji counts"
    )
    created_at: datetime = Field(..., description="Creation timestamp")
    expires_at: Optional[datetime] = Field(None, description="Expiration timestamp")

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "id": "msg-123",
                "author": {
                    "id": "user-456",
                    "display_name": "StreamerPro",
                    "avatar_url": None,
                    "badges": {"tier": "pro", "is_king": False, "is_top_ten": True, "is_verified": True}
                },
                "content": "Check out my new overlay pack!",
                "link_url": "https://example.com",
                "link_preview": {"url": "https://example.com", "title": "My Overlays"},
                "is_pinned": False,
                "reactions": {"🔥": 5, "❤️": 3},
                "created_at": "2024-01-15T10:30:00Z",
                "expires_at": None
            }]
        }
    }


class PromoMessagesListResponse(BaseModel):
    """Response schema for listing promo messages."""
    messages: List[PromoMessageResponse] = Field(..., description="List of promo messages")
    pinned_message: Optional[PromoMessageResponse] = Field(
        None,
        description="Currently pinned message"
    )
    total_count: int = Field(..., description="Total message count")
    has_more: bool = Field(..., description="Whether more messages exist")
    next_cursor: Optional[str] = Field(None, description="Cursor for next page")


class LeaderboardEntry(BaseModel):
    """Single entry in the donation leaderboard."""
    rank: int = Field(..., ge=1, description="Leaderboard rank")
    user_id: str = Field(..., description="User ID")
    display_name: str = Field(..., description="Display name")
    avatar_url: Optional[str] = Field(None, description="Avatar URL")
    total_donations_cents: int = Field(..., ge=0, description="Total donations in cents")
    message_count: int = Field(..., ge=0, description="Number of promo messages")
    is_king: bool = Field(default=False, description="Current top donor")


class LeaderboardResponse(BaseModel):
    """Response schema for the donation leaderboard."""
    entries: List[LeaderboardEntry] = Field(..., description="Leaderboard entries")
    current_user_rank: Optional[int] = Field(None, description="Current user's rank")
    current_user_total: Optional[int] = Field(
        None,
        description="Current user's total donations in cents"
    )
    updated_at: datetime = Field(..., description="Last update timestamp")


# ============================================================================
# Export all schemas
# ============================================================================

__all__ = [
    "PromoPaymentStatus",
    "SubscriptionTier",
    "PromoCheckoutRequest",
    "PromoCheckoutResponse",
    "UserBadges",
    "PromoMessageAuthor",
    "LinkPreview",
    "PromoMessageResponse",
    "PromoMessagesListResponse",
    "LeaderboardEntry",
    "LeaderboardResponse",
]
