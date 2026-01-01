"""
Thumbnail Intelligence Service

Analyzes top-performing YouTube gaming thumbnails using Gemini Vision
to extract layout patterns, color schemes, and design recommendations.

Architecture:
- collector.py: Fetches top videos per category from YouTube
- vision_analyzer.py: Sends thumbnails to Gemini Vision for analysis
- repository.py: Stores/retrieves analysis from database
- service.py: Main orchestrator service

Daily Schedule: 6:00 AM EST (11:00 UTC)
"""

from backend.services.thumbnail_intel.service import (
    ThumbnailIntelService,
    get_thumbnail_intel_service,
)
from backend.services.thumbnail_intel.collector import ThumbnailCollector
from backend.services.thumbnail_intel.vision_analyzer import ThumbnailVisionAnalyzer
from backend.services.thumbnail_intel.repository import ThumbnailIntelRepository

__all__ = [
    "ThumbnailIntelService",
    "get_thumbnail_intel_service",
    "ThumbnailCollector",
    "ThumbnailVisionAnalyzer",
    "ThumbnailIntelRepository",
]
