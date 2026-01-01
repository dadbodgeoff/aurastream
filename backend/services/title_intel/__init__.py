"""
Title Intelligence Service

Extracts title patterns, tags, and keywords from top-performing
YouTube videos per game category.
"""

from backend.services.title_intel.analyzer import (
    TitleIntelAnalyzer,
    get_title_intel_analyzer,
    GameTitleIntel,
    KeywordIntel,
    PhraseIntel,
    TagIntel,
    TagCluster,
    TitleSuggestion,
    TitlePattern,
)

__all__ = [
    "TitleIntelAnalyzer",
    "get_title_intel_analyzer",
    "GameTitleIntel",
    "KeywordIntel",
    "PhraseIntel",
    "TagIntel",
    "TagCluster",
    "TitleSuggestion",
    "TitlePattern",
]
