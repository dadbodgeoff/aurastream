"""
Alert Animation Studio V2 Schemas

Extended schemas for timeline, audio reactivity, and export features.
Kept separate from V1 schemas to avoid breaking changes.
"""

from datetime import datetime
from typing import Optional, List, Literal, Dict, Any
from pydantic import BaseModel, Field


# ============================================================================
# Timeline Types
# ============================================================================

class TimelineKeyframe(BaseModel):
    """Single keyframe on a property track."""
    id: str
    time: int = Field(..., description="Time in milliseconds")
    value: float
    easing: str = "power2.out"
    handle_in_x: Optional[float] = None
    handle_in_y: Optional[float] = None
    handle_out_x: Optional[float] = None
    handle_out_y: Optional[float] = None


class TimelineTrack(BaseModel):
    """Track containing keyframes for a single property."""
    id: str
    property: str = Field(..., description="AnimatableProperty name")
    keyframes: List[TimelineKeyframe] = []
    visible: bool = True
    locked: bool = False
    muted: bool = False
    color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")


class TimelineMarker(BaseModel):
    """Marker on the timeline for reference points."""
    id: str
    time: int = Field(..., description="Time in milliseconds")
    label: str = ""
    color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")


class Timeline(BaseModel):
    """Complete timeline with tracks and markers."""
    id: str
    name: str = "Untitled"
    duration: int = Field(..., ge=100, le=60000, description="Duration in milliseconds")
    tracks: List[TimelineTrack] = []
    fps: int = Field(default=30, ge=15, le=60)
    loop: bool = True
    markers: List[TimelineMarker] = []


# ============================================================================
# Audio Reactivity Types
# ============================================================================

AudioSourceType = Literal[
    "band",
    "energy",
    "beat",
    "beatPhase",
    "bpm",
    "spectralCentroid",
    "spectralFlux",
]

FrequencyBandName = Literal[
    "sub",
    "bass",
    "lowMid",
    "mid",
    "highMid",
    "high",
    "brilliance",
]

TriggerMode = Literal[
    "continuous",
    "onBeat",
    "onThreshold",
    "onRise",
    "onFall",
]


class AudioSource(BaseModel):
    """Audio source for reactive mapping."""
    type: AudioSourceType
    band: Optional[FrequencyBandName] = None
    beat_type: Optional[str] = None


class AudioReactiveMapping(BaseModel):
    """Mapping from audio source to animation property."""
    id: str
    enabled: bool = True
    source: AudioSource
    target: str = Field(..., description="AnimatableProperty name")
    input_min: float = Field(default=0, ge=0, le=1)
    input_max: float = Field(default=1, ge=0, le=1)
    output_min: float = Field(default=0)
    output_max: float = Field(default=1)
    smoothing: float = Field(default=0.3, ge=0, le=1)
    trigger_mode: TriggerMode = "continuous"
    threshold: Optional[float] = Field(None, ge=0, le=1)
    invert: bool = False
    clamp: bool = True


# ============================================================================
# Extended Animation Config
# ============================================================================

class AnimationConfigV2(BaseModel):
    """Extended animation config with V2 features."""
    # Base config fields (from V1)
    entry: Optional[Dict[str, Any]] = None
    loop: Optional[Dict[str, Any]] = None
    depth_effect: Optional[Dict[str, Any]] = None
    particles: Optional[Dict[str, Any]] = None
    duration_ms: int = Field(default=3000, ge=500, le=15000)
    loop_count: int = Field(default=1, ge=0, le=100)
    effects: Optional[List[str]] = None
    
    # V2 additions
    timeline: Optional[Timeline] = None
    audio_mappings: Optional[List[AudioReactiveMapping]] = None
    audio_url: Optional[str] = Field(None, max_length=2000)
    use_webgl_particles: bool = True


# ============================================================================
# Request Models
# ============================================================================

class UpdateTimelineRequest(BaseModel):
    """Update timeline data."""
    timeline: Timeline


class UpdateAudioMappingsRequest(BaseModel):
    """Update audio reactive mappings."""
    mappings: List[AudioReactiveMapping]
    audio_url: Optional[str] = Field(None, max_length=2000)


class OBSHtmlBlobRequest(BaseModel):
    """Request for OBS HTML blob generation."""
    width: int = Field(default=512, ge=64, le=1920)
    height: int = Field(default=512, ge=64, le=1920)
    include_debug: bool = False


class OBSHtmlBlobResponse(BaseModel):
    """Response with self-contained HTML blob."""
    html: str
    file_size: int
    instructions: str


# ============================================================================
# SSE Relay Types
# ============================================================================

AlertTriggerEventType = Literal["trigger", "test", "config_update", "ping"]


class AlertTriggerEvent(BaseModel):
    """Event sent via SSE to trigger alerts."""
    type: AlertTriggerEventType
    alert_id: str
    timestamp: datetime
    payload: Optional[Dict[str, Any]] = None


class RelayConnectionResponse(BaseModel):
    """Response for relay connection info."""
    relay_url: str
    alert_id: str
    token: str
    expires_at: datetime


class TriggerAlertResponse(BaseModel):
    """Response after triggering an alert."""
    status: str
    alert_id: str


class UpdateTimelineResponse(BaseModel):
    """Response after updating timeline."""
    status: str
    timeline_id: str


class UpdateAudioMappingsResponse(BaseModel):
    """Response after updating audio mappings."""
    status: str
    mappings_count: int
