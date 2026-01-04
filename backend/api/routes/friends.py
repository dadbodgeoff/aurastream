"""
Friends Route Handlers for AuraStream.
Endpoints for friend management and user search.
"""

from fastapi import APIRouter, HTTPException, Query, status
from backend.api.middleware.auth import CurrentUserDep
from backend.api.service_dependencies import SocialServiceDep
from backend.api.schemas.social import (
    SendFriendRequest, FriendsListResponse, FriendResponse, FriendRequestResponse,
    UserSearchResponse, UserSearchResult, FriendActionResponse,
    BlockedUsersListResponse, BlockedUserResponse,
)

router = APIRouter(prefix="/friends", tags=["Friends"])


@router.get("", response_model=FriendsListResponse)
async def get_friends_list(
    current_user: CurrentUserDep,
    service: SocialServiceDep,
) -> FriendsListResponse:
    """Get user's friends, pending requests, and sent requests."""
    data = await service.get_friends_list(current_user.sub)
    return FriendsListResponse(
        friends=[FriendResponse(**f) for f in data["friends"]],
        pending_requests=[FriendRequestResponse(**r) for r in data["pending_requests"]],
        sent_requests=[FriendRequestResponse(**r) for r in data["sent_requests"]],
    )


@router.post("/request", response_model=FriendActionResponse, status_code=status.HTTP_201_CREATED)
async def send_friend_request(
    request: SendFriendRequest,
    current_user: CurrentUserDep,
    service: SocialServiceDep,
) -> FriendActionResponse:
    """Send a friend request to another user."""
    try:
        result = await service.send_friend_request(current_user.sub, request.user_id)
        return FriendActionResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{friendship_id}/accept", response_model=FriendActionResponse)
async def accept_friend_request(
    friendship_id: str,
    current_user: CurrentUserDep,
    service: SocialServiceDep,
) -> FriendActionResponse:
    """Accept a pending friend request."""
    try:
        result = await service.accept_friend_request(friendship_id, current_user.sub)
        return FriendActionResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{friendship_id}/decline", response_model=FriendActionResponse)
async def decline_friend_request(
    friendship_id: str,
    current_user: CurrentUserDep,
    service: SocialServiceDep,
) -> FriendActionResponse:
    """Decline a pending friend request."""
    try:
        result = await service.decline_friend_request(friendship_id, current_user.sub)
        return FriendActionResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{friendship_id}", response_model=FriendActionResponse)
async def remove_friend(
    friendship_id: str,
    current_user: CurrentUserDep,
    service: SocialServiceDep,
) -> FriendActionResponse:
    """Remove a friend."""
    try:
        result = await service.remove_friend(friendship_id, current_user.sub)
        return FriendActionResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/search", response_model=UserSearchResponse)
async def search_users(
    current_user: CurrentUserDep,
    service: SocialServiceDep,
    q: str = Query(..., min_length=2, max_length=50, description="Search query"),
    limit: int = Query(default=20, ge=1, le=50),
) -> UserSearchResponse:
    """Search users by display name."""
    data = await service.search_users(current_user.sub, q, limit)
    return UserSearchResponse(
        users=[UserSearchResult(**u) for u in data["users"]],
        total=data["total"],
    )


@router.post("/block/{user_id}", response_model=FriendActionResponse)
async def block_user(
    user_id: str,
    current_user: CurrentUserDep,
    service: SocialServiceDep,
) -> FriendActionResponse:
    """Block a user."""
    try:
        result = await service.block_user(current_user.sub, user_id)
        return FriendActionResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/block/{user_id}", response_model=FriendActionResponse)
async def unblock_user(
    user_id: str,
    current_user: CurrentUserDep,
    service: SocialServiceDep,
) -> FriendActionResponse:
    """Unblock a user."""
    try:
        result = await service.unblock_user(current_user.sub, user_id)
        return FriendActionResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/blocked", response_model=BlockedUsersListResponse)
async def get_blocked_users(
    current_user: CurrentUserDep,
    service: SocialServiceDep,
) -> BlockedUsersListResponse:
    """Get list of blocked users."""
    data = await service.get_blocked_users(current_user.sub)
    return BlockedUsersListResponse(
        blocked_users=[BlockedUserResponse(**b) for b in data["blocked_users"]]
    )


__all__ = ["router"]
