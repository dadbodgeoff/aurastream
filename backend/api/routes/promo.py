"""
Promo Chatroom Route Handlers for Aurastream.
Promotional chatroom with Stripe payments for message posting.
"""

from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from backend.api.middleware.auth import get_current_user, get_current_user_optional
from backend.services.jwt_service import TokenPayload
from backend.api.schemas.promo import (
    PromoCheckoutRequest,
    PromoCheckoutResponse,
    PromoMessageResponse,
    PromoMessagesListResponse,
    LeaderboardResponse,
    LeaderboardEntry,
    PromoMessageAuthor,
    UserBadges,
    LinkPreview,
)
from backend.services.promo_service import (
    get_promo_service,
    PromoError,
    PromoMessageNotFoundError,
    PromoMessageNotOwnedError,
)
from backend.services.audit_service import get_audit_service

router = APIRouter(tags=["Promo Chatroom"])


def _map_message_to_response(msg) -> PromoMessageResponse:
    """Map service PromoMessage to response schema."""
    badges = UserBadges(
        tier="free", is_king=msg.badges.is_king, is_top_ten=msg.badges.is_top_10,
        is_verified=False, message_count_badge=None,
    )
    author = PromoMessageAuthor(
        id=msg.user_id, display_name=msg.user_display_name,
        avatar_url=msg.user_avatar_url, badges=badges,
    )
    link_preview = None
    if msg.link_preview:
        link_preview = LinkPreview(
            url=msg.link_preview.url, title=msg.link_preview.title,
            description=msg.link_preview.description, image_url=msg.link_preview.image_url,
        )
    return PromoMessageResponse(
        id=msg.id, author=author, content=msg.content, link_url=msg.link_url,
        link_preview=link_preview, is_pinned=msg.is_pinned,
        reactions=msg.reactions, created_at=msg.created_at, expires_at=None,
    )


def _map_leaderboard_entry(entry) -> LeaderboardEntry:
    """Map service LeaderboardEntry to response schema."""
    return LeaderboardEntry(
        rank=entry.rank, user_id=entry.user_id, display_name=entry.display_name,
        avatar_url=entry.avatar_url, total_donations_cents=entry.total_donations_cents,
        message_count=entry.message_count, is_king=entry.is_king,
    )


@router.post(
    "/checkout",
    response_model=PromoCheckoutResponse,
    summary="Create promo checkout",
    description="Create a Stripe checkout session for posting a promo message.\n\n**Cost:** $1.00 per message\n**Rate Limit:** 10 messages per hour",
    responses={
        200: {"description": "Checkout session created"},
        401: {"description": "Authentication required"},
        429: {"description": "Rate limit exceeded"},
    },
)
async def create_checkout_session(
    data: PromoCheckoutRequest,
    request: Request,
    current_user: TokenPayload = Depends(get_current_user),
) -> PromoCheckoutResponse:
    """Create a Stripe checkout session for posting a promo message."""
    service = get_promo_service()
    try:
        success_url = data.success_url or "https://aurastream.io/promo?success=true"
        cancel_url = data.cancel_url or "https://aurastream.io/promo?cancelled=true"
        checkout_url = await service.create_checkout_session(
            user_id=current_user.sub, content=data.content, link_url=data.link_url,
            success_url=success_url, cancel_url=cancel_url,
        )
        session_id = checkout_url.split("/")[-1].split("?")[0] if checkout_url else ""

        audit = get_audit_service()
        await audit.log(
            user_id=current_user.sub, action="promo.checkout", resource_type="promo_payment",
            resource_id=session_id, details={"amount_cents": 100, "has_link": bool(data.link_url)},
            ip_address=request.client.host if request.client else None,
        )

        return PromoCheckoutResponse(
            checkout_url=checkout_url, session_id=session_id, pending_message_id="pending",
        )
    except PromoError as e:
        raise HTTPException(status_code=e.status_code, detail={"error": {"message": e.message, "code": e.code}})


@router.get(
    "/messages",
    response_model=PromoMessagesListResponse,
    summary="List promo messages",
    description="Get paginated promo messages. Public endpoint.",
    responses={200: {"description": "Messages retrieved successfully"}},
)
async def get_messages(
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    limit: int = Query(20, ge=1, le=100, description="Number of messages to return"),
) -> PromoMessagesListResponse:
    """Get paginated promo messages. Public endpoint."""
    service = get_promo_service()
    try:
        messages, next_cursor = await service.get_messages(cursor=cursor, limit=limit)
        pinned = await service.get_pinned_message()
        return PromoMessagesListResponse(
            messages=[_map_message_to_response(m) for m in messages],
            pinned_message=_map_message_to_response(pinned) if pinned else None,
            total_count=len(messages), has_more=next_cursor is not None, next_cursor=next_cursor,
        )
    except PromoError as e:
        raise HTTPException(status_code=e.status_code, detail={"error": {"message": e.message, "code": e.code}})


@router.get(
    "/messages/pinned",
    response_model=Optional[PromoMessageResponse],
    summary="Get pinned message",
    description="Get the currently pinned promo message. Public endpoint.",
    responses={200: {"description": "Pinned message retrieved (or null if none)"}},
)
async def get_pinned_message() -> Optional[PromoMessageResponse]:
    """Get the currently pinned promo message. Public endpoint."""
    service = get_promo_service()
    try:
        pinned = await service.get_pinned_message()
        return _map_message_to_response(pinned) if pinned else None
    except PromoError as e:
        raise HTTPException(status_code=e.status_code, detail={"error": {"message": e.message, "code": e.code}})


@router.delete(
    "/messages/{message_id}",
    summary="Delete promo message",
    description="Delete your own promo message. This action is permanent.",
    responses={
        200: {"description": "Message deleted successfully"},
        401: {"description": "Authentication required"},
        403: {"description": "Not authorized to delete this message"},
        404: {"description": "Message not found"},
    },
)
async def delete_message(
    message_id: str,
    request: Request,
    current_user: TokenPayload = Depends(get_current_user),
) -> dict:
    """Delete own promo message. Auth required."""
    service = get_promo_service()
    try:
        await service.delete_message(message_id=message_id, user_id=current_user.sub)

        audit = get_audit_service()
        await audit.log(
            user_id=current_user.sub, action="promo.delete", resource_type="promo_message",
            resource_id=message_id, details={},
            ip_address=request.client.host if request.client else None,
        )
        return {"success": True}
    except PromoMessageNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"message": "Promo message not found", "code": "PROMO_MESSAGE_NOT_FOUND"}},
        )
    except PromoMessageNotOwnedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"message": "You don't own this message", "code": "PROMO_MESSAGE_NOT_OWNED"}},
        )
    except PromoError as e:
        raise HTTPException(status_code=e.status_code, detail={"error": {"message": e.message, "code": e.code}})


@router.post(
    "/dev/gift-message",
    response_model=PromoMessageResponse,
    summary="[DEV] Gift a promo message",
    description="Development endpoint to gift a promo message without payment. Simulates a completed $1 purchase.",
    responses={
        200: {"description": "Message created successfully"},
        401: {"description": "Authentication required"},
    },
)
async def dev_gift_message(
    data: PromoCheckoutRequest,
    request: Request,
    current_user: TokenPayload = Depends(get_current_user),
) -> PromoMessageResponse:
    """[DEV] Gift a promo message without payment - simulates completed purchase."""
    service = get_promo_service()
    try:
        msg = await service.create_gift_message(
            user_id=current_user.sub,
            content=data.content,
            link_url=data.link_url,
        )
        
        audit = get_audit_service()
        await audit.log(
            user_id=current_user.sub, action="promo.dev_gift", resource_type="promo_message",
            resource_id=msg.id, details={"gifted": True, "has_link": bool(data.link_url)},
            ip_address=request.client.host if request.client else None,
        )
        
        return _map_message_to_response(msg)
    except PromoError as e:
        raise HTTPException(status_code=e.status_code, detail={"error": {"message": e.message, "code": e.code}})


@router.get(
    "/leaderboard",
    response_model=LeaderboardResponse,
    summary="Get donation leaderboard",
    description="Get the donation leaderboard. Optional auth to show user's rank.",
    responses={200: {"description": "Leaderboard retrieved successfully"}},
)
async def get_leaderboard(
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
) -> LeaderboardResponse:
    """Get donation leaderboard. Optional auth to show user's rank."""
    service = get_promo_service()
    try:
        user_id = current_user.sub if current_user else None
        result = await service.get_leaderboard(user_id=user_id)
        entries = [_map_leaderboard_entry(e) for e in result.top_10]
        current_user_rank = result.user_entry.rank if result.user_entry else None
        current_user_total = result.user_entry.total_donations_cents if result.user_entry else None
        return LeaderboardResponse(
            entries=entries, current_user_rank=current_user_rank,
            current_user_total=current_user_total, updated_at=datetime.now(timezone.utc),
        )
    except PromoError as e:
        raise HTTPException(status_code=e.status_code, detail={"error": {"message": e.message, "code": e.code}})


__all__ = ["router"]
