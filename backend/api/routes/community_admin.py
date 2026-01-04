"""
Community Admin Route Handlers for Aurastream.
Admin/moderation operations for community posts and users.
"""

from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status, Query

from backend.api.middleware.auth import get_current_user
from backend.services.jwt_service import TokenPayload
from backend.api.service_dependencies import CommunityAdminServiceDep
from backend.api.schemas.community import (
    CommunityPostResponse, ReportPostRequest, ReportResponse,
    ReviewReportRequest, PaginatedReportsResponse, REPORT_STATUSES,
)
from backend.services.exceptions import (
    CommunityPostNotFoundError, CommunityAlreadyReportedError, CommunityUserBannedError,
)

router = APIRouter(prefix="/admin/community", tags=["Community Admin"])


# Request Models
class ToggleFeaturedRequest(BaseModel):
    is_featured: bool

class ToggleHiddenRequest(BaseModel):
    is_hidden: bool

class BanUserRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500)


# NOTE: Admin role check should be added via middleware or dependency

@router.put("/posts/{post_id}/feature", response_model=CommunityPostResponse)
async def toggle_featured(
    post_id: str, data: ToggleFeaturedRequest,
    current_user: TokenPayload = Depends(get_current_user),
    service: CommunityAdminServiceDep = None,
) -> CommunityPostResponse:
    """Toggle featured status of a post. Admin only."""
    try:
        return await service.toggle_featured(post_id, data.is_featured)
    except CommunityPostNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())


@router.put("/posts/{post_id}/hide", response_model=CommunityPostResponse)
async def toggle_hidden(
    post_id: str, data: ToggleHiddenRequest,
    current_user: TokenPayload = Depends(get_current_user),
    service: CommunityAdminServiceDep = None,
) -> CommunityPostResponse:
    """Toggle hidden status of a post. Admin only."""
    try:
        return await service.toggle_hidden(post_id, data.is_hidden)
    except CommunityPostNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())


@router.put("/users/{user_id}/ban", status_code=status.HTTP_204_NO_CONTENT)
async def ban_user(
    user_id: str, data: BanUserRequest,
    current_user: TokenPayload = Depends(get_current_user),
    service: CommunityAdminServiceDep = None,
) -> None:
    """Ban a user from community features. Admin only."""
    try:
        await service.ban_user(user_id, data.reason)
    except CommunityUserBannedError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.to_dict())


@router.delete("/users/{user_id}/ban", status_code=status.HTTP_204_NO_CONTENT)
async def unban_user(
    user_id: str, current_user: TokenPayload = Depends(get_current_user),
    service: CommunityAdminServiceDep = None,
) -> None:
    """Unban a user from community features. Admin only."""
    await service.unban_user(user_id)


@router.post("/posts/{post_id}/report", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def report_post(
    post_id: str, data: ReportPostRequest,
    current_user: TokenPayload = Depends(get_current_user),
    service: CommunityAdminServiceDep = None,
) -> ReportResponse:
    """Report a post for moderation. Available to all authenticated users."""
    try:
        return await service.report_post(current_user.sub, post_id, data)
    except CommunityPostNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())
    except CommunityAlreadyReportedError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.to_dict())


@router.get("/reports", response_model=PaginatedReportsResponse)
async def list_reports(
    status_filter: Optional[REPORT_STATUSES] = Query(None, alias="status"),
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50),
    current_user: TokenPayload = Depends(get_current_user),
    service: CommunityAdminServiceDep = None,
) -> PaginatedReportsResponse:
    """List reports with optional status filter. Admin only."""
    items, total = await service.list_reports(status=status_filter, page=page, limit=limit)
    return PaginatedReportsResponse(
        items=items, total=total, page=page, limit=limit, has_more=(page * limit) < total
    )


@router.put("/reports/{report_id}", response_model=ReportResponse)
async def review_report(
    report_id: str, data: ReviewReportRequest,
    current_user: TokenPayload = Depends(get_current_user),
    service: CommunityAdminServiceDep = None,
) -> ReportResponse:
    """Review a report and optionally hide the post. Admin only."""
    try:
        return await service.review_report(
            admin_id=current_user.sub, report_id=report_id,
            status=data.status, hide_post=data.hide_post,
        )
    except CommunityPostNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())


__all__ = ["router"]
