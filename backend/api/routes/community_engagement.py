"""
Community Engagement Route Handlers for Aurastream.
Handles likes, comments, and follows for community posts.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response

from backend.api.middleware.auth import get_current_user, get_current_user_optional
from backend.services.jwt_service import TokenPayload
from backend.services.community_engagement_service import get_community_engagement_service
from backend.api.schemas.community import (
    CreateCommentRequest, UpdateCommentRequest, CommentWithAuthorResponse,
    PaginatedCommentsResponse, PaginatedUsersResponse, CreatorProfileResponse,
)
from backend.services.exceptions import (
    CommunityPostNotFoundError, CommunityCommentNotFoundError,
    CommunityCommentNotOwnedError, CommunityEditWindowExpiredError,
    CommunityUserBannedError, CommunitySelfFollowError,
)

router = APIRouter(prefix="/community", tags=["Community Engagement"])


def _handle_exception(e) -> None:
    """Convert service exceptions to HTTPException."""
    status_map = {
        CommunityPostNotFoundError: status.HTTP_404_NOT_FOUND,
        CommunityCommentNotFoundError: status.HTTP_404_NOT_FOUND,
        CommunityCommentNotOwnedError: status.HTTP_403_FORBIDDEN,
        CommunityEditWindowExpiredError: status.HTTP_403_FORBIDDEN,
        CommunityUserBannedError: status.HTTP_403_FORBIDDEN,
        CommunitySelfFollowError: status.HTTP_422_UNPROCESSABLE_ENTITY,
    }
    raise HTTPException(status_code=status_map.get(type(e), 400), detail=e.to_dict())


# =============================================================================
# Likes
# =============================================================================

@router.post("/posts/{post_id}/like", status_code=status.HTTP_204_NO_CONTENT, summary="Like a post")
async def like_post(post_id: str, current_user: TokenPayload = Depends(get_current_user)) -> Response:
    """Like a community post. Idempotent - liking twice has no effect."""
    try:
        await get_community_engagement_service().like_post(current_user.sub, post_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except (CommunityPostNotFoundError, CommunityUserBannedError) as e:
        _handle_exception(e)


@router.delete("/posts/{post_id}/like", status_code=status.HTTP_204_NO_CONTENT, summary="Unlike a post")
async def unlike_post(post_id: str, current_user: TokenPayload = Depends(get_current_user)) -> Response:
    """Unlike a community post. No error if not previously liked."""
    await get_community_engagement_service().unlike_post(current_user.sub, post_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# =============================================================================
# Comments
# =============================================================================

@router.get("/posts/{post_id}/comments", response_model=PaginatedCommentsResponse, summary="List comments")
async def list_comments(
    post_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=50, description="Items per page"),
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
) -> PaginatedCommentsResponse:
    """List comments on a post with pagination."""
    viewer_id = current_user.sub if current_user else None
    comments, total = await get_community_engagement_service().list_comments(post_id, page, limit, viewer_id)
    return PaginatedCommentsResponse(items=comments, total=total, page=page, limit=limit, has_more=(page * limit) < total)


@router.post("/posts/{post_id}/comments", response_model=CommentWithAuthorResponse,
             status_code=status.HTTP_201_CREATED, summary="Create a comment")
async def create_comment(
    post_id: str, data: CreateCommentRequest, current_user: TokenPayload = Depends(get_current_user)
) -> CommentWithAuthorResponse:
    """Create a comment on a community post."""
    try:
        return await get_community_engagement_service().create_comment(current_user.sub, post_id, data)
    except (CommunityPostNotFoundError, CommunityUserBannedError) as e:
        _handle_exception(e)


@router.put("/comments/{comment_id}", response_model=CommentWithAuthorResponse, summary="Edit a comment")
async def edit_comment(
    comment_id: str, data: UpdateCommentRequest, current_user: TokenPayload = Depends(get_current_user)
) -> CommentWithAuthorResponse:
    """Edit a comment. Only the owner can edit within 15 minutes of creation."""
    try:
        return await get_community_engagement_service().edit_comment(current_user.sub, comment_id, data)
    except (CommunityCommentNotFoundError, CommunityCommentNotOwnedError,
            CommunityEditWindowExpiredError, CommunityUserBannedError) as e:
        _handle_exception(e)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a comment")
async def delete_comment(comment_id: str, current_user: TokenPayload = Depends(get_current_user)) -> Response:
    """Delete a comment. Owner or post owner can delete."""
    try:
        await get_community_engagement_service().delete_comment(current_user.sub, comment_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except (CommunityCommentNotFoundError, CommunityCommentNotOwnedError) as e:
        _handle_exception(e)


# =============================================================================
# Follows
# =============================================================================

@router.post("/users/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT, summary="Follow a user")
async def follow_user(user_id: str, current_user: TokenPayload = Depends(get_current_user)) -> Response:
    """Follow a user. Idempotent - following twice has no effect."""
    try:
        await get_community_engagement_service().follow_user(current_user.sub, user_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except (CommunitySelfFollowError, CommunityUserBannedError) as e:
        _handle_exception(e)


@router.delete("/users/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT, summary="Unfollow a user")
async def unfollow_user(user_id: str, current_user: TokenPayload = Depends(get_current_user)) -> Response:
    """Unfollow a user. No error if not previously following."""
    await get_community_engagement_service().unfollow_user(current_user.sub, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/users/{user_id}/followers", response_model=PaginatedUsersResponse, summary="Get followers")
async def get_followers(
    user_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=50, description="Items per page"),
) -> PaginatedUsersResponse:
    """Get list of users following the specified user."""
    users, total = await get_community_engagement_service().get_followers(user_id, page, limit)
    return PaginatedUsersResponse(items=users, total=total, page=page, limit=limit, has_more=(page * limit) < total)


@router.get("/users/{user_id}/following", response_model=PaginatedUsersResponse, summary="Get following")
async def get_following(
    user_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=50, description="Items per page"),
) -> PaginatedUsersResponse:
    """Get list of users the specified user is following."""
    users, total = await get_community_engagement_service().get_following(user_id, page, limit)
    return PaginatedUsersResponse(items=users, total=total, page=page, limit=limit, has_more=(page * limit) < total)


@router.get("/users/{user_id}", response_model=CreatorProfileResponse, summary="Get creator profile")
async def get_creator_profile(
    user_id: str, current_user: Optional[TokenPayload] = Depends(get_current_user_optional)
) -> CreatorProfileResponse:
    """Get public creator profile with stats and follow status."""
    viewer_id = current_user.sub if current_user else None
    return await get_community_engagement_service().get_creator_profile(user_id, viewer_id)


__all__ = ["router"]
