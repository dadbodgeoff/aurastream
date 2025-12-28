"""
Avatar route handlers for Aurastream.

This module implements avatar CRUD endpoints:
- GET /avatars - List user's avatars
- POST /avatars - Create new avatar
- GET /avatars/default - Get default avatar
- GET /avatars/options - Get all customization options
- GET /avatars/{id} - Get specific avatar
- PUT /avatars/{id} - Update avatar
- DELETE /avatars/{id} - Delete avatar
- POST /avatars/{id}/default - Set as default

All endpoints require authentication.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from backend.api.middleware.auth import get_current_user
from backend.api.schemas.avatar import (
    CreateAvatarRequest,
    UpdateAvatarRequest,
    AvatarResponse,
    AvatarListResponse,
    AvatarOptionsResponse,
)
from backend.services.avatar_service import get_avatar_service
from backend.services.jwt_service import TokenPayload
from backend.services.exceptions import NotFoundError, AuthorizationError


router = APIRouter()


def _avatar_to_response(avatar) -> AvatarResponse:
    """Convert Avatar dataclass to response schema."""
    return AvatarResponse(
        id=avatar.id,
        user_id=avatar.user_id,
        name=avatar.name,
        is_default=avatar.is_default,
        gender=avatar.gender,
        body_type=avatar.body_type,
        skin_tone=avatar.skin_tone,
        face_shape=avatar.face_shape,
        eye_color=avatar.eye_color,
        eye_style=avatar.eye_style,
        hair_color=avatar.hair_color,
        hair_style=avatar.hair_style,
        hair_texture=avatar.hair_texture,
        default_expression=avatar.default_expression,
        art_style=avatar.art_style,
        outfit_style=avatar.outfit_style,
        glasses=avatar.glasses,
        glasses_style=avatar.glasses_style,
        headwear=avatar.headwear,
        facial_hair=avatar.facial_hair,
        created_at=avatar.created_at,
        updated_at=avatar.updated_at,
    )


@router.get(
    "",
    response_model=AvatarListResponse,
    summary="List avatars",
    description="Get all avatars for the authenticated user.",
)
async def list_avatars(
    current_user: TokenPayload = Depends(get_current_user),
) -> AvatarListResponse:
    """List all avatars for the current user."""
    service = get_avatar_service()
    avatars = await service.list(current_user.sub)
    
    return AvatarListResponse(
        avatars=[_avatar_to_response(a) for a in avatars],
        total=len(avatars),
    )


@router.post(
    "",
    response_model=AvatarResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create avatar",
    description="Create a new avatar for the authenticated user.",
)
async def create_avatar(
    data: CreateAvatarRequest,
    current_user: TokenPayload = Depends(get_current_user),
) -> AvatarResponse:
    """Create a new avatar."""
    service = get_avatar_service()
    
    avatar = await service.create(
        user_id=current_user.sub,
        name=data.name,
        is_default=data.is_default,
        gender=data.gender,
        body_type=data.body_type,
        skin_tone=data.skin_tone,
        face_shape=data.face_shape,
        eye_color=data.eye_color,
        eye_style=data.eye_style,
        hair_color=data.hair_color,
        hair_style=data.hair_style,
        hair_texture=data.hair_texture,
        default_expression=data.default_expression,
        art_style=data.art_style,
        outfit_style=data.outfit_style,
        glasses=data.glasses,
        glasses_style=data.glasses_style,
        headwear=data.headwear,
        facial_hair=data.facial_hair,
    )
    
    return _avatar_to_response(avatar)


@router.get(
    "/options",
    response_model=AvatarOptionsResponse,
    summary="Get avatar options",
    description="Get all available options for avatar customization.",
)
async def get_avatar_options() -> AvatarOptionsResponse:
    """Get all available customization options."""
    return AvatarOptionsResponse()


@router.get(
    "/default",
    response_model=AvatarResponse,
    summary="Get default avatar",
    description="Get the user's default avatar.",
    responses={
        404: {"description": "No default avatar set"},
    },
)
async def get_default_avatar(
    current_user: TokenPayload = Depends(get_current_user),
) -> AvatarResponse:
    """Get the user's default avatar."""
    service = get_avatar_service()
    avatar = await service.get_default(current_user.sub)
    
    if not avatar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No default avatar set",
        )
    
    return _avatar_to_response(avatar)


@router.get(
    "/{avatar_id}",
    response_model=AvatarResponse,
    summary="Get avatar",
    description="Get a specific avatar by ID.",
    responses={
        404: {"description": "Avatar not found"},
        403: {"description": "Not authorized to access this avatar"},
    },
)
async def get_avatar(
    avatar_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> AvatarResponse:
    """Get a specific avatar."""
    service = get_avatar_service()
    
    try:
        avatar = await service.get(current_user.sub, avatar_id)
        return _avatar_to_response(avatar)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar not found",
        )
    except AuthorizationError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this avatar",
        )


@router.put(
    "/{avatar_id}",
    response_model=AvatarResponse,
    summary="Update avatar",
    description="Update an existing avatar.",
    responses={
        404: {"description": "Avatar not found"},
        403: {"description": "Not authorized to update this avatar"},
    },
)
async def update_avatar(
    avatar_id: str,
    data: UpdateAvatarRequest,
    current_user: TokenPayload = Depends(get_current_user),
) -> AvatarResponse:
    """Update an avatar."""
    service = get_avatar_service()
    
    # Build kwargs from non-None fields
    update_kwargs = {}
    for field, value in data.model_dump().items():
        if value is not None:
            update_kwargs[field] = value
    
    try:
        avatar = await service.update(current_user.sub, avatar_id, **update_kwargs)
        return _avatar_to_response(avatar)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar not found",
        )
    except AuthorizationError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this avatar",
        )


@router.delete(
    "/{avatar_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete avatar",
    description="Delete an avatar.",
    responses={
        404: {"description": "Avatar not found"},
        403: {"description": "Not authorized to delete this avatar"},
    },
)
async def delete_avatar(
    avatar_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> None:
    """Delete an avatar."""
    service = get_avatar_service()
    
    try:
        await service.delete(current_user.sub, avatar_id)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar not found",
        )
    except AuthorizationError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this avatar",
        )


@router.post(
    "/{avatar_id}/default",
    response_model=AvatarResponse,
    summary="Set default avatar",
    description="Set an avatar as the user's default.",
    responses={
        404: {"description": "Avatar not found"},
        403: {"description": "Not authorized to modify this avatar"},
    },
)
async def set_default_avatar(
    avatar_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> AvatarResponse:
    """Set an avatar as the default."""
    service = get_avatar_service()
    
    try:
        avatar = await service.set_default(current_user.sub, avatar_id)
        return _avatar_to_response(avatar)
    except NotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar not found",
        )
    except AuthorizationError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this avatar",
        )
