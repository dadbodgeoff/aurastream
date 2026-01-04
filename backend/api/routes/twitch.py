"""
Twitch Asset Generation Route Handlers for Aurastream.

This module implements all Twitch asset generation endpoints:
- POST /twitch/generate - Generate a single Twitch asset
- POST /twitch/packs - Generate an asset pack
- GET /twitch/packs/{pack_id} - Get pack status and assets
- GET /twitch/dimensions - Get dimension specifications
- GET /twitch/game-meta/{game_id} - Get game metadata
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request

from backend.api.middleware.auth import get_current_user
from backend.api.schemas.twitch import (
    TwitchGenerateRequest,
    PackGenerateRequest,
    AssetResponse,
    PackResponse,
    DimensionSpecResponse,
)
from backend.api.service_dependencies import (
    GenerationServiceDep,
    ContextEngineDep,
    GameMetaServiceDep,
    AuditServiceDep,
)
from backend.services.jwt_service import TokenPayload
from backend.services.twitch import (
    ContextEngine,
    PromptConstructor,
    AssetPipeline,
    QCGate,
    GameMetaService,
    DIMENSION_SPECS,
    get_dimension_spec,
)
from backend.services.exceptions import (
    BrandKitNotFoundError,
    AuthorizationError,
)


router = APIRouter(prefix="/twitch", tags=["twitch"])


@router.post(
    "/generate",
    response_model=dict,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Generate Twitch asset",
    description="Create a new Twitch asset generation job. Returns job ID for tracking.",
)
async def generate_twitch_asset(
    request: Request,
    data: TwitchGenerateRequest,
    current_user: TokenPayload = Depends(get_current_user),
    context_engine: ContextEngineDep = None,
    generation_service: GenerationServiceDep = None,
    audit: AuditServiceDep = None,
) -> dict:
    """
    Generate a single Twitch asset.
    
    This endpoint creates a generation job and returns immediately.
    Use the job ID to poll for status.
    """
    from backend.workers.twitch_worker import enqueue_twitch_generation_job
    
    try:
        # Build context (validates brand kit ownership)
        context = await context_engine.build_context(
            user_id=current_user.sub,
            brand_kit_id=data.brand_kit_id,
            asset_type=data.asset_type,
            game_id=data.game_id,
        )
        
        # Create job in database
        job = await generation_service.create_job(
            user_id=current_user.sub,
            brand_kit_id=data.brand_kit_id,
            asset_type=data.asset_type,
            custom_prompt=data.custom_prompt,
            parameters={
                "game_id": data.game_id,
                "text_overlay": data.text_overlay,
            } if data.game_id or data.text_overlay else None,
        )
        
        # Enqueue job to Twitch worker
        enqueue_twitch_generation_job(
            job_id=job.id,
            user_id=current_user.sub,
            brand_kit_id=data.brand_kit_id,
            asset_type=data.asset_type,
            custom_prompt=data.custom_prompt,
            game_id=data.game_id,
            text_overlay=data.text_overlay,
        )
        
        # Audit log
        await audit.log(
            user_id=current_user.sub,
            action="twitch.generate",
            resource_type="twitch_asset",
            resource_id=job.id,
            details={
                "asset_type": data.asset_type,
                "brand_kit_id": data.brand_kit_id,
                "game_id": data.game_id,
            },
            ip_address=request.client.host if request.client else None,
        )
        
        return {
            "job_id": job.id,
            "status": "queued",
            "asset_type": data.asset_type,
            "message": "Generation job created successfully",
        }
        
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.to_dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "generation_error", "message": str(e)}
        )


@router.post(
    "/packs",
    response_model=dict,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Generate asset pack",
    description="Create a pack of Twitch assets with consistent branding.",
)
async def generate_pack(
    request: Request,
    data: PackGenerateRequest,
    current_user: TokenPayload = Depends(get_current_user),
    context_engine: ContextEngineDep = None,
    audit: AuditServiceDep = None,
) -> dict:
    """
    Generate an asset pack.
    
    Pack types:
    - seasonal: 1 Story, 1 Thumbnail, 3 Emotes
    - emote: 5 Emotes with variations
    - stream: 3 Panels, 1 Offline screen
    """
    import uuid
    from backend.workers.twitch_worker import enqueue_pack_generation_job
    
    try:
        # Validate brand kit ownership
        await context_engine.build_context(
            user_id=current_user.sub,
            brand_kit_id=data.brand_kit_id,
            asset_type="pack",
            game_id=data.game_id,
        )
        
        # Generate pack ID
        pack_id = str(uuid.uuid4())
        
        # Enqueue pack job to Twitch worker
        enqueue_pack_generation_job(
            pack_id=pack_id,
            user_id=current_user.sub,
            brand_kit_id=data.brand_kit_id,
            pack_type=data.pack_type,
            custom_prompt=data.custom_prompt,
            game_id=data.game_id,
        )
        
        # Audit log
        await audit.log(
            user_id=current_user.sub,
            action="twitch.generate_pack",
            resource_type="twitch_pack",
            resource_id=pack_id,
            details={
                "pack_type": data.pack_type,
                "brand_kit_id": data.brand_kit_id,
            },
            ip_address=request.client.host if request.client else None,
        )
        
        return {
            "pack_id": pack_id,
            "pack_type": data.pack_type,
            "status": "queued",
            "progress": 0,
            "message": "Pack generation job created successfully",
        }
        
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.to_dict())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "generation_error", "message": str(e)}
        )


@router.get(
    "/packs/{pack_id}",
    response_model=dict,
    summary="Get pack status",
    description="Get the status and assets of a pack generation job.",
)
async def get_pack_status(
    pack_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> dict:
    """
    Get pack generation status.
    
    Returns current progress and any completed assets.
    """
    # TODO: Implement pack status retrieval from database
    # For now, return placeholder
    return {
        "pack_id": pack_id,
        "status": "processing",
        "progress": 50,
        "assets": [],
        "message": "Pack generation in progress",
    }


@router.get(
    "/dimensions",
    response_model=List[DimensionSpecResponse],
    summary="Get dimension specifications",
    description="Get all available asset type dimension specifications.",
)
async def get_dimensions() -> List[DimensionSpecResponse]:
    """
    Get dimension specifications for all asset types.
    
    Returns generation and export sizes for each asset type.
    """
    return [
        DimensionSpecResponse(
            asset_type=asset_type,
            generation_size=spec.generation_size,
            export_size=spec.export_size,
            aspect_ratio=spec.aspect_ratio,
        )
        for asset_type, spec in DIMENSION_SPECS.items()
    ]


@router.get(
    "/game-meta/{game_id}",
    response_model=dict,
    summary="Get game metadata",
    description="Get metadata for a game including current season information.",
)
async def get_game_meta(
    game_id: str,
    game_meta_service: GameMetaServiceDep = None,
) -> dict:
    """
    Get game metadata for context.
    
    Returns game name, current season, and genre if available.
    """
    meta = await game_meta_service.get_game_meta(game_id)
    
    if meta is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "game_not_found", "message": f"Game '{game_id}' not found"}
        )
    
    return meta


__all__ = ["router"]
