"""
API routes for Vibe Branding feature.

Provides endpoints for:
- Image analysis via file upload
- Image analysis via URL
- Usage quota tracking

All endpoints require authentication.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

import aiohttp
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query

from backend.api.schemas.vibe_branding import (
    AnalyzeURLRequest,
    AnalyzeResponse,
    UsageResponse,
    VibeAnalysisSchema,
    FontsSchema,
)
from backend.services.vibe_branding_service import (
    get_vibe_branding_service,
)
from backend.services.exceptions import (
    ContentPolicyError,
    GenerationError,
    RateLimitError,
)
from backend.services.jwt_service import TokenPayload
from backend.api.middleware.auth import get_current_user


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/vibe-branding", tags=["Vibe Branding"])

# Constants
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB


def _convert_analysis_to_schema(analysis) -> VibeAnalysisSchema:
    """Convert VibeAnalysis model to VibeAnalysisSchema."""
    return VibeAnalysisSchema(
        primary_colors=analysis.primary_colors,
        accent_colors=analysis.accent_colors,
        fonts=FontsSchema(
            headline=analysis.fonts["headline"],
            body=analysis.fonts["body"]
        ),
        tone=analysis.tone,
        style_reference=analysis.style_reference,
        lighting_mood=analysis.lighting_mood,
        style_keywords=analysis.style_keywords,
        text_vibe=analysis.text_vibe,
        confidence=analysis.confidence,
        source_image_hash=analysis.source_image_hash,
        analyzed_at=analysis.analyzed_at,
    )


@router.post("/analyze/upload", response_model=AnalyzeResponse)
async def analyze_uploaded_image(
    file: UploadFile = File(...),
    auto_create_kit: bool = Query(True, description="Automatically create brand kit"),
    kit_name: Optional[str] = Query(None, max_length=100, description="Name for brand kit"),
    current_user: TokenPayload = Depends(get_current_user)
):
    """
    Analyze an uploaded image and extract brand identity.
    
    Optionally creates a brand kit from the extracted data.
    
    **Tier Limits:**
    - Free: 1 analysis/month
    - Pro: 5 analyses/month
    - Studio: Unlimited
    
    **Supported formats:** JPEG, PNG, WebP (max 15MB)
    """
    service = get_vibe_branding_service()
    
    # Check quota
    quota = await service.check_user_quota(current_user.sub, current_user.tier)
    if not quota["can_analyze"]:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "quota_exceeded",
                "message": f"You've used all {quota['limit']} vibe analyses this month",
                "upgrade_url": "/dashboard/settings?tab=billing"
            }
        )
    
    # Validate file type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, and WebP images are supported"
        )
    
    # Read and validate size
    image_data = await file.read()
    if len(image_data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Image must be under 15MB"
        )
    
    # Analyze
    try:
        logger.info(f"Starting vibe analysis for user {current_user.sub}")
        analysis = await service.analyze_image(image_data, file.content_type)
        logger.info(f"Vibe analysis completed successfully for user {current_user.sub}")
    except ContentPolicyError:
        logger.warning(f"Content policy violation for user {current_user.sub}")
        raise HTTPException(
            status_code=400,
            detail="This image cannot be analyzed due to content restrictions"
        )
    except RateLimitError as e:
        logger.warning(f"Rate limit exceeded for user {current_user.sub}")
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Please try again in {e.retry_after} seconds."
        )
    except GenerationError as e:
        logger.error(f"Generation error for user {current_user.sub}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to analyze image. Please try a different image."
        )
    except Exception as e:
        logger.exception(f"Unexpected error during vibe analysis for user {current_user.sub}: {e}")
        raise
    
    # Increment usage
    await service.increment_usage(current_user.sub)
    
    # Create brand kit if requested
    brand_kit_id = None
    if auto_create_kit:
        try:
            kit = await service.create_brand_kit_from_analysis(
                analysis,
                current_user.sub,
                kit_name
            )
            brand_kit_id = kit["id"]
        except Exception:
            # Brand kit creation failure is non-critical
            pass
    
    return AnalyzeResponse(
        analysis=_convert_analysis_to_schema(analysis),
        brand_kit_id=brand_kit_id,
        cached=False
    )


@router.post("/analyze/url", response_model=AnalyzeResponse)
async def analyze_image_url(
    request: AnalyzeURLRequest,
    current_user: TokenPayload = Depends(get_current_user)
):
    """
    Analyze an image from URL and extract brand identity.
    
    Optionally creates a brand kit from the extracted data.
    
    **Tier Limits:**
    - Free: 1 analysis/month
    - Pro: 5 analyses/month
    - Studio: Unlimited
    """
    service = get_vibe_branding_service()
    
    # Check quota
    quota = await service.check_user_quota(current_user.sub, current_user.tier)
    if not quota["can_analyze"]:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "quota_exceeded",
                "message": f"You've used all {quota['limit']} vibe analyses this month",
                "upgrade_url": "/dashboard/settings?tab=billing"
            }
        )
    
    # Fetch image from URL
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(str(request.image_url), timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status != 200:
                    raise HTTPException(
                        status_code=400,
                        detail="Could not fetch image from URL"
                    )
                
                content_type = resp.headers.get("content-type", "image/jpeg").split(";")[0]
                if content_type not in ALLOWED_MIME_TYPES:
                    raise HTTPException(
                        status_code=400,
                        detail="URL must point to a JPEG, PNG, or WebP image"
                    )
                
                image_data = await resp.read()
                if len(image_data) > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=400,
                        detail="Image must be under 15MB"
                    )
    except aiohttp.ClientError:
        raise HTTPException(
            status_code=400,
            detail="Could not fetch image from URL"
        )
    
    # Analyze
    try:
        analysis = await service.analyze_image(image_data, content_type)
    except ContentPolicyError:
        raise HTTPException(
            status_code=400,
            detail="This image cannot be analyzed due to content restrictions"
        )
    except RateLimitError as e:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Please try again in {e.retry_after} seconds."
        )
    except GenerationError:
        raise HTTPException(
            status_code=500,
            detail="Failed to analyze image. Please try a different image."
        )
    
    # Increment usage
    await service.increment_usage(current_user.sub)
    
    # Create brand kit if requested
    brand_kit_id = None
    if request.auto_create_kit:
        try:
            kit = await service.create_brand_kit_from_analysis(
                analysis,
                current_user.sub,
                request.kit_name
            )
            brand_kit_id = kit["id"]
        except Exception:
            pass
    
    return AnalyzeResponse(
        analysis=_convert_analysis_to_schema(analysis),
        brand_kit_id=brand_kit_id,
        cached=False
    )


@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    current_user: TokenPayload = Depends(get_current_user)
):
    """
    Get user's vibe branding usage for current month.
    
    Returns the number of analyses used, the limit for the user's tier,
    and when the usage counter resets.
    """
    service = get_vibe_branding_service()
    quota = await service.check_user_quota(current_user.sub, current_user.tier)
    
    # Calculate reset date (first of next month)
    now = datetime.now(timezone.utc)
    if now.month == 12:
        resets_at = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        resets_at = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)
    
    return UsageResponse(
        used=quota["used"],
        limit=quota["limit"],
        remaining=quota["remaining"],
        can_analyze=quota["can_analyze"],
        resets_at=resets_at.isoformat()
    )
