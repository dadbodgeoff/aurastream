"""
Pydantic schemas for Friends & Messaging system.
AuraStream - Enterprise Social Features
"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# ============================================================================
# Friend Schemas
# ============================================================================

class SendFriendRequest(BaseModel):
    """Request to send a friend request."""
    user_id: str = Field(..., description="User ID to send friend request to")


class FriendResponse(BaseModel):
    """Response schema for a friend."""
    friendship_id: str
    user_id: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_online: bool = False
    created_at: Optional[datetime] = None


class FriendRequestResponse(BaseModel):
    """Response schema for a pending friend request."""
    friendship_id: str
    user_id: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None


class FriendsListResponse(BaseModel):
    """Response containing friends list."""
    friends: List[FriendResponse] = Field(default_factory=list)
    pending_requests: List[FriendRequestResponse] = Field(default_factory=list)
    sent_requests: List[FriendRequestResponse] = Field(default_factory=list)


class UserSearchResult(BaseModel):
    """User search result."""
    id: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    relationship_status: Optional[Literal['pending', 'accepted', 'blocked', 'none']] = None


class UserSearchResponse(BaseModel):
    """Response containing user search results."""
    users: List[UserSearchResult] = Field(default_factory=list)
    total: int = 0


class FriendActionResponse(BaseModel):
    """Response for friend actions."""
    friendship_id: Optional[str] = None
    status: Optional[str] = None
    message: str


# ============================================================================
# Message Schemas
# ============================================================================

class SendMessageRequest(BaseModel):
    """Request to send a message."""
    content: str = Field(..., min_length=1, max_length=2000)


class MessageResponse(BaseModel):
    """Response schema for a message."""
    id: str
    conversation_id: str
    sender_id: str
    content: str
    created_at: datetime
    read_at: Optional[datetime] = None


class LastMessage(BaseModel):
    """Last message in a conversation."""
    id: str
    content: str
    sender_id: str
    created_at: datetime


class ConversationResponse(BaseModel):
    """Response schema for a conversation."""
    conversation_id: str
    other_user_id: str
    other_user_display_name: Optional[str] = None
    other_user_avatar_url: Optional[str] = None
    is_online: bool = False
    last_message: Optional[LastMessage] = None
    unread_count: int = 0
    updated_at: datetime


class ConversationListResponse(BaseModel):
    """Response containing conversation list."""
    conversations: List[ConversationResponse] = Field(default_factory=list)
    total_unread: int = 0


class MessageHistoryResponse(BaseModel):
    """Response containing message history."""
    messages: List[MessageResponse] = Field(default_factory=list)
    has_more: bool = False
    oldest_id: Optional[str] = None


class UnreadCountResponse(BaseModel):
    """Response for unread message count."""
    unread_count: int = 0


class MarkReadResponse(BaseModel):
    """Response for marking messages as read."""
    marked_count: int = 0


# ============================================================================
# Block Schemas
# ============================================================================

class BlockedUserResponse(BaseModel):
    """Response schema for a blocked user."""
    user_id: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    blocked_at: datetime


class BlockedUsersListResponse(BaseModel):
    """Response containing blocked users list."""
    blocked_users: List[BlockedUserResponse] = Field(default_factory=list)
