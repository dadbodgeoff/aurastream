"""
Creator Media Library service package.

This package contains all services for the Creator Media Library feature:
- Storage management (upload, delete, retrieve from Supabase)
- Asset organization (tags, favorites, primary selection)
- Prompt injection (formatting assets for generation prompts)
- Usage tracking (analytics on asset usage)

The Creator Media Library is a unified storage system for all user-uploaded
assets that can be injected into any generation prompt. Supported asset types:
- logo: Brand logos (primary, secondary, icon, etc.)
- face: User faces for thumbnail recreation
- character: Character/avatar representations
- game_skin: Game character skins
- object: Props and items to include
- background: Custom backgrounds
- reference: Style reference images
- overlay: Stream overlays
- emote: Channel emotes
- badge: Subscriber badges
- panel: Channel panels
- alert: Alert images
- facecam_frame: Facecam borders
- stinger: Transition animations

Architecture:
- constants.py: Asset types, limits, allowed MIME types
- models.py: Internal data models
- storage.py: Supabase storage operations
- repository.py: Database CRUD operations
- prompt_injector.py: Format assets for prompt injection
- service.py: Main orchestrator service
"""

from backend.services.creator_media.constants import (
    MEDIA_ASSET_TYPES,
    MediaAssetType,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
    BUCKET_NAME,
    ASSET_LIMITS_PRO,
    ASSET_LIMITS_STUDIO,
    ASSET_TYPE_DESCRIPTIONS,
    ALLOWED_TIERS,
    TOTAL_ASSET_LIMIT,
    MAX_PROMPT_INJECTION_ASSETS,
    BG_REMOVAL_DEFAULT_TYPES,
    BG_REMOVAL_EXCLUDED_TYPES,
    can_access_media_library,
    get_asset_limits,
    should_remove_background_by_default,
    can_remove_background,
)
from backend.services.creator_media.models import (
    MediaAssetModel,
    MediaSummaryModel,
    MediaForPromptModel,
)
from backend.services.creator_media.storage import (
    MediaStorageService,
    get_storage_service,
)
from backend.services.creator_media.repository import (
    MediaRepository,
    get_media_repository,
)
from backend.services.creator_media.prompt_injector import (
    PromptInjector,
    get_prompt_injector,
)
from backend.services.creator_media.background_removal import (
    BackgroundRemovalService,
    get_background_removal_service,
)
from backend.services.creator_media.service import (
    CreatorMediaService,
    get_creator_media_service,
)
from backend.services.creator_media.placement_formatter import (
    PlacementFormatter,
    get_placement_formatter,
    PlacementData,
)
from backend.services.creator_media.compositor import (
    MediaAssetCompositor,
    get_media_compositor,
    PlacementSpec,
    CompositeResult,
)

__all__ = [
    # Constants
    "MEDIA_ASSET_TYPES",
    "MediaAssetType",
    "ALLOWED_MIME_TYPES",
    "MAX_FILE_SIZE",
    "BUCKET_NAME",
    "ASSET_LIMITS_PRO",
    "ASSET_LIMITS_STUDIO",
    "ASSET_TYPE_DESCRIPTIONS",
    "ALLOWED_TIERS",
    "TOTAL_ASSET_LIMIT",
    "MAX_PROMPT_INJECTION_ASSETS",
    "BG_REMOVAL_DEFAULT_TYPES",
    "BG_REMOVAL_EXCLUDED_TYPES",
    "can_access_media_library",
    "get_asset_limits",
    "should_remove_background_by_default",
    "can_remove_background",
    # Models
    "MediaAssetModel",
    "MediaSummaryModel",
    "MediaForPromptModel",
    # Storage
    "MediaStorageService",
    "get_storage_service",
    # Repository
    "MediaRepository",
    "get_media_repository",
    # Prompt Injector
    "PromptInjector",
    "get_prompt_injector",
    # Background Removal
    "BackgroundRemovalService",
    "get_background_removal_service",
    # Main Service
    "CreatorMediaService",
    "get_creator_media_service",
    # Placement Formatter
    "PlacementFormatter",
    "get_placement_formatter",
    "PlacementData",
    # Media Compositor
    "MediaAssetCompositor",
    "get_media_compositor",
    "PlacementSpec",
    "CompositeResult",
]
