"""
Enhanced Pydantic schemas for brand kit endpoints.

This module defines extended schemas for:
- Extended color system with gradients
- Typography system with font configurations
- Brand voice and personality
- Streamer-specific assets (overlays, alerts, panels, emotes, badges)
- Brand guidelines and social profiles

All schemas use Pydantic v2 syntax with comprehensive validation
and OpenAPI documentation.
"""

import re
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator, model_validator

# ============================================================================
# Constants
# ============================================================================

HEX_PATTERN = re.compile(r'^#[0-9A-Fa-f]{6}$')

VALID_FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900]

EXTENDED_TONES = Literal[
    'competitive',
    'casual',
    'educational',
    'comedic',
    'professional',
    'inspirational',
    'edgy',
    'wholesome'
]


# ============================================================================
# Helper Functions
# ============================================================================

def is_valid_hex_color(color: str) -> bool:
    """Check if a string is a valid hex color."""
    return bool(HEX_PATTERN.match(color))


def normalize_hex_color(color: str) -> str:
    """Normalize hex color to uppercase."""
    return color.upper()


# ============================================================================
# SECTION 1: Extended Color System
# ============================================================================

class ExtendedColor(BaseModel):
    """Extended color definition with metadata."""
    hex: str = Field(
        ...,
        description="Hex color code in #RRGGBB format",
        examples=["#FF5733"]
    )
    name: str = Field(
        ...,
        max_length=50,
        description="Human-readable name for the color",
        examples=["Sunset Orange"]
    )
    usage: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Description of how this color should be used",
        examples=["Primary call-to-action buttons and highlights"]
    )

    @field_validator('hex')
    @classmethod
    def validate_hex(cls, v: str) -> str:
        if not is_valid_hex_color(v):
            raise ValueError(f"Invalid hex color format: {v}. Expected format: #RRGGBB")
        return normalize_hex_color(v)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "hex": "#FF5733",
                    "name": "Sunset Orange",
                    "usage": "Primary call-to-action buttons and highlights"
                }
            ]
        }
    }


class GradientStop(BaseModel):
    """A single stop in a gradient definition."""
    color: str = Field(
        ...,
        description="Hex color code for this gradient stop",
        examples=["#FF5733"]
    )
    position: int = Field(
        ...,
        ge=0,
        le=100,
        description="Position of the stop in the gradient (0-100)",
        examples=[0]
    )

    @field_validator('color')
    @classmethod
    def validate_color(cls, v: str) -> str:
        if not is_valid_hex_color(v):
            raise ValueError(f"Invalid hex color format: {v}. Expected format: #RRGGBB")
        return normalize_hex_color(v)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "color": "#FF5733",
                    "position": 0
                }
            ]
        }
    }


class Gradient(BaseModel):
    """Gradient definition with multiple color stops."""
    name: str = Field(
        ...,
        max_length=50,
        description="Name of the gradient",
        examples=["Sunset Fade"]
    )
    type: Literal['linear', 'radial'] = Field(
        ...,
        description="Type of gradient",
        examples=["linear"]
    )
    angle: int = Field(
        ...,
        ge=0,
        le=360,
        description="Angle of the gradient in degrees (0-360, for linear gradients)",
        examples=[45]
    )
    stops: List[GradientStop] = Field(
        ...,
        min_length=2,
        max_length=10,
        description="Color stops in the gradient (2-10 stops)"
    )

    @model_validator(mode='after')
    def validate_stops_order(self) -> 'Gradient':
        """Validate that gradient stops are in ascending order by position."""
        positions = [stop.position for stop in self.stops]
        if positions != sorted(positions):
            raise ValueError("Gradient stops must be in ascending order by position")
        return self

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "Sunset Fade",
                    "type": "linear",
                    "angle": 45,
                    "stops": [
                        {"color": "#FF5733", "position": 0},
                        {"color": "#FFC300", "position": 50},
                        {"color": "#DAF7A6", "position": 100}
                    ]
                }
            ]
        }
    }


class ColorPalette(BaseModel):
    """Complete color palette with categorized colors and gradients."""
    primary: List[ExtendedColor] = Field(
        default_factory=list,
        max_length=5,
        description="Primary brand colors (max 5)"
    )
    secondary: List[ExtendedColor] = Field(
        default_factory=list,
        max_length=5,
        description="Secondary brand colors (max 5)"
    )
    accent: List[ExtendedColor] = Field(
        default_factory=list,
        max_length=3,
        description="Accent colors for highlights (max 3)"
    )
    neutral: List[ExtendedColor] = Field(
        default_factory=list,
        max_length=5,
        description="Neutral colors for backgrounds and text (max 5)"
    )
    gradients: List[Gradient] = Field(
        default_factory=list,
        max_length=3,
        description="Brand gradients (max 3)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "primary": [
                        {"hex": "#FF5733", "name": "Brand Orange", "usage": "Main brand color"}
                    ],
                    "secondary": [
                        {"hex": "#3498DB", "name": "Ocean Blue", "usage": "Secondary elements"}
                    ],
                    "accent": [
                        {"hex": "#F1C40F", "name": "Gold", "usage": "Highlights and CTAs"}
                    ],
                    "neutral": [
                        {"hex": "#2C3E50", "name": "Dark Slate", "usage": "Text and backgrounds"}
                    ],
                    "gradients": [
                        {
                            "name": "Brand Gradient",
                            "type": "linear",
                            "angle": 90,
                            "stops": [
                                {"color": "#FF5733", "position": 0},
                                {"color": "#3498DB", "position": 100}
                            ]
                        }
                    ]
                }
            ]
        }
    }


# ============================================================================
# SECTION 2: Typography System
# ============================================================================

class FontConfig(BaseModel):
    """Font configuration with family, weight, and style."""
    family: str = Field(
        ...,
        max_length=100,
        description="Font family name",
        examples=["Montserrat"]
    )
    weight: int = Field(
        ...,
        description="Font weight (100-900 in increments of 100)",
        examples=[700]
    )
    style: Literal['normal', 'italic'] = Field(
        default='normal',
        description="Font style",
        examples=["normal"]
    )

    @field_validator('weight')
    @classmethod
    def validate_weight(cls, v: int) -> int:
        if v not in VALID_FONT_WEIGHTS:
            raise ValueError(
                f"Invalid font weight: {v}. Must be one of: {', '.join(map(str, VALID_FONT_WEIGHTS))}"
            )
        return v

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "family": "Montserrat",
                    "weight": 700,
                    "style": "normal"
                }
            ]
        }
    }


class Typography(BaseModel):
    """Complete typography system with font configurations for different text types."""
    display: Optional[FontConfig] = Field(
        default=None,
        description="Font for large display text and hero sections"
    )
    headline: Optional[FontConfig] = Field(
        default=None,
        description="Font for headlines and titles"
    )
    subheadline: Optional[FontConfig] = Field(
        default=None,
        description="Font for subheadlines and section headers"
    )
    body: Optional[FontConfig] = Field(
        default=None,
        description="Font for body text and paragraphs"
    )
    caption: Optional[FontConfig] = Field(
        default=None,
        description="Font for captions and small text"
    )
    accent: Optional[FontConfig] = Field(
        default=None,
        description="Font for accent text and special elements"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "display": {"family": "Oswald", "weight": 700, "style": "normal"},
                    "headline": {"family": "Montserrat", "weight": 600, "style": "normal"},
                    "subheadline": {"family": "Montserrat", "weight": 500, "style": "normal"},
                    "body": {"family": "Inter", "weight": 400, "style": "normal"},
                    "caption": {"family": "Inter", "weight": 400, "style": "italic"},
                    "accent": {"family": "Playfair Display", "weight": 700, "style": "italic"}
                }
            ]
        }
    }


# ============================================================================
# SECTION 3: Brand Voice
# ============================================================================

class BrandVoice(BaseModel):
    """Brand voice and personality configuration."""
    tone: EXTENDED_TONES = Field(
        default="casual",
        description="Primary brand tone",
        examples=["competitive"]
    )
    personality_traits: List[str] = Field(
        default_factory=list,
        max_length=5,
        description="Personality traits that define the brand voice (max 5, each max 30 chars)",
        examples=[["Bold", "Energetic", "Authentic"]]
    )
    tagline: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Brand tagline or slogan",
        examples=["Level Up Your Stream"]
    )
    catchphrases: List[str] = Field(
        default_factory=list,
        max_length=10,
        description="Brand catchphrases and signature phrases (max 10, each max 50 chars)",
        examples=[["Let's gooo!", "GG everyone"]]
    )
    content_themes: List[str] = Field(
        default_factory=list,
        max_length=5,
        description="Core content themes and topics (max 5, each max 30 chars)",
        examples=[["Gaming", "Community", "Entertainment"]]
    )

    @field_validator('personality_traits')
    @classmethod
    def validate_personality_traits(cls, v: List[str]) -> List[str]:
        for trait in v:
            if len(trait) > 30:
                raise ValueError(f"Personality trait '{trait[:20]}...' exceeds 30 characters")
        return v

    @field_validator('catchphrases')
    @classmethod
    def validate_catchphrases(cls, v: List[str]) -> List[str]:
        for phrase in v:
            if len(phrase) > 50:
                raise ValueError(f"Catchphrase '{phrase[:20]}...' exceeds 50 characters")
        return v

    @field_validator('content_themes')
    @classmethod
    def validate_content_themes(cls, v: List[str]) -> List[str]:
        for theme in v:
            if len(theme) > 30:
                raise ValueError(f"Content theme '{theme[:20]}...' exceeds 30 characters")
        return v

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "tone": "competitive",
                    "personality_traits": ["Bold", "Energetic", "Authentic"],
                    "tagline": "Level Up Your Stream",
                    "catchphrases": ["Let's gooo!", "GG everyone", "Stay awesome"],
                    "content_themes": ["Gaming", "Community", "Entertainment"]
                }
            ]
        }
    }


# ============================================================================
# SECTION 4: Streamer Assets
# ============================================================================

class OverlayAsset(BaseModel):
    """Overlay asset for stream scenes."""
    id: str = Field(
        ...,
        description="Unique identifier for the overlay asset",
        examples=["overlay-001"]
    )
    url: str = Field(
        ...,
        description="URL to the overlay asset file",
        examples=["https://cdn.streamerstudio.com/overlays/starting-soon.png"]
    )
    overlay_type: Literal['starting_soon', 'brb', 'ending', 'gameplay'] = Field(
        ...,
        description="Type of overlay",
        examples=["starting_soon"]
    )
    duration_seconds: int = Field(
        ...,
        ge=1,
        le=300,
        description="Duration in seconds (1-300)",
        examples=[30]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "overlay-001",
                    "url": "https://cdn.streamerstudio.com/overlays/starting-soon.png",
                    "overlay_type": "starting_soon",
                    "duration_seconds": 30
                }
            ]
        }
    }


class AlertAsset(BaseModel):
    """Alert asset for stream notifications."""
    id: str = Field(
        ...,
        description="Unique identifier for the alert asset",
        examples=["alert-001"]
    )
    alert_type: Literal['follow', 'subscribe', 'donation', 'raid', 'bits', 'gift_sub'] = Field(
        ...,
        description="Type of alert",
        examples=["follow"]
    )
    image_url: str = Field(
        ...,
        description="URL to the alert image/animation",
        examples=["https://cdn.streamerstudio.com/alerts/follow.gif"]
    )
    sound_url: Optional[str] = Field(
        default=None,
        description="URL to the alert sound (optional)",
        examples=["https://cdn.streamerstudio.com/alerts/follow.mp3"]
    )
    duration_ms: int = Field(
        ...,
        ge=500,
        le=30000,
        description="Duration in milliseconds (500-30000)",
        examples=[3000]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "alert-001",
                    "alert_type": "follow",
                    "image_url": "https://cdn.streamerstudio.com/alerts/follow.gif",
                    "sound_url": "https://cdn.streamerstudio.com/alerts/follow.mp3",
                    "duration_ms": 3000
                }
            ]
        }
    }


class PanelAsset(BaseModel):
    """Panel asset for channel profile."""
    id: str = Field(
        ...,
        description="Unique identifier for the panel asset",
        examples=["panel-001"]
    )
    name: str = Field(
        ...,
        max_length=50,
        description="Name of the panel",
        examples=["About Me"]
    )
    image_url: str = Field(
        ...,
        description="URL to the panel image",
        examples=["https://cdn.streamerstudio.com/panels/about.png"]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "panel-001",
                    "name": "About Me",
                    "image_url": "https://cdn.streamerstudio.com/panels/about.png"
                }
            ]
        }
    }


class EmoteAsset(BaseModel):
    """Emote asset for channel subscribers."""
    id: str = Field(
        ...,
        description="Unique identifier for the emote",
        examples=["emote-001"]
    )
    name: str = Field(
        ...,
        max_length=30,
        description="Emote name/code",
        examples=["myHype"]
    )
    url: str = Field(
        ...,
        description="URL to the emote image",
        examples=["https://cdn.streamerstudio.com/emotes/hype.png"]
    )
    tier: Literal[1, 2, 3] = Field(
        ...,
        description="Subscriber tier required (1, 2, or 3)",
        examples=[1]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "emote-001",
                    "name": "myHype",
                    "url": "https://cdn.streamerstudio.com/emotes/hype.png",
                    "tier": 1
                }
            ]
        }
    }


class BadgeAsset(BaseModel):
    """Subscriber badge asset."""
    id: str = Field(
        ...,
        description="Unique identifier for the badge",
        examples=["badge-001"]
    )
    months: int = Field(
        ...,
        ge=1,
        le=120,
        description="Months of subscription required (1-120)",
        examples=[1]
    )
    url: str = Field(
        ...,
        description="URL to the badge image",
        examples=["https://cdn.streamerstudio.com/badges/1month.png"]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "badge-001",
                    "months": 1,
                    "url": "https://cdn.streamerstudio.com/badges/1month.png"
                }
            ]
        }
    }


class FacecamFrame(BaseModel):
    """Facecam frame/border asset."""
    id: str = Field(
        ...,
        description="Unique identifier for the facecam frame",
        examples=["facecam-001"]
    )
    url: str = Field(
        ...,
        description="URL to the facecam frame image",
        examples=["https://cdn.streamerstudio.com/facecam/frame.png"]
    )
    position: Literal['top-left', 'top-right', 'bottom-left', 'bottom-right'] = Field(
        ...,
        description="Default position of the facecam on screen",
        examples=["bottom-right"]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "facecam-001",
                    "url": "https://cdn.streamerstudio.com/facecam/frame.png",
                    "position": "bottom-right"
                }
            ]
        }
    }


class Stinger(BaseModel):
    """Stinger transition asset."""
    id: str = Field(
        ...,
        description="Unique identifier for the stinger",
        examples=["stinger-001"]
    )
    url: str = Field(
        ...,
        description="URL to the stinger video/animation",
        examples=["https://cdn.streamerstudio.com/stingers/transition.webm"]
    )
    duration_ms: int = Field(
        ...,
        ge=100,
        le=5000,
        description="Duration in milliseconds (100-5000)",
        examples=[500]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "stinger-001",
                    "url": "https://cdn.streamerstudio.com/stingers/transition.webm",
                    "duration_ms": 500
                }
            ]
        }
    }


class StreamerAssets(BaseModel):
    """Container for all streamer-specific assets."""
    overlays: List[OverlayAsset] = Field(
        default_factory=list,
        max_length=10,
        description="Stream overlay assets (max 10)"
    )
    alerts: List[AlertAsset] = Field(
        default_factory=list,
        max_length=20,
        description="Alert assets (max 20)"
    )
    panels: List[PanelAsset] = Field(
        default_factory=list,
        max_length=20,
        description="Channel panel assets (max 20)"
    )
    emotes: List[EmoteAsset] = Field(
        default_factory=list,
        max_length=50,
        description="Channel emotes (max 50)"
    )
    badges: List[BadgeAsset] = Field(
        default_factory=list,
        max_length=20,
        description="Subscriber badges (max 20)"
    )
    facecam_frame: Optional[FacecamFrame] = Field(
        default=None,
        description="Facecam frame/border"
    )
    stinger: Optional[Stinger] = Field(
        default=None,
        description="Scene transition stinger"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "overlays": [
                        {
                            "id": "overlay-001",
                            "url": "https://cdn.streamerstudio.com/overlays/starting-soon.png",
                            "overlay_type": "starting_soon",
                            "duration_seconds": 30
                        }
                    ],
                    "alerts": [
                        {
                            "id": "alert-001",
                            "alert_type": "follow",
                            "image_url": "https://cdn.streamerstudio.com/alerts/follow.gif",
                            "sound_url": "https://cdn.streamerstudio.com/alerts/follow.mp3",
                            "duration_ms": 3000
                        }
                    ],
                    "panels": [
                        {
                            "id": "panel-001",
                            "name": "About Me",
                            "image_url": "https://cdn.streamerstudio.com/panels/about.png"
                        }
                    ],
                    "emotes": [
                        {
                            "id": "emote-001",
                            "name": "myHype",
                            "url": "https://cdn.streamerstudio.com/emotes/hype.png",
                            "tier": 1
                        }
                    ],
                    "badges": [
                        {
                            "id": "badge-001",
                            "months": 1,
                            "url": "https://cdn.streamerstudio.com/badges/1month.png"
                        }
                    ],
                    "facecam_frame": {
                        "id": "facecam-001",
                        "url": "https://cdn.streamerstudio.com/facecam/frame.png",
                        "position": "bottom-right"
                    },
                    "stinger": {
                        "id": "stinger-001",
                        "url": "https://cdn.streamerstudio.com/stingers/transition.webm",
                        "duration_ms": 500
                    }
                }
            ]
        }
    }


class BrandGuidelines(BaseModel):
    """Brand guidelines and usage rules."""
    logo_min_size_px: int = Field(
        default=48,
        ge=16,
        le=512,
        description="Minimum logo size in pixels (16-512)",
        examples=[48]
    )
    logo_clear_space_ratio: float = Field(
        default=0.25,
        ge=0.1,
        le=1.0,
        description="Clear space around logo as ratio of logo size (0.1-1.0)",
        examples=[0.25]
    )
    primary_color_ratio: float = Field(
        default=60.0,
        ge=0,
        le=100,
        description="Recommended usage ratio for primary colors (percentage)",
        examples=[60.0]
    )
    secondary_color_ratio: float = Field(
        default=30.0,
        ge=0,
        le=100,
        description="Recommended usage ratio for secondary colors (percentage)",
        examples=[30.0]
    )
    accent_color_ratio: float = Field(
        default=10.0,
        ge=0,
        le=100,
        description="Recommended usage ratio for accent colors (percentage)",
        examples=[10.0]
    )
    prohibited_modifications: List[str] = Field(
        default_factory=list,
        max_length=10,
        description="List of prohibited logo/brand modifications (max 10)",
        examples=[["Stretching", "Color changes", "Adding effects"]]
    )
    style_do: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Description of recommended style practices",
        examples=["Use bold colors, maintain consistent spacing, keep designs clean"]
    )
    style_dont: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Description of style practices to avoid",
        examples=["Avoid cluttered layouts, don't use more than 3 colors at once"]
    )

    @model_validator(mode='after')
    def validate_color_ratios(self) -> 'BrandGuidelines':
        """Validate that color ratios sum to 100 or less."""
        total = self.primary_color_ratio + self.secondary_color_ratio + self.accent_color_ratio
        if total > 100:
            raise ValueError(
                f"Color ratios must sum to 100 or less. Current sum: {total}"
            )
        return self

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "logo_min_size_px": 48,
                    "logo_clear_space_ratio": 0.25,
                    "primary_color_ratio": 60.0,
                    "secondary_color_ratio": 30.0,
                    "accent_color_ratio": 10.0,
                    "prohibited_modifications": ["Stretching", "Color changes", "Adding effects"],
                    "style_do": "Use bold colors, maintain consistent spacing, keep designs clean",
                    "style_dont": "Avoid cluttered layouts, don't use more than 3 colors at once"
                }
            ]
        }
    }


class SocialProfile(BaseModel):
    """Social media profile link."""
    platform: str = Field(
        ...,
        max_length=50,
        description="Social media platform name",
        examples=["twitch"]
    )
    username: str = Field(
        ...,
        max_length=100,
        description="Username on the platform",
        examples=["mystreamer"]
    )
    url: str = Field(
        ...,
        description="Full URL to the profile",
        examples=["https://twitch.tv/mystreamer"]
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "platform": "twitch",
                    "username": "mystreamer",
                    "url": "https://twitch.tv/mystreamer"
                }
            ]
        }
    }


class SocialProfiles(BaseModel):
    """Container for social media profiles."""
    profiles: List[SocialProfile] = Field(
        default_factory=list,
        max_length=20,
        description="List of social media profiles (max 20)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "profiles": [
                        {
                            "platform": "twitch",
                            "username": "mystreamer",
                            "url": "https://twitch.tv/mystreamer"
                        },
                        {
                            "platform": "twitter",
                            "username": "mystreamer",
                            "url": "https://twitter.com/mystreamer"
                        },
                        {
                            "platform": "youtube",
                            "username": "MyStreamer",
                            "url": "https://youtube.com/@MyStreamer"
                        }
                    ]
                }
            ]
        }
    }


# ============================================================================
# Export all schemas
# ============================================================================

__all__ = [
    # Constants
    "HEX_PATTERN",
    "VALID_FONT_WEIGHTS",
    "EXTENDED_TONES",
    # Helper functions
    "is_valid_hex_color",
    "normalize_hex_color",
    # Section 1: Extended Color System
    "ExtendedColor",
    "GradientStop",
    "Gradient",
    "ColorPalette",
    # Section 2: Typography System
    "FontConfig",
    "Typography",
    # Section 3: Brand Voice
    "BrandVoice",
    # Section 4: Streamer Assets
    "OverlayAsset",
    "AlertAsset",
    "PanelAsset",
    "EmoteAsset",
    "BadgeAsset",
    "FacecamFrame",
    "Stinger",
    "StreamerAssets",
    "BrandGuidelines",
    "SocialProfile",
    "SocialProfiles",
]
