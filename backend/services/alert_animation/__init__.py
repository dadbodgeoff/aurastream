"""
Alert Animation Studio Services

Enterprise-grade services for 3D alert animation generation:
- depth_service: Depth map generation with edge refinement
- export_service: Server-side FFmpeg export fallback
- suggestion_service: AI-powered animation suggestions
- animation_engine: Professional animation with spring physics
"""

from backend.services.alert_animation.depth_service import (
    DepthMapService,
    get_depth_service,
)
from backend.services.alert_animation.export_service import (
    AnimationExportService,
    get_export_service,
)
from backend.services.alert_animation.suggestion_service import (
    AnimationSuggestionService,
    get_animation_suggestion_service,
)
from backend.services.alert_animation.animation_engine import (
    EasingType,
    EasingFunctions,
    SpringConfig,
    BezierCurve,
    AnimationKeyframe,
    AnimationTrack,
    AnimationTimeline,
    DepthParallaxEngine,
    create_designer_animation,
)

__all__ = [
    # Depth Service
    "DepthMapService",
    "get_depth_service",
    # Export Service
    "AnimationExportService",
    "get_export_service",
    # Suggestion Service
    "AnimationSuggestionService",
    "get_animation_suggestion_service",
    # Animation Engine
    "EasingType",
    "EasingFunctions",
    "SpringConfig",
    "BezierCurve",
    "AnimationKeyframe",
    "AnimationTrack",
    "AnimationTimeline",
    "DepthParallaxEngine",
    "create_designer_animation",
]
