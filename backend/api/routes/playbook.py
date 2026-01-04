"""
Playbook API Routes - Streamer Playbook Endpoints.

Provides access to generated playbook reports with timestamps.
"""

import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query

from backend.api.middleware.auth import get_current_user, get_current_user_optional
from backend.services.jwt_service import TokenPayload
from backend.api.schemas.playbook import TodaysPlaybook
from backend.api.service_dependencies import PlaybookServiceDep

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/playbook", tags=["Playbook"])


@router.get("/latest", response_model=TodaysPlaybook)
async def get_latest_playbook(
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
    service: PlaybookServiceDep = None,
) -> TodaysPlaybook:
    """
    Get the most recent playbook report.
    
    Returns the latest generated playbook with all insights,
    strategies, and recommendations.
    """
    try:
        playbook = await service.get_latest_playbook()
        
        if not playbook:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No playbook reports available yet"
            )
        
        return playbook
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get latest playbook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve playbook"
        )


@router.get("/reports", response_model=List[dict])
async def list_playbook_reports(
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
    service: PlaybookServiceDep = None,
) -> List[dict]:
    """
    List recent playbook reports.
    
    Returns a list of report summaries for the report selector,
    allowing users to browse historical reports.
    """
    try:
        reports = await service.repository.list_recent_reports(limit)
        
        return [
            {
                "id": r["id"],
                "reportDate": r["report_date"],
                "reportTime": r["report_time"],
                "reportTimestamp": r["report_timestamp"],
                "headline": r["headline"],
                "mood": r["mood"],
                "trendingGame": r.get("trending_game", ""),
            }
            for r in reports
        ]
        
    except Exception as e:
        logger.error(f"Failed to list reports: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list reports"
        )


@router.get("/reports/{report_id}", response_model=TodaysPlaybook)
async def get_playbook_report(
    report_id: str,
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
    service: PlaybookServiceDep = None,
) -> TodaysPlaybook:
    """
    Get a specific playbook report by ID.
    
    Allows users to view historical reports.
    """
    try:
        playbook = await service.get_playbook_by_id(report_id)
        
        if not playbook:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
        
        # Mark as viewed if user is authenticated
        if current_user:
            await service.repository.mark_report_viewed(
                current_user.sub, report_id
            )
        
        return playbook
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get report {report_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve report"
        )


@router.post("/generate", response_model=TodaysPlaybook)
async def generate_playbook(
    current_user: TokenPayload = Depends(get_current_user),
    service: PlaybookServiceDep = None,
) -> TodaysPlaybook:
    """
    Manually trigger playbook generation.
    
    This endpoint is rate-limited and typically only used for testing.
    Normal generation happens automatically on data refresh.
    
    Requires authentication.
    """
    # Check if user has permission (could add tier check here)
    tier = getattr(current_user, "tier", "free")
    if tier not in ("studio", "unlimited"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manual playbook generation requires Studio tier"
        )
    
    try:
        playbook = await service.generate_playbook(save_to_db=True)
        return playbook
        
    except Exception as e:
        logger.error(f"Failed to generate playbook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate playbook"
        )


@router.get("/unviewed-count")
async def get_unviewed_count(
    current_user: TokenPayload = Depends(get_current_user),
    service: PlaybookServiceDep = None,
) -> dict:
    """
    Get count of unviewed playbook reports for the current user.
    
    Used to show "new" badges in the UI.
    """
    try:
        count = await service.repository.get_unviewed_count(current_user.sub)
        return {"unviewedCount": count}
        
    except Exception as e:
        logger.error(f"Failed to get unviewed count: {e}")
        return {"unviewedCount": 0}


__all__ = ["router"]
