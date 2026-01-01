"""
Trend Intelligence Service Package.
Exports singleton getters for all trend services.
"""

from typing import Optional

from backend.services.trends.trend_service import TrendService

# Lazy imports to avoid circular dependencies
# These will be imported when the getters are called
_trend_service: Optional[TrendService] = None
_youtube_collector = None
_twitch_collector = None


def get_trend_service() -> TrendService:
    """Get or create the trend service singleton."""
    global _trend_service
    if _trend_service is None:
        _trend_service = TrendService()
    return _trend_service


def get_youtube_collector():
    """Get or create the YouTube collector singleton."""
    global _youtube_collector
    if _youtube_collector is None:
        from backend.services.trends.youtube_collector import YouTubeCollector
        _youtube_collector = YouTubeCollector()
    return _youtube_collector


def get_twitch_collector():
    """Get or create the Twitch collector singleton."""
    global _twitch_collector
    if _twitch_collector is None:
        from backend.services.trends.twitch_collector import TwitchCollector
        _twitch_collector = TwitchCollector()
    return _twitch_collector


__all__ = [
    "TrendService",
    "get_trend_service",
    "get_youtube_collector",
    "get_twitch_collector",
]
