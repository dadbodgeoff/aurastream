"""
Pydantic schemas for Prompt Coach endpoints.

This module defines request/response schemas for:
- Coach session start with pre-loaded context
- Chat continuation for refinement
- Validation results
- SSE streaming chunks

All schemas use Pydantic v2 syntax with comprehensive validation
and OpenAPI documentation.
"""

from typing import Optional, List, Literal, Dict, Any
from pydantic import BaseModel, Field, model_validator


# ============================================================================
# Type Definitions
# ============================================================================

AssetTypeEnum = Literal[
    # General asset types (matching generation.py)
    "thumbnail",
    "overlay",
    "banner",
    "story_graphic",
    "clip_cover",
    # Twitch-specific asset types
    "twitch_emote",
    "twitch_badge",
    "twitch_panel",
    "twitch_offline",
    # Legacy/extended types for backwards compatibility
    "youtube_thumbnail",
    "twitch_banner",
    "tiktok_story",
    "instagram_story",
    "instagram_reel",
]

MoodEnum = Literal["hype", "cozy", "rage", "chill", "custom"]

CoachVerbosityEnum = Literal["concise", "balanced", "detailed"]

CoachStyleEnum = Literal["friendly", "professional", "creative", "technical"]

ValidationSeverityEnum = Literal["error", "warning", "info"]

StreamChunkTypeEnum = Literal[
    "token",
    "intent_ready",
    "grounding",
    "grounding_complete",
    "done",
    "error",
]


# ============================================================================
# Color and Font Models
# ============================================================================

class ColorInfo(BaseModel):
    """Color information from brand kit."""
    hex: str = Field(
        ...,
        pattern=r"^#[0-9A-Fa-f]{6}$",
        description="Hex color code",
        examples=["#FF5733"]
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Color name",
        examples=["Sunset Orange"]
    )


class FontInfo(BaseModel):
    """Font information from brand kit."""
    headline: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Headline font family",
        examples=["Montserrat"]
    )
    body: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Body font family",
        examples=["Inter"]
    )


# ============================================================================
# Brand Context
# ============================================================================

class BrandContext(BaseModel):
    """Brand kit context sent from client (already loaded client-side).
    
    All fields are optional to support users without brand kits.
    The coach service will use sensible defaults when values are missing.
    """
    brand_kit_id: Optional[str] = Field(
        None,
        description="Brand kit UUID (optional - users can proceed without a brand kit)",
        examples=["550e8400-e29b-41d4-a716-446655440000"]
    )
    colors: List[ColorInfo] = Field(
        default_factory=list,
        max_length=10,
        description="Brand colors (optional - empty list if no brand kit)"
    )
    tone: str = Field(
        default="professional",
        min_length=1,
        max_length=50,
        description="Brand tone (defaults to 'professional' if not specified)",
        examples=["competitive"]
    )
    fonts: Optional[FontInfo] = Field(
        None,
        description="Brand fonts (optional - system defaults used if not specified)"
    )
    logo_url: Optional[str] = Field(
        None,
        description="Logo URL if available",
        examples=["https://cdn.streamerstudio.com/logos/my-brand.png"]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "brand_kit_id": "550e8400-e29b-41d4-a716-446655440000",
                    "colors": [
                        {"hex": "#FF5733", "name": "Sunset Orange"},
                        {"hex": "#3498DB", "name": "Ocean Blue"}
                    ],
                    "tone": "competitive",
                    "fonts": {"headline": "Montserrat", "body": "Inter"},
                    "logo_url": None
                },
                {
                    "brand_kit_id": None,
                    "colors": [],
                    "tone": "professional",
                    "fonts": None,
                    "logo_url": None
                }
            ]
        }
    }


# ============================================================================
# Coach Preferences
# ============================================================================

class CoachPreferences(BaseModel):
    """User preferences for coach interaction style.
    
    Allows users to customize how the coach communicates with them.
    These preferences can be passed per-session or stored per-user.
    """
    verbosity: CoachVerbosityEnum = Field(
        default="balanced",
        description="How detailed the coach's responses should be"
    )
    style: CoachStyleEnum = Field(
        default="friendly",
        description="Communication style of the coach"
    )
    show_tips: bool = Field(
        default=True,
        description="Whether to show helpful tips during coaching"
    )
    auto_suggest: bool = Field(
        default=True,
        description="Whether to proactively suggest improvements"
    )
    emoji_level: Literal["none", "minimal", "normal"] = Field(
        default="normal",
        description="How many emojis to use in responses"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "verbosity": "balanced",
                    "style": "friendly",
                    "show_tips": True,
                    "auto_suggest": True,
                    "emoji_level": "normal"
                },
                {
                    "verbosity": "concise",
                    "style": "professional",
                    "show_tips": False,
                    "auto_suggest": False,
                    "emoji_level": "none"
                }
            ]
        }
    }


# ============================================================================
# Request Schemas
# ============================================================================

class MediaAssetPlacement(BaseModel):
    """
    Precise placement data for a media asset on the generation canvas.
    
    Matches the generation.py schema exactly for consistency.
    Allows users to specify exact position, size, rotation, and opacity
    for their media assets in the generated output.
    """
    asset_id: str = Field(
        ...,
        description="ID of the media asset to place"
    )
    display_name: str = Field(
        ...,
        description="Display name of the asset"
    )
    asset_type: str = Field(
        ...,
        description="Type of the asset (face, logo, character, etc.)"
    )
    url: str = Field(
        ...,
        description="URL of the asset (preferably processed/transparent version)"
    )
    x: float = Field(
        ...,
        ge=0,
        le=100,
        description="X position as percentage (0-100) from left edge"
    )
    y: float = Field(
        ...,
        ge=0,
        le=100,
        description="Y position as percentage (0-100) from top edge"
    )
    width: float = Field(
        ...,
        gt=0,
        description="Width value (percentage or pixels based on size_unit)"
    )
    height: float = Field(
        ...,
        gt=0,
        description="Height value (percentage or pixels based on size_unit)"
    )
    size_unit: Literal["percent", "px"] = Field(
        default="percent",
        description="Unit for width/height values"
    )
    z_index: int = Field(
        default=1,
        ge=1,
        description="Layer order (higher = on top)"
    )
    rotation: float = Field(
        default=0,
        ge=0,
        le=360,
        description="Rotation in degrees"
    )
    opacity: float = Field(
        default=100,
        ge=0,
        le=100,
        description="Opacity percentage (0-100)"
    )


class StartCoachRequest(BaseModel):
    """
    Start a coach session with ALL context pre-loaded.
    
    Client captures everything before this call, including brand kit data,
    asset type selection, mood, and initial description.
    
    Brand context is optional - users can start sessions without a brand kit.
    Media assets can be pre-selected for injection into the generated asset.
    Canvas snapshot mode is supported for complex compositions with sketches.
    """
    brand_context: Optional[BrandContext] = Field(
        default_factory=BrandContext,
        description="Pre-loaded brand kit context (optional - defaults provided for users without brand kits)"
    )
    asset_type: Optional[AssetTypeEnum] = Field(
        None,
        description="Type of asset to generate (optional - can be determined during conversation)",
        examples=["twitch_emote"]
    )
    mood: Optional[MoodEnum] = Field(
        None,
        description="Mood/style selection (optional - can be determined during conversation)",
        examples=["hype"]
    )
    custom_mood: Optional[str] = Field(
        None,
        max_length=100,
        description="Custom mood if mood='custom'",
        examples=["nostalgic retro vibes"]
    )
    game_id: Optional[str] = Field(
        None,
        description="Game ID for context",
        examples=["fortnite"]
    )
    game_name: Optional[str] = Field(
        None,
        max_length=100,
        description="Game name for context",
        examples=["Fortnite"]
    )
    description: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="User's description of what they want",
        examples=["Victory royale celebration emote"]
    )
    # Creator Media Library integration
    media_asset_ids: Optional[List[str]] = Field(
        None,
        max_length=2,
        description="Media asset UUIDs to inject into generation (max 2)",
        examples=[["550e8400-e29b-41d4-a716-446655440000"]]
    )
    media_asset_placements: Optional[List[MediaAssetPlacement]] = Field(
        None,
        max_length=2,
        description="Placement configurations for media assets"
    )
    # Canvas Studio integration - single-image mode for complex compositions
    canvas_snapshot_url: Optional[str] = Field(
        None,
        description="URL of canvas snapshot image. When provided, uses single-image mode instead of media_asset_placements. More cost-effective for multiple assets with sketches."
    )
    canvas_snapshot_description: Optional[str] = Field(
        None,
        max_length=2000,
        description="Description of canvas snapshot contents for AI context (asset names, positions, sketch annotations)."
    )
    # Coach preferences for this session
    preferences: Optional[CoachPreferences] = Field(
        None,
        description="Optional coach interaction preferences for this session"
    )

    @model_validator(mode='after')
    def validate_custom_mood(self) -> 'StartCoachRequest':
        """Validate that custom_mood is provided when mood is 'custom'."""
        if self.mood == 'custom' and not self.custom_mood:
            raise ValueError("custom_mood is required when mood is 'custom'")
        return self

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "brand_context": {
                        "brand_kit_id": "550e8400-e29b-41d4-a716-446655440000",
                        "colors": [
                            {"hex": "#FF5733", "name": "Sunset Orange"},
                            {"hex": "#3498DB", "name": "Ocean Blue"}
                        ],
                        "tone": "competitive",
                        "fonts": {"headline": "Montserrat", "body": "Inter"},
                        "logo_url": None
                    },
                    "asset_type": "twitch_emote",
                    "mood": "hype",
                    "game_id": "fortnite",
                    "game_name": "Fortnite",
                    "description": "Victory royale celebration emote"
                }
            ]
        }
    }


class ReferenceAsset(BaseModel):
    """
    Reference asset from user's media library to provide visual context.
    
    Users can attach up to 2 reference images per message to help the coach
    understand their vision better.
    """
    asset_id: str = Field(
        ...,
        description="Media asset UUID from user's library"
    )
    display_name: str = Field(
        ...,
        max_length=100,
        description="Display name of the asset"
    )
    asset_type: str = Field(
        ...,
        description="Type of the asset (face, logo, character, etc.)"
    )
    url: str = Field(
        ...,
        description="URL of the asset for AI context"
    )
    description: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional description of what this reference shows"
    )


class ContinueChatRequest(BaseModel):
    """Continue chat for refinement with optional reference assets."""
    message: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="User's refinement message",
        examples=["Make the colors more vibrant"]
    )
    reference_assets: Optional[List[ReferenceAsset]] = Field(
        None,
        max_length=2,
        description="Reference assets from user's media library (max 2 per message)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"message": "Make the colors more vibrant"},
                {"message": "Add more energy to the pose"},
                {
                    "message": "I want it to look more like this reference",
                    "reference_assets": [
                        {
                            "asset_id": "550e8400-e29b-41d4-a716-446655440000",
                            "display_name": "My Logo",
                            "asset_type": "logo",
                            "url": "https://cdn.aurastream.com/media/logo.png",
                            "description": "My brand logo with blue gradient"
                        }
                    ]
                }
            ]
        }
    }


# ============================================================================
# Validation Models
# ============================================================================

class ValidationIssue(BaseModel):
    """Single validation issue found during prompt analysis."""
    severity: ValidationSeverityEnum = Field(
        ...,
        description="Issue severity level",
        examples=["warning"]
    )
    code: str = Field(
        ...,
        description="Issue code for programmatic handling",
        examples=["MISSING_SUBJECT"]
    )
    message: str = Field(
        ...,
        description="Human-readable message",
        examples=["Prompt is missing a clear subject"]
    )
    suggestion: Optional[str] = Field(
        None,
        description="Suggested fix",
        examples=["Add a specific character or object as the main focus"]
    )


class ValidationResult(BaseModel):
    """Result of prompt validation."""
    is_valid: bool = Field(
        ...,
        description="Whether prompt is valid (no errors)"
    )
    is_generation_ready: bool = Field(
        ...,
        description="Whether prompt is ready for generation"
    )
    quality_score: float = Field(
        ...,
        ge=0,
        le=1,
        description="Quality score 0-1",
        examples=[0.85]
    )
    issues: List[ValidationIssue] = Field(
        default_factory=list,
        description="List of issues found"
    )
    fixed_prompt: Optional[str] = Field(
        None,
        description="Auto-fixed prompt if available"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "is_valid": True,
                    "is_generation_ready": True,
                    "quality_score": 0.85,
                    "issues": [
                        {
                            "severity": "info",
                            "code": "COULD_ADD_DETAIL",
                            "message": "Consider adding more specific details",
                            "suggestion": "Specify the character's expression or pose"
                        }
                    ],
                    "fixed_prompt": None
                }
            ]
        }
    }


# ============================================================================
# Response Schemas
# ============================================================================

class StreamChunk(BaseModel):
    """Single chunk in SSE streaming response."""
    type: StreamChunkTypeEnum = Field(
        ...,
        description="Chunk type"
    )
    content: str = Field(
        default="",
        description="Content (for token/error types)"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional metadata"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"type": "token", "content": "Here's a refined", "metadata": None},
                {"type": "validation", "content": "", "metadata": {"quality_score": 0.85}},
                {"type": "done", "content": "", "metadata": {"total_tokens": 150}}
            ]
        }
    }


class CoachAccessResponse(BaseModel):
    """Response for coach access check."""
    has_access: bool = Field(
        ...,
        description="Whether user has full coach access (premium or trial available)"
    )
    feature: Literal["full_coach", "tips_only"] = Field(
        ...,
        description="Available feature level"
    )
    grounding: bool = Field(
        default=False,
        description="Whether grounding is available"
    )
    upgrade_message: Optional[str] = Field(
        None,
        description="Upgrade message for non-premium users",
        examples=["Upgrade to Studio to unlock the full Prompt Coach experience"]
    )
    rate_limits: Optional[Dict[str, Any]] = Field(
        None,
        description="Rate limit status for coach endpoints"
    )
    trial_available: Optional[bool] = Field(
        None,
        description="Whether user has a free trial available (free/pro only)"
    )
    trial_used: Optional[bool] = Field(
        None,
        description="Whether user has already used their free trial"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "has_access": True,
                    "feature": "full_coach",
                    "grounding": True,
                    "upgrade_message": None,
                    "rate_limits": {
                        "messages": {"remaining": 8, "limit": 10, "window_seconds": 60},
                        "sessions": {"remaining": 18, "limit": 20, "window_seconds": 3600}
                    },
                    "trial_available": None,
                    "trial_used": None
                },
                {
                    "has_access": True,
                    "feature": "full_coach",
                    "grounding": False,
                    "upgrade_message": "Try Prompt Coach free! You have 1 trial session.",
                    "rate_limits": None,
                    "trial_available": True,
                    "trial_used": False
                },
                {
                    "has_access": False,
                    "feature": "tips_only",
                    "grounding": False,
                    "upgrade_message": "You've used your free trial! Upgrade to Studio.",
                    "rate_limits": None,
                    "trial_available": False,
                    "trial_used": True
                }
            ]
        }
    }


class PromptTipResponse(BaseModel):
    """Single prompt tip."""
    id: str = Field(
        ...,
        description="Tip ID",
        examples=["tip_001"]
    )
    title: str = Field(
        ...,
        description="Tip title",
        examples=["Be Specific About Style"]
    )
    description: str = Field(
        ...,
        description="Tip description",
        examples=["Include specific art style references like 'anime', 'pixel art', or 'realistic'"]
    )
    example: str = Field(
        ...,
        description="Example prompt",
        examples=["A pixel art style victory emote with retro gaming vibes"]
    )


class TipsResponse(BaseModel):
    """Response for static tips endpoint."""
    feature: Literal["tips_only"] = Field(
        default="tips_only",
        description="Feature level indicator"
    )
    tips: List[PromptTipResponse] = Field(
        ...,
        description="List of tips"
    )
    upgrade_cta: Dict[str, Any] = Field(
        ...,
        description="Upgrade call-to-action"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "feature": "tips_only",
                    "tips": [
                        {
                            "id": "tip_001",
                            "title": "Be Specific About Style",
                            "description": "Include specific art style references",
                            "example": "A pixel art style victory emote"
                        }
                    ],
                    "upgrade_cta": {
                        "title": "Unlock Prompt Coach",
                        "description": "Get AI-powered prompt refinement",
                        "button_text": "Upgrade to Studio"
                    }
                }
            ]
        }
    }


class SessionStateResponse(BaseModel):
    """Response for session state."""
    session_id: str = Field(
        ...,
        description="Session UUID",
        examples=["660e8400-e29b-41d4-a716-446655440001"]
    )
    status: Literal["active", "ended", "expired"] = Field(
        ...,
        description="Session status"
    )
    turns_used: int = Field(
        ...,
        description="Number of turns used",
        examples=[3]
    )
    turns_remaining: int = Field(
        ...,
        description="Turns remaining",
        examples=[7]
    )
    current_prompt: Optional[str] = Field(
        None,
        description="Current prompt draft"
    )
    prompt_versions: int = Field(
        ...,
        description="Number of prompt versions",
        examples=[2]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "session_id": "660e8400-e29b-41d4-a716-446655440001",
                    "status": "active",
                    "turns_used": 3,
                    "turns_remaining": 7,
                    "current_prompt": "A vibrant victory emote with orange and blue colors",
                    "prompt_versions": 2
                }
            ]
        }
    }


class EndSessionResponse(BaseModel):
    """Response for ending a session."""
    session_id: str = Field(
        ...,
        description="Session UUID",
        examples=["660e8400-e29b-41d4-a716-446655440001"]
    )
    final_prompt: Optional[str] = Field(
        None,
        description="Final prompt"
    )
    confidence_score: float = Field(
        ...,
        ge=0,
        le=1,
        description="Confidence score",
        examples=[0.92]
    )
    keywords: List[str] = Field(
        default_factory=list,
        description="Extracted keywords",
        examples=[["victory", "celebration", "emote", "vibrant"]]
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Session metadata"
    )


# ============================================================================
# Inline Generation Schemas
# ============================================================================

class GenerateFromSessionRequest(BaseModel):
    """Request to generate an asset from a coach session."""
    include_logo: bool = Field(
        default=False,
        description="Whether to include brand logo on the asset"
    )
    logo_type: Optional[str] = Field(
        default="primary",
        description="Logo type to use if include_logo is True",
        examples=["primary", "secondary", "icon"]
    )
    logo_position: Optional[str] = Field(
        default="bottom-right",
        description="Logo position on the asset",
        examples=["bottom-right", "bottom-left", "top-right", "top-left"]
    )
    # Creator Media Library integration - can override session defaults
    media_asset_ids: Optional[List[str]] = Field(
        None,
        max_length=2,
        description="Media asset UUIDs to inject (overrides session defaults if provided)"
    )
    media_asset_placements: Optional[List[MediaAssetPlacement]] = Field(
        None,
        max_length=2,
        description="Placement configurations for media assets"
    )
    # Canvas Studio integration - can override session defaults
    canvas_snapshot_url: Optional[str] = Field(
        None,
        description="URL of canvas snapshot image (overrides session defaults if provided). More cost-effective for complex compositions."
    )
    canvas_snapshot_description: Optional[str] = Field(
        None,
        max_length=2000,
        description="Description of canvas snapshot contents for AI context."
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "include_logo": False
                },
                {
                    "include_logo": True,
                    "logo_type": "primary",
                    "logo_position": "bottom-right"
                },
                {
                    "include_logo": False,
                    "media_asset_ids": ["550e8400-e29b-41d4-a716-446655440000"],
                    "media_asset_placements": [
                        {
                            "asset_id": "550e8400-e29b-41d4-a716-446655440000",
                            "position": "bottom-right",
                            "size": "small",
                            "opacity": 0.9
                        }
                    ]
                }
            ]
        }
    }


class RefineImageRequest(BaseModel):
    """Request to refine a generated image using multi-turn conversation."""
    refinement: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="What to change about the image",
        examples=["Make the armor gold", "Add more sparkles", "Make it brighter", "Change the background to blue"]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"refinement": "Make the colors more vibrant"},
                {"refinement": "Add a subtle glow effect"},
                {"refinement": "Make the character's expression more intense"},
            ]
        }
    }


class RefineImageResponse(BaseModel):
    """Response after triggering image refinement."""
    job_id: str = Field(
        ...,
        description="Generation job UUID for polling",
        examples=["770e8400-e29b-41d4-a716-446655440002"]
    )
    status: str = Field(
        default="queued",
        description="Initial job status",
        examples=["queued"]
    )
    message: str = Field(
        default="Refinement started",
        description="Status message"
    )
    refinements_used: int = Field(
        ...,
        description="Total refinements used this month"
    )
    refinements_remaining: int = Field(
        ...,
        description="Free refinements remaining (-1 for unlimited)"
    )
    counted_as_creation: bool = Field(
        default=False,
        description="Whether this refinement counted as a creation (Pro users after 5 free)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "job_id": "770e8400-e29b-41d4-a716-446655440002",
                    "status": "queued",
                    "message": "Refinement started",
                    "refinements_used": 2,
                    "refinements_remaining": 3,
                    "counted_as_creation": False
                }
            ]
        }
    }


class QualityWarning(BaseModel):
    """Warning about prompt quality before generation."""
    score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Quality score (0.0-1.0)"
    )
    message: str = Field(
        ...,
        description="Warning message"
    )
    issues: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="List of quality issues found"
    )


class GenerateFromSessionResponse(BaseModel):
    """Response after triggering generation from a coach session."""
    job_id: str = Field(
        ...,
        description="Generation job UUID for polling",
        examples=["770e8400-e29b-41d4-a716-446655440002"]
    )
    status: str = Field(
        default="queued",
        description="Initial job status",
        examples=["queued"]
    )
    message: str = Field(
        default="Generation started",
        description="Status message"
    )
    quality_warning: Optional[Dict[str, Any]] = Field(
        None,
        description="Warning if prompt quality is below threshold (score < 0.7)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "job_id": "770e8400-e29b-41d4-a716-446655440002",
                    "status": "queued",
                    "message": "Generation started",
                    "quality_warning": None
                },
                {
                    "job_id": "770e8400-e29b-41d4-a716-446655440003",
                    "status": "queued",
                    "message": "Generation started",
                    "quality_warning": {
                        "score": 0.55,
                        "message": "Your prompt may produce suboptimal results. Consider refining further.",
                        "issues": [
                            {"severity": "warning", "message": "Missing subject element", "suggestion": "Add a clear subject to your prompt"}
                        ]
                    }
                }
            ]
        }
    }


class SessionAssetResponse(BaseModel):
    """Asset generated from a coach session."""
    id: str = Field(..., description="Asset UUID")
    url: str = Field(..., description="Asset URL")
    asset_type: str = Field(..., description="Asset type")
    width: int = Field(..., description="Width in pixels")
    height: int = Field(..., description="Height in pixels")
    created_at: str = Field(..., description="Creation timestamp")


class SessionAssetsResponse(BaseModel):
    """Response for listing assets from a coach session."""
    assets: List[SessionAssetResponse] = Field(
        default_factory=list,
        description="Assets generated in this session"
    )


class SessionSummary(BaseModel):
    """Summary of a coach session for listing."""
    id: str = Field(..., description="Session UUID")
    asset_type: str = Field(..., description="Asset type")
    mood: Optional[str] = Field(None, description="Selected mood")
    status: str = Field(..., description="Session status")
    turns_used: int = Field(..., description="Number of turns used")
    current_prompt: Optional[str] = Field(None, description="Current/final prompt")
    has_assets: bool = Field(..., description="Whether session has generated assets")
    created_at: str = Field(..., description="Creation timestamp")
    ended_at: Optional[str] = Field(None, description="End timestamp")


class SessionListResponse(BaseModel):
    """Response for listing user's coach sessions."""
    sessions: List[SessionSummary] = Field(
        default_factory=list,
        description="List of sessions"
    )
    total: int = Field(..., description="Total number of sessions")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "session_id": "660e8400-e29b-41d4-a716-446655440001",
                    "final_prompt": "A vibrant victory celebration emote featuring a character with raised fists, using sunset orange (#FF5733) and ocean blue (#3498DB) colors, in a dynamic hype style",
                    "confidence_score": 0.92,
                    "keywords": ["victory", "celebration", "emote", "vibrant", "hype"],
                    "metadata": {
                        "turns_used": 4,
                        "grounding_calls": 1,
                        "brand_elements_used": ["colors", "tone"]
                    }
                }
            ]
        }
    }


# ============================================================================
# Export all schemas
# ============================================================================

__all__ = [
    # Type definitions
    "AssetTypeEnum",
    "MoodEnum",
    "CoachVerbosityEnum",
    "CoachStyleEnum",
    "ValidationSeverityEnum",
    "StreamChunkTypeEnum",
    # Color and Font models
    "ColorInfo",
    "FontInfo",
    # Brand context
    "BrandContext",
    # Coach preferences
    "CoachPreferences",
    # Media asset placement
    "MediaAssetPlacement",
    # Reference asset for chat messages
    "ReferenceAsset",
    # Request schemas
    "StartCoachRequest",
    "ContinueChatRequest",
    "GenerateFromSessionRequest",
    "RefineImageRequest",
    # Validation models
    "ValidationIssue",
    "ValidationResult",
    # Response schemas
    "StreamChunk",
    "CoachAccessResponse",
    "PromptTipResponse",
    "TipsResponse",
    "SessionStateResponse",
    "EndSessionResponse",
    "GenerateFromSessionResponse",
    "RefineImageResponse",
    "SessionAssetResponse",
    "SessionAssetsResponse",
    "SessionSummary",
    "SessionListResponse",
]
