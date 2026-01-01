"""
Clip Radar Service - Breaking Clips Velocity Tracker

Detects viral Twitch clips by tracking view velocity across gaming categories.
Polls clips every 5 minutes and calculates views/minute to surface trending content.

Features:
- Real-time velocity tracking in Redis (24h retention)
- Daily recaps compressed to PostgreSQL at 6am UTC
- Historical viewing of past days' top clips
"""

from backend.services.clip_radar.service import (
    ClipRadarService,
    get_clip_radar_service,
)
from backend.services.clip_radar.models import (
    TrackedClip,
    ViralClip,
    CategoryClipStats,
)
from backend.services.clip_radar.constants import TRACKED_CATEGORIES

__all__ = [
    "ClipRadarService",
    "get_clip_radar_service",
    "TrackedClip",
    "ViralClip",
    "CategoryClipStats",
    "TRACKED_CATEGORIES",
]
