"""
Alert Animation Studio Schemas

Pydantic models for request/response validation.
All models use snake_case (transformed to camelCase in frontend).
"""

from datetime import datetime
from typing import Optional, List, Literal, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


# ============================================================================
# Enums / Literals
# ============================================================================

AnimationCategory = Literal["entry", "loop", "depth", "particles"]
ExportFormat = Literal["webm", "gif", "apng"]
JobStatus = Literal["queued", "processing", "completed", "failed"]

EntryType = Literal["pop_in", "slide_in", "fade_in", "burst", "glitch", "bounce"]
LoopType = Literal["float", "pulse", "glow", "wiggle", "rgb_glow"]
DepthType = Literal["parallax", "tilt", "pop_out"]
ParticleType = Literal["sparkles", "confetti", "fire", "hearts", "pixels"]

SlideDirection = Literal["left", "right", "top", "bottom"]
TriggerType = Literal["mouse", "on_enter", "always"]


# ============================================================================
# Animation Config Models
# ============================================================================

class EntryAnimation(BaseModel):
    """Entry animation configuration."""
    type: EntryType
    duration_ms: int = Field(default=500, ge=100, le=3000)
    easing: str = Field(default="power2.out", max_length=50)
    
    # Type-specific fields
    scale_from: Optional[float] = Field(None, ge=0, le=5)
    opacity_from: Optional[float] = Field(None, ge=0, le=1)
    rotation_from: Optional[float] = Field(None, ge=-360, le=360)
    direction: Optional[SlideDirection] = None
    distance_percent: Optional[float] = Field(None, ge=0, le=200)
    bounce: Optional[float] = Field(None, ge=0, le=1)
    glitch_intensity: Optional[float] = Field(None, ge=0, le=1)
    bounces: Optional[int] = Field(None, ge=1, le=10)
    height: Optional[float] = Field(None, ge=0, le=200)


class LoopAnimation(BaseModel):
    """Loop animation configuration."""
    type: LoopType
    frequency: float = Field(default=1.0, ge=0.1, le=10.0)
    easing: str = Field(default="sine.inOut", max_length=50)
    
    # Float-specific
    amplitude_y: Optional[float] = Field(None, ge=0, le=100)
    amplitude_x: Optional[float] = Field(None, ge=0, le=100)
    phase_offset: Optional[float] = Field(None, ge=0, le=360)
    
    # Pulse-specific
    scale_min: Optional[float] = Field(None, ge=0.5, le=1.0)
    scale_max: Optional[float] = Field(None, ge=1.0, le=2.0)
    
    # Glow-specific
    color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    intensity_min: Optional[float] = Field(None, ge=0, le=1)
    intensity_max: Optional[float] = Field(None, ge=0, le=1)
    blur_radius: Optional[float] = Field(None, ge=0, le=100)
    
    # Wiggle-specific
    angle_max: Optional[float] = Field(None, ge=0, le=45)
    decay: Optional[float] = Field(None, ge=0, le=1)
    
    # RGB Glow-specific
    speed: Optional[float] = Field(None, ge=0.1, le=10)
    saturation: Optional[float] = Field(None, ge=0, le=1)


class DepthEffect(BaseModel):
    """3D depth effect configuration."""
    type: DepthType
    intensity: float = Field(default=0.5, ge=0.0, le=1.0)
    trigger: TriggerType = "mouse"
    
    # Parallax-specific
    invert: Optional[bool] = None
    smooth_factor: Optional[float] = Field(None, ge=0, le=1)
    
    # Tilt-specific
    max_angle_x: Optional[float] = Field(None, ge=0, le=45)
    max_angle_y: Optional[float] = Field(None, ge=0, le=45)
    perspective: Optional[int] = Field(None, ge=100, le=5000)
    scale_on_hover: Optional[float] = Field(None, ge=1, le=1.5)
    
    # Pop Out-specific
    depth_scale: Optional[float] = Field(None, ge=0, le=100)
    duration_ms: Optional[int] = Field(None, ge=100, le=2000)
    easing: Optional[str] = Field(None, max_length=50)


class ParticleEffect(BaseModel):
    """Particle effect configuration."""
    type: ParticleType
    count: int = Field(default=20, ge=1, le=200)
    
    # Common
    color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    colors: Optional[List[str]] = None
    color_variance: Optional[float] = Field(None, ge=0, le=1)
    size_min: Optional[float] = Field(None, ge=1, le=50)
    size_max: Optional[float] = Field(None, ge=1, le=50)
    size: Optional[float] = Field(None, ge=1, le=50)
    speed: Optional[float] = Field(None, ge=0.1, le=10)
    lifetime_ms: Optional[int] = Field(None, ge=500, le=10000)
    spawn_area: Optional[Literal["around", "above", "below", "center"]] = None
    
    # Confetti-specific
    gravity: Optional[float] = Field(None, ge=0, le=2)
    spread: Optional[float] = Field(None, ge=0, le=360)
    
    # Hearts-specific
    float_speed: Optional[float] = Field(None, ge=0.1, le=5)
    sway_amount: Optional[float] = Field(None, ge=0, le=100)
    
    # Fire-specific
    turbulence: Optional[float] = Field(None, ge=0, le=1)


class AnimationConfig(BaseModel):
    """Complete animation configuration."""
    entry: Optional[EntryAnimation] = None
    loop: Optional[LoopAnimation] = None
    depth_effect: Optional[DepthEffect] = None
    particles: Optional[ParticleEffect] = None
    duration_ms: int = Field(default=3000, ge=500, le=15000)
    loop_count: int = Field(default=1, ge=0, le=100)  # 0 = infinite
    effects: Optional[List[str]] = None


# ============================================================================
# Request Models
# ============================================================================

class CreateAnimationProjectRequest(BaseModel):
    """Create a new animation project."""
    source_asset_id: Optional[UUID] = None
    source_url: str = Field(..., min_length=1, max_length=2000)
    name: str = Field(default="Untitled Animation", max_length=100)
    animation_config: Optional[AnimationConfig] = None


class UpdateAnimationProjectRequest(BaseModel):
    """Update an existing animation project."""
    name: Optional[str] = Field(None, max_length=100)
    animation_config: Optional[AnimationConfig] = None
    export_format: Optional[ExportFormat] = None
    export_width: Optional[int] = Field(None, ge=64, le=1920)
    export_height: Optional[int] = Field(None, ge=64, le=1920)
    export_fps: Optional[int] = Field(None, ge=15, le=60)


class ExportAnimationRequest(BaseModel):
    """Request animation export."""
    format: ExportFormat = "webm"
    width: Optional[int] = Field(None, ge=64, le=1920)
    height: Optional[int] = Field(None, ge=64, le=1920)
    fps: Optional[int] = Field(None, ge=15, le=60)
    use_server_export: bool = False


class CreatePresetRequest(BaseModel):
    """Create a custom preset."""
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=200)
    category: AnimationCategory
    config: Dict[str, Any]


# ============================================================================
# Response Models
# ============================================================================

class AnimationExportResponse(BaseModel):
    """Single export record."""
    id: str
    format: ExportFormat
    url: str
    file_size: Optional[int] = None
    width: int
    height: int
    fps: int
    duration_ms: int
    obs_browser_url: Optional[str] = None
    created_at: datetime


class AnimationProjectResponse(BaseModel):
    """Animation project with all details."""
    id: str
    user_id: str
    source_asset_id: Optional[str] = None
    source_url: str
    depth_map_url: Optional[str] = None
    depth_map_generated_at: Optional[datetime] = None
    animation_config: AnimationConfig
    export_format: ExportFormat
    export_width: int
    export_height: int
    export_fps: int
    exports: List[AnimationExportResponse] = []
    name: str
    thumbnail_url: Optional[str] = None
    requires_tier: str = "pro"
    created_at: datetime
    updated_at: datetime


class AnimationProjectListResponse(BaseModel):
    """Paginated list of projects."""
    projects: List[AnimationProjectResponse]
    total: int
    page: int
    page_size: int


class AnimationPresetResponse(BaseModel):
    """Animation preset."""
    id: str
    user_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    category: AnimationCategory
    config: Dict[str, Any]
    preview_url: Optional[str] = None
    icon: Optional[str] = None


class DepthMapJobResponse(BaseModel):
    """Depth map generation job status."""
    job_id: str
    status: JobStatus
    progress: Optional[int] = None
    depth_map_url: Optional[str] = None
    error_message: Optional[str] = None
    estimated_seconds: Optional[int] = None


class OBSBrowserSourceResponse(BaseModel):
    """OBS browser source configuration."""
    url: str
    width: int
    height: int
    instructions: str


class ExportClientResponse(BaseModel):
    """Response for client-side export."""
    export_mode: Literal["client"] = "client"
    animation_config: AnimationConfig
    depth_map_url: Optional[str] = None
    source_url: str
    instructions: str = "Use MediaRecorder API with provided config"


class ExportServerResponse(BaseModel):
    """Response for server-side export job."""
    export_mode: Literal["server"] = "server"
    job_id: str
    status: JobStatus
