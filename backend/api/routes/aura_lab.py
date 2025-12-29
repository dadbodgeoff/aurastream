"""
API routes for The Aura Lab feature.

Provides endpoints for:
- Test subject upload and management
- Element fusion operations
- Inventory management
- Usage tracking
- Element discovery

All endpoints require authentication.
"""

import uuid
from typing import Optional

import aiohttp
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query

from backend.api.schemas.aura_lab import (
    SetSubjectResponse,
    FuseRequest,
    FuseResponse,
    KeepRequest,
    InventoryResponse,
    UsageResponse,
    ElementsResponse,
    ElementSchema,
    RarityScoresSchema,
    FusionItem,
    SuccessResponse,
)
from backend.services.aura_lab_service import AuraLabService, ELEMENTS
from backend.services.storage_service import get_storage_service
from backend.services.nano_banana_client import get_nano_banana_client, GenerationRequest
from backend.services.exceptions import ContentPolicyError, RateLimitError, GenerationError
from backend.services.jwt_service import TokenPayload
from backend.api.middleware.auth import get_current_user


router = APIRouter(prefix="/api/v1/aura-lab", tags=["Aura Lab"])

# Constants
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB
AURA_LAB_BUCKET = "aura-lab"  # Dedicated bucket for Aura Lab assets

# Fusion prompt template for image-to-image transformation
FUSION_PROMPT_TEMPLATE = """You are a visual alchemist specializing in identity transformation.

I'm providing you with an INPUT IMAGE (the "Test Subject") that you must transform.

ELEMENT TO APPLY: {element_name}
ELEMENT DESCRIPTION: {element_description}

YOUR TASK:
Transform the INPUT IMAGE using the essence of the element to create a "Twitch Emote" style sticker.

CRITICAL RULES:

1. IDENTITY PRESERVATION (Non-negotiable):
   - The facial features, hair shape, and key characteristics of the INPUT IMAGE must be clearly recognizable
   - If the input is a person, the result must look like that person
   - If the input is a logo, preserve the overall silhouette and key symbols
   - The result should pass the "squint test" - recognizable at 28px

2. MATERIAL TRANSFORMATION:
   - The texture, color palette, and physical substance must be 100% derived from the element
   - Make the transformation dramatic and obvious
   - Apply {element_name} characteristics: {element_description}

3. STYLE REQUIREMENTS:
   - Thick white sticker outline (3-4px)
   - Vector illustration style
   - High contrast for chat readability
   - Expressive, exaggerated features
   - Clean edges, no fine details that disappear at small sizes

4. OUTPUT:
   - Single square image
   - Solid neon-green background (#00FF00) for easy removal
   - Centered composition
   - No text or watermarks
"""


# ============================================================================
# Test Subject Endpoints
# ============================================================================

@router.post("/set-subject", response_model=SetSubjectResponse)
async def set_subject(
    file: UploadFile = File(...),
    current_user: TokenPayload = Depends(get_current_user)
):
    """
    Upload and lock in a test subject for fusion experiments.
    
    The test subject is the base image that will be transformed when
    fused with different elements. Subjects expire after 24 hours.
    
    **Supported formats:** JPEG, PNG, WebP (max 15MB)
    
    **Returns:** Subject ID and image URL for use in fusion requests.
    """
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
    
    # Generate unique subject ID
    subject_id = str(uuid.uuid4())
    
    # Upload to Supabase Storage
    storage = get_storage_service()
    try:
        # Use a dedicated bucket path for aura-lab subjects
        # Path: subjects/{user_id}/{subject_id}.{ext}
        upload_result = await storage.upload_asset(
            user_id=current_user.sub,
            job_id=f"subjects/{subject_id}",  # Use subjects subfolder
            image_data=image_data,
            content_type=file.content_type or "image/png"
        )
        image_url = upload_result.url
        storage_path = upload_result.path
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload image: {str(e)}"
        )
    
    # Save subject metadata to database
    service = AuraLabService()
    result = await service.set_subject(
        current_user.sub,
        image_url,
        storage_path
    )
    
    return SetSubjectResponse(**result)


# ============================================================================
# Fusion Endpoints
# ============================================================================

@router.post("/fuse", response_model=FuseResponse)
async def fuse(
    request: FuseRequest,
    current_user: TokenPayload = Depends(get_current_user)
):
    """
    Perform a fusion between test subject and element.
    
    Combines the uploaded test subject with the selected element to
    generate a transformed image using AI. The result includes AI-generated
    rarity scores and may be a first discovery.
    
    **Tier Limits:**
    - Free: 2 fusions/month
    - Pro: 25 fusions/month
    
    **Premium Elements:** Require Pro tier.
    
    **Returns:** Fusion result with image URL, rarity, and scores.
    """
    from backend.services.usage_limit_service import get_usage_limit_service
    
    service = AuraLabService()
    usage_service = get_usage_limit_service()
    tier = current_user.tier or "free"
    
    try:
        # Validate element exists
        if request.element_id not in ELEMENTS:
            raise HTTPException(status_code=400, detail=f"Unknown element: {request.element_id}")
        
        element = ELEMENTS[request.element_id]
        
        # Check premium access for premium elements
        if element["premium"] and tier == "free":
            raise HTTPException(status_code=403, detail="Premium element requires Pro tier")
        
        # Check usage limits
        usage = await usage_service.check_limit(current_user.sub, "aura_lab")
        if not usage.can_use:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "limit_exceeded",
                    "message": f"You've used all {usage.limit} Aura Lab fusions this month. Upgrade to Pro for more!",
                    "used": usage.used,
                    "limit": usage.limit,
                    "resets_at": usage.resets_at.isoformat() if usage.resets_at else None,
                }
            )
        
        # Get the subject
        subject = await service.get_subject(current_user.sub, request.subject_id)
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found or expired")
        
        # Fetch the subject image from storage
        subject_image_url = subject["image_url"]
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(subject_image_url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                    if resp.status != 200:
                        raise HTTPException(status_code=500, detail="Failed to fetch subject image")
                    subject_image_data = await resp.read()
                    content_type = resp.headers.get("content-type", "image/png").split(";")[0]
        except aiohttp.ClientError as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch subject image: {str(e)}")
        
        # Build the fusion prompt
        fusion_prompt = FUSION_PROMPT_TEMPLATE.format(
            element_name=element["name"],
            element_description=element["description"]
        )
        
        # Generate the fused image using Nano Banana (Gemini)
        nano_banana = get_nano_banana_client()
        gen_request = GenerationRequest(
            prompt=fusion_prompt,
            width=512,
            height=512,
            input_image=subject_image_data,
            input_mime_type=content_type
        )
        
        try:
            gen_response = await nano_banana.generate(gen_request)
            generated_image_data = gen_response.image_data
        except ContentPolicyError:
            raise HTTPException(
                status_code=400,
                detail="This image cannot be processed due to content restrictions"
            )
        except RateLimitError as e:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Please try again in {e.retry_after} seconds."
            )
        except GenerationError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate fusion: {str(e)}"
            )
        
        # Upload the generated image to storage
        fusion_id = str(uuid.uuid4())
        storage = get_storage_service()
        
        try:
            upload_result = await storage.upload_asset(
                user_id=current_user.sub,
                job_id=f"fusions/{fusion_id}",
                image_data=generated_image_data,
                content_type="image/png"
            )
            generated_image_url = upload_result.url
            storage_path = upload_result.path
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save fusion result: {str(e)}"
            )
        
        # Mark usage
        await usage_service.increment(current_user.sub, "aura_lab")
        
        # Record the fusion in the database
        result = await service.fuse(
            current_user.sub,
            request.subject_id,
            request.element_id,
            tier,
            generated_image_url,
            storage_path
        )
        
        return FuseResponse(
            fusion_id=result.fusion_id,
            image_url=result.image_url,
            rarity=result.rarity,
            scores=RarityScoresSchema(**result.scores),
            is_first_discovery=result.is_first_discovery,
            recipe_id=result.recipe_id
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/keep", response_model=SuccessResponse)
async def keep_fusion(
    request: KeepRequest,
    current_user: TokenPayload = Depends(get_current_user)
):
    """
    Save a fusion to inventory.
    
    Marks the fusion as kept, adding it to the user's permanent
    inventory. Kept fusions can be viewed and downloaded later.
    
    **Returns:** Success status.
    """
    service = AuraLabService()
    success = await service.keep_fusion(current_user.sub, request.fusion_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Fusion not found")
    
    return SuccessResponse(success=True)


@router.post("/trash", response_model=SuccessResponse)
async def trash_fusion(
    request: KeepRequest,
    current_user: TokenPayload = Depends(get_current_user)
):
    """
    Delete a fusion (don't keep it).
    
    Permanently deletes the fusion. This action cannot be undone.
    Only fusions that haven't been kept can be trashed.
    
    **Returns:** Success status.
    """
    service = AuraLabService()
    success = await service.trash_fusion(current_user.sub, request.fusion_id)
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Fusion not found or already kept"
        )
    
    return SuccessResponse(success=True)


# ============================================================================
# Inventory Endpoints
# ============================================================================

@router.get("/inventory", response_model=InventoryResponse)
async def get_inventory(
    limit: int = Query(50, ge=1, le=100, description="Number of items to return"),
    offset: int = Query(0, ge=0, description="Number of items to skip"),
    rarity: Optional[str] = Query(
        None,
        pattern="^(common|rare|mythic)$",
        description="Filter by rarity tier"
    ),
    current_user: TokenPayload = Depends(get_current_user)
):
    """
    Get user's saved fusions (inventory).
    
    Returns a paginated list of all fusions the user has kept,
    with optional filtering by rarity tier.
    
    **Query Parameters:**
    - `limit`: Number of items per page (1-100, default 50)
    - `offset`: Number of items to skip (default 0)
    - `rarity`: Filter by rarity (common, rare, mythic)
    
    **Returns:** List of fusions with rarity counts.
    """
    service = AuraLabService()
    result = await service.get_inventory(
        current_user.sub,
        limit=limit,
        offset=offset,
        rarity_filter=rarity
    )
    
    # Transform to response model
    fusions = [
        FusionItem(
            id=f["id"],
            image_url=f["image_url"],
            element_id=f["element_id"],
            rarity=f["rarity"],
            scores=f["scores"],
            created_at=f["created_at"]
        )
        for f in result["fusions"]
    ]
    
    return InventoryResponse(
        fusions=fusions,
        total=result["total"],
        mythic_count=result["mythic_count"],
        rare_count=result["rare_count"],
        common_count=result["common_count"]
    )


# ============================================================================
# Usage Endpoints
# ============================================================================

@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    current_user: TokenPayload = Depends(get_current_user)
):
    """
    Get user's fusion usage.
    
    Returns the number of fusions used, the limit based on subscription tier,
    and when the counter resets.
    
    **Tier Limits:**
    - Free: 2 fusions/month
    - Pro: 25 fusions/month
    - Studio: 25 fusions/month
    
    **Returns:** Usage statistics and reset time.
    """
    from backend.services.usage_limit_service import get_usage_limit_service
    
    usage_service = get_usage_limit_service()
    usage = await usage_service.check_limit(current_user.sub, "aura_lab")
    
    return UsageResponse(
        used_today=usage.used,  # Actually monthly, but keeping field name for compat
        limit=usage.limit,
        remaining=usage.remaining,
        resets_at=usage.resets_at.isoformat() + "Z" if usage.resets_at else None
    )


# ============================================================================
# Elements Endpoints
# ============================================================================

@router.get("/elements", response_model=ElementsResponse)
async def get_elements(
    current_user: TokenPayload = Depends(get_current_user)
):
    """
    Get available elements for fusion.
    
    Returns all elements with their descriptions and icons.
    Premium elements are marked as locked for free tier users.
    
    **Element Categories:**
    - Free (12): fire, ice, clown, gigachad, mecha, zombie, gold, ghost, pixel, skull, rainbow, electric
    - Premium (8): cyberpunk, 8bit, noir, vaporwave, anime, horror, steampunk, hologram
    
    **Returns:** List of elements with lock status.
    """
    service = AuraLabService()
    result = service.get_elements(current_user.tier or "free")
    
    elements = [
        ElementSchema(**e)
        for e in result["elements"]
    ]
    
    return ElementsResponse(
        elements=elements,
        premium_locked=result["premium_locked"]
    )
