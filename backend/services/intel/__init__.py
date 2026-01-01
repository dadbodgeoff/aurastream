"""
Creator Intel Service Module

Provides services for the unified intelligence dashboard.
Now with modular, enterprise-grade components.
"""

from .preferences_repository import IntelPreferencesRepository
from .categories import get_available_categories, AVAILABLE_CATEGORIES
from .competition_analyzer import (
    CompetitionAnalyzer,
    get_competition_analyzer,
    CompetitionAnalysis,
    CATEGORY_BASELINES,
    CompetitionAnalysisError,
)
from .mission_generator import MissionGenerator, get_mission_generator
from .viral_detector import (
    ViralDetector,
    get_viral_detector,
    close_viral_detector,
    VideoVelocity,
    ViralOpportunityAnalysis,
)
from .category_stats import CategoryStats
from .scoring_engine import (
    ScoringEngine,
    get_scoring_engine,
    create_scoring_engine,
)

# Re-export from modular components
from .stats import (
    calculate_z_score,
    calculate_percentile_score,
    calculate_percentile,
    calculate_mean,
    calculate_std,
    remove_outliers_iqr,
    remove_outliers_mad,
    PercentileThresholds,
)
from .decay import (
    freshness_decay,
    recency_boost,
    velocity_from_age,
    combined_freshness_score,
)
from .confidence import (
    calculate_confidence,
    calculate_score_variance,
    assess_data_quality,
    DataQualityLevel,
)
from .scoring import (
    combine_scores,
    weighted_harmonic_mean,
    normalize_across_categories,
    calculate_category_difficulty,
)

__all__ = [
    # Repository
    "IntelPreferencesRepository",
    # Categories
    "get_available_categories",
    "AVAILABLE_CATEGORIES",
    # Competition Analyzer
    "CompetitionAnalyzer",
    "get_competition_analyzer",
    "CompetitionAnalysis",
    "CATEGORY_BASELINES",
    "CompetitionAnalysisError",
    # Mission Generator
    "MissionGenerator",
    "get_mission_generator",
    # Viral Detector
    "ViralDetector",
    "get_viral_detector",
    "close_viral_detector",
    "VideoVelocity",
    "ViralOpportunityAnalysis",
    # Category Stats
    "CategoryStats",
    # Scoring Engine
    "ScoringEngine",
    "get_scoring_engine",
    "create_scoring_engine",
    # Stats
    "calculate_z_score",
    "calculate_percentile_score",
    "calculate_percentile",
    "calculate_mean",
    "calculate_std",
    "remove_outliers_iqr",
    "remove_outliers_mad",
    "PercentileThresholds",
    # Decay
    "freshness_decay",
    "recency_boost",
    "velocity_from_age",
    "combined_freshness_score",
    # Confidence
    "calculate_confidence",
    "calculate_score_variance",
    "assess_data_quality",
    "DataQualityLevel",
    # Scoring
    "combine_scores",
    "weighted_harmonic_mean",
    "normalize_across_categories",
    "calculate_category_difficulty",
]
