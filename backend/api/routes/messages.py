"""
Messages Route Handlers for AuraStream.
Endpoints for direct messaging between users.
"""

from fastapi import APIRouter, HTTPException, Query, status
from backend.api.middleware.auth import CurrentUserDep
from backend.services.message_service import get_message_service
from backend.api.schemas.social import (
    SendMessageRequest, MessageResponse, ConversationListResponse,
    ConversationResponse, MessageHistoryResponse, LastMessage,
    UnreadCountResponse, MarkReadResponse,
)

router = APIRouter(prefix="/messages", tags=["Messages"])


@router.get("/conversations", response_model=ConversationListResponse)
async def get_conversations(current_user: CurrentUserDep) -> ConversationListResponse:
    """Get all conversations for the current user."""
    service = get_message_service()
    data = await service.get_conversations(current_user.sub)

    conversations = []
    for c in data["conversations"]:
        last_msg = None
        if c["last_message"]:
            last_msg = LastMessage(
                id=c["last_message"]["id"],
                content=c["last_message"]["content"],
                sender_id=c["last_message"]["sender_id"],
                created_at=c["last_message"]["created_at"],
            )
        conversations.append(ConversationResponse(
            conversation_id=c["conversation_id"],
            other_user_id=c["other_user_id"],
            other_user_display_name=c["other_user_display_name"],
            other_user_avatar_url=c["other_user_avatar_url"],
            is_online=c["is_online"],
            last_message=last_msg,
            unread_count=c["unread_count"],
            updated_at=c["updated_at"],
        ))

    return ConversationListResponse(
        conversations=conversations,
        total_unread=data["total_unread"],
    )


@router.get("/unread/count", response_model=UnreadCountResponse)
async def get_unread_count(current_user: CurrentUserDep) -> UnreadCountResponse:
    """Get total unread message count."""
    service = get_message_service()
    count = await service.get_unread_count(current_user.sub)
    return UnreadCountResponse(unread_count=count)


@router.get("/{user_id}", response_model=MessageHistoryResponse)
async def get_messages(
    user_id: str,
    current_user: CurrentUserDep,
    limit: int = Query(default=50, ge=1, le=100),
    before_id: str | None = Query(default=None),
) -> MessageHistoryResponse:
    """Get message history with a specific user."""
    service = get_message_service()
    try:
        data = await service.get_messages(current_user.sub, user_id, limit, before_id)
        messages = [MessageResponse(**m) for m in data["messages"]]
        return MessageHistoryResponse(
            messages=messages,
            has_more=data["has_more"],
            oldest_id=data["oldest_id"],
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/{user_id}", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    user_id: str, request: SendMessageRequest, current_user: CurrentUserDep
) -> MessageResponse:
    """Send a message to another user."""
    service = get_message_service()
    try:
        message = await service.send_message(current_user.sub, user_id, request.content)
        return MessageResponse(**message)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{user_id}/read", response_model=MarkReadResponse)
async def mark_as_read(user_id: str, current_user: CurrentUserDep) -> MarkReadResponse:
    """Mark all messages from a user as read."""
    service = get_message_service()
    result = await service.mark_as_read(current_user.sub, user_id)
    return MarkReadResponse(**result)


__all__ = ["router"]
