"""
Generation Job Route Handlers for Aurastream.

This module implements all generation job endpoints:
- POST /generate - Create a new generation job
- GET /jobs/{job_id} - Get job status and details
- GET /jobs/{job_id}/assets - Get assets from a completed job
- GET /jobs/{job_id}/stream - SSE stream for real-time job progress
- GET /jobs - List jobs with pagination and filtering
"""

import asyncio
import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import StreamingResponse

from backend.api.middleware.auth import get_current_user
from backend.api.schemas.generation import (
    GenerateRequest,
    JobResponse,
    JobListResponse,
)
from backend.api.schemas.asset import AssetResponse
from backend.services.jwt_service import TokenPayload
from backend.services.audit_service import get_audit_service
from backend.services.generation_service import get_generation_service, JobStatus
from backend.services.exceptions import (
    JobNotFoundError,
    BrandKitNotFoundError,
    AuthorizationError,
    InvalidStateTransitionError,
)
from backend.workers.generation_worker import enqueue_generation_job


router = APIRouter()


def _job_to_response(job) -> JobResponse:
    """Convert GenerationJob dataclass to response schema."""
    return JobResponse(
        id=job.id,
        user_id=job.user_id,
        brand_kit_id=job.brand_kit_id,
        asset_type=job.asset_type,
        status=job.status.value if hasattr(job.status, 'value') else job.status,
        progress=job.progress,
        error_message=job.error_message,
        created_at=job.created_at,
        updated_at=job.updated_at,
        completed_at=job.completed_at,
    )


def _asset_to_response(asset) -> AssetResponse:
    """Convert Asset dataclass to response schema."""
    return AssetResponse(
        id=asset.id,
        job_id=asset.job_id,
        user_id=asset.user_id,
        asset_type=asset.asset_type,
        url=asset.url,
        width=asset.width,
        height=asset.height,
        file_size=asset.file_size,
        is_public=asset.is_public,
        viral_score=asset.viral_score,
        created_at=asset.created_at,
    )


@router.post(
    "/generate",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create generation job",
)
async def create_generation_job(
    request: Request,
    data: GenerateRequest,
    current_user: TokenPayload = Depends(get_current_user),
) -> JobResponse:
    """
    Create a new asset generation job.
    
    **Tier Limits:**
    - Free: 3 creations/month
    - Pro: 50 creations/month
    """
    from backend.services.usage_limit_service import get_usage_limit_service
    
    # Check usage limits
    usage_service = get_usage_limit_service()
    usage = await usage_service.check_limit(current_user.sub, "creations")
    if not usage.can_use:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "limit_exceeded",
                "message": f"You've used all {usage.limit} asset creations this month. Upgrade to Pro for more!",
                "used": usage.used,
                "limit": usage.limit,
                "resets_at": usage.resets_at.isoformat() if usage.resets_at else None,
            },
        )
    
    service = get_generation_service()
    
    try:
        # Build parameters dict from brand_customization
        parameters = {}
        if data.brand_customization:
            bc = data.brand_customization
            # Logo options
            parameters["include_logo"] = bc.include_logo
            parameters["brand_kit_id"] = data.brand_kit_id
            parameters["logo_type"] = bc.logo_type
            parameters["logo_position"] = bc.logo_position
            parameters["logo_size"] = bc.logo_size
            # Brand intensity
            parameters["brand_intensity"] = bc.brand_intensity
            # Color selection
            if bc.colors:
                parameters["colors"] = {
                    "primary_index": bc.colors.primary_index,
                    "secondary_index": bc.colors.secondary_index,
                    "accent_index": bc.colors.accent_index,
                    "use_gradient": bc.colors.use_gradient,
                }
            # Typography selection
            if bc.typography:
                parameters["typography"] = {
                    "level": bc.typography.level,
                }
            # Voice selection
            if bc.voice:
                parameters["voice"] = {
                    "use_tagline": bc.voice.use_tagline,
                    "use_catchphrase": bc.voice.use_catchphrase,
                }
        
        job = await service.create_job(
            user_id=current_user.sub,
            brand_kit_id=data.brand_kit_id,
            asset_type=data.asset_type,
            custom_prompt=data.custom_prompt,
            parameters=parameters if parameters else None,
        )
        
        # Increment usage counter
        await usage_service.increment(current_user.sub, "creations")
        
        # Enqueue job for background processing
        enqueue_generation_job(job.id, current_user.sub)
        
        # Audit log
        audit = get_audit_service()
        await audit.log(
            user_id=current_user.sub,
            action="generation.create",
            resource_type="generation_job",
            resource_id=job.id,
            details={
                "asset_type": data.asset_type, 
                "brand_kit_id": data.brand_kit_id,
                "include_logo": parameters.get("include_logo", False),
            },
            ip_address=request.client.host if request.client else None,
        )
        
        return _job_to_response(job)
        
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.to_dict())


@router.get(
    "/jobs/{job_id}",
    response_model=JobResponse,
    summary="Get job status",
)
async def get_job(
    job_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> JobResponse:
    """Get a generation job by ID."""
    service = get_generation_service()
    
    try:
        job = await service.get_job(current_user.sub, job_id)
        return _job_to_response(job)
    except JobNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.to_dict())


@router.get(
    "/jobs/{job_id}/assets",
    response_model=List[AssetResponse],
    summary="Get job assets",
)
async def get_job_assets(
    job_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> List[AssetResponse]:
    """Get all assets from a generation job."""
    service = get_generation_service()
    
    try:
        assets = await service.get_job_assets(current_user.sub, job_id)
        return [_asset_to_response(asset) for asset in assets]
    except JobNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.to_dict())


@router.get(
    "/jobs",
    response_model=JobListResponse,
    summary="List generation jobs",
)
async def list_jobs(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by job status"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of jobs to return"),
    offset: int = Query(0, ge=0, description="Number of jobs to skip"),
    current_user: TokenPayload = Depends(get_current_user),
) -> JobListResponse:
    """List all generation jobs for the current user."""
    service = get_generation_service()
    
    # Convert status string to enum if provided
    status_enum = None
    if status_filter:
        try:
            status_enum = JobStatus(status_filter)
        except ValueError:
            pass  # Invalid status, ignore filter
    
    jobs = await service.list_jobs(
        user_id=current_user.sub,
        status=status_enum,
        limit=limit,
        offset=offset,
    )
    
    return JobListResponse(
        jobs=[_job_to_response(job) for job in jobs],
        total=len(jobs),  # TODO: Get actual total count from service
        limit=limit,
        offset=offset,
    )


@router.get(
    "/jobs/{job_id}/stream",
    summary="Stream job progress",
    description="""
    Stream real-time job progress updates via Server-Sent Events.
    
    **SSE Event Types:**
    - progress: Job progress update with percentage
    - completed: Job completed with asset data
    - failed: Job failed with error message
    - heartbeat: Keep-alive ping every 5 seconds
    
    **Usage:**
    Connect to this endpoint and listen for events until you receive
    'completed' or 'failed'. The stream will automatically close after.
    """,
    responses={
        200: {
            "description": "SSE stream started",
            "content": {"text/event-stream": {}},
        },
        401: {"description": "Authentication required"},
        404: {"description": "Job not found"},
    },
)
async def stream_job_progress(
    job_id: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    """
    Stream real-time job progress updates via SSE.
    
    Polls the job status and streams updates to the client.
    Includes heartbeat events to keep the connection alive.
    """
    service = get_generation_service()
    
    # Verify job exists and user owns it
    try:
        job = await service.get_job(current_user.sub, job_id)
    except JobNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.to_dict())
    
    async def event_generator():
        """Generate SSE events for job progress."""
        last_progress = -1
        last_status = None
        heartbeat_counter = 0
        max_iterations = 300  # 5 minutes max (1 second intervals)
        
        for _ in range(max_iterations):
            try:
                job = await service.get_job(current_user.sub, job_id)
                job_status = job.status.value if hasattr(job.status, 'value') else job.status
                
                # Send progress update if progress OR status changed
                if job.progress != last_progress or job_status != last_status:
                    last_progress = job.progress
                    last_status = job_status
                    event_data = json.dumps({
                        "type": "progress",
                        "status": job_status,
                        "progress": job.progress,
                        "message": _get_progress_message(job.progress, job_status),
                    })
                    yield f"data: {event_data}\n\n"
                
                # Check for completion
                if job_status == "completed":
                    # Get the generated asset
                    assets = await service.get_job_assets(current_user.sub, job_id)
                    asset = assets[0] if assets else None
                    
                    event_data = json.dumps({
                        "type": "completed",
                        "status": "completed",
                        "progress": 100,
                        "asset": {
                            "id": asset.id,
                            "url": asset.url,
                            "asset_type": asset.asset_type,
                            "width": asset.width,
                            "height": asset.height,
                            "file_size": asset.file_size,
                        } if asset else None,
                    })
                    yield f"data: {event_data}\n\n"
                    return
                
                # Check for failure
                if job_status == "failed":
                    event_data = json.dumps({
                        "type": "failed",
                        "status": "failed",
                        "progress": 0,
                        "error": job.error_message or "Generation failed",
                    })
                    yield f"data: {event_data}\n\n"
                    return
                
                # Send heartbeat every 5 iterations (5 seconds)
                heartbeat_counter += 1
                if heartbeat_counter >= 5:
                    heartbeat_counter = 0
                    event_data = json.dumps({"type": "heartbeat"})
                    yield f"data: {event_data}\n\n"
                
                # Wait before next poll
                await asyncio.sleep(1)
                
            except Exception as e:
                event_data = json.dumps({
                    "type": "error",
                    "error": str(e),
                })
                yield f"data: {event_data}\n\n"
                return
        
        # Timeout after max iterations
        event_data = json.dumps({
            "type": "timeout",
            "error": "Job timed out waiting for completion",
        })
        yield f"data: {event_data}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _get_progress_message(progress: int, status: str) -> str:
    """Get a human-readable progress message."""
    if status == "queued":
        return "Waiting in queue..."
    if progress <= 10:
        return "Starting generation..."
    if progress <= 30:
        return "Generating your asset..."
    if progress <= 50:
        return "Adding brand elements..."
    if progress <= 70:
        return "Uploading to storage..."
    if progress <= 85:
        return "Finalizing..."
    if progress < 100:
        return "Almost done..."
    return "Complete!"


__all__ = ["router"]
