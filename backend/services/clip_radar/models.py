"""
Clip Radar Data Models
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List


@dataclass
class TrackedClip:
    """A clip being tracked for velocity."""
    clip_id: str
    title: str
    url: str
    thumbnail_url: str
    broadcaster_id: str
    broadcaster_name: str
    creator_name: str
    game_id: str
    game_name: str
    language: str
    duration: float
    created_at: datetime
    
    # Tracking data
    view_count: int
    previous_view_count: Optional[int] = None
    first_seen_at: Optional[datetime] = None
    last_updated_at: Optional[datetime] = None
    
    # Calculated metrics
    velocity: float = 0.0  # views per minute
    total_gained: int = 0  # views gained since first seen
    
    @property
    def age_minutes(self) -> float:
        """Minutes since clip was created."""
        from datetime import timezone
        now = datetime.now(timezone.utc)
        # Ensure created_at is timezone-aware
        created = self.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        delta = now - created
        return delta.total_seconds() / 60
    
    @property
    def is_fresh(self) -> bool:
        """Clip is less than 6 hours old."""
        return self.age_minutes < 360


@dataclass
class ViralClip(TrackedClip):
    """A clip that's going viral (high velocity)."""
    velocity_rank: int = 0
    velocity_percentile: float = 0.0
    alert_reason: str = ""


@dataclass
class CategoryClipStats:
    """Stats for clips in a category."""
    game_id: str
    game_name: str
    total_clips: int
    total_views: int
    avg_velocity: float
    top_clip: Optional[TrackedClip] = None
    viral_clips: List[ViralClip] = field(default_factory=list)
