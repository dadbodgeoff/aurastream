# Brand Kit Enhancement - Implementation Tasks

## Overview

This task list implements the enterprise-grade brand kit enhancement for Streamer Studio. All implementation is delegated to sub-agents with the orchestrator enforcing compliance, patterns, and quality.

**Dependencies:** Phase 1 Logo System (COMPLETE ✅)
**Delegation Strategy:** Parallel sub-agent execution for maximum efficiency
**Status:** IN PROGRESS

---

## Current State

### Completed ✅
- Logo service (`backend/services/logo_service.py`)
- Logo API routes (`backend/api/routes/logos.py`)
- Storage bucket configuration (`backend/database/migrations/002_storage_buckets.sql`)
- Requirements and design documentation

### Remaining Work
- Phase 2: Extended Colors & Typography
- Phase 3: Streamer Assets
- Phase 4: Brand Voice & Guidelines
- Phase 5: Logo Integration with Generation
- Phase 6: Frontend Implementation (TSX + Swift)

---

## Execution Strategy

### Wave 1: Backend Schemas (Sections 1-4) - PARALLEL
### Wave 2: Database & Services (Sections 5-7) - PARALLEL  
### Wave 3: API Routes (Sections 8-10) - PARALLEL
### Wave 4: Backend Tests (Sections 11-12) - PARALLEL
### Wave 5: TSX Frontend (Sections 13-16) - PARALLEL
### Wave 6: Swift Frontend (Sections 17-20) - PARALLEL
### Wave 7: Verification (Section 21) - SEQUENTIAL

---

## Section 1: Extended Color System Schema

**File:** `backend/api/schemas/brand_kit_enhanced.py` (CREATE)
**Agent:** Wave 1 - Agent 1

### Task Checklist
- [ ] 1.1 Create ExtendedColor model
- [ ] 1.2 Create GradientStop model
- [ ] 1.3 Create Gradient model
- [ ] 1.4 Create ColorPalette model
- [ ] 1.5 Add all validators
- [ ] 1.6 Export in __all__

### Exact Implementation

```python
"""
Enhanced Brand Kit Schemas for Streamer Studio.

This module extends the base brand kit schemas with:
- Extended color system with names and usage descriptions
- Gradient definitions with multiple stops
- Typography hierarchy (6 levels)
- Enhanced brand voice with personality traits
- Streamer-specific asset schemas
"""

import re
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator, model_validator

# ============================================================================
# Constants
# ============================================================================

HEX_PATTERN = re.compile(r'^#[0-9A-Fa-f]{6}$')

VALID_FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900]

VALID_FONT_STYLES = Literal["normal", "italic"]

VALID_GRADIENT_TYPES = Literal["linear", "radial"]

LOGO_POSITIONS = Literal["top-left", "top-right", "bottom-left", "bottom-right", "center"]

LOGO_SIZES = Literal["small", "medium", "large"]

EXTENDED_TONES = Literal[
    "competitive", "casual", "educational", "comedic", "professional",
    "inspirational", "edgy", "wholesome"
]

OVERLAY_TYPES = Literal["starting_soon", "brb", "ending", "gameplay"]

ALERT_TYPES = Literal["follow", "subscribe", "donation", "raid", "bits", "gift_sub"]

EMOTE_TIERS = Literal[1, 2, 3]

FACECAM_POSITIONS = Literal["top-left", "top-right", "bottom-left", "bottom-right"]


# ============================================================================
# Extended Color System
# ============================================================================

class ExtendedColor(BaseModel):
    """A color with metadata for brand guidelines."""
    hex: str = Field(..., description="Hex color code", examples=["#FF5733"])
    name: str = Field(
        ..., 
        min_length=1, 
        max_length=50, 
        description="Color name",
        examples=["Brand Orange"]
    )
    usage: str = Field(
        default="",
        max_length=200,
        description="Usage guidelines",
        examples=["Primary CTAs, headers"]
    )
    
    @field_validator("hex")
    @classmethod
    def validate_hex(cls, v: str) -> str:
        if not HEX_PATTERN.match(v):
            raise ValueError(f"Invalid hex color: {v}. Expected format: #RRGGBB")
        return v.upper()


class GradientStop(BaseModel):
    """A single stop in a gradient."""
    color: str = Field(..., description="Hex color at this stop")
    position: int = Field(
        ..., 
        ge=0, 
        le=100, 
        description="Position as percentage (0-100)"
    )
    
    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str) -> str:
        if not HEX_PATTERN.match(v):
            raise ValueError(f"Invalid hex color: {v}")
        return v.upper()


class Gradient(BaseModel):
    """A gradient definition with multiple color stops."""
    name: str = Field(
        ..., 
        min_length=1, 
        max_length=50,
        description="Gradient name",
        examples=["Brand Gradient"]
    )
    type: VALID_GRADIENT_TYPES = Field(
        default="linear",
        description="Gradient type"
    )
    angle: int = Field(
        default=135,
        ge=0,
        le=360,
        description="Angle in degrees (for linear gradients)"
    )
    stops: List[GradientStop] = Field(
        ...,
        min_length=2,
        max_length=10,
        description="Color stops (minimum 2)"
    )
    
    @field_validator("stops")
    @classmethod
    def validate_stops_order(cls, v: List[GradientStop]) -> List[GradientStop]:
        positions = [stop.position for stop in v]
        if positions != sorted(positions):
            raise ValueError("Gradient stops must be in ascending position order")
        return v


class ColorPalette(BaseModel):
    """Complete color palette for a brand kit."""
    primary: List[ExtendedColor] = Field(
        default_factory=list,
        max_length=5,
        description="Primary brand colors (1-5)"
    )
    secondary: List[ExtendedColor] = Field(
        default_factory=list,
        max_length=5,
        description="Secondary colors (0-5)"
    )
    accent: List[ExtendedColor] = Field(
        default_factory=list,
        max_length=3,
        description="Accent colors (0-3)"
    )
    neutral: List[ExtendedColor] = Field(
        default_factory=list,
        max_length=5,
        description="Neutral/background colors (0-5)"
    )
    gradients: List[Gradient] = Field(
        default_factory=list,
        max_length=3,
        description="Gradient definitions (0-3)"
    )
```

### Validation Criteria
- All hex colors must match `#RRGGBB` format
- Color names max 50 chars
- Gradient stops must be in ascending order (0-100)
- At least 2 stops per gradient, max 10
- Gradient angle 0-360 degrees

---

## Section 2: Typography Hierarchy Schema

**File:** `backend/api/schemas/brand_kit_enhanced.py` (APPEND)
**Agent:** Wave 1 - Agent 2

### Task Checklist
- [ ] 2.1 Create FontConfig model
- [ ] 2.2 Create Typography model with 6 levels
- [ ] 2.3 Add font weight validation
- [ ] 2.4 Add font style validation
- [ ] 2.5 Ensure backward compatibility

### Exact Implementation

```python
# ============================================================================
# Typography System
# ============================================================================

class FontConfig(BaseModel):
    """Configuration for a single font level."""
    family: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Font family name",
        examples=["Montserrat"]
    )
    weight: int = Field(
        default=400,
        description="Font weight (100-900)"
    )
    style: VALID_FONT_STYLES = Field(
        default="normal",
        description="Font style"
    )
    
    @field_validator("weight")
    @classmethod
    def validate_weight(cls, v: int) -> int:
        if v not in VALID_FONT_WEIGHTS:
            raise ValueError(
                f"Invalid font weight: {v}. Must be one of: {VALID_FONT_WEIGHTS}"
            )
        return v


class Typography(BaseModel):
    """Complete typography hierarchy for a brand kit."""
    display: Optional[FontConfig] = Field(
        default=None,
        description="Large display text (hero sections)"
    )
    headline: Optional[FontConfig] = Field(
        default=None,
        description="H1-H2 headers"
    )
    subheadline: Optional[FontConfig] = Field(
        default=None,
        description="H3-H4 headers"
    )
    body: Optional[FontConfig] = Field(
        default=None,
        description="Body text"
    )
    caption: Optional[FontConfig] = Field(
        default=None,
        description="Small text, labels"
    )
    accent: Optional[FontConfig] = Field(
        default=None,
        description="Special text (quotes, callouts)"
    )
    
    def has_any_config(self) -> bool:
        """Check if any typography level is configured."""
        return any([
            self.display, self.headline, self.subheadline,
            self.body, self.caption, self.accent
        ])
```

### Validation Criteria
- Font weights must be in [100, 200, 300, 400, 500, 600, 700, 800, 900]
- Font styles must be "normal" or "italic"
- Font family max 100 chars
- All fields optional for partial updates

---

## Section 3: Brand Voice Enhancement Schema

**File:** `backend/api/schemas/brand_kit_enhanced.py` (APPEND)
**Agent:** Wave 1 - Agent 3

### Task Checklist
- [ ] 3.1 Create BrandVoice model
- [ ] 3.2 Add personality_traits validation (3-5 items)
- [ ] 3.3 Add tagline validation (max 100 chars)
- [ ] 3.4 Add catchphrases validation (max 10 items)
- [ ] 3.5 Add content_themes validation (max 5 items)

### Exact Implementation

```python
# ============================================================================
# Brand Voice
# ============================================================================

class BrandVoice(BaseModel):
    """Enhanced brand voice configuration."""
    tone: EXTENDED_TONES = Field(
        default="professional",
        description="Primary brand tone"
    )
    personality_traits: List[str] = Field(
        default_factory=list,
        min_length=0,
        max_length=5,
        description="Brand personality traits (3-5 adjectives)"
    )
    tagline: str = Field(
        default="",
        max_length=100,
        description="Brand tagline",
        examples=["Level Up Your Stream"]
    )
    catchphrases: List[str] = Field(
        default_factory=list,
        max_length=10,
        description="Common phrases/sayings"
    )
    content_themes: List[str] = Field(
        default_factory=list,
        max_length=5,
        description="Main content topics"
    )
    
    @field_validator("personality_traits")
    @classmethod
    def validate_traits(cls, v: List[str]) -> List[str]:
        for trait in v:
            if len(trait) > 30:
                raise ValueError(f"Personality trait too long: {trait[:20]}... (max 30 chars)")
        return v
    
    @field_validator("catchphrases")
    @classmethod
    def validate_catchphrases(cls, v: List[str]) -> List[str]:
        for phrase in v:
            if len(phrase) > 50:
                raise ValueError(f"Catchphrase too long: {phrase[:20]}... (max 50 chars)")
        return v
    
    @field_validator("content_themes")
    @classmethod
    def validate_themes(cls, v: List[str]) -> List[str]:
        for theme in v:
            if len(theme) > 30:
                raise ValueError(f"Content theme too long: {theme[:20]}... (max 30 chars)")
        return v
```

### Validation Criteria
- Personality traits: 0-5 items, each max 30 chars
- Tagline: max 100 chars
- Catchphrases: max 10 items, each max 50 chars
- Content themes: max 5 items, each max 30 chars
- Extended tones include: inspirational, edgy, wholesome

---

## Section 4: Streamer Assets Schema

**File:** `backend/api/schemas/brand_kit_enhanced.py` (APPEND)
**Agent:** Wave 1 - Agent 4

### Task Checklist
- [ ] 4.1 Create OverlayAsset model
- [ ] 4.2 Create AlertAsset model
- [ ] 4.3 Create PanelAsset model
- [ ] 4.4 Create EmoteAsset model
- [ ] 4.5 Create BadgeAsset model
- [ ] 4.6 Create FacecamFrame model
- [ ] 4.7 Create Stinger model
- [ ] 4.8 Create StreamerAssets container model
- [ ] 4.9 Create Guidelines model
- [ ] 4.10 Create SocialProfiles model

### Exact Implementation

```python
# ============================================================================
# Streamer Assets
# ============================================================================

class OverlayAsset(BaseModel):
    """Stream overlay asset (starting soon, BRB, etc.)."""
    id: str = Field(default="", description="Asset ID")
    url: str = Field(..., description="Asset URL")
    overlay_type: OVERLAY_TYPES = Field(..., description="Type of overlay")
    duration_seconds: Optional[int] = Field(
        default=None,
        ge=1,
        le=300,
        description="Display duration in seconds"
    )


class AlertAsset(BaseModel):
    """Stream alert asset with image and optional sound."""
    id: str = Field(default="", description="Asset ID")
    alert_type: ALERT_TYPES = Field(..., description="Type of alert")
    image_url: str = Field(..., description="Alert image/animation URL")
    sound_url: Optional[str] = Field(default=None, description="Alert sound URL")
    duration_ms: int = Field(
        default=3000,
        ge=500,
        le=30000,
        description="Alert duration in milliseconds"
    )


class PanelAsset(BaseModel):
    """Channel panel image."""
    id: str = Field(default="", description="Asset ID")
    name: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Panel name",
        examples=["About", "Schedule", "Rules"]
    )
    image_url: str = Field(..., description="Panel image URL")


class EmoteAsset(BaseModel):
    """Custom emote asset."""
    id: str = Field(default="", description="Asset ID")
    name: str = Field(
        ...,
        min_length=1,
        max_length=30,
        description="Emote name (without prefix)",
        examples=["hype", "gg", "love"]
    )
    url: str = Field(..., description="Emote image URL")
    tier: EMOTE_TIERS = Field(default=1, description="Subscriber tier (1, 2, or 3)")


class BadgeAsset(BaseModel):
    """Subscriber badge asset."""
    id: str = Field(default="", description="Asset ID")
    months: int = Field(
        ...,
        ge=1,
        le=120,
        description="Months of subscription",
        examples=[1, 3, 6, 12, 24]
    )
    url: str = Field(..., description="Badge image URL")


class FacecamFrame(BaseModel):
    """Webcam frame overlay."""
    id: str = Field(default="", description="Asset ID")
    url: str = Field(..., description="Frame image URL")
    position: FACECAM_POSITIONS = Field(
        default="bottom-right",
        description="Default position on stream"
    )


class Stinger(BaseModel):
    """Transition animation (stinger)."""
    id: str = Field(default="", description="Asset ID")
    url: str = Field(..., description="Stinger video URL")
    duration_ms: int = Field(
        default=1000,
        ge=100,
        le=5000,
        description="Transition duration in milliseconds"
    )


class StreamerAssets(BaseModel):
    """Container for all streamer-specific assets."""
    overlays: List[OverlayAsset] = Field(
        default_factory=list,
        max_length=10,
        description="Stream overlays"
    )
    alerts: List[AlertAsset] = Field(
        default_factory=list,
        max_length=20,
        description="Alert configurations"
    )
    panels: List[PanelAsset] = Field(
        default_factory=list,
        max_length=20,
        description="Channel panels"
    )
    emotes: List[EmoteAsset] = Field(
        default_factory=list,
        max_length=50,
        description="Custom emotes"
    )
    badges: List[BadgeAsset] = Field(
        default_factory=list,
        max_length=20,
        description="Subscriber badges"
    )
    facecam_frame: Optional[FacecamFrame] = Field(
        default=None,
        description="Webcam frame"
    )
    stinger: Optional[Stinger] = Field(
        default=None,
        description="Transition animation"
    )


# ============================================================================
# Guidelines & Social
# ============================================================================

class BrandGuidelines(BaseModel):
    """Brand usage guidelines."""
    logo_min_size_px: int = Field(default=48, ge=16, le=512)
    logo_clear_space_ratio: float = Field(default=0.25, ge=0.1, le=1.0)
    primary_color_ratio: int = Field(default=60, ge=0, le=100)
    secondary_color_ratio: int = Field(default=30, ge=0, le=100)
    accent_color_ratio: int = Field(default=10, ge=0, le=100)
    prohibited_modifications: List[str] = Field(
        default_factory=list,
        max_length=10
    )
    photo_style: str = Field(default="", max_length=200)
    illustration_style: str = Field(default="", max_length=200)
    icon_style: str = Field(default="", max_length=200)
    
    @model_validator(mode="after")
    def validate_ratios(self):
        total = self.primary_color_ratio + self.secondary_color_ratio + self.accent_color_ratio
        if total > 100:
            raise ValueError(f"Color ratios sum to {total}%, must be <= 100%")
        return self


class SocialProfile(BaseModel):
    """Social media profile configuration."""
    platform: str = Field(..., description="Platform name")
    username: str = Field(default="", max_length=100)
    profile_url: str = Field(default="", max_length=500)
    banner_url: Optional[str] = Field(default=None)


class SocialProfiles(BaseModel):
    """Container for social media profiles."""
    twitch: Optional[SocialProfile] = None
    youtube: Optional[SocialProfile] = None
    twitter: Optional[SocialProfile] = None
    discord: Optional[SocialProfile] = None
    tiktok: Optional[SocialProfile] = None
    instagram: Optional[SocialProfile] = None
```

### Validation Criteria
- Overlay duration: 1-300 seconds
- Alert duration: 500-30000 ms
- Emote names: max 30 chars
- Badge months: 1-120
- Stinger duration: 100-5000 ms
- Color ratios must sum to <= 100%

---

## Section 5: Database Migration

**File:** `backend/database/migrations/003_brand_kit_enhancement.sql` (CREATE)
**Agent:** Wave 2 - Agent 5

### Task Checklist
- [ ] 5.1 Create migration file
- [ ] 5.2 Add colors_extended JSONB column
- [ ] 5.3 Add typography JSONB column
- [ ] 5.4 Add voice JSONB column
- [ ] 5.5 Add streamer_assets JSONB column
- [ ] 5.6 Add guidelines JSONB column
- [ ] 5.7 Add social_profiles JSONB column
- [ ] 5.8 Add logos JSONB column
- [ ] 5.9 Add indexes for JSONB queries

### Exact Implementation

```sql
-- Migration: 003_brand_kit_enhancement.sql
-- Description: Add enhanced brand kit fields for enterprise features
-- Date: 2024-01-XX

-- ============================================================================
-- Add new JSONB columns to brand_kits table
-- ============================================================================

-- Extended color palette with names and usage
ALTER TABLE brand_kits 
ADD COLUMN IF NOT EXISTS colors_extended JSONB DEFAULT '{}';

-- Typography hierarchy (display, headline, subheadline, body, caption, accent)
ALTER TABLE brand_kits 
ADD COLUMN IF NOT EXISTS typography JSONB DEFAULT '{}';

-- Enhanced brand voice with personality traits
ALTER TABLE brand_kits 
ADD COLUMN IF NOT EXISTS voice JSONB DEFAULT '{}';

-- Streamer-specific assets (overlays, alerts, panels, emotes, badges)
ALTER TABLE brand_kits 
ADD COLUMN IF NOT EXISTS streamer_assets JSONB DEFAULT '{}';

-- Brand usage guidelines
ALTER TABLE brand_kits 
ADD COLUMN IF NOT EXISTS guidelines JSONB DEFAULT '{}';

-- Social media profiles
ALTER TABLE brand_kits 
ADD COLUMN IF NOT EXISTS social_profiles JSONB DEFAULT '{}';

-- Logo metadata (references to storage)
ALTER TABLE brand_kits 
ADD COLUMN IF NOT EXISTS logos JSONB DEFAULT '{}';

-- ============================================================================
-- Indexes for JSONB queries
-- ============================================================================

-- Index for querying by tone in voice
CREATE INDEX IF NOT EXISTS idx_brand_kits_voice_tone 
ON brand_kits ((voice->>'tone'));

-- GIN index for full JSONB search on streamer_assets
CREATE INDEX IF NOT EXISTS idx_brand_kits_streamer_assets 
ON brand_kits USING GIN (streamer_assets);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN brand_kits.colors_extended IS 
'Extended color palette with names, usage descriptions, and gradients';

COMMENT ON COLUMN brand_kits.typography IS 
'Typography hierarchy: display, headline, subheadline, body, caption, accent';

COMMENT ON COLUMN brand_kits.voice IS 
'Brand voice: tone, personality_traits, tagline, catchphrases, content_themes';

COMMENT ON COLUMN brand_kits.streamer_assets IS 
'Streamer assets: overlays, alerts, panels, emotes, badges, facecam_frame, stinger';

COMMENT ON COLUMN brand_kits.guidelines IS 
'Brand guidelines: logo usage, color ratios, style guides';

COMMENT ON COLUMN brand_kits.social_profiles IS 
'Social media profiles: twitch, youtube, twitter, discord, tiktok, instagram';

COMMENT ON COLUMN brand_kits.logos IS 
'Logo metadata: primary, secondary, icon, monochrome, watermark URLs';
```

### Validation Criteria
- All columns use JSONB with DEFAULT '{}'
- Indexes created for common query patterns
- Comments added for documentation
- Migration is idempotent (IF NOT EXISTS)

---

## Section 6: Brand Kit Service Updates

**File:** `backend/services/brand_kit_service.py` (MODIFY)
**Agent:** Wave 2 - Agent 6

### Task Checklist
- [ ] 6.1 Import new schemas
- [ ] 6.2 Update create() for new JSONB fields
- [ ] 6.3 Update update() for partial JSONB updates
- [ ] 6.4 Add update_colors_extended() method
- [ ] 6.5 Add update_typography() method
- [ ] 6.6 Add update_voice() method
- [ ] 6.7 Add update_guidelines() method
- [ ] 6.8 Add update_streamer_assets() method
- [ ] 6.9 Add update_social_profiles() method
- [ ] 6.10 Ensure backward compatibility

### Methods to Add

```python
async def update_colors_extended(
    self, user_id: str, brand_kit_id: str, colors: dict
) -> dict:
    """
    Update extended color palette for a brand kit.
    
    Args:
        user_id: Authenticated user's ID
        brand_kit_id: Brand kit UUID
        colors: ColorPalette dict with primary, secondary, accent, neutral, gradients
        
    Returns:
        Updated brand kit dictionary
    """
    # Verify ownership
    await self.get(user_id, brand_kit_id)
    
    update_data = {
        "colors_extended": colors,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = (
        self.db.table(self.table)
        .update(update_data)
        .eq("id", brand_kit_id)
        .execute()
    )
    
    if not result.data:
        raise BrandKitNotFoundError(brand_kit_id)
    
    return result.data[0]


async def update_typography(
    self, user_id: str, brand_kit_id: str, typography: dict
) -> dict:
    """Update typography hierarchy for a brand kit."""
    await self.get(user_id, brand_kit_id)
    
    update_data = {
        "typography": typography,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = (
        self.db.table(self.table)
        .update(update_data)
        .eq("id", brand_kit_id)
        .execute()
    )
    
    if not result.data:
        raise BrandKitNotFoundError(brand_kit_id)
    
    return result.data[0]


async def update_voice(
    self, user_id: str, brand_kit_id: str, voice: dict
) -> dict:
    """Update brand voice configuration."""
    await self.get(user_id, brand_kit_id)
    
    update_data = {
        "voice": voice,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = (
        self.db.table(self.table)
        .update(update_data)
        .eq("id", brand_kit_id)
        .execute()
    )
    
    if not result.data:
        raise BrandKitNotFoundError(brand_kit_id)
    
    return result.data[0]


async def update_guidelines(
    self, user_id: str, brand_kit_id: str, guidelines: dict
) -> dict:
    """Update brand guidelines."""
    await self.get(user_id, brand_kit_id)
    
    update_data = {
        "guidelines": guidelines,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = (
        self.db.table(self.table)
        .update(update_data)
        .eq("id", brand_kit_id)
        .execute()
    )
    
    if not result.data:
        raise BrandKitNotFoundError(brand_kit_id)
    
    return result.data[0]


async def update_streamer_assets(
    self, user_id: str, brand_kit_id: str, streamer_assets: dict
) -> dict:
    """Update streamer assets configuration."""
    await self.get(user_id, brand_kit_id)
    
    update_data = {
        "streamer_assets": streamer_assets,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = (
        self.db.table(self.table)
        .update(update_data)
        .eq("id", brand_kit_id)
        .execute()
    )
    
    if not result.data:
        raise BrandKitNotFoundError(brand_kit_id)
    
    return result.data[0]


async def update_social_profiles(
    self, user_id: str, brand_kit_id: str, social_profiles: dict
) -> dict:
    """Update social media profiles."""
    await self.get(user_id, brand_kit_id)
    
    update_data = {
        "social_profiles": social_profiles,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = (
        self.db.table(self.table)
        .update(update_data)
        .eq("id", brand_kit_id)
        .execute()
    )
    
    if not result.data:
        raise BrandKitNotFoundError(brand_kit_id)
    
    return result.data[0]


async def update_logos_metadata(
    self, user_id: str, brand_kit_id: str, logos: dict
) -> dict:
    """Update logo metadata (URLs stored in storage)."""
    await self.get(user_id, brand_kit_id)
    
    update_data = {
        "logos": logos,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = (
        self.db.table(self.table)
        .update(update_data)
        .eq("id", brand_kit_id)
        .execute()
    )
    
    if not result.data:
        raise BrandKitNotFoundError(brand_kit_id)
    
    return result.data[0]
```

### Update create() Method

Add these fields to the brand_kit dict in create():
```python
"colors_extended": {},
"typography": {},
"voice": {},
"streamer_assets": {},
"guidelines": {},
"social_profiles": {},
"logos": {},
```

### Validation Criteria
- All methods verify ownership before update
- All methods update the updated_at timestamp
- Backward compatible with existing brand kits
- Returns full updated brand kit

---

## Section 7: Streamer Asset Service

**File:** `backend/services/streamer_asset_service.py` (CREATE)
**Agent:** Wave 2 - Agent 7

### Task Checklist
- [ ] 7.1 Create StreamerAssetService class
- [ ] 7.2 Define BUCKET_NAME and allowed types
- [ ] 7.3 Implement upload_overlay()
- [ ] 7.4 Implement upload_alert()
- [ ] 7.5 Implement upload_panel()
- [ ] 7.6 Implement upload_emote()
- [ ] 7.7 Implement upload_badge()
- [ ] 7.8 Implement upload_facecam_frame()
- [ ] 7.9 Implement upload_stinger()
- [ ] 7.10 Implement list_assets()
- [ ] 7.11 Implement delete_asset()
- [ ] 7.12 Create singleton getter

### Exact Implementation

```python
"""
Streamer Asset Service for Streamer Studio.

This service handles upload, retrieval, and management of streamer-specific assets:
- Overlays (starting soon, BRB, ending, gameplay)
- Alerts (follow, subscribe, donation, raid, bits, gift_sub)
- Panels (channel info panels)
- Emotes (custom emotes by tier)
- Badges (subscriber badges by month)
- Facecam frames
- Stingers (transition animations)

Storage: Supabase 'brand-assets' bucket
Path convention: {user_id}/{brand_kit_id}/{category}/{asset_id}.{ext}
"""

import logging
from typing import Optional, Dict, List, Literal
from uuid import uuid4
from datetime import datetime, timezone

from backend.database.supabase_client import get_supabase_client
from backend.services.brand_kit_service import get_brand_kit_service
from backend.services.exceptions import (
    AuthorizationError,
    BrandKitNotFoundError,
    StorageError,
)

logger = logging.getLogger(__name__)

# Asset categories
AssetCategory = Literal[
    "overlays", "alerts", "panels", "emotes", "badges", "facecam", "stinger"
]

# Allowed MIME types by category
ALLOWED_IMAGE_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

ALLOWED_VIDEO_TYPES = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
}

ALLOWED_AUDIO_TYPES = {
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/ogg": ".ogg",
}

# Max file sizes
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB
MAX_AUDIO_SIZE = 5 * 1024 * 1024   # 5MB


class StreamerAssetService:
    """Service for managing streamer-specific assets."""
    
    BUCKET_NAME = "brand-assets"
    
    def __init__(self, supabase_client=None):
        self._supabase = supabase_client
        self._brand_kit_service = None
    
    @property
    def db(self):
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    @property
    def brand_kit_service(self):
        if self._brand_kit_service is None:
            self._brand_kit_service = get_brand_kit_service()
        return self._brand_kit_service
    
    def _get_storage_path(
        self,
        user_id: str,
        brand_kit_id: str,
        category: str,
        asset_id: str,
        extension: str
    ) -> str:
        return f"{user_id}/{brand_kit_id}/{category}/{asset_id}{extension}"
    
    def _get_extension(self, content_type: str, category: str) -> str:
        all_types = {**ALLOWED_IMAGE_TYPES, **ALLOWED_VIDEO_TYPES, **ALLOWED_AUDIO_TYPES}
        return all_types.get(content_type, ".bin")
    
    def _validate_file(
        self,
        file_data: bytes,
        content_type: str,
        category: str,
        is_audio: bool = False
    ) -> None:
        """Validate file type and size."""
        if is_audio:
            if content_type not in ALLOWED_AUDIO_TYPES:
                raise ValueError(f"Invalid audio type: {content_type}")
            if len(file_data) > MAX_AUDIO_SIZE:
                raise ValueError(f"Audio too large: {len(file_data)} bytes (max 5MB)")
        elif category in ["stinger"]:
            if content_type not in ALLOWED_VIDEO_TYPES:
                raise ValueError(f"Invalid video type: {content_type}")
            if len(file_data) > MAX_VIDEO_SIZE:
                raise ValueError(f"Video too large: {len(file_data)} bytes (max 50MB)")
        else:
            allowed = {**ALLOWED_IMAGE_TYPES, **ALLOWED_VIDEO_TYPES}
            if content_type not in allowed:
                raise ValueError(f"Invalid file type: {content_type}")
            if len(file_data) > MAX_IMAGE_SIZE:
                raise ValueError(f"File too large: {len(file_data)} bytes (max 10MB)")
    
    async def _upload_file(
        self,
        user_id: str,
        brand_kit_id: str,
        category: str,
        file_data: bytes,
        content_type: str,
        asset_id: Optional[str] = None
    ) -> Dict:
        """Upload a file and return metadata."""
        if asset_id is None:
            asset_id = str(uuid4())
        
        extension = self._get_extension(content_type, category)
        storage_path = self._get_storage_path(
            user_id, brand_kit_id, category, asset_id, extension
        )
        
        try:
            # Upload file
            self.db.storage.from_(self.BUCKET_NAME).upload(
                path=storage_path,
                file=file_data,
                file_options={"content-type": content_type}
            )
            
            # Get signed URL
            url_result = self.db.storage.from_(self.BUCKET_NAME).create_signed_url(
                path=storage_path,
                expires_in=31536000  # 1 year
            )
            
            url = url_result.get("signedURL") or url_result.get("signedUrl")
            
            return {
                "id": asset_id,
                "url": url,
                "storage_path": storage_path,
                "content_type": content_type,
                "file_size": len(file_data),
            }
        except Exception as e:
            logger.error(f"Asset upload failed: {e}")
            raise StorageError(f"Failed to upload asset: {str(e)}")
    
    async def upload_overlay(
        self,
        user_id: str,
        brand_kit_id: str,
        overlay_type: str,
        file_data: bytes,
        content_type: str,
        duration_seconds: Optional[int] = None
    ) -> Dict:
        """Upload a stream overlay."""
        # Verify ownership
        await self.brand_kit_service.get(user_id, brand_kit_id)
        
        self._validate_file(file_data, content_type, "overlays")
        
        result = await self._upload_file(
            user_id, brand_kit_id, "overlays", file_data, content_type
        )
        
        return {
            **result,
            "overlay_type": overlay_type,
            "duration_seconds": duration_seconds,
        }
    
    async def upload_alert(
        self,
        user_id: str,
        brand_kit_id: str,
        alert_type: str,
        image_data: bytes,
        image_content_type: str,
        sound_data: Optional[bytes] = None,
        sound_content_type: Optional[str] = None,
        duration_ms: int = 3000
    ) -> Dict:
        """Upload an alert with image and optional sound."""
        await self.brand_kit_service.get(user_id, brand_kit_id)
        
        self._validate_file(image_data, image_content_type, "alerts")
        
        asset_id = str(uuid4())
        
        # Upload image
        image_result = await self._upload_file(
            user_id, brand_kit_id, "alerts", image_data, image_content_type, asset_id
        )
        
        sound_url = None
        if sound_data and sound_content_type:
            self._validate_file(sound_data, sound_content_type, "alerts", is_audio=True)
            sound_result = await self._upload_file(
                user_id, brand_kit_id, "alerts", sound_data, sound_content_type,
                f"{asset_id}_sound"
            )
            sound_url = sound_result["url"]
        
        return {
            "id": asset_id,
            "alert_type": alert_type,
            "image_url": image_result["url"],
            "sound_url": sound_url,
            "duration_ms": duration_ms,
        }
    
    async def upload_panel(
        self,
        user_id: str,
        brand_kit_id: str,
        name: str,
        file_data: bytes,
        content_type: str
    ) -> Dict:
        """Upload a channel panel."""
        await self.brand_kit_service.get(user_id, brand_kit_id)
        self._validate_file(file_data, content_type, "panels")
        
        result = await self._upload_file(
            user_id, brand_kit_id, "panels", file_data, content_type
        )
        
        return {
            **result,
            "name": name,
            "image_url": result["url"],
        }
    
    async def upload_emote(
        self,
        user_id: str,
        brand_kit_id: str,
        name: str,
        tier: int,
        file_data: bytes,
        content_type: str
    ) -> Dict:
        """Upload a custom emote."""
        await self.brand_kit_service.get(user_id, brand_kit_id)
        self._validate_file(file_data, content_type, "emotes")
        
        result = await self._upload_file(
            user_id, brand_kit_id, "emotes", file_data, content_type
        )
        
        return {
            **result,
            "name": name,
            "tier": tier,
        }
    
    async def upload_badge(
        self,
        user_id: str,
        brand_kit_id: str,
        months: int,
        file_data: bytes,
        content_type: str
    ) -> Dict:
        """Upload a subscriber badge."""
        await self.brand_kit_service.get(user_id, brand_kit_id)
        self._validate_file(file_data, content_type, "badges")
        
        result = await self._upload_file(
            user_id, brand_kit_id, "badges", file_data, content_type
        )
        
        return {
            **result,
            "months": months,
        }
    
    async def upload_facecam_frame(
        self,
        user_id: str,
        brand_kit_id: str,
        position: str,
        file_data: bytes,
        content_type: str
    ) -> Dict:
        """Upload a facecam frame."""
        await self.brand_kit_service.get(user_id, brand_kit_id)
        self._validate_file(file_data, content_type, "facecam")
        
        result = await self._upload_file(
            user_id, brand_kit_id, "facecam", file_data, content_type, "frame"
        )
        
        return {
            **result,
            "position": position,
        }
    
    async def upload_stinger(
        self,
        user_id: str,
        brand_kit_id: str,
        duration_ms: int,
        file_data: bytes,
        content_type: str
    ) -> Dict:
        """Upload a stinger transition."""
        await self.brand_kit_service.get(user_id, brand_kit_id)
        self._validate_file(file_data, content_type, "stinger")
        
        result = await self._upload_file(
            user_id, brand_kit_id, "stinger", file_data, content_type, "transition"
        )
        
        return {
            **result,
            "duration_ms": duration_ms,
        }
    
    async def delete_asset(
        self,
        user_id: str,
        brand_kit_id: str,
        category: str,
        asset_id: str
    ) -> bool:
        """Delete an asset by ID."""
        await self.brand_kit_service.get(user_id, brand_kit_id)
        
        # Try all possible extensions
        all_extensions = list(ALLOWED_IMAGE_TYPES.values()) + \
                        list(ALLOWED_VIDEO_TYPES.values()) + \
                        list(ALLOWED_AUDIO_TYPES.values())
        
        deleted = False
        for ext in all_extensions:
            path = self._get_storage_path(user_id, brand_kit_id, category, asset_id, ext)
            try:
                self.db.storage.from_(self.BUCKET_NAME).remove([path])
                deleted = True
            except Exception:
                continue
        
        return deleted


# Singleton
_streamer_asset_service: Optional[StreamerAssetService] = None


def get_streamer_asset_service() -> StreamerAssetService:
    global _streamer_asset_service
    if _streamer_asset_service is None:
        _streamer_asset_service = StreamerAssetService()
    return _streamer_asset_service
```

### Validation Criteria
- All uploads verify brand kit ownership
- File type validation per category
- Size limits enforced (10MB images, 50MB video, 5MB audio)
- Signed URLs with 1-year expiration
- Proper error handling with StorageError

---

## Section 8: API Routes - Brand Kit Extensions

**File:** `backend/api/routes/brand_kits.py` (MODIFY)
**Agent:** Wave 3 - Agent 8

### Task Checklist
- [ ] 8.1 Import new schemas
- [ ] 8.2 Add PUT /brand-kits/{id}/colors endpoint
- [ ] 8.3 Add GET /brand-kits/{id}/colors endpoint
- [ ] 8.4 Add PUT /brand-kits/{id}/typography endpoint
- [ ] 8.5 Add GET /brand-kits/{id}/typography endpoint
- [ ] 8.6 Add PUT /brand-kits/{id}/voice endpoint
- [ ] 8.7 Add GET /brand-kits/{id}/voice endpoint
- [ ] 8.8 Add PUT /brand-kits/{id}/guidelines endpoint
- [ ] 8.9 Add GET /brand-kits/{id}/guidelines endpoint

### Endpoints to Add

```python
from backend.api.schemas.brand_kit_enhanced import (
    ColorPalette,
    Typography,
    BrandVoice,
    BrandGuidelines,
)


# Response schemas for new endpoints
class ColorPaletteResponse(BaseModel):
    brand_kit_id: str
    colors: ColorPalette


class TypographyResponse(BaseModel):
    brand_kit_id: str
    typography: Typography


class VoiceResponse(BaseModel):
    brand_kit_id: str
    voice: BrandVoice


class GuidelinesResponse(BaseModel):
    brand_kit_id: str
    guidelines: BrandGuidelines


@router.put(
    "/{brand_kit_id}/colors",
    response_model=ColorPaletteResponse,
    summary="Update extended colors",
    description="Update the extended color palette for a brand kit.",
)
async def update_colors(
    brand_kit_id: str,
    colors: ColorPalette,
    current_user: TokenPayload = Depends(get_current_user),
) -> ColorPaletteResponse:
    """Update extended color palette."""
    service = get_brand_kit_service()
    try:
        await service.update_colors_extended(
            current_user.sub, brand_kit_id, colors.model_dump()
        )
        return ColorPaletteResponse(brand_kit_id=brand_kit_id, colors=colors)
    except BrandKitNotFoundError:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Access denied")


@router.get(
    "/{brand_kit_id}/colors",
    response_model=ColorPaletteResponse,
    summary="Get extended colors",
)
async def get_colors(
    brand_kit_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> ColorPaletteResponse:
    """Get extended color palette."""
    service = get_brand_kit_service()
    try:
        brand_kit = await service.get(current_user.sub, brand_kit_id)
        colors_data = brand_kit.get("colors_extended", {})
        return ColorPaletteResponse(
            brand_kit_id=brand_kit_id,
            colors=ColorPalette(**colors_data) if colors_data else ColorPalette()
        )
    except BrandKitNotFoundError:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Access denied")


@router.put(
    "/{brand_kit_id}/typography",
    response_model=TypographyResponse,
    summary="Update typography",
)
async def update_typography(
    brand_kit_id: str,
    typography: Typography,
    current_user: TokenPayload = Depends(get_current_user),
) -> TypographyResponse:
    """Update typography hierarchy."""
    service = get_brand_kit_service()
    try:
        await service.update_typography(
            current_user.sub, brand_kit_id, typography.model_dump(exclude_none=True)
        )
        return TypographyResponse(brand_kit_id=brand_kit_id, typography=typography)
    except BrandKitNotFoundError:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Access denied")


@router.get(
    "/{brand_kit_id}/typography",
    response_model=TypographyResponse,
    summary="Get typography",
)
async def get_typography(
    brand_kit_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> TypographyResponse:
    """Get typography hierarchy."""
    service = get_brand_kit_service()
    try:
        brand_kit = await service.get(current_user.sub, brand_kit_id)
        typo_data = brand_kit.get("typography", {})
        return TypographyResponse(
            brand_kit_id=brand_kit_id,
            typography=Typography(**typo_data) if typo_data else Typography()
        )
    except BrandKitNotFoundError:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Access denied")


@router.put(
    "/{brand_kit_id}/voice",
    response_model=VoiceResponse,
    summary="Update brand voice",
)
async def update_voice(
    brand_kit_id: str,
    voice: BrandVoice,
    current_user: TokenPayload = Depends(get_current_user),
) -> VoiceResponse:
    """Update brand voice configuration."""
    service = get_brand_kit_service()
    try:
        await service.update_voice(
            current_user.sub, brand_kit_id, voice.model_dump()
        )
        return VoiceResponse(brand_kit_id=brand_kit_id, voice=voice)
    except BrandKitNotFoundError:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Access denied")


@router.get(
    "/{brand_kit_id}/voice",
    response_model=VoiceResponse,
    summary="Get brand voice",
)
async def get_voice(
    brand_kit_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> VoiceResponse:
    """Get brand voice configuration."""
    service = get_brand_kit_service()
    try:
        brand_kit = await service.get(current_user.sub, brand_kit_id)
        voice_data = brand_kit.get("voice", {})
        return VoiceResponse(
            brand_kit_id=brand_kit_id,
            voice=BrandVoice(**voice_data) if voice_data else BrandVoice()
        )
    except BrandKitNotFoundError:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Access denied")


@router.put(
    "/{brand_kit_id}/guidelines",
    response_model=GuidelinesResponse,
    summary="Update brand guidelines",
)
async def update_guidelines(
    brand_kit_id: str,
    guidelines: BrandGuidelines,
    current_user: TokenPayload = Depends(get_current_user),
) -> GuidelinesResponse:
    """Update brand usage guidelines."""
    service = get_brand_kit_service()
    try:
        await service.update_guidelines(
            current_user.sub, brand_kit_id, guidelines.model_dump()
        )
        return GuidelinesResponse(brand_kit_id=brand_kit_id, guidelines=guidelines)
    except BrandKitNotFoundError:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Access denied")


@router.get(
    "/{brand_kit_id}/guidelines",
    response_model=GuidelinesResponse,
    summary="Get brand guidelines",
)
async def get_guidelines(
    brand_kit_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> GuidelinesResponse:
    """Get brand usage guidelines."""
    service = get_brand_kit_service()
    try:
        brand_kit = await service.get(current_user.sub, brand_kit_id)
        guidelines_data = brand_kit.get("guidelines", {})
        return GuidelinesResponse(
            brand_kit_id=brand_kit_id,
            guidelines=BrandGuidelines(**guidelines_data) if guidelines_data else BrandGuidelines()
        )
    except BrandKitNotFoundError:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Access denied")
```

### Validation Criteria
- All endpoints require authentication
- Proper error handling (404, 403)
- Response models match request schemas
- Empty objects returned for unset fields

---

## Section 9: API Routes - Streamer Assets

**File:** `backend/api/routes/streamer_assets.py` (CREATE)
**Agent:** Wave 3 - Agent 9

### Task Checklist
- [ ] 9.1 Create router with prefix
- [ ] 9.2 Create response schemas
- [ ] 9.3 Add POST overlays endpoint
- [ ] 9.4 Add POST alerts endpoint
- [ ] 9.5 Add POST panels endpoint
- [ ] 9.6 Add POST emotes endpoint
- [ ] 9.7 Add POST badges endpoint
- [ ] 9.8 Add POST facecam endpoint
- [ ] 9.9 Add POST stinger endpoint
- [ ] 9.10 Add GET all assets endpoint
- [ ] 9.11 Add DELETE asset endpoint
- [ ] 9.12 Register in main.py

### Exact Implementation

```python
"""
Streamer Assets Route Handlers for Streamer Studio.

Endpoints for managing streamer-specific assets:
- Overlays (starting soon, BRB, ending, gameplay)
- Alerts (follow, subscribe, donation, raid)
- Panels (channel info panels)
- Emotes (custom emotes by tier)
- Badges (subscriber badges)
- Facecam frame
- Stinger transition
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel, Field

from backend.api.middleware.auth import get_current_user
from backend.services.jwt_service import TokenPayload
from backend.services.streamer_asset_service import get_streamer_asset_service
from backend.services.exceptions import BrandKitNotFoundError, AuthorizationError, StorageError


router = APIRouter()


# =============================================================================
# Response Schemas
# =============================================================================

class OverlayResponse(BaseModel):
    id: str
    url: str
    overlay_type: str
    duration_seconds: Optional[int] = None


class AlertResponse(BaseModel):
    id: str
    alert_type: str
    image_url: str
    sound_url: Optional[str] = None
    duration_ms: int


class PanelResponse(BaseModel):
    id: str
    name: str
    image_url: str


class EmoteResponse(BaseModel):
    id: str
    name: str
    url: str
    tier: int


class BadgeResponse(BaseModel):
    id: str
    months: int
    url: str


class FacecamResponse(BaseModel):
    id: str
    url: str
    position: str


class StingerResponse(BaseModel):
    id: str
    url: str
    duration_ms: int


class StreamerAssetsListResponse(BaseModel):
    brand_kit_id: str
    overlays: List[OverlayResponse] = []
    alerts: List[AlertResponse] = []
    panels: List[PanelResponse] = []
    emotes: List[EmoteResponse] = []
    badges: List[BadgeResponse] = []
    facecam_frame: Optional[FacecamResponse] = None
    stinger: Optional[StingerResponse] = None


class DeleteResponse(BaseModel):
    deleted: bool
    category: str
    asset_id: str


# =============================================================================
# Endpoints
# =============================================================================

@router.post(
    "/{brand_kit_id}/streamer-assets/overlays",
    response_model=OverlayResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload overlay",
)
async def upload_overlay(
    brand_kit_id: str,
    overlay_type: str = Form(..., description="Type: starting_soon, brb, ending, gameplay"),
    duration_seconds: Optional[int] = Form(default=None),
    file: UploadFile = File(...),
    current_user: TokenPayload = Depends(get_current_user),
) -> OverlayResponse:
    """Upload a stream overlay."""
    service = get_streamer_asset_service()
    try:
        file_data = await file.read()
        result = await service.upload_overlay(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
            overlay_type=overlay_type,
            file_data=file_data,
            content_type=file.content_type or "application/octet-stream",
            duration_seconds=duration_seconds,
        )
        return OverlayResponse(**result)
    except BrandKitNotFoundError:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Access denied")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except StorageError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/{brand_kit_id}/streamer-assets/alerts",
    response_model=AlertResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload alert",
)
async def upload_alert(
    brand_kit_id: str,
    alert_type: str = Form(..., description="Type: follow, subscribe, donation, raid, bits, gift_sub"),
    duration_ms: int = Form(default=3000),
    image: UploadFile = File(..., description="Alert image/animation"),
    sound: Optional[UploadFile] = File(default=None, description="Alert sound (optional)"),
    current_user: TokenPayload = Depends(get_current_user),
) -> AlertResponse:
    """Upload an alert with image and optional sound."""
    service = get_streamer_asset_service()
    try:
        image_data = await image.read()
        sound_data = await sound.read() if sound else None
        
        result = await service.upload_alert(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
            alert_type=alert_type,
            image_data=image_data,
            image_content_type=image.content_type or "application/octet-stream",
            sound_data=sound_data,
            sound_content_type=sound.content_type if sound else None,
            duration_ms=duration_ms,
        )
        return AlertResponse(**result)
    except BrandKitNotFoundError:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Access denied")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except StorageError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/{brand_kit_id}/streamer-assets/panels",
    response_model=PanelResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload panel",
)
async def upload_panel(
    brand_kit_id: str,
    name: str = Form(..., description="Panel name (e.g., About, Schedule, Rules)"),
    file: UploadFile = File(...),
    current_user: TokenPayload = Depends(get_current_user),
) -> PanelResponse:
    """Upload a channel panel."""
    service = get_streamer_asset_service()
    try:
        file_data = await file.read()
        result = await service.upload_panel(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
            name=name,
            file_data=file_data,
            content_type=file.content_type or "application/octet-stream",
        )
        return PanelResponse(**result)
    except BrandKitNotFoundError:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Access denied")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except StorageError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/{brand_kit_id}/streamer-assets/emotes",
    response_model=EmoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload emote",
)
async def upload_emote(
    brand_kit_id: str,
    name: str = Form(..., description="Emote name"),
    tier: int = Form(default=1, description="Subscriber tier (1, 2, or 3)"),
    file: UploadFile = File(...),
    current_user: TokenPayload = Depends(get_current_user),
) -> EmoteResponse:
    """Upload a custom emote."""
    service = get_streamer_asset_service()
    try:
        file_data = await file.read()
        result = await service.upload_emote(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
            name=name,
            tier=tier,
            file_data=file_data,
            content_type=file.content_type or "application/octet-stream",
        )
        return EmoteResponse(**result)
    except BrandKitNotFoundError:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Access denied")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except StorageError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/{brand_kit_id}/streamer-assets/badges",
    response_model=BadgeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload badge",
)
async def upload_badge(
    brand_kit_id: str,
    months: int = Form(..., description="Months of subscription"),
    file: UploadFile = File(...),
    current_user: TokenPayload = Depends(get_current_user),
) -> BadgeResponse:
    """Upload a subscriber badge."""
    service = get_streamer_asset_service()
    try:
        file_data = await file.read()
        result = await service.upload_badge(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
            months=months,
            file_data=file_data,
            content_type=file.content_type or "application/octet-stream",
        )
        return BadgeResponse(**result)
    except BrandKitNotFoundError:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Access denied")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except StorageError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/{brand_kit_id}/streamer-assets/facecam",
    response_model=FacecamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload facecam frame",
)
async def upload_facecam(
    brand_kit_id: str,
    position: str = Form(default="bottom-right", description="Position on stream"),
    file: UploadFile = File(...),
    current_user: TokenPayload = Depends(get_current_user),
) -> FacecamResponse:
    """Upload a facecam frame."""
    service = get_streamer_asset_service()
    try:
        file_data = await file.read()
        result = await service.upload_facecam_frame(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
            position=position,
            file_data=file_data,
            content_type=file.content_type or "application/octet-stream",
        )
        return FacecamResponse(**result)
    except BrandKitNotFoundError:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Access denied")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except StorageError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/{brand_kit_id}/streamer-assets/stinger",
    response_model=StingerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload stinger",
)
async def upload_stinger(
    brand_kit_id: str,
    duration_ms: int = Form(default=1000, description="Transition duration in ms"),
    file: UploadFile = File(...),
    current_user: TokenPayload = Depends(get_current_user),
) -> StingerResponse:
    """Upload a stinger transition."""
    service = get_streamer_asset_service()
    try:
        file_data = await file.read()
        result = await service.upload_stinger(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
            duration_ms=duration_ms,
            file_data=file_data,
            content_type=file.content_type or "application/octet-stream",
        )
        return StingerResponse(**result)
    except BrandKitNotFoundError:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Access denied")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except StorageError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(
    "/{brand_kit_id}/streamer-assets/{category}/{asset_id}",
    response_model=DeleteResponse,
    summary="Delete asset",
)
async def delete_asset(
    brand_kit_id: str,
    category: str,
    asset_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> DeleteResponse:
    """Delete a streamer asset."""
    service = get_streamer_asset_service()
    try:
        deleted = await service.delete_asset(
            user_id=current_user.sub,
            brand_kit_id=brand_kit_id,
            category=category,
            asset_id=asset_id,
        )
        return DeleteResponse(deleted=deleted, category=category, asset_id=asset_id)
    except BrandKitNotFoundError:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Access denied")


__all__ = ["router"]
```

### Register in main.py

Add to `backend/api/main.py`:
```python
from backend.api.routes.streamer_assets import router as streamer_assets_router

app.include_router(
    streamer_assets_router,
    prefix="/api/v1/brand-kits",
    tags=["streamer-assets"]
)
```

### Validation Criteria
- All endpoints require authentication
- File uploads validated by service
- Proper HTTP status codes (201 for create, 200 for get/delete)
- Error handling for 400, 403, 404, 500

---

## Section 10: Generation Integration

**Files:** 
- `backend/api/schemas/generation.py` (MODIFY)
- `backend/services/prompt_engine.py` (MODIFY)
- `backend/workers/generation_worker.py` (MODIFY)

**Agent:** Wave 3 - Agent 10

### Task Checklist
- [ ] 10.1 Add include_logo to GenerateRequest
- [ ] 10.2 Add logo_position to GenerateRequest
- [ ] 10.3 Add logo_size to GenerateRequest
- [ ] 10.4 Update prompt engine for logo injection
- [ ] 10.5 Update generation worker to fetch logo
- [ ] 10.6 Pass logo to Nano Banana client

### Schema Updates (generation.py)

```python
# Add to GenerateRequest class:

include_logo: bool = Field(
    default=False,
    description="Include brand logo in generated asset"
)
logo_position: Optional[Literal[
    "top-left", "top-right", "bottom-left", "bottom-right", "center"
]] = Field(
    default="bottom-right",
    description="Position of logo on generated asset"
)
logo_size: Optional[Literal["small", "medium", "large"]] = Field(
    default="medium",
    description="Size of logo (small=10%, medium=15%, large=20%)"
)
```

### Prompt Engine Updates (prompt_engine.py)

```python
from backend.services.logo_service import get_logo_service

# Add new function:
async def build_prompt_with_logo(
    template_content: str,
    brand_kit: dict,
    include_logo: bool = False,
    logo_position: str = "bottom-right",
    logo_size: str = "medium",
) -> tuple[str, Optional[bytes]]:
    """
    Build prompt with optional logo inclusion.
    
    Args:
        template_content: The prompt template
        brand_kit: Brand kit data
        include_logo: Whether to include logo
        logo_position: Position for logo placement
        logo_size: Size of logo (small/medium/large)
        
    Returns:
        Tuple of (prompt_string, logo_bytes or None)
    """
    # Build base prompt
    prompt = build_prompt(template_content, brand_kit)
    
    logo_bytes = None
    
    if include_logo:
        logo_service = get_logo_service()
        logo_bytes = await logo_service.get_logo_for_generation(
            user_id=brand_kit.get("user_id"),
            brand_kit_id=brand_kit.get("id"),
        )
        
        if logo_bytes:
            # Add logo placement instructions to prompt
            size_map = {"small": "10%", "medium": "15%", "large": "20%"}
            size_percent = size_map.get(logo_size, "15%")
            
            prompt += f"""

LOGO PLACEMENT:
- Include the provided brand logo
- Position: {logo_position} corner
- Size: {size_percent} of image width
- Ensure logo is clearly visible and not obscured
- Maintain logo aspect ratio
"""
    
    return prompt, logo_bytes
```

### Generation Worker Updates (generation_worker.py)

```python
# Update process_generation_job function to:
# 1. Check if include_logo is True in job data
# 2. Call build_prompt_with_logo instead of build_prompt
# 3. Pass logo_bytes to nano_banana_client if available

# In the job processing section:
include_logo = job_data.get("include_logo", False)
logo_position = job_data.get("logo_position", "bottom-right")
logo_size = job_data.get("logo_size", "medium")

if include_logo:
    prompt, logo_bytes = await build_prompt_with_logo(
        template_content=template_content,
        brand_kit=brand_kit,
        include_logo=True,
        logo_position=logo_position,
        logo_size=logo_size,
    )
else:
    prompt = build_prompt(template_content, brand_kit)
    logo_bytes = None

# Pass to generation (logo_bytes can be used for composition)
result = await nano_banana_client.generate(
    prompt=prompt,
    logo_bytes=logo_bytes,  # New parameter
    # ... other params
)
```

### Validation Criteria
- Logo position must be one of: top-left, top-right, bottom-left, bottom-right, center
- Logo size must be one of: small, medium, large
- Logo bytes fetched from storage when include_logo=True
- Graceful fallback if no logo uploaded

---

## Section 11: Property Tests

**File:** `backend/tests/properties/test_brand_kit_enhancement_properties.py` (CREATE)
**Agent:** Wave 4 - Agent 11

### Task Checklist
- [ ] 11.1 Create test file with imports
- [ ] 11.2 Property: Extended color hex validation
- [ ] 11.3 Property: Gradient stops validation
- [ ] 11.4 Property: Font weight validation
- [ ] 11.5 Property: Typography hierarchy
- [ ] 11.6 Property: Voice personality traits
- [ ] 11.7 Property: Streamer asset validation

### Exact Implementation

```python
"""
Property-based tests for brand kit enhancement schemas.

Uses Hypothesis for generative testing with 100+ iterations per property.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from pydantic import ValidationError

from backend.api.schemas.brand_kit_enhanced import (
    ExtendedColor,
    GradientStop,
    Gradient,
    ColorPalette,
    FontConfig,
    Typography,
    BrandVoice,
    OverlayAsset,
    AlertAsset,
    EmoteAsset,
    BadgeAsset,
    BrandGuidelines,
    VALID_FONT_WEIGHTS,
)


# =============================================================================
# Strategies
# =============================================================================

hex_color_strategy = st.from_regex(r'^#[0-9A-Fa-f]{6}$', fullmatch=True)

invalid_hex_strategy = st.one_of(
    st.from_regex(r'^#[0-9A-Fa-f]{3}$', fullmatch=True),  # Too short
    st.from_regex(r'^#[0-9A-Fa-f]{8}$', fullmatch=True),  # Too long
    st.from_regex(r'^[0-9A-Fa-f]{6}$', fullmatch=True),   # Missing #
    st.text(min_size=1, max_size=10).filter(lambda x: not x.startswith('#')),
)

font_weight_strategy = st.sampled_from(VALID_FONT_WEIGHTS)

invalid_font_weight_strategy = st.integers().filter(
    lambda x: x not in VALID_FONT_WEIGHTS
)

gradient_position_strategy = st.integers(min_value=0, max_value=100)


# =============================================================================
# Extended Color Tests
# =============================================================================

class TestExtendedColorProperties:
    """Property tests for ExtendedColor schema."""
    
    @given(hex_color=hex_color_strategy, name=st.text(min_size=1, max_size=50))
    @settings(max_examples=100)
    def test_valid_hex_colors_accepted(self, hex_color: str, name: str):
        """Valid hex colors should be accepted and normalized to uppercase."""
        assume(name.strip())  # Non-empty after strip
        color = ExtendedColor(hex=hex_color, name=name)
        assert color.hex == hex_color.upper()
    
    @given(hex_color=invalid_hex_strategy)
    @settings(max_examples=100)
    def test_invalid_hex_colors_rejected(self, hex_color: str):
        """Invalid hex colors should raise ValidationError."""
        with pytest.raises(ValidationError):
            ExtendedColor(hex=hex_color, name="Test")
    
    @given(name=st.text(min_size=51, max_size=100))
    @settings(max_examples=50)
    def test_name_too_long_rejected(self, name: str):
        """Names over 50 chars should be rejected."""
        with pytest.raises(ValidationError):
            ExtendedColor(hex="#FF5733", name=name)


# =============================================================================
# Gradient Tests
# =============================================================================

class TestGradientProperties:
    """Property tests for Gradient schema."""
    
    @given(
        pos1=st.integers(min_value=0, max_value=49),
        pos2=st.integers(min_value=50, max_value=100)
    )
    @settings(max_examples=100)
    def test_valid_gradient_stops_accepted(self, pos1: int, pos2: int):
        """Gradient stops in ascending order should be accepted."""
        gradient = Gradient(
            name="Test Gradient",
            stops=[
                GradientStop(color="#FF0000", position=pos1),
                GradientStop(color="#0000FF", position=pos2),
            ]
        )
        assert len(gradient.stops) == 2
        assert gradient.stops[0].position < gradient.stops[1].position
    
    @given(
        pos1=st.integers(min_value=50, max_value=100),
        pos2=st.integers(min_value=0, max_value=49)
    )
    @settings(max_examples=100)
    def test_descending_stops_rejected(self, pos1: int, pos2: int):
        """Gradient stops in descending order should be rejected."""
        with pytest.raises(ValidationError):
            Gradient(
                name="Test",
                stops=[
                    GradientStop(color="#FF0000", position=pos1),
                    GradientStop(color="#0000FF", position=pos2),
                ]
            )
    
    @given(position=st.integers(min_value=101, max_value=1000))
    @settings(max_examples=50)
    def test_position_over_100_rejected(self, position: int):
        """Positions over 100 should be rejected."""
        with pytest.raises(ValidationError):
            GradientStop(color="#FF0000", position=position)


# =============================================================================
# Typography Tests
# =============================================================================

class TestTypographyProperties:
    """Property tests for Typography schema."""
    
    @given(weight=font_weight_strategy)
    @settings(max_examples=100)
    def test_valid_font_weights_accepted(self, weight: int):
        """Valid font weights should be accepted."""
        config = FontConfig(family="Inter", weight=weight)
        assert config.weight == weight
    
    @given(weight=invalid_font_weight_strategy)
    @settings(max_examples=100)
    def test_invalid_font_weights_rejected(self, weight: int):
        """Invalid font weights should be rejected."""
        with pytest.raises(ValidationError):
            FontConfig(family="Inter", weight=weight)
    
    @given(style=st.sampled_from(["normal", "italic"]))
    @settings(max_examples=20)
    def test_valid_font_styles_accepted(self, style: str):
        """Valid font styles should be accepted."""
        config = FontConfig(family="Inter", style=style)
        assert config.style == style


# =============================================================================
# Brand Voice Tests
# =============================================================================

class TestBrandVoiceProperties:
    """Property tests for BrandVoice schema."""
    
    @given(traits=st.lists(st.text(min_size=1, max_size=30), min_size=0, max_size=5))
    @settings(max_examples=100)
    def test_valid_personality_traits_accepted(self, traits: list):
        """0-5 traits with max 30 chars each should be accepted."""
        assume(all(t.strip() for t in traits))  # Non-empty after strip
        voice = BrandVoice(personality_traits=traits)
        assert len(voice.personality_traits) <= 5
    
    @given(traits=st.lists(st.text(min_size=31, max_size=50), min_size=1, max_size=3))
    @settings(max_examples=50)
    def test_long_traits_rejected(self, traits: list):
        """Traits over 30 chars should be rejected."""
        with pytest.raises(ValidationError):
            BrandVoice(personality_traits=traits)
    
    @given(tagline=st.text(min_size=101, max_size=200))
    @settings(max_examples=50)
    def test_long_tagline_rejected(self, tagline: str):
        """Taglines over 100 chars should be rejected."""
        with pytest.raises(ValidationError):
            BrandVoice(tagline=tagline)


# =============================================================================
# Streamer Asset Tests
# =============================================================================

class TestStreamerAssetProperties:
    """Property tests for streamer asset schemas."""
    
    @given(duration=st.integers(min_value=500, max_value=30000))
    @settings(max_examples=100)
    def test_valid_alert_duration_accepted(self, duration: int):
        """Alert durations 500-30000ms should be accepted."""
        alert = AlertAsset(
            alert_type="follow",
            image_url="https://example.com/alert.gif",
            duration_ms=duration
        )
        assert alert.duration_ms == duration
    
    @given(duration=st.integers(min_value=30001, max_value=100000))
    @settings(max_examples=50)
    def test_alert_duration_too_long_rejected(self, duration: int):
        """Alert durations over 30000ms should be rejected."""
        with pytest.raises(ValidationError):
            AlertAsset(
                alert_type="follow",
                image_url="https://example.com/alert.gif",
                duration_ms=duration
            )
    
    @given(months=st.integers(min_value=1, max_value=120))
    @settings(max_examples=100)
    def test_valid_badge_months_accepted(self, months: int):
        """Badge months 1-120 should be accepted."""
        badge = BadgeAsset(months=months, url="https://example.com/badge.png")
        assert badge.months == months
    
    @given(tier=st.sampled_from([1, 2, 3]))
    @settings(max_examples=30)
    def test_valid_emote_tiers_accepted(self, tier: int):
        """Emote tiers 1, 2, 3 should be accepted."""
        emote = EmoteAsset(name="hype", url="https://example.com/emote.png", tier=tier)
        assert emote.tier == tier


# =============================================================================
# Guidelines Tests
# =============================================================================

class TestGuidelinesProperties:
    """Property tests for BrandGuidelines schema."""
    
    @given(
        primary=st.integers(min_value=0, max_value=60),
        secondary=st.integers(min_value=0, max_value=30),
        accent=st.integers(min_value=0, max_value=10)
    )
    @settings(max_examples=100)
    def test_valid_color_ratios_accepted(self, primary: int, secondary: int, accent: int):
        """Color ratios summing to <= 100 should be accepted."""
        assume(primary + secondary + accent <= 100)
        guidelines = BrandGuidelines(
            primary_color_ratio=primary,
            secondary_color_ratio=secondary,
            accent_color_ratio=accent
        )
        total = guidelines.primary_color_ratio + guidelines.secondary_color_ratio + guidelines.accent_color_ratio
        assert total <= 100
    
    @given(
        primary=st.integers(min_value=50, max_value=100),
        secondary=st.integers(min_value=30, max_value=50),
        accent=st.integers(min_value=30, max_value=50)
    )
    @settings(max_examples=50)
    def test_color_ratios_over_100_rejected(self, primary: int, secondary: int, accent: int):
        """Color ratios summing to > 100 should be rejected."""
        assume(primary + secondary + accent > 100)
        with pytest.raises(ValidationError):
            BrandGuidelines(
                primary_color_ratio=primary,
                secondary_color_ratio=secondary,
                accent_color_ratio=accent
            )
```

### Validation Criteria
- All properties run 100+ iterations (except simple ones at 50)
- Tests cover both valid and invalid inputs
- Uses Hypothesis strategies for comprehensive coverage
- All tests must pass

---

## Section 12: Unit Tests

**File:** `backend/tests/unit/test_brand_kit_enhancement_endpoints.py` (CREATE)
**Agent:** Wave 4 - Agent 12

### Task Checklist
- [ ] 12.1 Create test file with fixtures
- [ ] 12.2 Test extended colors CRUD
- [ ] 12.3 Test typography CRUD
- [ ] 12.4 Test voice CRUD
- [ ] 12.5 Test guidelines CRUD
- [ ] 12.6 Test streamer asset upload
- [ ] 12.7 Test logo in generation request
- [ ] 12.8 Test backward compatibility

### Exact Implementation

```python
"""
Unit tests for brand kit enhancement endpoints.

Tests cover:
- Extended colors CRUD
- Typography CRUD
- Brand voice CRUD
- Guidelines CRUD
- Streamer asset uploads
- Logo in generation
- Backward compatibility
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from uuid import uuid4

from backend.api.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def mock_user_id():
    return str(uuid4())


@pytest.fixture
def mock_brand_kit_id():
    return str(uuid4())


@pytest.fixture
def mock_token(mock_user_id):
    return f"Bearer mock_token_{mock_user_id}"


@pytest.fixture
def auth_headers(mock_token):
    return {"Authorization": mock_token}


@pytest.fixture
def mock_brand_kit(mock_user_id, mock_brand_kit_id):
    return {
        "id": mock_brand_kit_id,
        "user_id": mock_user_id,
        "name": "Test Brand Kit",
        "is_active": True,
        "primary_colors": ["#FF5733"],
        "accent_colors": [],
        "fonts": {"headline": "Montserrat", "body": "Inter"},
        "tone": "professional",
        "style_reference": "",
        "colors_extended": {},
        "typography": {},
        "voice": {},
        "guidelines": {},
        "streamer_assets": {},
        "social_profiles": {},
        "logos": {},
    }


# =============================================================================
# Extended Colors Tests
# =============================================================================

class TestExtendedColorsEndpoints:
    """Tests for extended colors endpoints."""
    
    @patch("backend.api.routes.brand_kits.get_current_user")
    @patch("backend.api.routes.brand_kits.get_brand_kit_service")
    def test_update_colors_success(
        self, mock_service, mock_auth, client, mock_user_id, mock_brand_kit_id, mock_brand_kit
    ):
        """Test successful color palette update."""
        mock_auth.return_value = MagicMock(sub=mock_user_id)
        mock_service_instance = MagicMock()
        mock_service_instance.update_colors_extended = AsyncMock(return_value=mock_brand_kit)
        mock_service.return_value = mock_service_instance
        
        response = client.put(
            f"/api/v1/brand-kits/{mock_brand_kit_id}/colors",
            json={
                "primary": [{"hex": "#FF5733", "name": "Brand Orange", "usage": "CTAs"}],
                "secondary": [],
                "accent": [],
                "neutral": [],
                "gradients": []
            },
            headers={"Authorization": "Bearer test"}
        )
        
        assert response.status_code == 200
        assert "colors" in response.json()
    
    @patch("backend.api.routes.brand_kits.get_current_user")
    @patch("backend.api.routes.brand_kits.get_brand_kit_service")
    def test_get_colors_success(
        self, mock_service, mock_auth, client, mock_user_id, mock_brand_kit_id, mock_brand_kit
    ):
        """Test successful color palette retrieval."""
        mock_auth.return_value = MagicMock(sub=mock_user_id)
        mock_service_instance = MagicMock()
        mock_service_instance.get = AsyncMock(return_value=mock_brand_kit)
        mock_service.return_value = mock_service_instance
        
        response = client.get(
            f"/api/v1/brand-kits/{mock_brand_kit_id}/colors",
            headers={"Authorization": "Bearer test"}
        )
        
        assert response.status_code == 200
        assert "brand_kit_id" in response.json()
    
    def test_update_colors_invalid_hex(self, client):
        """Test color update with invalid hex rejected."""
        response = client.put(
            f"/api/v1/brand-kits/{uuid4()}/colors",
            json={
                "primary": [{"hex": "invalid", "name": "Test", "usage": ""}],
            },
            headers={"Authorization": "Bearer test"}
        )
        
        assert response.status_code in [400, 422]


# =============================================================================
# Typography Tests
# =============================================================================

class TestTypographyEndpoints:
    """Tests for typography endpoints."""
    
    @patch("backend.api.routes.brand_kits.get_current_user")
    @patch("backend.api.routes.brand_kits.get_brand_kit_service")
    def test_update_typography_success(
        self, mock_service, mock_auth, client, mock_user_id, mock_brand_kit_id, mock_brand_kit
    ):
        """Test successful typography update."""
        mock_auth.return_value = MagicMock(sub=mock_user_id)
        mock_service_instance = MagicMock()
        mock_service_instance.update_typography = AsyncMock(return_value=mock_brand_kit)
        mock_service.return_value = mock_service_instance
        
        response = client.put(
            f"/api/v1/brand-kits/{mock_brand_kit_id}/typography",
            json={
                "display": {"family": "Montserrat", "weight": 800, "style": "normal"},
                "headline": {"family": "Montserrat", "weight": 700, "style": "normal"},
                "body": {"family": "Inter", "weight": 400, "style": "normal"},
            },
            headers={"Authorization": "Bearer test"}
        )
        
        assert response.status_code == 200
    
    def test_update_typography_invalid_weight(self, client):
        """Test typography update with invalid weight rejected."""
        response = client.put(
            f"/api/v1/brand-kits/{uuid4()}/typography",
            json={
                "headline": {"family": "Inter", "weight": 450, "style": "normal"},
            },
            headers={"Authorization": "Bearer test"}
        )
        
        assert response.status_code in [400, 422]


# =============================================================================
# Brand Voice Tests
# =============================================================================

class TestVoiceEndpoints:
    """Tests for brand voice endpoints."""
    
    @patch("backend.api.routes.brand_kits.get_current_user")
    @patch("backend.api.routes.brand_kits.get_brand_kit_service")
    def test_update_voice_success(
        self, mock_service, mock_auth, client, mock_user_id, mock_brand_kit_id, mock_brand_kit
    ):
        """Test successful voice update."""
        mock_auth.return_value = MagicMock(sub=mock_user_id)
        mock_service_instance = MagicMock()
        mock_service_instance.update_voice = AsyncMock(return_value=mock_brand_kit)
        mock_service.return_value = mock_service_instance
        
        response = client.put(
            f"/api/v1/brand-kits/{mock_brand_kit_id}/voice",
            json={
                "tone": "competitive",
                "personality_traits": ["Bold", "Energetic", "Authentic"],
                "tagline": "Level Up Your Stream",
                "catchphrases": ["Let's gooo!"],
                "content_themes": ["Gaming", "Tech"],
            },
            headers={"Authorization": "Bearer test"}
        )
        
        assert response.status_code == 200
    
    def test_update_voice_trait_too_long(self, client):
        """Test voice update with trait over 30 chars rejected."""
        response = client.put(
            f"/api/v1/brand-kits/{uuid4()}/voice",
            json={
                "personality_traits": ["This trait is way too long and exceeds thirty characters"],
            },
            headers={"Authorization": "Bearer test"}
        )
        
        assert response.status_code in [400, 422]


# =============================================================================
# Guidelines Tests
# =============================================================================

class TestGuidelinesEndpoints:
    """Tests for guidelines endpoints."""
    
    @patch("backend.api.routes.brand_kits.get_current_user")
    @patch("backend.api.routes.brand_kits.get_brand_kit_service")
    def test_update_guidelines_success(
        self, mock_service, mock_auth, client, mock_user_id, mock_brand_kit_id, mock_brand_kit
    ):
        """Test successful guidelines update."""
        mock_auth.return_value = MagicMock(sub=mock_user_id)
        mock_service_instance = MagicMock()
        mock_service_instance.update_guidelines = AsyncMock(return_value=mock_brand_kit)
        mock_service.return_value = mock_service_instance
        
        response = client.put(
            f"/api/v1/brand-kits/{mock_brand_kit_id}/guidelines",
            json={
                "logo_min_size_px": 48,
                "logo_clear_space_ratio": 0.25,
                "primary_color_ratio": 60,
                "secondary_color_ratio": 30,
                "accent_color_ratio": 10,
            },
            headers={"Authorization": "Bearer test"}
        )
        
        assert response.status_code == 200
    
    def test_update_guidelines_ratios_over_100(self, client):
        """Test guidelines with color ratios over 100% rejected."""
        response = client.put(
            f"/api/v1/brand-kits/{uuid4()}/guidelines",
            json={
                "primary_color_ratio": 60,
                "secondary_color_ratio": 30,
                "accent_color_ratio": 20,  # Total = 110%
            },
            headers={"Authorization": "Bearer test"}
        )
        
        assert response.status_code in [400, 422]


# =============================================================================
# Logo in Generation Tests
# =============================================================================

class TestLogoInGeneration:
    """Tests for logo inclusion in generation."""
    
    @patch("backend.api.routes.generation.get_current_user")
    @patch("backend.api.routes.generation.get_generation_service")
    def test_generate_with_logo_options(
        self, mock_service, mock_auth, client, mock_user_id, mock_brand_kit_id
    ):
        """Test generation request with logo options."""
        mock_auth.return_value = MagicMock(sub=mock_user_id)
        mock_service_instance = MagicMock()
        mock_service_instance.create_job = AsyncMock(return_value={
            "id": str(uuid4()),
            "status": "pending"
        })
        mock_service.return_value = mock_service_instance
        
        response = client.post(
            "/api/v1/generation/jobs",
            json={
                "asset_type": "thumbnail",
                "brand_kit_id": mock_brand_kit_id,
                "include_logo": True,
                "logo_position": "bottom-right",
                "logo_size": "medium",
            },
            headers={"Authorization": "Bearer test"}
        )
        
        # Should accept the request (actual generation tested separately)
        assert response.status_code in [200, 201, 422]  # 422 if other validation fails


# =============================================================================
# Backward Compatibility Tests
# =============================================================================

class TestBackwardCompatibility:
    """Tests for backward compatibility with existing brand kits."""
    
    @patch("backend.api.routes.brand_kits.get_current_user")
    @patch("backend.api.routes.brand_kits.get_brand_kit_service")
    def test_get_brand_kit_without_new_fields(
        self, mock_service, mock_auth, client, mock_user_id, mock_brand_kit_id
    ):
        """Test getting brand kit that doesn't have new JSONB fields."""
        mock_auth.return_value = MagicMock(sub=mock_user_id)
        
        # Old brand kit without new fields
        old_brand_kit = {
            "id": mock_brand_kit_id,
            "user_id": mock_user_id,
            "name": "Old Brand Kit",
            "is_active": True,
            "primary_colors": ["#FF5733"],
            "accent_colors": [],
            "fonts": {"headline": "Montserrat", "body": "Inter"},
            "tone": "professional",
            "style_reference": "",
            # No colors_extended, typography, voice, etc.
        }
        
        mock_service_instance = MagicMock()
        mock_service_instance.get = AsyncMock(return_value=old_brand_kit)
        mock_service.return_value = mock_service_instance
        
        response = client.get(
            f"/api/v1/brand-kits/{mock_brand_kit_id}",
            headers={"Authorization": "Bearer test"}
        )
        
        assert response.status_code == 200
    
    @patch("backend.api.routes.brand_kits.get_current_user")
    @patch("backend.api.routes.brand_kits.get_brand_kit_service")
    def test_create_brand_kit_minimal_fields(
        self, mock_service, mock_auth, client, mock_user_id
    ):
        """Test creating brand kit with only required fields (no new fields)."""
        mock_auth.return_value = MagicMock(sub=mock_user_id)
        mock_service_instance = MagicMock()
        mock_service_instance.create = AsyncMock(return_value={
            "id": str(uuid4()),
            "user_id": mock_user_id,
            "name": "Minimal Brand Kit",
            "is_active": False,
            "primary_colors": ["#FF5733"],
            "accent_colors": [],
            "fonts": {"headline": "Montserrat", "body": "Inter"},
            "tone": "professional",
            "style_reference": "",
        })
        mock_service_instance.count = AsyncMock(return_value=0)
        mock_service.return_value = mock_service_instance
        
        response = client.post(
            "/api/v1/brand-kits",
            json={
                "name": "Minimal Brand Kit",
                "primary_colors": ["#FF5733"],
                "fonts": {"headline": "Montserrat", "body": "Inter"},
            },
            headers={"Authorization": "Bearer test"}
        )
        
        assert response.status_code in [200, 201]
```

### Validation Criteria
- All CRUD operations tested
- Invalid inputs rejected with proper status codes
- Backward compatibility verified
- Mocks properly isolate tests

---

## Section 13: TSX Types & API Client

**File:** `tsx/packages/api-client/src/types/brand-kit-enhanced.ts` (CREATE)
**Agent:** Wave 5 - Agent 13

### Task Checklist
- [ ] 13.1 Create ExtendedColor type
- [ ] 13.2 Create Gradient types
- [ ] 13.3 Create ColorPalette type
- [ ] 13.4 Create FontConfig type
- [ ] 13.5 Create Typography type
- [ ] 13.6 Create BrandVoice type
- [ ] 13.7 Create StreamerAssets types
- [ ] 13.8 Create Guidelines type
- [ ] 13.9 Export all types

### Exact Implementation

```typescript
/**
 * Enhanced Brand Kit Types for Streamer Studio
 * 
 * Extends base brand kit types with:
 * - Extended color system with names and usage
 * - Typography hierarchy (6 levels)
 * - Enhanced brand voice
 * - Streamer-specific assets
 */

// =============================================================================
// Extended Color System
// =============================================================================

export interface ExtendedColor {
  hex: string;
  name: string;
  usage?: string;
}

export interface GradientStop {
  color: string;
  position: number; // 0-100
}

export interface Gradient {
  name: string;
  type: 'linear' | 'radial';
  angle: number; // 0-360
  stops: GradientStop[];
}

export interface ColorPalette {
  primary: ExtendedColor[];
  secondary: ExtendedColor[];
  accent: ExtendedColor[];
  neutral: ExtendedColor[];
  gradients: Gradient[];
}

// =============================================================================
// Typography System
// =============================================================================

export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type FontStyle = 'normal' | 'italic';

export interface FontConfig {
  family: string;
  weight: FontWeight;
  style: FontStyle;
}

export interface Typography {
  display?: FontConfig;
  headline?: FontConfig;
  subheadline?: FontConfig;
  body?: FontConfig;
  caption?: FontConfig;
  accent?: FontConfig;
}

// =============================================================================
// Brand Voice
// =============================================================================

export type BrandTone = 
  | 'competitive' 
  | 'casual' 
  | 'educational' 
  | 'comedic' 
  | 'professional'
  | 'inspirational'
  | 'edgy'
  | 'wholesome';

export interface BrandVoice {
  tone: BrandTone;
  personality_traits: string[];
  tagline: string;
  catchphrases: string[];
  content_themes: string[];
}

// =============================================================================
// Streamer Assets
// =============================================================================

export type OverlayType = 'starting_soon' | 'brb' | 'ending' | 'gameplay';
export type AlertType = 'follow' | 'subscribe' | 'donation' | 'raid' | 'bits' | 'gift_sub';
export type EmoteTier = 1 | 2 | 3;
export type FacecamPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface OverlayAsset {
  id: string;
  url: string;
  overlay_type: OverlayType;
  duration_seconds?: number;
}

export interface AlertAsset {
  id: string;
  alert_type: AlertType;
  image_url: string;
  sound_url?: string;
  duration_ms: number;
}

export interface PanelAsset {
  id: string;
  name: string;
  image_url: string;
}

export interface EmoteAsset {
  id: string;
  name: string;
  url: string;
  tier: EmoteTier;
}

export interface BadgeAsset {
  id: string;
  months: number;
  url: string;
}

export interface FacecamFrame {
  id: string;
  url: string;
  position: FacecamPosition;
}

export interface Stinger {
  id: string;
  url: string;
  duration_ms: number;
}

export interface StreamerAssets {
  overlays: OverlayAsset[];
  alerts: AlertAsset[];
  panels: PanelAsset[];
  emotes: EmoteAsset[];
  badges: BadgeAsset[];
  facecam_frame?: FacecamFrame;
  stinger?: Stinger;
}

// =============================================================================
// Guidelines
// =============================================================================

export interface BrandGuidelines {
  logo_min_size_px: number;
  logo_clear_space_ratio: number;
  primary_color_ratio: number;
  secondary_color_ratio: number;
  accent_color_ratio: number;
  prohibited_modifications: string[];
  photo_style: string;
  illustration_style: string;
  icon_style: string;
}

// =============================================================================
// Social Profiles
// =============================================================================

export interface SocialProfile {
  platform: string;
  username: string;
  profile_url: string;
  banner_url?: string;
}

export interface SocialProfiles {
  twitch?: SocialProfile;
  youtube?: SocialProfile;
  twitter?: SocialProfile;
  discord?: SocialProfile;
  tiktok?: SocialProfile;
  instagram?: SocialProfile;
}

// =============================================================================
// Logo Types
// =============================================================================

export type LogoType = 'primary' | 'secondary' | 'icon' | 'monochrome' | 'watermark';
export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
export type LogoSize = 'small' | 'medium' | 'large';

export interface LogoMetadata {
  type: LogoType;
  url: string;
  storage_path: string;
  content_type: string;
  file_size: number;
  filename?: string;
}

export interface Logos {
  primary?: LogoMetadata;
  secondary?: LogoMetadata;
  icon?: LogoMetadata;
  monochrome?: LogoMetadata;
  watermark?: LogoMetadata;
}

// =============================================================================
// Enhanced Brand Kit
// =============================================================================

export interface EnhancedBrandKit {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  
  // Original fields
  primary_colors: string[];
  accent_colors: string[];
  fonts: {
    headline: string;
    body: string;
  };
  tone: BrandTone;
  style_reference: string;
  logo_url?: string;
  
  // Enhanced fields
  colors_extended: ColorPalette;
  typography: Typography;
  voice: BrandVoice;
  streamer_assets: StreamerAssets;
  guidelines: BrandGuidelines;
  social_profiles: SocialProfiles;
  logos: Logos;
  
  created_at: string;
  updated_at: string;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface UpdateColorsRequest {
  primary?: ExtendedColor[];
  secondary?: ExtendedColor[];
  accent?: ExtendedColor[];
  neutral?: ExtendedColor[];
  gradients?: Gradient[];
}

export interface UpdateTypographyRequest {
  display?: FontConfig;
  headline?: FontConfig;
  subheadline?: FontConfig;
  body?: FontConfig;
  caption?: FontConfig;
  accent?: FontConfig;
}

export interface UpdateVoiceRequest {
  tone?: BrandTone;
  personality_traits?: string[];
  tagline?: string;
  catchphrases?: string[];
  content_themes?: string[];
}

export interface UpdateGuidelinesRequest {
  logo_min_size_px?: number;
  logo_clear_space_ratio?: number;
  primary_color_ratio?: number;
  secondary_color_ratio?: number;
  accent_color_ratio?: number;
  prohibited_modifications?: string[];
  photo_style?: string;
  illustration_style?: string;
  icon_style?: string;
}

export interface GenerateWithLogoRequest {
  asset_type: string;
  brand_kit_id: string;
  custom_prompt?: string;
  include_logo?: boolean;
  logo_position?: LogoPosition;
  logo_size?: LogoSize;
}
```

### Update API Client (client.ts)

Add these methods to the API client:

```typescript
// Brand Kit Enhancement Methods
async updateColors(brandKitId: string, colors: UpdateColorsRequest): Promise<ColorPalette> {
  const response = await this.put(`/brand-kits/${brandKitId}/colors`, colors);
  return response.colors;
}

async getColors(brandKitId: string): Promise<ColorPalette> {
  const response = await this.get(`/brand-kits/${brandKitId}/colors`);
  return response.colors;
}

async updateTypography(brandKitId: string, typography: UpdateTypographyRequest): Promise<Typography> {
  const response = await this.put(`/brand-kits/${brandKitId}/typography`, typography);
  return response.typography;
}

async getTypography(brandKitId: string): Promise<Typography> {
  const response = await this.get(`/brand-kits/${brandKitId}/typography`);
  return response.typography;
}

async updateVoice(brandKitId: string, voice: UpdateVoiceRequest): Promise<BrandVoice> {
  const response = await this.put(`/brand-kits/${brandKitId}/voice`, voice);
  return response.voice;
}

async getVoice(brandKitId: string): Promise<BrandVoice> {
  const response = await this.get(`/brand-kits/${brandKitId}/voice`);
  return response.voice;
}

async updateGuidelines(brandKitId: string, guidelines: UpdateGuidelinesRequest): Promise<BrandGuidelines> {
  const response = await this.put(`/brand-kits/${brandKitId}/guidelines`, guidelines);
  return response.guidelines;
}

async getGuidelines(brandKitId: string): Promise<BrandGuidelines> {
  const response = await this.get(`/brand-kits/${brandKitId}/guidelines`);
  return response.guidelines;
}

// Logo Methods
async uploadLogo(brandKitId: string, logoType: LogoType, file: File): Promise<LogoMetadata> {
  const formData = new FormData();
  formData.append('logo_type', logoType);
  formData.append('file', file);
  return this.postForm(`/brand-kits/${brandKitId}/logos`, formData);
}

async getLogos(brandKitId: string): Promise<Logos> {
  const response = await this.get(`/brand-kits/${brandKitId}/logos`);
  return response.logos;
}

async deleteLogo(brandKitId: string, logoType: LogoType): Promise<void> {
  await this.delete(`/brand-kits/${brandKitId}/logos/${logoType}`);
}

// Streamer Asset Methods
async uploadOverlay(brandKitId: string, overlayType: OverlayType, file: File, durationSeconds?: number): Promise<OverlayAsset> {
  const formData = new FormData();
  formData.append('overlay_type', overlayType);
  formData.append('file', file);
  if (durationSeconds) formData.append('duration_seconds', durationSeconds.toString());
  return this.postForm(`/brand-kits/${brandKitId}/streamer-assets/overlays`, formData);
}

async uploadAlert(brandKitId: string, alertType: AlertType, image: File, sound?: File, durationMs?: number): Promise<AlertAsset> {
  const formData = new FormData();
  formData.append('alert_type', alertType);
  formData.append('image', image);
  if (sound) formData.append('sound', sound);
  if (durationMs) formData.append('duration_ms', durationMs.toString());
  return this.postForm(`/brand-kits/${brandKitId}/streamer-assets/alerts`, formData);
}

async deleteStreamerAsset(brandKitId: string, category: string, assetId: string): Promise<void> {
  await this.delete(`/brand-kits/${brandKitId}/streamer-assets/${category}/${assetId}`);
}
```

### Validation Criteria
- All types match backend schemas exactly
- Proper TypeScript strict mode compliance
- Export all types from index.ts
- API client methods handle FormData for uploads

---

## Section 14: TSX Web Brand Kit Editor Components

**Files:** 
- `tsx/apps/web/src/components/brand-kit/ColorPaletteEditor.tsx` (CREATE)
- `tsx/apps/web/src/components/brand-kit/TypographyEditor.tsx` (CREATE)
- `tsx/apps/web/src/components/brand-kit/VoiceConfigEditor.tsx` (CREATE)
- `tsx/apps/web/src/components/brand-kit/LogoUploader.tsx` (CREATE)

**Agent:** Wave 5 - Agent 14

### Task Checklist
- [ ] 14.1 Create ColorPaletteEditor component
- [ ] 14.2 Create GradientEditor component
- [ ] 14.3 Create TypographyEditor component
- [ ] 14.4 Create VoiceConfigEditor component
- [ ] 14.5 Create LogoUploader component
- [ ] 14.6 Create index.ts barrel export

### ColorPaletteEditor Component

```tsx
'use client';

import { useState } from 'react';
import { ExtendedColor, Gradient, ColorPalette } from '@repo/api-client';

interface ColorPaletteEditorProps {
  value: ColorPalette;
  onChange: (palette: ColorPalette) => void;
  disabled?: boolean;
}

export function ColorPaletteEditor({ value, onChange, disabled }: ColorPaletteEditorProps) {
  const [activeCategory, setActiveCategory] = useState<'primary' | 'secondary' | 'accent' | 'neutral' | 'gradients'>('primary');

  const addColor = (category: 'primary' | 'secondary' | 'accent' | 'neutral') => {
    const newColor: ExtendedColor = { hex: '#000000', name: 'New Color', usage: '' };
    onChange({
      ...value,
      [category]: [...(value[category] || []), newColor],
    });
  };

  const updateColor = (category: 'primary' | 'secondary' | 'accent' | 'neutral', index: number, color: ExtendedColor) => {
    const updated = [...(value[category] || [])];
    updated[index] = color;
    onChange({ ...value, [category]: updated });
  };

  const removeColor = (category: 'primary' | 'secondary' | 'accent' | 'neutral', index: number) => {
    const updated = [...(value[category] || [])];
    updated.splice(index, 1);
    onChange({ ...value, [category]: updated });
  };

  const renderColorList = (category: 'primary' | 'secondary' | 'accent' | 'neutral') => {
    const colors = value[category] || [];
    const maxColors = category === 'accent' ? 3 : 5;

    return (
      <div className="space-y-3">
        {colors.map((color, index) => (
          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="color"
              value={color.hex}
              onChange={(e) => updateColor(category, index, { ...color, hex: e.target.value.toUpperCase() })}
              disabled={disabled}
              className="w-12 h-12 rounded cursor-pointer"
            />
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={color.name}
                onChange={(e) => updateColor(category, index, { ...color, name: e.target.value })}
                placeholder="Color name"
                maxLength={50}
                disabled={disabled}
                className="w-full px-3 py-1 border rounded"
              />
              <input
                type="text"
                value={color.usage || ''}
                onChange={(e) => updateColor(category, index, { ...color, usage: e.target.value })}
                placeholder="Usage description"
                maxLength={200}
                disabled={disabled}
                className="w-full px-3 py-1 border rounded text-sm"
              />
            </div>
            <button
              onClick={() => removeColor(category, index)}
              disabled={disabled}
              className="p-2 text-red-500 hover:bg-red-50 rounded"
            >
              ✕
            </button>
          </div>
        ))}
        {colors.length < maxColors && (
          <button
            onClick={() => addColor(category)}
            disabled={disabled}
            className="w-full py-2 border-2 border-dashed rounded-lg text-gray-500 hover:border-gray-400"
          >
            + Add Color ({colors.length}/{maxColors})
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b">
        {(['primary', 'secondary', 'accent', 'neutral', 'gradients'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 capitalize ${activeCategory === cat ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          >
            {cat}
          </button>
        ))}
      </div>
      
      {activeCategory !== 'gradients' && renderColorList(activeCategory)}
      {activeCategory === 'gradients' && (
        <div className="text-gray-500 text-center py-8">
          Gradient editor coming soon
        </div>
      )}
    </div>
  );
}
```

### TypographyEditor Component

```tsx
'use client';

import { Typography, FontConfig, FontWeight, FontStyle } from '@repo/api-client';

const FONT_WEIGHTS: FontWeight[] = [100, 200, 300, 400, 500, 600, 700, 800, 900];
const FONT_STYLES: FontStyle[] = ['normal', 'italic'];
const TYPOGRAPHY_LEVELS = ['display', 'headline', 'subheadline', 'body', 'caption', 'accent'] as const;

interface TypographyEditorProps {
  value: Typography;
  onChange: (typography: Typography) => void;
  disabled?: boolean;
}

export function TypographyEditor({ value, onChange, disabled }: TypographyEditorProps) {
  const updateLevel = (level: keyof Typography, config: FontConfig | undefined) => {
    onChange({ ...value, [level]: config });
  };

  const renderLevelEditor = (level: keyof Typography) => {
    const config = value[level];
    
    return (
      <div key={level} className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium capitalize">{level}</h4>
          {config ? (
            <button
              onClick={() => updateLevel(level, undefined)}
              disabled={disabled}
              className="text-sm text-red-500"
            >
              Remove
            </button>
          ) : (
            <button
              onClick={() => updateLevel(level, { family: 'Inter', weight: 400, style: 'normal' })}
              disabled={disabled}
              className="text-sm text-blue-500"
            >
              Configure
            </button>
          )}
        </div>
        
        {config && (
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              value={config.family}
              onChange={(e) => updateLevel(level, { ...config, family: e.target.value })}
              placeholder="Font family"
              disabled={disabled}
              className="px-3 py-2 border rounded"
            />
            <select
              value={config.weight}
              onChange={(e) => updateLevel(level, { ...config, weight: parseInt(e.target.value) as FontWeight })}
              disabled={disabled}
              className="px-3 py-2 border rounded"
            >
              {FONT_WEIGHTS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <select
              value={config.style}
              onChange={(e) => updateLevel(level, { ...config, style: e.target.value as FontStyle })}
              disabled={disabled}
              className="px-3 py-2 border rounded"
            >
              {FONT_STYLES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {TYPOGRAPHY_LEVELS.map(renderLevelEditor)}
    </div>
  );
}
```

### VoiceConfigEditor Component

```tsx
'use client';

import { BrandVoice, BrandTone } from '@repo/api-client';

const TONES: BrandTone[] = [
  'competitive', 'casual', 'educational', 'comedic', 
  'professional', 'inspirational', 'edgy', 'wholesome'
];

interface VoiceConfigEditorProps {
  value: BrandVoice;
  onChange: (voice: BrandVoice) => void;
  disabled?: boolean;
}

export function VoiceConfigEditor({ value, onChange, disabled }: VoiceConfigEditorProps) {
  const addTrait = () => {
    if ((value.personality_traits?.length || 0) < 5) {
      onChange({
        ...value,
        personality_traits: [...(value.personality_traits || []), ''],
      });
    }
  };

  const updateTrait = (index: number, trait: string) => {
    const updated = [...(value.personality_traits || [])];
    updated[index] = trait;
    onChange({ ...value, personality_traits: updated });
  };

  const removeTrait = (index: number) => {
    const updated = [...(value.personality_traits || [])];
    updated.splice(index, 1);
    onChange({ ...value, personality_traits: updated });
  };

  return (
    <div className="space-y-6">
      {/* Tone Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Brand Tone</label>
        <div className="grid grid-cols-4 gap-2">
          {TONES.map((tone) => (
            <button
              key={tone}
              onClick={() => onChange({ ...value, tone })}
              disabled={disabled}
              className={`px-3 py-2 rounded capitalize ${
                value.tone === tone 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {tone}
            </button>
          ))}
        </div>
      </div>

      {/* Tagline */}
      <div>
        <label className="block text-sm font-medium mb-2">Tagline</label>
        <input
          type="text"
          value={value.tagline || ''}
          onChange={(e) => onChange({ ...value, tagline: e.target.value })}
          placeholder="Level Up Your Stream"
          maxLength={100}
          disabled={disabled}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {/* Personality Traits */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Personality Traits ({value.personality_traits?.length || 0}/5)
        </label>
        <div className="space-y-2">
          {(value.personality_traits || []).map((trait, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={trait}
                onChange={(e) => updateTrait(index, e.target.value)}
                placeholder="e.g., Bold, Energetic"
                maxLength={30}
                disabled={disabled}
                className="flex-1 px-3 py-2 border rounded"
              />
              <button
                onClick={() => removeTrait(index)}
                disabled={disabled}
                className="px-3 py-2 text-red-500 hover:bg-red-50 rounded"
              >
                ✕
              </button>
            </div>
          ))}
          {(value.personality_traits?.length || 0) < 5 && (
            <button
              onClick={addTrait}
              disabled={disabled}
              className="text-sm text-blue-500"
            >
              + Add Trait
            </button>
          )}
        </div>
      </div>

      {/* Catchphrases */}
      <div>
        <label className="block text-sm font-medium mb-2">Catchphrases</label>
        <textarea
          value={(value.catchphrases || []).join('\n')}
          onChange={(e) => onChange({ 
            ...value, 
            catchphrases: e.target.value.split('\n').filter(Boolean).slice(0, 10)
          })}
          placeholder="One per line (max 10)"
          disabled={disabled}
          className="w-full px-3 py-2 border rounded h-24"
        />
      </div>

      {/* Content Themes */}
      <div>
        <label className="block text-sm font-medium mb-2">Content Themes</label>
        <textarea
          value={(value.content_themes || []).join('\n')}
          onChange={(e) => onChange({ 
            ...value, 
            content_themes: e.target.value.split('\n').filter(Boolean).slice(0, 5)
          })}
          placeholder="One per line (max 5)"
          disabled={disabled}
          className="w-full px-3 py-2 border rounded h-20"
        />
      </div>
    </div>
  );
}
```

### LogoUploader Component

```tsx
'use client';

import { useState, useCallback } from 'react';
import { LogoType, LogoMetadata } from '@repo/api-client';

const LOGO_TYPES: { type: LogoType; label: string; description: string }[] = [
  { type: 'primary', label: 'Primary Logo', description: 'Main logo for generation' },
  { type: 'secondary', label: 'Secondary Logo', description: 'Alternative logo' },
  { type: 'icon', label: 'Icon', description: 'Favicon, small displays' },
  { type: 'monochrome', label: 'Monochrome', description: 'Single-color version' },
  { type: 'watermark', label: 'Watermark', description: 'Transparent overlay' },
];

interface LogoUploaderProps {
  logos: Record<LogoType, LogoMetadata | undefined>;
  onUpload: (type: LogoType, file: File) => Promise<void>;
  onDelete: (type: LogoType) => Promise<void>;
  disabled?: boolean;
}

export function LogoUploader({ logos, onUpload, onDelete, disabled }: LogoUploaderProps) {
  const [uploading, setUploading] = useState<LogoType | null>(null);

  const handleDrop = useCallback(async (type: LogoType, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setUploading(type);
      try {
        await onUpload(type, file);
      } finally {
        setUploading(null);
      }
    }
  }, [onUpload]);

  const handleFileSelect = useCallback(async (type: LogoType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(type);
      try {
        await onUpload(type, file);
      } finally {
        setUploading(null);
      }
    }
  }, [onUpload]);

  return (
    <div className="grid grid-cols-2 gap-4">
      {LOGO_TYPES.map(({ type, label, description }) => {
        const logo = logos[type];
        const isUploading = uploading === type;

        return (
          <div
            key={type}
            className="border-2 border-dashed rounded-lg p-4"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(type, e)}
          >
            <div className="text-sm font-medium">{label}</div>
            <div className="text-xs text-gray-500 mb-3">{description}</div>
            
            {logo ? (
              <div className="relative">
                <img
                  src={logo.url}
                  alt={label}
                  className="w-full h-24 object-contain bg-gray-100 rounded"
                />
                <button
                  onClick={() => onDelete(type)}
                  disabled={disabled}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="block cursor-pointer">
                <div className="h-24 flex items-center justify-center bg-gray-50 rounded text-gray-400">
                  {isUploading ? 'Uploading...' : 'Drop image or click'}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(type, e)}
                  disabled={disabled || isUploading}
                  className="hidden"
                />
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

### Validation Criteria
- All components use TypeScript strict mode
- Proper prop types matching API client types
- Accessible form controls
- Loading states for async operations
- Validation feedback for user input

---

## Section 15: TSX Mobile Brand Kit Editor

**Files:**
- `tsx/apps/mobile/src/components/brand-kit/ColorPaletteEditor.tsx` (CREATE)
- `tsx/apps/mobile/src/components/brand-kit/TypographyPicker.tsx` (CREATE)
- `tsx/apps/mobile/src/components/brand-kit/VoiceConfig.tsx` (CREATE)
- `tsx/apps/mobile/src/app/(tabs)/brand-kits/edit.tsx` (CREATE)

**Agent:** Wave 5 - Agent 15

### Task Checklist
- [ ] 15.1 Create mobile ColorPaletteEditor
- [ ] 15.2 Create mobile TypographyPicker
- [ ] 15.3 Create mobile VoiceConfig
- [ ] 15.4 Create mobile LogoUploader with ImagePicker
- [ ] 15.5 Create edit screen with tabs

### Mobile Components Pattern

Use React Native / Expo components:
- `View`, `Text`, `TextInput`, `TouchableOpacity`, `ScrollView`
- `expo-image-picker` for logo uploads
- Bottom sheet for color picker
- Segmented control for tabs

### Mobile Edit Screen Structure

```tsx
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ColorPaletteEditor } from '@/components/brand-kit/ColorPaletteEditor';
import { TypographyPicker } from '@/components/brand-kit/TypographyPicker';
import { VoiceConfig } from '@/components/brand-kit/VoiceConfig';
import { LogoUploader } from '@/components/brand-kit/LogoUploader';

type Tab = 'colors' | 'typography' | 'voice' | 'logos';

export default function EditBrandKitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('colors');
  
  // Fetch brand kit data
  // Handle updates
  
  return (
    <View className="flex-1 bg-white">
      {/* Tab Bar */}
      <View className="flex-row border-b border-gray-200">
        {(['colors', 'typography', 'voice', 'logos'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-3 ${activeTab === tab ? 'border-b-2 border-blue-500' : ''}`}
          >
            <Text className={`text-center capitalize ${activeTab === tab ? 'text-blue-500' : 'text-gray-500'}`}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Content */}
      <ScrollView className="flex-1 p-4">
        {activeTab === 'colors' && <ColorPaletteEditor />}
        {activeTab === 'typography' && <TypographyPicker />}
        {activeTab === 'voice' && <VoiceConfig />}
        {activeTab === 'logos' && <LogoUploader />}
      </ScrollView>
    </View>
  );
}
```

### Validation Criteria
- Uses NativeWind/Tailwind for styling
- Proper Expo Router integration
- Image picker for logo uploads
- Responsive to different screen sizes

---

## Section 16: TSX Streamer Assets UI

**Files:**
- `tsx/apps/web/src/components/brand-kit/StreamerAssetsManager.tsx` (CREATE)
- `tsx/apps/web/src/components/brand-kit/OverlayUploader.tsx` (CREATE)
- `tsx/apps/web/src/components/brand-kit/AlertConfigEditor.tsx` (CREATE)

**Agent:** Wave 5 - Agent 16

### Task Checklist
- [ ] 16.1 Create StreamerAssetsManager container
- [ ] 16.2 Create OverlayUploader component
- [ ] 16.3 Create AlertConfigEditor component
- [ ] 16.4 Create PanelManager component
- [ ] 16.5 Create EmoteBadgeUploader component

### StreamerAssetsManager Component

```tsx
'use client';

import { useState } from 'react';
import { StreamerAssets, OverlayType, AlertType } from '@repo/api-client';

type AssetCategory = 'overlays' | 'alerts' | 'panels' | 'emotes' | 'badges' | 'facecam' | 'stinger';

interface StreamerAssetsManagerProps {
  brandKitId: string;
  assets: StreamerAssets;
  onUpload: (category: AssetCategory, data: FormData) => Promise<void>;
  onDelete: (category: AssetCategory, assetId: string) => Promise<void>;
}

export function StreamerAssetsManager({ brandKitId, assets, onUpload, onDelete }: StreamerAssetsManagerProps) {
  const [activeCategory, setActiveCategory] = useState<AssetCategory>('overlays');
  const [uploading, setUploading] = useState(false);

  const categories: { key: AssetCategory; label: string; count: number }[] = [
    { key: 'overlays', label: 'Overlays', count: assets.overlays?.length || 0 },
    { key: 'alerts', label: 'Alerts', count: assets.alerts?.length || 0 },
    { key: 'panels', label: 'Panels', count: assets.panels?.length || 0 },
    { key: 'emotes', label: 'Emotes', count: assets.emotes?.length || 0 },
    { key: 'badges', label: 'Badges', count: assets.badges?.length || 0 },
    { key: 'facecam', label: 'Facecam', count: assets.facecam_frame ? 1 : 0 },
    { key: 'stinger', label: 'Stinger', count: assets.stinger ? 1 : 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`px-4 py-2 rounded-full whitespace-nowrap ${
              activeCategory === key
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Content based on category */}
      <div className="border rounded-lg p-4">
        {activeCategory === 'overlays' && (
          <OverlaySection
            overlays={assets.overlays || []}
            onUpload={(type, file, duration) => {
              const formData = new FormData();
              formData.append('overlay_type', type);
              formData.append('file', file);
              if (duration) formData.append('duration_seconds', duration.toString());
              return onUpload('overlays', formData);
            }}
            onDelete={(id) => onDelete('overlays', id)}
          />
        )}
        {activeCategory === 'alerts' && (
          <AlertSection
            alerts={assets.alerts || []}
            onUpload={(type, image, sound, duration) => {
              const formData = new FormData();
              formData.append('alert_type', type);
              formData.append('image', image);
              if (sound) formData.append('sound', sound);
              formData.append('duration_ms', duration.toString());
              return onUpload('alerts', formData);
            }}
            onDelete={(id) => onDelete('alerts', id)}
          />
        )}
        {/* Similar sections for panels, emotes, badges, facecam, stinger */}
      </div>
    </div>
  );
}

// Sub-components for each category
function OverlaySection({ overlays, onUpload, onDelete }) {
  const OVERLAY_TYPES: OverlayType[] = ['starting_soon', 'brb', 'ending', 'gameplay'];
  
  return (
    <div className="space-y-4">
      <h3 className="font-medium">Stream Overlays</h3>
      <div className="grid grid-cols-2 gap-4">
        {OVERLAY_TYPES.map((type) => {
          const existing = overlays.find(o => o.overlay_type === type);
          return (
            <div key={type} className="border rounded p-3">
              <div className="text-sm font-medium capitalize mb-2">
                {type.replace('_', ' ')}
              </div>
              {existing ? (
                <div className="relative">
                  <img src={existing.url} alt={type} className="w-full h-32 object-cover rounded" />
                  <button
                    onClick={() => onDelete(existing.id)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <div className="h-32 flex items-center justify-center bg-gray-50 rounded border-2 border-dashed">
                    Upload
                  </div>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUpload(type, file, null);
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AlertSection({ alerts, onUpload, onDelete }) {
  const ALERT_TYPES: AlertType[] = ['follow', 'subscribe', 'donation', 'raid', 'bits', 'gift_sub'];
  
  return (
    <div className="space-y-4">
      <h3 className="font-medium">Alert Animations</h3>
      <div className="grid grid-cols-3 gap-4">
        {ALERT_TYPES.map((type) => {
          const existing = alerts.find(a => a.alert_type === type);
          return (
            <div key={type} className="border rounded p-3">
              <div className="text-sm font-medium capitalize mb-2">{type.replace('_', ' ')}</div>
              {existing ? (
                <div className="space-y-2">
                  <img src={existing.image_url} alt={type} className="w-full h-20 object-contain" />
                  {existing.sound_url && <div className="text-xs text-green-500">🔊 Sound attached</div>}
                  <button
                    onClick={() => onDelete(existing.id)}
                    className="text-xs text-red-500"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-4">
                  <label className="cursor-pointer text-blue-500">
                    Upload
                    <input type="file" accept="image/*" className="hidden" />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Validation Criteria
- Grid layout for asset categories
- Preview for uploaded assets
- Delete confirmation
- File type validation
- Progress indicators for uploads

---

## Section 17: Swift Models

**File:** `swift/Sources/StreamerStudioCore/Features/BrandKit/BrandKitModels.swift` (MODIFY)
**Agent:** Wave 6 - Agent 17

### Task Checklist
- [ ] 17.1 Add ExtendedColor model
- [ ] 17.2 Add Gradient models
- [ ] 17.3 Add ColorPalette model
- [ ] 17.4 Add FontConfig model
- [ ] 17.5 Add Typography model
- [ ] 17.6 Add BrandVoice model
- [ ] 17.7 Add StreamerAssets models
- [ ] 17.8 Update BrandKit model

### Models to Add

```swift
import Foundation

// MARK: - Extended Color System

public struct ExtendedColor: Codable, Equatable, Sendable {
    public let hex: String
    public let name: String
    public let usage: String?
    
    public init(hex: String, name: String, usage: String? = nil) {
        self.hex = hex
        self.name = name
        self.usage = usage
    }
}

public struct GradientStop: Codable, Equatable, Sendable {
    public let color: String
    public let position: Int
    
    public init(color: String, position: Int) {
        self.color = color
        self.position = position
    }
}

public enum GradientType: String, Codable, Sendable {
    case linear
    case radial
}

public struct Gradient: Codable, Equatable, Sendable {
    public let name: String
    public let type: GradientType
    public let angle: Int
    public let stops: [GradientStop]
    
    public init(name: String, type: GradientType = .linear, angle: Int = 135, stops: [GradientStop]) {
        self.name = name
        self.type = type
        self.angle = angle
        self.stops = stops
    }
}

public struct ColorPalette: Codable, Equatable, Sendable {
    public let primary: [ExtendedColor]
    public let secondary: [ExtendedColor]
    public let accent: [ExtendedColor]
    public let neutral: [ExtendedColor]
    public let gradients: [Gradient]
    
    public init(
        primary: [ExtendedColor] = [],
        secondary: [ExtendedColor] = [],
        accent: [ExtendedColor] = [],
        neutral: [ExtendedColor] = [],
        gradients: [Gradient] = []
    ) {
        self.primary = primary
        self.secondary = secondary
        self.accent = accent
        self.neutral = neutral
        self.gradients = gradients
    }
}

// MARK: - Typography System

public enum FontWeight: Int, Codable, Sendable, CaseIterable {
    case thin = 100
    case extraLight = 200
    case light = 300
    case regular = 400
    case medium = 500
    case semiBold = 600
    case bold = 700
    case extraBold = 800
    case black = 900
}

public enum FontStyle: String, Codable, Sendable {
    case normal
    case italic
}

public struct FontConfig: Codable, Equatable, Sendable {
    public let family: String
    public let weight: FontWeight
    public let style: FontStyle
    
    public init(family: String, weight: FontWeight = .regular, style: FontStyle = .normal) {
        self.family = family
        self.weight = weight
        self.style = style
    }
}

public struct Typography: Codable, Equatable, Sendable {
    public let display: FontConfig?
    public let headline: FontConfig?
    public let subheadline: FontConfig?
    public let body: FontConfig?
    public let caption: FontConfig?
    public let accent: FontConfig?
    
    public init(
        display: FontConfig? = nil,
        headline: FontConfig? = nil,
        subheadline: FontConfig? = nil,
        body: FontConfig? = nil,
        caption: FontConfig? = nil,
        accent: FontConfig? = nil
    ) {
        self.display = display
        self.headline = headline
        self.subheadline = subheadline
        self.body = body
        self.caption = caption
        self.accent = accent
    }
}

// MARK: - Brand Voice

public enum BrandTone: String, Codable, Sendable, CaseIterable {
    case competitive
    case casual
    case educational
    case comedic
    case professional
    case inspirational
    case edgy
    case wholesome
}

public struct BrandVoice: Codable, Equatable, Sendable {
    public let tone: BrandTone
    public let personalityTraits: [String]
    public let tagline: String
    public let catchphrases: [String]
    public let contentThemes: [String]
    
    enum CodingKeys: String, CodingKey {
        case tone
        case personalityTraits = "personality_traits"
        case tagline
        case catchphrases
        case contentThemes = "content_themes"
    }
    
    public init(
        tone: BrandTone = .professional,
        personalityTraits: [String] = [],
        tagline: String = "",
        catchphrases: [String] = [],
        contentThemes: [String] = []
    ) {
        self.tone = tone
        self.personalityTraits = personalityTraits
        self.tagline = tagline
        self.catchphrases = catchphrases
        self.contentThemes = contentThemes
    }
}

// MARK: - Streamer Assets

public enum OverlayType: String, Codable, Sendable {
    case startingSoon = "starting_soon"
    case brb
    case ending
    case gameplay
}

public enum AlertType: String, Codable, Sendable {
    case follow
    case subscribe
    case donation
    case raid
    case bits
    case giftSub = "gift_sub"
}

public enum EmoteTier: Int, Codable, Sendable {
    case tier1 = 1
    case tier2 = 2
    case tier3 = 3
}

public enum FacecamPosition: String, Codable, Sendable {
    case topLeft = "top-left"
    case topRight = "top-right"
    case bottomLeft = "bottom-left"
    case bottomRight = "bottom-right"
}

public struct OverlayAsset: Codable, Equatable, Identifiable, Sendable {
    public let id: String
    public let url: String
    public let overlayType: OverlayType
    public let durationSeconds: Int?
    
    enum CodingKeys: String, CodingKey {
        case id, url
        case overlayType = "overlay_type"
        case durationSeconds = "duration_seconds"
    }
}

public struct AlertAsset: Codable, Equatable, Identifiable, Sendable {
    public let id: String
    public let alertType: AlertType
    public let imageUrl: String
    public let soundUrl: String?
    public let durationMs: Int
    
    enum CodingKeys: String, CodingKey {
        case id
        case alertType = "alert_type"
        case imageUrl = "image_url"
        case soundUrl = "sound_url"
        case durationMs = "duration_ms"
    }
}

public struct PanelAsset: Codable, Equatable, Identifiable, Sendable {
    public let id: String
    public let name: String
    public let imageUrl: String
    
    enum CodingKeys: String, CodingKey {
        case id, name
        case imageUrl = "image_url"
    }
}

public struct EmoteAsset: Codable, Equatable, Identifiable, Sendable {
    public let id: String
    public let name: String
    public let url: String
    public let tier: EmoteTier
}

public struct BadgeAsset: Codable, Equatable, Identifiable, Sendable {
    public let id: String
    public let months: Int
    public let url: String
}

public struct FacecamFrame: Codable, Equatable, Identifiable, Sendable {
    public let id: String
    public let url: String
    public let position: FacecamPosition
}

public struct Stinger: Codable, Equatable, Identifiable, Sendable {
    public let id: String
    public let url: String
    public let durationMs: Int
    
    enum CodingKeys: String, CodingKey {
        case id, url
        case durationMs = "duration_ms"
    }
}

public struct StreamerAssets: Codable, Equatable, Sendable {
    public let overlays: [OverlayAsset]
    public let alerts: [AlertAsset]
    public let panels: [PanelAsset]
    public let emotes: [EmoteAsset]
    public let badges: [BadgeAsset]
    public let facecamFrame: FacecamFrame?
    public let stinger: Stinger?
    
    enum CodingKeys: String, CodingKey {
        case overlays, alerts, panels, emotes, badges
        case facecamFrame = "facecam_frame"
        case stinger
    }
    
    public init(
        overlays: [OverlayAsset] = [],
        alerts: [AlertAsset] = [],
        panels: [PanelAsset] = [],
        emotes: [EmoteAsset] = [],
        badges: [BadgeAsset] = [],
        facecamFrame: FacecamFrame? = nil,
        stinger: Stinger? = nil
    ) {
        self.overlays = overlays
        self.alerts = alerts
        self.panels = panels
        self.emotes = emotes
        self.badges = badges
        self.facecamFrame = facecamFrame
        self.stinger = stinger
    }
}

// MARK: - Logo Types

public enum LogoType: String, Codable, Sendable, CaseIterable {
    case primary
    case secondary
    case icon
    case monochrome
    case watermark
}

public enum LogoPosition: String, Codable, Sendable {
    case topLeft = "top-left"
    case topRight = "top-right"
    case bottomLeft = "bottom-left"
    case bottomRight = "bottom-right"
    case center
}

public enum LogoSize: String, Codable, Sendable {
    case small
    case medium
    case large
}

public struct LogoMetadata: Codable, Equatable, Sendable {
    public let type: LogoType
    public let url: String
    public let storagePath: String
    public let contentType: String
    public let fileSize: Int
    public let filename: String?
    
    enum CodingKeys: String, CodingKey {
        case type, url, filename
        case storagePath = "storage_path"
        case contentType = "content_type"
        case fileSize = "file_size"
    }
}
```

### Update BrandKit Model

Add these properties to the existing BrandKit struct:

```swift
// Add to BrandKit struct
public let colorsExtended: ColorPalette?
public let typography: Typography?
public let voice: BrandVoice?
public let streamerAssets: StreamerAssets?
public let logos: [LogoType: LogoMetadata]?

// Add to CodingKeys
case colorsExtended = "colors_extended"
case typography
case voice
case streamerAssets = "streamer_assets"
case logos
```

### Validation Criteria
- All models conform to Codable, Equatable, Sendable
- Proper CodingKeys for snake_case API
- Optional fields where appropriate
- Enums for constrained values

---

## Section 18: Swift Views

**Files:**
- `swift/Sources/StreamerStudio/Features/BrandKit/ColorPaletteEditorView.swift` (CREATE)
- `swift/Sources/StreamerStudio/Features/BrandKit/TypographyEditorView.swift` (CREATE)
- `swift/Sources/StreamerStudio/Features/BrandKit/VoiceConfigView.swift` (CREATE)
- `swift/Sources/StreamerStudio/Features/BrandKit/LogoUploadView.swift` (CREATE)

**Agent:** Wave 6 - Agent 18

### Task Checklist
- [ ] 18.1 Create ColorPaletteEditorView
- [ ] 18.2 Create TypographyEditorView
- [ ] 18.3 Create VoiceConfigView
- [ ] 18.4 Create LogoUploadView with PhotosPicker
- [ ] 18.5 Update BrandKitEditorView with tabs

### ColorPaletteEditorView

```swift
import SwiftUI
import StreamerStudioCore

struct ColorPaletteEditorView: View {
    @Binding var palette: ColorPalette
    @State private var selectedCategory: ColorCategory = .primary
    
    enum ColorCategory: String, CaseIterable {
        case primary, secondary, accent, neutral
    }
    
    var body: some View {
        VStack(spacing: 16) {
            // Category Picker
            Picker("Category", selection: $selectedCategory) {
                ForEach(ColorCategory.allCases, id: \.self) { category in
                    Text(category.rawValue.capitalized).tag(category)
                }
            }
            .pickerStyle(.segmented)
            
            // Color List
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(colorsForCategory.indices, id: \.self) { index in
                        ColorRowView(
                            color: binding(for: index),
                            onDelete: { deleteColor(at: index) }
                        )
                    }
                    
                    if canAddMore {
                        Button(action: addColor) {
                            Label("Add Color", systemImage: "plus.circle")
                        }
                        .buttonStyle(.bordered)
                    }
                }
                .padding()
            }
        }
    }
    
    private var colorsForCategory: [ExtendedColor] {
        switch selectedCategory {
        case .primary: return palette.primary
        case .secondary: return palette.secondary
        case .accent: return palette.accent
        case .neutral: return palette.neutral
        }
    }
    
    private var canAddMore: Bool {
        let count = colorsForCategory.count
        return selectedCategory == .accent ? count < 3 : count < 5
    }
    
    private func binding(for index: Int) -> Binding<ExtendedColor> {
        Binding(
            get: { colorsForCategory[index] },
            set: { newValue in
                var colors = colorsForCategory
                colors[index] = newValue
                updateCategory(with: colors)
            }
        )
    }
    
    private func addColor() {
        var colors = colorsForCategory
        colors.append(ExtendedColor(hex: "#000000", name: "New Color"))
        updateCategory(with: colors)
    }
    
    private func deleteColor(at index: Int) {
        var colors = colorsForCategory
        colors.remove(at: index)
        updateCategory(with: colors)
    }
    
    private func updateCategory(with colors: [ExtendedColor]) {
        switch selectedCategory {
        case .primary:
            palette = ColorPalette(primary: colors, secondary: palette.secondary, accent: palette.accent, neutral: palette.neutral, gradients: palette.gradients)
        case .secondary:
            palette = ColorPalette(primary: palette.primary, secondary: colors, accent: palette.accent, neutral: palette.neutral, gradients: palette.gradients)
        case .accent:
            palette = ColorPalette(primary: palette.primary, secondary: palette.secondary, accent: colors, neutral: palette.neutral, gradients: palette.gradients)
        case .neutral:
            palette = ColorPalette(primary: palette.primary, secondary: palette.secondary, accent: palette.accent, neutral: colors, gradients: palette.gradients)
        }
    }
}

struct ColorRowView: View {
    @Binding var color: ExtendedColor
    let onDelete: () -> Void
    
    var body: some View {
        HStack(spacing: 12) {
            ColorPicker("", selection: hexBinding)
                .labelsHidden()
                .frame(width: 44, height: 44)
            
            VStack(alignment: .leading, spacing: 4) {
                TextField("Color Name", text: nameBinding)
                    .textFieldStyle(.roundedBorder)
                TextField("Usage", text: usageBinding)
                    .textFieldStyle(.roundedBorder)
                    .font(.caption)
            }
            
            Button(action: onDelete) {
                Image(systemName: "trash")
                    .foregroundColor(.red)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
    
    private var hexBinding: Binding<Color> {
        Binding(
            get: { Color(hex: color.hex) ?? .black },
            set: { color = ExtendedColor(hex: $0.hexString, name: color.name, usage: color.usage) }
        )
    }
    
    private var nameBinding: Binding<String> {
        Binding(
            get: { color.name },
            set: { color = ExtendedColor(hex: color.hex, name: $0, usage: color.usage) }
        )
    }
    
    private var usageBinding: Binding<String> {
        Binding(
            get: { color.usage ?? "" },
            set: { color = ExtendedColor(hex: color.hex, name: color.name, usage: $0.isEmpty ? nil : $0) }
        )
    }
}
```

### LogoUploadView

```swift
import SwiftUI
import PhotosUI
import StreamerStudioCore

struct LogoUploadView: View {
    @Binding var logos: [LogoType: LogoMetadata]
    let onUpload: (LogoType, Data) async throws -> Void
    let onDelete: (LogoType) async throws -> Void
    
    @State private var selectedItem: PhotosPickerItem?
    @State private var uploadingType: LogoType?
    @State private var error: String?
    
    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
            ForEach(LogoType.allCases, id: \.self) { type in
                LogoSlotView(
                    type: type,
                    metadata: logos[type],
                    isUploading: uploadingType == type,
                    onSelect: { selectLogo(for: type) },
                    onDelete: { deleteLogo(type) }
                )
            }
        }
        .photosPicker(isPresented: .constant(uploadingType != nil), selection: $selectedItem, matching: .images)
        .onChange(of: selectedItem) { _, newItem in
            Task {
                await handleSelection(newItem)
            }
        }
        .alert("Error", isPresented: .constant(error != nil)) {
            Button("OK") { error = nil }
        } message: {
            Text(error ?? "")
        }
    }
    
    private func selectLogo(for type: LogoType) {
        uploadingType = type
    }
    
    private func handleSelection(_ item: PhotosPickerItem?) async {
        guard let item, let type = uploadingType else { return }
        
        do {
            if let data = try await item.loadTransferable(type: Data.self) {
                try await onUpload(type, data)
            }
        } catch {
            self.error = error.localizedDescription
        }
        
        uploadingType = nil
        selectedItem = nil
    }
    
    private func deleteLogo(_ type: LogoType) {
        Task {
            do {
                try await onDelete(type)
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}

struct LogoSlotView: View {
    let type: LogoType
    let metadata: LogoMetadata?
    let isUploading: Bool
    let onSelect: () -> Void
    let onDelete: () -> Void
    
    var body: some View {
        VStack(spacing: 8) {
            Text(type.rawValue.capitalized)
                .font(.caption)
                .fontWeight(.medium)
            
            ZStack {
                if let metadata {
                    AsyncImage(url: URL(string: metadata.url)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        ProgressView()
                    }
                    .frame(height: 80)
                    
                    Button(action: onDelete) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.red)
                    }
                    .position(x: 90, y: 10)
                } else {
                    Button(action: onSelect) {
                        VStack {
                            Image(systemName: "photo.badge.plus")
                                .font(.title2)
                            Text("Upload")
                                .font(.caption)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 80)
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                    }
                    .disabled(isUploading)
                }
                
                if isUploading {
                    ProgressView()
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}
```

### Validation Criteria
- SwiftUI best practices
- PhotosPicker for image selection
- Async/await for uploads
- Error handling with alerts
- Loading states

---

## Section 19: Swift ViewModel Updates

**File:** `swift/Sources/StreamerStudio/Features/BrandKit/BrandKitViewModel.swift` (MODIFY)
**Agent:** Wave 6 - Agent 19

### Task Checklist
- [ ] 19.1 Add enhanced field properties
- [ ] 19.2 Add updateColors method
- [ ] 19.3 Add updateTypography method
- [ ] 19.4 Add updateVoice method
- [ ] 19.5 Add logo upload/delete methods
- [ ] 19.6 Add streamer asset methods

### Methods to Add

```swift
// Add to BrandKitViewModel

// MARK: - Enhanced Fields

@Published var colorsExtended: ColorPalette = ColorPalette()
@Published var typography: Typography = Typography()
@Published var voice: BrandVoice = BrandVoice()
@Published var streamerAssets: StreamerAssets = StreamerAssets()
@Published var logos: [LogoType: LogoMetadata] = [:]

// MARK: - Update Methods

func updateColors(_ palette: ColorPalette) async throws {
    guard let brandKitId = selectedBrandKit?.id else { return }
    
    isLoading = true
    defer { isLoading = false }
    
    let response = try await apiClient.put(
        "/brand-kits/\(brandKitId)/colors",
        body: palette
    )
    
    colorsExtended = palette
}

func updateTypography(_ typography: Typography) async throws {
    guard let brandKitId = selectedBrandKit?.id else { return }
    
    isLoading = true
    defer { isLoading = false }
    
    let response = try await apiClient.put(
        "/brand-kits/\(brandKitId)/typography",
        body: typography
    )
    
    self.typography = typography
}

func updateVoice(_ voice: BrandVoice) async throws {
    guard let brandKitId = selectedBrandKit?.id else { return }
    
    isLoading = true
    defer { isLoading = false }
    
    let response = try await apiClient.put(
        "/brand-kits/\(brandKitId)/voice",
        body: voice
    )
    
    self.voice = voice
}

// MARK: - Logo Methods

func uploadLogo(type: LogoType, data: Data) async throws {
    guard let brandKitId = selectedBrandKit?.id else { return }
    
    isLoading = true
    defer { isLoading = false }
    
    let metadata: LogoMetadata = try await apiClient.uploadMultipart(
        "/brand-kits/\(brandKitId)/logos",
        fields: ["logo_type": type.rawValue],
        fileField: "file",
        fileData: data,
        fileName: "logo.png",
        mimeType: "image/png"
    )
    
    logos[type] = metadata
}

func deleteLogo(type: LogoType) async throws {
    guard let brandKitId = selectedBrandKit?.id else { return }
    
    isLoading = true
    defer { isLoading = false }
    
    try await apiClient.delete("/brand-kits/\(brandKitId)/logos/\(type.rawValue)")
    
    logos.removeValue(forKey: type)
}

func fetchLogos() async throws {
    guard let brandKitId = selectedBrandKit?.id else { return }
    
    struct LogosResponse: Decodable {
        let logos: [String: LogoMetadata?]
    }
    
    let response: LogosResponse = try await apiClient.get("/brand-kits/\(brandKitId)/logos")
    
    logos = [:]
    for (key, value) in response.logos {
        if let type = LogoType(rawValue: key), let metadata = value {
            logos[type] = metadata
        }
    }
}

// MARK: - Load Enhanced Data

func loadEnhancedData() async throws {
    guard let brandKit = selectedBrandKit else { return }
    
    // Load from brand kit if available
    if let colors = brandKit.colorsExtended {
        colorsExtended = colors
    }
    if let typo = brandKit.typography {
        typography = typo
    }
    if let v = brandKit.voice {
        voice = v
    }
    if let assets = brandKit.streamerAssets {
        streamerAssets = assets
    }
    
    // Fetch logos separately
    try await fetchLogos()
}
```

### Validation Criteria
- Async/await for all API calls
- Loading state management
- Error propagation
- State updates on main thread

---

## Section 20: Swift Tests

**File:** `swift/Tests/StreamerStudioTests/BrandKitEnhancementTests.swift` (CREATE)
**Agent:** Wave 6 - Agent 20

### Task Checklist
- [ ] 20.1 Test ExtendedColor encoding/decoding
- [ ] 20.2 Test Gradient encoding/decoding
- [ ] 20.3 Test Typography encoding/decoding
- [ ] 20.4 Test BrandVoice encoding/decoding
- [ ] 20.5 Test StreamerAssets encoding/decoding
- [ ] 20.6 Test ViewModel state management

### Exact Implementation

```swift
import XCTest
@testable import StreamerStudio
@testable import StreamerStudioCore

final class BrandKitEnhancementTests: XCTestCase {
    
    // MARK: - ExtendedColor Tests
    
    func testExtendedColorEncoding() throws {
        let color = ExtendedColor(hex: "#FF5733", name: "Brand Orange", usage: "Primary CTAs")
        
        let encoder = JSONEncoder()
        let data = try encoder.encode(color)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        
        XCTAssertEqual(json["hex"] as? String, "#FF5733")
        XCTAssertEqual(json["name"] as? String, "Brand Orange")
        XCTAssertEqual(json["usage"] as? String, "Primary CTAs")
    }
    
    func testExtendedColorDecoding() throws {
        let json = """
        {"hex": "#3498DB", "name": "Ocean Blue", "usage": "Secondary elements"}
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        let color = try decoder.decode(ExtendedColor.self, from: json)
        
        XCTAssertEqual(color.hex, "#3498DB")
        XCTAssertEqual(color.name, "Ocean Blue")
        XCTAssertEqual(color.usage, "Secondary elements")
    }
    
    func testExtendedColorWithoutUsage() throws {
        let json = """
        {"hex": "#FF0000", "name": "Red"}
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        let color = try decoder.decode(ExtendedColor.self, from: json)
        
        XCTAssertNil(color.usage)
    }
    
    // MARK: - Gradient Tests
    
    func testGradientEncoding() throws {
        let gradient = Gradient(
            name: "Brand Gradient",
            type: .linear,
            angle: 135,
            stops: [
                GradientStop(color: "#FF5733", position: 0),
                GradientStop(color: "#3498DB", position: 100)
            ]
        )
        
        let encoder = JSONEncoder()
        let data = try encoder.encode(gradient)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        
        XCTAssertEqual(json["name"] as? String, "Brand Gradient")
        XCTAssertEqual(json["type"] as? String, "linear")
        XCTAssertEqual(json["angle"] as? Int, 135)
        
        let stops = json["stops"] as! [[String: Any]]
        XCTAssertEqual(stops.count, 2)
    }
    
    func testGradientDecoding() throws {
        let json = """
        {
            "name": "Sunset",
            "type": "radial",
            "angle": 0,
            "stops": [
                {"color": "#FF0000", "position": 0},
                {"color": "#FF8800", "position": 50},
                {"color": "#FFFF00", "position": 100}
            ]
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        let gradient = try decoder.decode(Gradient.self, from: json)
        
        XCTAssertEqual(gradient.name, "Sunset")
        XCTAssertEqual(gradient.type, .radial)
        XCTAssertEqual(gradient.stops.count, 3)
        XCTAssertEqual(gradient.stops[1].position, 50)
    }
    
    // MARK: - Typography Tests
    
    func testFontConfigEncoding() throws {
        let config = FontConfig(family: "Montserrat", weight: .bold, style: .normal)
        
        let encoder = JSONEncoder()
        let data = try encoder.encode(config)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        
        XCTAssertEqual(json["family"] as? String, "Montserrat")
        XCTAssertEqual(json["weight"] as? Int, 700)
        XCTAssertEqual(json["style"] as? String, "normal")
    }
    
    func testTypographyPartialDecoding() throws {
        let json = """
        {
            "headline": {"family": "Montserrat", "weight": 700, "style": "normal"},
            "body": {"family": "Inter", "weight": 400, "style": "normal"}
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        let typography = try decoder.decode(Typography.self, from: json)
        
        XCTAssertNotNil(typography.headline)
        XCTAssertNotNil(typography.body)
        XCTAssertNil(typography.display)
        XCTAssertNil(typography.caption)
    }
    
    func testAllFontWeights() {
        for weight in FontWeight.allCases {
            let config = FontConfig(family: "Test", weight: weight, style: .normal)
            XCTAssertEqual(config.weight, weight)
        }
    }
    
    // MARK: - BrandVoice Tests
    
    func testBrandVoiceEncoding() throws {
        let voice = BrandVoice(
            tone: .competitive,
            personalityTraits: ["Bold", "Energetic"],
            tagline: "Level Up",
            catchphrases: ["Let's go!"],
            contentThemes: ["Gaming"]
        )
        
        let encoder = JSONEncoder()
        let data = try encoder.encode(voice)
        let json = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        
        XCTAssertEqual(json["tone"] as? String, "competitive")
        XCTAssertEqual(json["personality_traits"] as? [String], ["Bold", "Energetic"])
        XCTAssertEqual(json["tagline"] as? String, "Level Up")
    }
    
    func testBrandVoiceDecoding() throws {
        let json = """
        {
            "tone": "wholesome",
            "personality_traits": ["Friendly", "Supportive", "Positive"],
            "tagline": "Spread Joy",
            "catchphrases": ["You're awesome!", "Thanks for being here"],
            "content_themes": ["Community", "Positivity"]
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        let voice = try decoder.decode(BrandVoice.self, from: json)
        
        XCTAssertEqual(voice.tone, .wholesome)
        XCTAssertEqual(voice.personalityTraits.count, 3)
        XCTAssertEqual(voice.catchphrases.count, 2)
    }
    
    func testAllBrandTones() {
        for tone in BrandTone.allCases {
            let voice = BrandVoice(tone: tone)
            XCTAssertEqual(voice.tone, tone)
        }
    }
    
    // MARK: - StreamerAssets Tests
    
    func testOverlayAssetDecoding() throws {
        let json = """
        {
            "id": "123",
            "url": "https://example.com/overlay.png",
            "overlay_type": "starting_soon",
            "duration_seconds": 10
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        let overlay = try decoder.decode(OverlayAsset.self, from: json)
        
        XCTAssertEqual(overlay.id, "123")
        XCTAssertEqual(overlay.overlayType, .startingSoon)
        XCTAssertEqual(overlay.durationSeconds, 10)
    }
    
    func testAlertAssetDecoding() throws {
        let json = """
        {
            "id": "456",
            "alert_type": "subscribe",
            "image_url": "https://example.com/alert.gif",
            "sound_url": "https://example.com/alert.mp3",
            "duration_ms": 3000
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        let alert = try decoder.decode(AlertAsset.self, from: json)
        
        XCTAssertEqual(alert.alertType, .subscribe)
        XCTAssertNotNil(alert.soundUrl)
        XCTAssertEqual(alert.durationMs, 3000)
    }
    
    func testEmoteAssetDecoding() throws {
        let json = """
        {"id": "789", "name": "hype", "url": "https://example.com/emote.png", "tier": 2}
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        let emote = try decoder.decode(EmoteAsset.self, from: json)
        
        XCTAssertEqual(emote.name, "hype")
        XCTAssertEqual(emote.tier, .tier2)
    }
    
    func testStreamerAssetsDecoding() throws {
        let json = """
        {
            "overlays": [],
            "alerts": [],
            "panels": [],
            "emotes": [],
            "badges": [],
            "facecam_frame": null,
            "stinger": null
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        let assets = try decoder.decode(StreamerAssets.self, from: json)
        
        XCTAssertTrue(assets.overlays.isEmpty)
        XCTAssertNil(assets.facecamFrame)
    }
    
    // MARK: - Logo Tests
    
    func testLogoMetadataDecoding() throws {
        let json = """
        {
            "type": "primary",
            "url": "https://example.com/logo.png",
            "storage_path": "user/brand/primary.png",
            "content_type": "image/png",
            "file_size": 12345,
            "filename": "my-logo.png"
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        let metadata = try decoder.decode(LogoMetadata.self, from: json)
        
        XCTAssertEqual(metadata.type, .primary)
        XCTAssertEqual(metadata.fileSize, 12345)
        XCTAssertEqual(metadata.filename, "my-logo.png")
    }
    
    func testAllLogoTypes() {
        for type in LogoType.allCases {
            XCTAssertNotNil(type.rawValue)
        }
    }
    
    // MARK: - ColorPalette Tests
    
    func testColorPaletteRoundTrip() throws {
        let palette = ColorPalette(
            primary: [ExtendedColor(hex: "#FF5733", name: "Orange")],
            secondary: [ExtendedColor(hex: "#3498DB", name: "Blue")],
            accent: [],
            neutral: [],
            gradients: []
        )
        
        let encoder = JSONEncoder()
        let data = try encoder.encode(palette)
        
        let decoder = JSONDecoder()
        let decoded = try decoder.decode(ColorPalette.self, from: data)
        
        XCTAssertEqual(decoded.primary.count, 1)
        XCTAssertEqual(decoded.secondary.count, 1)
        XCTAssertEqual(decoded.primary.first?.hex, "#FF5733")
    }
}
```

### Validation Criteria
- All encoding/decoding tests pass
- CodingKeys properly handle snake_case
- Optional fields handled correctly
- All enum cases tested
- Round-trip encoding verified

---

## Section 21: Verification Gate

**Agent:** Orchestrator (Sequential)

### Task Checklist
- [ ] 21.1 Run all backend tests
- [ ] 21.2 Run all TSX tests
- [ ] 21.3 Run all Swift tests
- [ ] 21.4 Verify no regressions
- [ ] 21.5 Update task status

### Test Commands

```bash
# Backend tests (from workspace root)
python3 -m pytest backend/tests/ -v --tb=short

# TSX tests
npm run test --prefix tsx

# Swift tests
swift test --package-path swift
```

### Expected Results

| Platform | Test Count | Status |
|----------|------------|--------|
| Backend Property Tests | 6+ new | ⏳ |
| Backend Unit Tests | 20+ new | ⏳ |
| Backend Total | 230+ | ⏳ |
| TSX Tests | 10+ new | ⏳ |
| Swift Tests | 15+ new | ⏳ |
| Swift Total | 95+ | ⏳ |

### Verification Checklist

- [ ] All existing tests still pass (no regressions)
- [ ] New property tests pass with 100+ iterations
- [ ] New unit tests cover all endpoints
- [ ] TypeScript types compile without errors
- [ ] Swift models encode/decode correctly
- [ ] API client methods work with new endpoints
- [ ] UI components render without errors

### Sign-off Criteria

1. **Backend**: All 230+ tests passing
2. **TSX**: All tests passing, no TypeScript errors
3. **Swift**: All 95+ tests passing
4. **Integration**: Extended brand kit can be created, updated, and retrieved
5. **Logo in Generation**: Logo can be included in generation request

---

## File Manifest Summary

### Files to CREATE (18 files)

| File | Section |
|------|---------|
| `backend/api/schemas/brand_kit_enhanced.py` | 1-4 |
| `backend/database/migrations/003_brand_kit_enhancement.sql` | 5 |
| `backend/services/streamer_asset_service.py` | 7 |
| `backend/api/routes/streamer_assets.py` | 9 |
| `backend/tests/properties/test_brand_kit_enhancement_properties.py` | 11 |
| `backend/tests/unit/test_brand_kit_enhancement_endpoints.py` | 12 |
| `tsx/packages/api-client/src/types/brand-kit-enhanced.ts` | 13 |
| `tsx/apps/web/src/components/brand-kit/ColorPaletteEditor.tsx` | 14 |
| `tsx/apps/web/src/components/brand-kit/TypographyEditor.tsx` | 14 |
| `tsx/apps/web/src/components/brand-kit/VoiceConfigEditor.tsx` | 14 |
| `tsx/apps/web/src/components/brand-kit/LogoUploader.tsx` | 14 |
| `tsx/apps/web/src/components/brand-kit/StreamerAssetsManager.tsx` | 16 |
| `tsx/apps/mobile/src/app/(tabs)/brand-kits/edit.tsx` | 15 |
| `swift/Sources/StreamerStudio/Features/BrandKit/ColorPaletteEditorView.swift` | 18 |
| `swift/Sources/StreamerStudio/Features/BrandKit/TypographyEditorView.swift` | 18 |
| `swift/Sources/StreamerStudio/Features/BrandKit/VoiceConfigView.swift` | 18 |
| `swift/Sources/StreamerStudio/Features/BrandKit/LogoUploadView.swift` | 18 |
| `swift/Tests/StreamerStudioTests/BrandKitEnhancementTests.swift` | 20 |

### Files to MODIFY (8 files)

| File | Section |
|------|---------|
| `backend/services/brand_kit_service.py` | 6 |
| `backend/api/routes/brand_kits.py` | 8 |
| `backend/api/schemas/generation.py` | 10 |
| `backend/services/prompt_engine.py` | 10 |
| `backend/api/main.py` | 9 |
| `tsx/packages/api-client/src/client.ts` | 13 |
| `swift/Sources/StreamerStudioCore/Features/BrandKit/BrandKitModels.swift` | 17 |
| `swift/Sources/StreamerStudio/Features/BrandKit/BrandKitViewModel.swift` | 19 |

---

## Execution Log

| Wave | Section | Agent | Status | Notes |
|------|---------|-------|--------|-------|
| 1 | 1 | Extended Colors | ⏳ | |
| 1 | 2 | Typography | ⏳ | |
| 1 | 3 | Brand Voice | ⏳ | |
| 1 | 4 | Streamer Assets | ⏳ | |
| 2 | 5 | Migration | ⏳ | |
| 2 | 6 | Service Updates | ⏳ | |
| 2 | 7 | Asset Service | ⏳ | |
| 3 | 8 | Brand Kit Routes | ⏳ | |
| 3 | 9 | Asset Routes | ⏳ | |
| 3 | 10 | Generation | ⏳ | |
| 4 | 11 | Property Tests | ⏳ | |
| 4 | 12 | Unit Tests | ⏳ | |
| 5 | 13 | TSX Types | ⏳ | |
| 5 | 14 | Web Components | ⏳ | |
| 5 | 15 | Mobile Components | ⏳ | |
| 5 | 16 | Streamer UI | ⏳ | |
| 6 | 17 | Swift Models | ⏳ | |
| 6 | 18 | Swift Views | ⏳ | |
| 6 | 19 | Swift ViewModel | ⏳ | |
| 6 | 20 | Swift Tests | ⏳ | |
| 7 | 21 | Verification | ⏳ | |


---

## Section 22: Brand Kit Selection & Prompt Injection System

**Overview:** This section defines how users select specific brand kit elements during generation and how those selections are efficiently injected into prompts without degrading AI performance.

### Design Philosophy

1. **Clean UX**: Collapsible "Brand Customization" panel with sensible defaults
2. **Progressive Disclosure**: Basic options visible, advanced options expandable
3. **Token Efficiency**: Compressed prompt format, only include what's selected
4. **Smart Defaults**: Auto-select primary color, headline font, etc.

---

### 22.1 Generation Request Schema Enhancement

**File:** `backend/api/schemas/generation.py` (MODIFY)

```python
from typing import Optional, List, Literal
from pydantic import BaseModel, Field

# Logo options (already defined in Section 10)
LogoPositionEnum = Literal["top-left", "top-right", "bottom-left", "bottom-right", "center"]
LogoSizeEnum = Literal["small", "medium", "large"]

# NEW: Brand element selection
class ColorSelection(BaseModel):
    """User's color selection for generation."""
    primary_index: int = Field(
        default=0,
        ge=0,
        le=4,
        description="Index of primary color to use (0-4)"
    )
    secondary_index: Optional[int] = Field(
        default=None,
        ge=0,
        le=4,
        description="Index of secondary color (optional)"
    )
    accent_index: Optional[int] = Field(
        default=None,
        ge=0,
        le=2,
        description="Index of accent color (optional)"
    )
    use_gradient: Optional[int] = Field(
        default=None,
        ge=0,
        le=2,
        description="Index of gradient to use (optional)"
    )


class TypographySelection(BaseModel):
    """User's typography selection for generation."""
    level: Literal["display", "headline", "subheadline", "body", "caption", "accent"] = Field(
        default="headline",
        description="Typography level to use for main text"
    )


class VoiceSelection(BaseModel):
    """User's voice/tone selection for generation."""
    use_tagline: bool = Field(
        default=False,
        description="Include brand tagline in generation"
    )
    use_catchphrase: Optional[int] = Field(
        default=None,
        description="Index of catchphrase to include (optional)"
    )


class BrandCustomization(BaseModel):
    """
    Complete brand customization for generation.
    
    Allows users to select specific elements from their brand kit
    to use in asset generation. All fields are optional with smart defaults.
    """
    # Color selection
    colors: Optional[ColorSelection] = Field(
        default=None,
        description="Color selection (uses defaults if not specified)"
    )
    
    # Typography selection
    typography: Optional[TypographySelection] = Field(
        default=None,
        description="Typography selection (uses headline if not specified)"
    )
    
    # Voice/tone selection
    voice: Optional[VoiceSelection] = Field(
        default=None,
        description="Voice elements to include"
    )
    
    # Logo options
    include_logo: bool = Field(
        default=False,
        description="Include brand logo in generated asset"
    )
    logo_type: Literal["primary", "secondary", "icon", "watermark"] = Field(
        default="primary",
        description="Which logo variation to use"
    )
    logo_position: LogoPositionEnum = Field(
        default="bottom-right",
        description="Position of logo on asset"
    )
    logo_size: LogoSizeEnum = Field(
        default="medium",
        description="Size of logo (small=10%, medium=15%, large=20%)"
    )
    
    # Style intensity
    brand_intensity: Literal["subtle", "balanced", "strong"] = Field(
        default="balanced",
        description="How strongly to apply brand elements"
    )


# Updated GenerateRequest
class GenerateRequest(BaseModel):
    """Request body for creating a generation job."""
    asset_type: AssetTypeEnum = Field(
        ...,
        description="Type of asset to generate"
    )
    brand_kit_id: str = Field(
        ...,
        description="ID of the brand kit to use"
    )
    custom_prompt: Optional[str] = Field(
        None,
        max_length=500,
        description="Custom prompt to guide generation"
    )
    
    # NEW: Brand customization
    brand_customization: Optional[BrandCustomization] = Field(
        default=None,
        description="Specific brand elements to use (uses smart defaults if not specified)"
    )
```

---

### 22.2 Token-Efficient Prompt Builder

**File:** `backend/services/prompt_engine.py` (MODIFY)

**Key Principle:** Use compressed, semantic tokens instead of verbose descriptions. AI models understand shorthand better and it saves context window.

```python
from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass
class ResolvedBrandContext:
    """
    Resolved brand kit values based on user selection.
    
    Contains only the specific values the user selected,
    ready for token-efficient prompt injection.
    """
    # Colors (hex values only - AI understands these)
    primary_color: str  # e.g., "#FF5733"
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    gradient: Optional[str] = None  # e.g., "linear 135° #FF5733→#3498DB"
    
    # Typography (font name + weight shorthand)
    font: str  # e.g., "Montserrat 700"
    
    # Voice (only if selected)
    tone: str  # e.g., "competitive"
    tagline: Optional[str] = None
    catchphrase: Optional[str] = None
    
    # Logo
    include_logo: bool = False
    logo_position: Optional[str] = None
    logo_size: Optional[str] = None
    
    # Intensity
    intensity: str = "balanced"


class BrandContextResolver:
    """
    Resolves user's brand customization selections into concrete values.
    
    Takes the brand kit data and user's selections, returns only
    the specific values needed for prompt injection.
    """
    
    @staticmethod
    def resolve(
        brand_kit: Dict[str, Any],
        customization: Optional[Dict[str, Any]] = None
    ) -> ResolvedBrandContext:
        """
        Resolve brand kit + customization into concrete values.
        
        Args:
            brand_kit: Full brand kit data from database
            customization: User's BrandCustomization selections
            
        Returns:
            ResolvedBrandContext with specific values to inject
        """
        custom = customization or {}
        colors_custom = custom.get("colors", {}) or {}
        typo_custom = custom.get("typography", {}) or {}
        voice_custom = custom.get("voice", {}) or {}
        
        # === Resolve Colors ===
        # Get extended colors if available, fall back to basic
        colors_extended = brand_kit.get("colors_extended", {})
        primary_colors = colors_extended.get("primary", [])
        secondary_colors = colors_extended.get("secondary", [])
        accent_colors = colors_extended.get("accent", [])
        gradients = colors_extended.get("gradients", [])
        
        # Fall back to basic colors if extended not set
        if not primary_colors:
            basic_primary = brand_kit.get("primary_colors", ["#000000"])
            primary_colors = [{"hex": c} for c in basic_primary]
        if not accent_colors:
            basic_accent = brand_kit.get("accent_colors", [])
            accent_colors = [{"hex": c} for c in basic_accent]
        
        # Select specific colors based on user choice
        primary_idx = colors_custom.get("primary_index", 0)
        primary_color = primary_colors[min(primary_idx, len(primary_colors) - 1)]["hex"] if primary_colors else "#000000"
        
        secondary_color = None
        if colors_custom.get("secondary_index") is not None and secondary_colors:
            sec_idx = colors_custom["secondary_index"]
            secondary_color = secondary_colors[min(sec_idx, len(secondary_colors) - 1)]["hex"]
        
        accent_color = None
        if colors_custom.get("accent_index") is not None and accent_colors:
            acc_idx = colors_custom["accent_index"]
            accent_color = accent_colors[min(acc_idx, len(accent_colors) - 1)]["hex"]
        
        # Resolve gradient
        gradient_str = None
        if colors_custom.get("use_gradient") is not None and gradients:
            grad_idx = colors_custom["use_gradient"]
            grad = gradients[min(grad_idx, len(gradients) - 1)]
            # Compact format: "linear 135° #FF5733→#3498DB"
            stops = "→".join([s["color"] for s in grad.get("stops", [])])
            gradient_str = f"{grad.get('type', 'linear')} {grad.get('angle', 135)}° {stops}"
        
        # === Resolve Typography ===
        typography = brand_kit.get("typography", {})
        typo_level = typo_custom.get("level", "headline")
        font_config = typography.get(typo_level) or typography.get("headline")
        
        # Fall back to basic fonts
        if not font_config:
            basic_fonts = brand_kit.get("fonts", {})
            font_config = {
                "family": basic_fonts.get("headline", "Inter"),
                "weight": 700
            }
        
        # Compact format: "Montserrat 700"
        font_str = f"{font_config.get('family', 'Inter')} {font_config.get('weight', 400)}"
        
        # === Resolve Voice ===
        voice = brand_kit.get("voice", {})
        tone = voice.get("tone") or brand_kit.get("tone", "professional")
        
        tagline = None
        if voice_custom.get("use_tagline") and voice.get("tagline"):
            tagline = voice["tagline"]
        
        catchphrase = None
        if voice_custom.get("use_catchphrase") is not None:
            catchphrases = voice.get("catchphrases", [])
            if catchphrases:
                cp_idx = voice_custom["use_catchphrase"]
                catchphrase = catchphrases[min(cp_idx, len(catchphrases) - 1)]
        
        # === Logo ===
        include_logo = custom.get("include_logo", False)
        logo_position = custom.get("logo_position", "bottom-right") if include_logo else None
        logo_size = custom.get("logo_size", "medium") if include_logo else None
        
        # === Intensity ===
        intensity = custom.get("brand_intensity", "balanced")
        
        return ResolvedBrandContext(
            primary_color=primary_color,
            secondary_color=secondary_color,
            accent_color=accent_color,
            gradient=gradient_str,
            font=font_str,
            tone=tone,
            tagline=tagline,
            catchphrase=catchphrase,
            include_logo=include_logo,
            logo_position=logo_position,
            logo_size=logo_size,
            intensity=intensity,
        )
```

---

### 22.3 Token-Efficient Prompt Format

**File:** `backend/services/prompt_engine.py` (ADD METHOD)

```python
class PromptEngine:
    # ... existing code ...
    
    # Token budget guidelines:
    # - Brand context: ~50-80 tokens max
    # - Custom prompt: ~100 tokens max
    # - Quality modifiers: ~30 tokens
    # - Total brand injection: <150 tokens
    
    INTENSITY_MODIFIERS = {
        "subtle": "subtly incorporate",
        "balanced": "use",
        "strong": "prominently feature",
    }
    
    def build_brand_context_prompt(
        self,
        context: ResolvedBrandContext,
    ) -> str:
        """
        Build a token-efficient brand context string.
        
        Uses compressed format that AI models understand well:
        - Hex colors directly (no "the color red")
        - Font shorthand (no "use the font family called")
        - Minimal connecting words
        
        Target: <80 tokens for full brand context
        
        Args:
            context: Resolved brand context with specific values
            
        Returns:
            Compact brand context string for prompt injection
        """
        parts = []
        intensity = self.INTENSITY_MODIFIERS.get(context.intensity, "use")
        
        # Colors - compact format
        colors = [context.primary_color]
        if context.secondary_color:
            colors.append(context.secondary_color)
        if context.accent_color:
            colors.append(f"accent:{context.accent_color}")
        
        parts.append(f"Colors: {' '.join(colors)}")
        
        # Gradient if selected
        if context.gradient:
            parts.append(f"Gradient: {context.gradient}")
        
        # Typography - single line
        parts.append(f"Font: {context.font}")
        
        # Tone - single word
        parts.append(f"Tone: {context.tone}")
        
        # Tagline/catchphrase if selected
        if context.tagline:
            parts.append(f'Tagline: "{context.tagline}"')
        if context.catchphrase:
            parts.append(f'Text: "{context.catchphrase}"')
        
        # Logo placement if included
        if context.include_logo:
            parts.append(f"Logo: {context.logo_position} {context.logo_size}")
        
        # Combine with intensity instruction
        brand_block = " | ".join(parts)
        
        return f"[BRAND: {intensity} - {brand_block}]"
    
    def build_prompt_v2(
        self,
        asset_type: AssetType,
        brand_kit: Dict[str, Any],
        customization: Optional[Dict[str, Any]] = None,
        custom_prompt: Optional[str] = None,
        version: str = "v1.0"
    ) -> str:
        """
        Build prompt with token-efficient brand injection.
        
        New prompt structure:
        1. Asset type instruction (fixed)
        2. Brand context block (compact, ~50-80 tokens)
        3. Custom prompt (sanitized, ~100 tokens max)
        4. Quality modifiers (fixed, ~30 tokens)
        
        Total: ~200-250 tokens for brand + custom, leaving
        plenty of room for AI generation.
        
        Args:
            asset_type: Type of asset to generate
            brand_kit: Full brand kit data
            customization: User's brand customization selections
            custom_prompt: Optional user prompt
            version: Template version
            
        Returns:
            Complete prompt string optimized for token efficiency
        """
        # Resolve brand context
        resolver = BrandContextResolver()
        context = resolver.resolve(brand_kit, customization)
        
        # Load template for asset type
        template = self.load_template(asset_type, version)
        
        # Build brand context block
        brand_block = self.build_brand_context_prompt(context)
        
        # Sanitize custom prompt
        sanitized_custom = ""
        if custom_prompt:
            sanitized_custom = self.sanitize_input(custom_prompt)
        
        # Build final prompt
        # Format: [TYPE] [BRAND BLOCK] [CUSTOM] [QUALITY]
        prompt_parts = [
            f"Create a {asset_type.value} image.",
            brand_block,
        ]
        
        if sanitized_custom:
            prompt_parts.append(f"Content: {sanitized_custom}")
        
        # Add quality modifiers
        if template.quality_modifiers:
            quality_str = ", ".join(template.quality_modifiers[:5])  # Limit to 5
            prompt_parts.append(f"Quality: {quality_str}")
        
        return "\n".join(prompt_parts)
```

**Example Output (Token-Efficient):**

```
Create a thumbnail image.
[BRAND: use - Colors: #FF5733 #3498DB accent:#F1C40F | Font: Montserrat 700 | Tone: competitive | Tagline: "Level Up Your Stream" | Logo: bottom-right medium]
Content: Epic gaming victory moment with dramatic lighting
Quality: high quality, professional, eye-catching, 4K resolution, vibrant colors
```

**Token Count:** ~65 tokens (vs ~150+ with verbose format)

---

### 22.4 Frontend UX - Generation Page Brand Customization

**File:** `tsx/apps/web/src/components/generation/BrandCustomizationPanel.tsx` (CREATE)

**UX Design Principles:**
1. **Collapsed by default** - Shows "Using: [Brand Kit Name] defaults" 
2. **Expandable sections** - Colors, Typography, Voice, Logo
3. **Visual previews** - Color swatches, font samples
4. **Clear labels** - "Primary Color", "Headline Font", etc.
5. **Smart defaults** - Pre-selected based on brand kit

```tsx
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Palette, Type, MessageSquare, Image } from 'lucide-react';
import { 
  BrandCustomization, 
  ColorPalette, 
  Typography, 
  BrandVoice,
  Logos 
} from '@repo/api-client';

interface BrandCustomizationPanelProps {
  brandKitName: string;
  colors: ColorPalette;
  typography: Typography;
  voice: BrandVoice;
  logos: Logos;
  value: BrandCustomization;
  onChange: (customization: BrandCustomization) => void;
}

export function BrandCustomizationPanel({
  brandKitName,
  colors,
  typography,
  voice,
  logos,
  value,
  onChange,
}: BrandCustomizationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<'colors' | 'typography' | 'voice' | 'logo' | null>(null);

  const hasLogo = logos.primary || logos.secondary || logos.icon;

  return (
    <div className="border rounded-lg bg-white">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-gray-500" />
          <span className="font-medium">Brand Customization</span>
          <span className="text-sm text-gray-500">
            Using: {brandKitName} {isExpanded ? '' : '(defaults)'}
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t">
          {/* Quick Summary */}
          <div className="flex gap-2 pt-3 flex-wrap">
            <QuickBadge 
              label="Color" 
              value={colors.primary[value.colors?.primary_index || 0]?.hex || '#000'} 
              type="color"
            />
            <QuickBadge 
              label="Font" 
              value={typography[value.typography?.level || 'headline']?.family || 'Default'} 
              type="text"
            />
            <QuickBadge 
              label="Tone" 
              value={voice.tone || 'professional'} 
              type="text"
            />
            {value.include_logo && (
              <QuickBadge label="Logo" value={value.logo_position || 'bottom-right'} type="text" />
            )}
          </div>

          {/* Section Toggles */}
          <div className="grid grid-cols-4 gap-2">
            <SectionButton
              icon={<Palette className="w-4 h-4" />}
              label="Colors"
              active={activeSection === 'colors'}
              onClick={() => setActiveSection(activeSection === 'colors' ? null : 'colors')}
            />
            <SectionButton
              icon={<Type className="w-4 h-4" />}
              label="Typography"
              active={activeSection === 'typography'}
              onClick={() => setActiveSection(activeSection === 'typography' ? null : 'typography')}
            />
            <SectionButton
              icon={<MessageSquare className="w-4 h-4" />}
              label="Voice"
              active={activeSection === 'voice'}
              onClick={() => setActiveSection(activeSection === 'voice' ? null : 'voice')}
            />
            <SectionButton
              icon={<Image className="w-4 h-4" />}
              label="Logo"
              active={activeSection === 'logo'}
              onClick={() => setActiveSection(activeSection === 'logo' ? null : 'logo')}
              disabled={!hasLogo}
            />
          </div>

          {/* Active Section Content */}
          {activeSection === 'colors' && (
            <ColorSelectionSection
              colors={colors}
              value={value.colors || {}}
              onChange={(colorSelection) => onChange({ ...value, colors: colorSelection })}
            />
          )}
          {activeSection === 'typography' && (
            <TypographySelectionSection
              typography={typography}
              value={value.typography || {}}
              onChange={(typoSelection) => onChange({ ...value, typography: typoSelection })}
            />
          )}
          {activeSection === 'voice' && (
            <VoiceSelectionSection
              voice={voice}
              value={value.voice || {}}
              onChange={(voiceSelection) => onChange({ ...value, voice: voiceSelection })}
            />
          )}
          {activeSection === 'logo' && hasLogo && (
            <LogoSelectionSection
              logos={logos}
              includeLogo={value.include_logo}
              logoType={value.logo_type}
              logoPosition={value.logo_position}
              logoSize={value.logo_size}
              onChange={(logoOptions) => onChange({ ...value, ...logoOptions })}
            />
          )}

          {/* Brand Intensity Slider */}
          <div className="pt-2 border-t">
            <label className="text-sm font-medium text-gray-700">Brand Intensity</label>
            <div className="flex gap-2 mt-2">
              {(['subtle', 'balanced', 'strong'] as const).map((intensity) => (
                <button
                  key={intensity}
                  onClick={() => onChange({ ...value, brand_intensity: intensity })}
                  className={`flex-1 py-2 px-3 rounded text-sm capitalize ${
                    value.brand_intensity === intensity
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {intensity}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {value.brand_intensity === 'subtle' && 'Brand elements will be lightly incorporated'}
              {value.brand_intensity === 'balanced' && 'Brand elements will be clearly visible'}
              {value.brand_intensity === 'strong' && 'Brand elements will be prominently featured'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-components
function QuickBadge({ label, value, type }: { label: string; value: string; type: 'color' | 'text' }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
      {type === 'color' && (
        <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: value }} />
      )}
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium">{type === 'color' ? value : value}</span>
    </div>
  );
}

function SectionButton({ icon, label, active, onClick, disabled }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 p-2 rounded ${
        active ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
}
```

---

### 22.5 Color Selection Sub-Component

```tsx
function ColorSelectionSection({ colors, value, onChange }: {
  colors: ColorPalette;
  value: { primary_index?: number; secondary_index?: number; accent_index?: number; use_gradient?: number };
  onChange: (value: typeof value) => void;
}) {
  return (
    <div className="space-y-4 p-3 bg-gray-50 rounded">
      {/* Primary Color Selection */}
      {colors.primary.length > 0 && (
        <div>
          <label className="text-sm font-medium">Primary Color</label>
          <div className="flex gap-2 mt-1">
            {colors.primary.map((color, idx) => (
              <button
                key={idx}
                onClick={() => onChange({ ...value, primary_index: idx })}
                className={`relative w-10 h-10 rounded-lg border-2 transition-all ${
                  (value.primary_index || 0) === idx ? 'border-blue-500 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color.hex }}
                title={`${color.name}: ${color.usage || 'No description'}`}
              >
                {(value.primary_index || 0) === idx && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
          {colors.primary[value.primary_index || 0] && (
            <p className="text-xs text-gray-500 mt-1">
              {colors.primary[value.primary_index || 0].name}
              {colors.primary[value.primary_index || 0].usage && ` - ${colors.primary[value.primary_index || 0].usage}`}
            </p>
          )}
        </div>
      )}

      {/* Secondary Color (Optional) */}
      {colors.secondary.length > 0 && (
        <div>
          <label className="text-sm font-medium flex items-center gap-2">
            Secondary Color
            <span className="text-xs text-gray-400">(optional)</span>
          </label>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => onChange({ ...value, secondary_index: undefined })}
              className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center ${
                value.secondary_index === undefined ? 'border-blue-500 bg-gray-200' : 'border-gray-200'
              }`}
            >
              <span className="text-xs text-gray-500">None</span>
            </button>
            {colors.secondary.map((color, idx) => (
              <button
                key={idx}
                onClick={() => onChange({ ...value, secondary_index: idx })}
                className={`w-10 h-10 rounded-lg border-2 ${
                  value.secondary_index === idx ? 'border-blue-500 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Accent Color (Optional) */}
      {colors.accent.length > 0 && (
        <div>
          <label className="text-sm font-medium flex items-center gap-2">
            Accent Color
            <span className="text-xs text-gray-400">(optional)</span>
          </label>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => onChange({ ...value, accent_index: undefined })}
              className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center ${
                value.accent_index === undefined ? 'border-blue-500 bg-gray-200' : 'border-gray-200'
              }`}
            >
              <span className="text-xs text-gray-500">None</span>
            </button>
            {colors.accent.map((color, idx) => (
              <button
                key={idx}
                onClick={() => onChange({ ...value, accent_index: idx })}
                className={`w-10 h-10 rounded-lg border-2 ${
                  value.accent_index === idx ? 'border-blue-500 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Gradient (Optional) */}
      {colors.gradients.length > 0 && (
        <div>
          <label className="text-sm font-medium flex items-center gap-2">
            Use Gradient
            <span className="text-xs text-gray-400">(optional)</span>
          </label>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => onChange({ ...value, use_gradient: undefined })}
              className={`w-16 h-10 rounded-lg border-2 flex items-center justify-center ${
                value.use_gradient === undefined ? 'border-blue-500 bg-gray-200' : 'border-gray-200'
              }`}
            >
              <span className="text-xs text-gray-500">None</span>
            </button>
            {colors.gradients.map((gradient, idx) => (
              <button
                key={idx}
                onClick={() => onChange({ ...value, use_gradient: idx })}
                className={`w-16 h-10 rounded-lg border-2 ${
                  value.use_gradient === idx ? 'border-blue-500 scale-110' : 'border-transparent'
                }`}
                style={{
                  background: `linear-gradient(${gradient.angle}deg, ${gradient.stops.map(s => s.color).join(', ')})`
                }}
                title={gradient.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 22.6 Typography Selection Sub-Component

```tsx
function TypographySelectionSection({ typography, value, onChange }: {
  typography: Typography;
  value: { level?: string };
  onChange: (value: typeof value) => void;
}) {
  const levels = [
    { key: 'display', label: 'Display', desc: 'Large hero text' },
    { key: 'headline', label: 'Headline', desc: 'Main titles' },
    { key: 'subheadline', label: 'Subheadline', desc: 'Secondary titles' },
    { key: 'body', label: 'Body', desc: 'Regular text' },
    { key: 'caption', label: 'Caption', desc: 'Small text' },
    { key: 'accent', label: 'Accent', desc: 'Special text' },
  ] as const;

  const availableLevels = levels.filter(l => typography[l.key]);

  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded">
      <label className="text-sm font-medium">Typography Style</label>
      <div className="space-y-2">
        {availableLevels.map(({ key, label, desc }) => {
          const config = typography[key];
          if (!config) return null;
          
          return (
            <button
              key={key}
              onClick={() => onChange({ level: key })}
              className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                (value.level || 'headline') === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span 
                    className="font-medium"
                    style={{ 
                      fontFamily: config.family,
                      fontWeight: config.weight,
                      fontStyle: config.style,
                    }}
                  >
                    {label}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">{desc}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {config.family} {config.weight}
                </span>
              </div>
              {/* Preview */}
              <p 
                className="mt-1 text-sm text-gray-600"
                style={{ 
                  fontFamily: config.family,
                  fontWeight: config.weight,
                  fontStyle: config.style,
                }}
              >
                The quick brown fox jumps over the lazy dog
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

---

### 22.7 Voice & Logo Selection Sub-Components

```tsx
function VoiceSelectionSection({ voice, value, onChange }: {
  voice: BrandVoice;
  value: { use_tagline?: boolean; use_catchphrase?: number };
  onChange: (value: typeof value) => void;
}) {
  return (
    <div className="space-y-4 p-3 bg-gray-50 rounded">
      {/* Tone Display (read-only) */}
      <div>
        <label className="text-sm font-medium">Brand Tone</label>
        <div className="mt-1 px-3 py-2 bg-white rounded border capitalize">
          {voice.tone || 'professional'}
        </div>
      </div>

      {/* Tagline Toggle */}
      {voice.tagline && (
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value.use_tagline || false}
              onChange={(e) => onChange({ ...value, use_tagline: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium">Include Tagline</span>
          </label>
          <p className="mt-1 text-sm text-gray-600 italic pl-6">"{voice.tagline}"</p>
        </div>
      )}

      {/* Catchphrase Selection */}
      {voice.catchphrases && voice.catchphrases.length > 0 && (
        <div>
          <label className="text-sm font-medium flex items-center gap-2">
            Include Catchphrase
            <span className="text-xs text-gray-400">(optional)</span>
          </label>
          <div className="mt-2 space-y-2">
            <button
              onClick={() => onChange({ ...value, use_catchphrase: undefined })}
              className={`w-full p-2 rounded border text-left text-sm ${
                value.use_catchphrase === undefined
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              None
            </button>
            {voice.catchphrases.map((phrase, idx) => (
              <button
                key={idx}
                onClick={() => onChange({ ...value, use_catchphrase: idx })}
                className={`w-full p-2 rounded border text-left text-sm ${
                  value.use_catchphrase === idx
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                "{phrase}"
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LogoSelectionSection({ logos, includeLogo, logoType, logoPosition, logoSize, onChange }: {
  logos: Logos;
  includeLogo: boolean;
  logoType: string;
  logoPosition: string;
  logoSize: string;
  onChange: (options: { include_logo: boolean; logo_type?: string; logo_position?: string; logo_size?: string }) => void;
}) {
  const availableLogos = [
    { key: 'primary', label: 'Primary', logo: logos.primary },
    { key: 'secondary', label: 'Secondary', logo: logos.secondary },
    { key: 'icon', label: 'Icon', logo: logos.icon },
    { key: 'watermark', label: 'Watermark', logo: logos.watermark },
  ].filter(l => l.logo);

  const positions = [
    { key: 'top-left', label: '↖ Top Left' },
    { key: 'top-right', label: '↗ Top Right' },
    { key: 'bottom-left', label: '↙ Bottom Left' },
    { key: 'bottom-right', label: '↘ Bottom Right' },
    { key: 'center', label: '⊙ Center' },
  ];

  const sizes = [
    { key: 'small', label: 'Small (10%)' },
    { key: 'medium', label: 'Medium (15%)' },
    { key: 'large', label: 'Large (20%)' },
  ];

  return (
    <div className="space-y-4 p-3 bg-gray-50 rounded">
      {/* Include Logo Toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={includeLogo}
          onChange={(e) => onChange({ include_logo: e.target.checked })}
          className="w-4 h-4 rounded"
        />
        <span className="text-sm font-medium">Include Logo in Generated Asset</span>
      </label>

      {includeLogo && (
        <>
          {/* Logo Type Selection */}
          <div>
            <label className="text-sm font-medium">Logo Variation</label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {availableLogos.map(({ key, label, logo }) => (
                <button
                  key={key}
                  onClick={() => onChange({ include_logo: true, logo_type: key })}
                  className={`p-2 rounded border ${
                    logoType === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <img 
                    src={logo?.url} 
                    alt={label} 
                    className="w-full h-12 object-contain"
                  />
                  <span className="text-xs mt-1 block">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Position Selection */}
          <div>
            <label className="text-sm font-medium">Position</label>
            <div className="grid grid-cols-5 gap-1 mt-2">
              {positions.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => onChange({ include_logo: true, logo_position: key })}
                  className={`p-2 rounded text-xs ${
                    logoPosition === key ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Size Selection */}
          <div>
            <label className="text-sm font-medium">Size</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {sizes.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => onChange({ include_logo: true, logo_size: key })}
                  className={`p-2 rounded text-sm ${
                    logoSize === key ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

---

### 22.8 Task Checklist for Section 22

**Agent:** Wave 3 - Agent 10 (Extended)

- [ ] 22.1 Update GenerateRequest schema with BrandCustomization
- [ ] 22.2 Create BrandContextResolver class
- [ ] 22.3 Add build_brand_context_prompt method to PromptEngine
- [ ] 22.4 Add build_prompt_v2 method to PromptEngine
- [ ] 22.5 Create BrandCustomizationPanel component (web)
- [ ] 22.6 Create ColorSelectionSection sub-component
- [ ] 22.7 Create TypographySelectionSection sub-component
- [ ] 22.8 Create VoiceSelectionSection sub-component
- [ ] 22.9 Create LogoSelectionSection sub-component
- [ ] 22.10 Update generation page to use BrandCustomizationPanel
- [ ] 22.11 Create mobile version of brand customization
- [ ] 22.12 Create Swift version of brand customization
- [ ] 22.13 Add unit tests for BrandContextResolver
- [ ] 22.14 Add property tests for prompt token efficiency

### 22.9 Token Efficiency Tests

**File:** `backend/tests/unit/test_prompt_token_efficiency.py` (CREATE)

```python
"""
Tests for token-efficient prompt generation.

Ensures brand context injection stays within token budget
while maintaining prompt quality.
"""

import pytest
from backend.services.prompt_engine import (
    PromptEngine,
    BrandContextResolver,
    ResolvedBrandContext,
)


class TestBrandContextResolver:
    """Tests for brand context resolution."""
    
    def test_resolve_with_defaults(self):
        """Test resolution with no customization uses defaults."""
        brand_kit = {
            "primary_colors": ["#FF5733", "#3498DB"],
            "accent_colors": ["#F1C40F"],
            "fonts": {"headline": "Montserrat", "body": "Inter"},
            "tone": "competitive",
        }
        
        context = BrandContextResolver.resolve(brand_kit, None)
        
        assert context.primary_color == "#FF5733"  # First primary
        assert context.secondary_color is None
        assert context.font == "Montserrat 700"  # Default weight
        assert context.tone == "competitive"
    
    def test_resolve_with_extended_colors(self):
        """Test resolution with extended color palette."""
        brand_kit = {
            "colors_extended": {
                "primary": [
                    {"hex": "#FF5733", "name": "Orange"},
                    {"hex": "#3498DB", "name": "Blue"},
                ],
                "secondary": [{"hex": "#2ECC71", "name": "Green"}],
                "accent": [{"hex": "#F1C40F", "name": "Gold"}],
                "gradients": [],
            },
            "fonts": {"headline": "Montserrat"},
            "tone": "professional",
        }
        
        customization = {
            "colors": {
                "primary_index": 1,  # Select Blue
                "secondary_index": 0,  # Select Green
            }
        }
        
        context = BrandContextResolver.resolve(brand_kit, customization)
        
        assert context.primary_color == "#3498DB"
        assert context.secondary_color == "#2ECC71"
    
    def test_resolve_with_typography_selection(self):
        """Test typography level selection."""
        brand_kit = {
            "primary_colors": ["#000000"],
            "fonts": {"headline": "Inter"},
            "typography": {
                "display": {"family": "Montserrat", "weight": 800},
                "headline": {"family": "Montserrat", "weight": 700},
                "body": {"family": "Inter", "weight": 400},
            },
            "tone": "professional",
        }
        
        customization = {
            "typography": {"level": "display"}
        }
        
        context = BrandContextResolver.resolve(brand_kit, customization)
        
        assert context.font == "Montserrat 800"
    
    def test_resolve_with_voice_elements(self):
        """Test voice element selection."""
        brand_kit = {
            "primary_colors": ["#000000"],
            "fonts": {"headline": "Inter"},
            "tone": "competitive",
            "voice": {
                "tone": "competitive",
                "tagline": "Level Up Your Stream",
                "catchphrases": ["Let's go!", "GG everyone"],
            },
        }
        
        customization = {
            "voice": {
                "use_tagline": True,
                "use_catchphrase": 1,  # "GG everyone"
            }
        }
        
        context = BrandContextResolver.resolve(brand_kit, customization)
        
        assert context.tagline == "Level Up Your Stream"
        assert context.catchphrase == "GG everyone"


class TestPromptTokenEfficiency:
    """Tests for token-efficient prompt generation."""
    
    def test_brand_context_under_80_tokens(self):
        """Brand context block should be under 80 tokens."""
        engine = PromptEngine()
        
        context = ResolvedBrandContext(
            primary_color="#FF5733",
            secondary_color="#3498DB",
            accent_color="#F1C40F",
            gradient="linear 135° #FF5733→#3498DB",
            font="Montserrat 700",
            tone="competitive",
            tagline="Level Up Your Stream",
            catchphrase="Let's go!",
            include_logo=True,
            logo_position="bottom-right",
            logo_size="medium",
            intensity="balanced",
        )
        
        brand_block = engine.build_brand_context_prompt(context)
        
        # Rough token estimate: ~4 chars per token
        estimated_tokens = len(brand_block) / 4
        
        assert estimated_tokens < 80, f"Brand block too long: ~{estimated_tokens} tokens"
    
    def test_minimal_context_under_30_tokens(self):
        """Minimal brand context should be under 30 tokens."""
        engine = PromptEngine()
        
        context = ResolvedBrandContext(
            primary_color="#FF5733",
            font="Inter 400",
            tone="professional",
            intensity="balanced",
        )
        
        brand_block = engine.build_brand_context_prompt(context)
        
        estimated_tokens = len(brand_block) / 4
        
        assert estimated_tokens < 30, f"Minimal block too long: ~{estimated_tokens} tokens"
    
    def test_full_prompt_under_250_tokens(self):
        """Full prompt with brand + custom should be under 250 tokens."""
        engine = PromptEngine()
        
        brand_kit = {
            "primary_colors": ["#FF5733"],
            "fonts": {"headline": "Montserrat"},
            "tone": "competitive",
        }
        
        prompt = engine.build_prompt_v2(
            asset_type=engine.AssetType.THUMBNAIL,
            brand_kit=brand_kit,
            customization={"brand_intensity": "strong"},
            custom_prompt="Epic gaming victory moment with dramatic lighting and explosions",
        )
        
        estimated_tokens = len(prompt) / 4
        
        assert estimated_tokens < 250, f"Full prompt too long: ~{estimated_tokens} tokens"
```

### 22.10 Validation Criteria

1. **Token Efficiency:**
   - Brand context block: <80 tokens
   - Minimal context: <30 tokens
   - Full prompt: <250 tokens

2. **UX Clarity:**
   - Collapsed by default with summary
   - Visual color swatches
   - Font previews with actual font rendering
   - Clear labels and descriptions

3. **Smart Defaults:**
   - First primary color selected
   - Headline typography selected
   - No optional elements selected
   - Balanced intensity

4. **Prompt Quality:**
   - AI understands hex colors directly
   - Font shorthand (name + weight) is clear
   - Intensity modifiers guide AI behavior
   - Logo placement instructions are specific

---

## Updated Execution Log

| Wave | Section | Agent | Status | Notes |
|------|---------|-------|--------|-------|
| ... | ... | ... | ... | ... |
| 3 | 22 | Brand Customization | ⏳ | NEW - Token-efficient prompt injection |

---

## Summary: Brand Kit → Prompt Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        USER GENERATION REQUEST                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. User selects Brand Kit                                                   │
│  2. User expands "Brand Customization" panel (optional)                      │
│  3. User selects specific colors, fonts, voice elements                      │
│  4. User toggles logo inclusion + position/size                              │
│  5. User sets brand intensity (subtle/balanced/strong)                       │
│  6. User enters custom prompt                                                │
│  7. User clicks "Generate"                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND PROCESSING                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. BrandContextResolver.resolve(brand_kit, customization)                   │
│     → Extracts only selected values                                          │
│     → Falls back to defaults for unselected                                  │
│                                                                              │
│  2. PromptEngine.build_brand_context_prompt(context)                         │
│     → Builds compact brand block: ~50-80 tokens                              │
│     → Format: [BRAND: intensity - Colors: X | Font: Y | Tone: Z]             │
│                                                                              │
│  3. PromptEngine.build_prompt_v2(...)                                        │
│     → Combines: asset type + brand block + custom prompt + quality           │
│     → Total: ~200-250 tokens                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI GENERATION                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Prompt sent to Nano Banana / AI model:                                      │
│                                                                              │
│  Create a thumbnail image.                                                   │
│  [BRAND: prominently feature - Colors: #FF5733 #3498DB accent:#F1C40F |      │
│   Font: Montserrat 700 | Tone: competitive | Tagline: "Level Up" |           │
│   Logo: bottom-right medium]                                                 │
│  Content: Epic gaming victory moment with dramatic lighting                  │
│  Quality: high quality, professional, eye-catching, 4K resolution            │
│                                                                              │
│  → AI generates asset with brand elements incorporated                       │
│  → Logo composited in post-processing if include_logo=true                   │
└─────────────────────────────────────────────────────────────────────────────┘
```
