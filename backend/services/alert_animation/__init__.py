"""
Alert Animation Studio Services

Services for 3D alert animation generation:
- depth_service: Depth map generation using Depth Anything V2
- export_service: Server-side FFmpeg export fallback
- obs_service: OBS browser source URL generation
"""

from backend.services.alert_animation.depth_service import (
    DepthMapService,
    get_depth_service,
)
from backend.services.alert_animation.export_service import (
    AnimationExportService,
    get_export_service,
)

__all__ = [
    "DepthMapService",
    "get_depth_service",
    "AnimationExportService",
    "get_export_service",
]
