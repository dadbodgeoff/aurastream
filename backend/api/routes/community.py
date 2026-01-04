"""
Community Gallery Route Handlers for Aurastream.

Post CRUD and feed endpoints for the community gallery.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query

from backend.api.middleware.auth import get_current_user, get_current_user_optional
from backend.services.jwt_service import TokenPayload
from backend.api.service_dependencies import CommunityPostServiceDep, CommunityFeedServiceDep
from backend.api.schemas.community import (
    CreatePostRequest, UpdatePostRequest, CommunityPostWithAuthorResponse,
    PaginatedPostsResponse, POST_SORT_OPTIONS,
)
from backend.services.exceptions import (
    CommunityPostNotFoundError, CommunityAssetNotOwnedError,
    CommunityPostNotOwnedError, CommunityAlreadySharedError, CommunityUserBannedError,
)

router = APIRouter(prefix="/community", tags=["Community"])


def _paginate(items, total: int, page: int, limit: int) -> PaginatedPostsResponse:
    """Build paginated response."""
    return PaginatedPostsResponse(
        items=items, total=total, page=page, limit=limit, has_more=(page * limit) < total
    )


@router.get("/posts", response_model=PaginatedPostsResponse)
async def list_posts(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50),
    sort: POST_SORT_OPTIONS = Query("trending"), asset_type: Optional[str] = None,
    tags: Optional[List[str]] = Query(None),
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
    service: CommunityFeedServiceDep = None,
) -> PaginatedPostsResponse:
    """List community posts with pagination and filters."""
    viewer_id = current_user.sub if current_user else None
    items, total = await service.list_posts(
        page=page, limit=limit, sort=sort, asset_type=asset_type, tags=tags, viewer_id=viewer_id
    )
    return _paginate(items, total, page, limit)


@router.post("/posts", response_model=CommunityPostWithAuthorResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    data: CreatePostRequest, current_user: TokenPayload = Depends(get_current_user),
    service: CommunityPostServiceDep = None,
) -> CommunityPostWithAuthorResponse:
    """Share an asset to the community gallery."""
    try:
        return await service.create_post(current_user.sub, data)
    except CommunityUserBannedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.to_dict())
    except CommunityAssetNotOwnedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.to_dict())
    except CommunityAlreadySharedError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.to_dict())


@router.get("/posts/featured", response_model=PaginatedPostsResponse)
async def get_featured_posts(
    limit: int = Query(10, ge=1, le=50),
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
    service: CommunityFeedServiceDep = None,
) -> PaginatedPostsResponse:
    """Get featured/spotlight community posts."""
    viewer_id = current_user.sub if current_user else None
    items, total = await service.get_featured_posts(limit=limit, viewer_id=viewer_id)
    return _paginate(items, total, page=1, limit=limit)


@router.get("/posts/trending", response_model=PaginatedPostsResponse)
async def get_trending_posts(
    limit: int = Query(20, ge=1, le=50), asset_type: Optional[str] = None,
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
    service: CommunityFeedServiceDep = None,
) -> PaginatedPostsResponse:
    """Get trending community posts."""
    viewer_id = current_user.sub if current_user else None
    items, total = await service.get_trending_posts(limit=limit, asset_type=asset_type, viewer_id=viewer_id)
    return _paginate(items, total, page=1, limit=limit)


@router.get("/posts/search", response_model=PaginatedPostsResponse)
async def search_posts(
    q: str = Query(..., min_length=1), page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
    service: CommunityFeedServiceDep = None,
) -> PaginatedPostsResponse:
    """Search community posts by title, description, or tags."""
    viewer_id = current_user.sub if current_user else None
    items, total = await service.search_posts(query=q, page=page, limit=limit, viewer_id=viewer_id)
    return _paginate(items, total, page, limit)


@router.get("/posts/mine", response_model=PaginatedPostsResponse)
async def get_my_posts(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50),
    current_user: TokenPayload = Depends(get_current_user),
    service: CommunityFeedServiceDep = None,
) -> PaginatedPostsResponse:
    """Get current user's community posts."""
    items, total = await service.get_user_posts(
        target_user_id=current_user.sub, page=page, limit=limit, viewer_id=current_user.sub
    )
    return _paginate(items, total, page, limit)


@router.get("/posts/liked", response_model=PaginatedPostsResponse)
async def get_liked_posts(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50),
    current_user: TokenPayload = Depends(get_current_user),
    service: CommunityFeedServiceDep = None,
) -> PaginatedPostsResponse:
    """Get posts the current user has liked."""
    items, total = await service.get_liked_posts(user_id=current_user.sub, page=page, limit=limit)
    return _paginate(items, total, page, limit)


@router.get("/posts/following", response_model=PaginatedPostsResponse)
async def get_following_feed(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50),
    current_user: TokenPayload = Depends(get_current_user),
    service: CommunityFeedServiceDep = None,
) -> PaginatedPostsResponse:
    """Get posts from users the current user follows."""
    items, total = await service.get_following_feed(user_id=current_user.sub, page=page, limit=limit)
    return _paginate(items, total, page, limit)


@router.get("/posts/{post_id}", response_model=CommunityPostWithAuthorResponse)
async def get_post(
    post_id: str, current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
    service: CommunityPostServiceDep = None,
) -> CommunityPostWithAuthorResponse:
    """Get a community post by ID."""
    viewer_id = current_user.sub if current_user else None
    try:
        return await service.get_post(post_id, viewer_id=viewer_id)
    except CommunityPostNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())


@router.put("/posts/{post_id}", response_model=CommunityPostWithAuthorResponse)
async def update_post(
    post_id: str, data: UpdatePostRequest, current_user: TokenPayload = Depends(get_current_user),
    service: CommunityPostServiceDep = None,
) -> CommunityPostWithAuthorResponse:
    """Update a community post."""
    try:
        return await service.update_post(current_user.sub, post_id, data)
    except CommunityUserBannedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.to_dict())
    except CommunityPostNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())
    except CommunityPostNotOwnedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.to_dict())


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: str, current_user: TokenPayload = Depends(get_current_user),
    service: CommunityPostServiceDep = None,
) -> None:
    """Delete a community post."""
    try:
        await service.delete_post(current_user.sub, post_id)
    except CommunityPostNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())
    except CommunityPostNotOwnedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.to_dict())


@router.get("/users/{user_id}/posts", response_model=PaginatedPostsResponse)
async def get_user_posts(
    user_id: str, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50),
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
    service: CommunityFeedServiceDep = None,
) -> PaginatedPostsResponse:
    """Get community posts by a specific user."""
    viewer_id = current_user.sub if current_user else None
    items, total = await service.get_user_posts(
        target_user_id=user_id, page=page, limit=limit, viewer_id=viewer_id
    )
    return _paginate(items, total, page, limit)


@router.get("/creators/spotlight")
async def get_spotlight_creators(
    limit: int = Query(10, ge=1, le=20),
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
    service: CommunityFeedServiceDep = None,
):
    """
    Get spotlight creators - users with the most engagement.
    Returns creators with their recent assets and follow status.
    """
    try:
        viewer_id = current_user.sub if current_user else None
        creators = await service.get_spotlight_creators(limit=limit, viewer_id=viewer_id)
        return {"items": creators}
    except Exception as e:
        # Log the error but return empty list to avoid breaking the UI
        import logging
        logging.getLogger(__name__).warning(f"Failed to get spotlight creators: {e}")
        return {"items": []}


@router.get("/users/{user_id}")
async def get_user_profile(
    user_id: str,
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
    service: CommunityFeedServiceDep = None,
):
    """Get a user's community profile with stats."""
    viewer_id = current_user.sub if current_user else None
    try:
        profile = await service.get_user_profile(user_id, viewer_id=viewer_id)
        return profile
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")


@router.post("/users/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
async def follow_user(
    user_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    service: CommunityFeedServiceDep = None,
):
    """Follow a user."""
    if user_id == current_user.sub:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot follow yourself")
    await service.follow_user(follower_id=current_user.sub, followed_id=user_id)


@router.delete("/users/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
async def unfollow_user(
    user_id: str,
    current_user: TokenPayload = Depends(get_current_user),
    service: CommunityFeedServiceDep = None,
):
    """Unfollow a user."""
    await service.unfollow_user(follower_id=current_user.sub, followed_id=user_id)


__all__ = ["router"]
