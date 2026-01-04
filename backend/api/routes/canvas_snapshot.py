"""
Canvas Snapshot Route Handlers for Aurastream.

Handles temporary canvas snapshot uploads for single-image generation mode.
Snapshots are composite images created from the placement canvas, enabling
cost-effective generation by sending one image instead of multiple assets.

Endpoints:
- POST /canvas-snapshot - Upload a canvas snapshot
"""

import base64
import logging
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from backend.api.middleware.auth import get_current_user
from backend.api.schemas.canvas_snapshot import (
    CanvasSnapshotUploadRequest,
    CanvasSnapshotUploadResponse,
)
from backend.services.jwt_service import TokenPayload
from backend.services.storage_service import get_storage_service

logger = logging.getLogger(__name__)

router = APIRouter()

# Snapshot expiration time (1 hour)
SNAPSHOT_EXPIRATION_HOURS = 1

# Maximum snapshot file size (10MB)
MAX_SNAPSHOT_SIZE_BYTES = 10 * 1024 * 1024


@router.post(
    "",
    response_model=CanvasSnapshotUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload canvas snapshot",
    description="""
    Upload a canvas snapshot for single-image generation mode.
    
    Canvas snapshots are temporary composite images that combine multiple
    placed assets into a single image. This reduces API costs by sending
    one image to the AI instead of multiple individual assets.
    
    Snapshots expire after 1 hour and are automatically cleaned up.
    
    **Pro/Studio only feature.**
    """,
)
async def upload_canvas_snapshot(
    request: CanvasSnapshotUploadRequest,
    current_user: TokenPayload = Depends(get_current_user),
) -> CanvasSnapshotUploadResponse:
    """
    Upload a canvas snapshot for generation.
    
    The snapshot is stored temporarily and can be referenced in generation
    requests via the canvas_snapshot_url field.
    """
    user_id = current_user.sub
    
    # Decode base64 image
    try:
        image_data = base64.b64decode(request.image_base64)
    except Exception as e:
        logger.warning(f"Invalid base64 image data: user_id={user_id}, error={e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid base64 image data",
        )
    
    # Validate file size
    if len(image_data) > MAX_SNAPSHOT_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Snapshot exceeds maximum size of {MAX_SNAPSHOT_SIZE_BYTES // (1024 * 1024)}MB",
        )
    
    # Validate minimum size (sanity check)
    if len(image_data) < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image data too small to be valid",
        )
    
    # Generate snapshot ID
    snapshot_id = f"snap_{uuid4().hex[:12]}"
    
    # Determine file extension from MIME type
    ext_map = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp",
    }
    extension = ext_map.get(request.mime_type, "png")
    
    # Upload to storage
    storage_service = get_storage_service()
    
    try:
        # Store in snapshots folder with user subfolder
        storage_path = f"snapshots/{user_id}/{snapshot_id}.{extension}"
        
        upload_result = await storage_service.upload_raw(
            path=storage_path,
            data=image_data,
            content_type=request.mime_type,
        )
        
        logger.info(
            f"Canvas snapshot uploaded: user_id={user_id}, "
            f"snapshot_id={snapshot_id}, size={len(image_data)}, "
            f"dimensions={request.width}x{request.height}"
        )
        
        # Calculate expiration time
        expires_at = datetime.now(timezone.utc) + timedelta(hours=SNAPSHOT_EXPIRATION_HOURS)
        
        return CanvasSnapshotUploadResponse(
            url=upload_result.url,
            storage_path=storage_path,
            file_size=len(image_data),
            snapshot_id=snapshot_id,
            expires_at=expires_at,
        )
        
    except Exception as e:
        logger.error(f"Failed to upload canvas snapshot: user_id={user_id}, error={e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload canvas snapshot",
        )
