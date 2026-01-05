"""
Core domain models, types, and exceptions for Coach module.

This package provides the foundational types and exceptions used
throughout the Coach service. It serves as the single source of truth
for type definitions and error handling.

Modules:
- types: Type aliases, constants, and tier configuration
- exceptions: Custom exception classes with API response support

Usage:
    from backend.services.coach.core import (
        # Types
        AssetType,
        MoodType,
        StreamChunkType,
        SessionStatus,
        TierType,
        ValidationSeverity,
        ConfidenceLevel,
        # Constants
        MAX_TURNS,
        MAX_TOKENS_IN,
        MAX_TOKENS_OUT,
        SESSION_TTL_SECONDS,
        TIER_ACCESS,
        # Helper functions
        has_coach_access,
        has_grounding_access,
        get_feature_level,
        # Exceptions
        CoachError,
        SessionNotFoundError,
        SessionExpiredError,
        SessionLimitExceededError,
        GroundingError,
        IntentExtractionError,
    )
"""

from backend.services.coach.core.types import (
    # Type Aliases
    AssetType,
    MoodType,
    StreamChunkType,
    SessionStatus,
    TierType,
    ValidationSeverity,
    ConfidenceLevel,
    # Constants
    MAX_TURNS,
    MAX_TOKENS_IN,
    MAX_TOKENS_OUT,
    SESSION_TTL_SECONDS,
    SESSION_KEY_PREFIX,
    # Configuration
    TIER_ACCESS,
    # Helper Functions
    has_coach_access,
    has_grounding_access,
    get_feature_level,
)

from backend.services.coach.core.exceptions import (
    CoachError,
    SessionNotFoundError,
    SessionExpiredError,
    SessionLimitExceededError,
    GroundingError,
    IntentExtractionError,
)


__all__ = [
    # Type Aliases
    "AssetType",
    "MoodType",
    "StreamChunkType",
    "SessionStatus",
    "TierType",
    "ValidationSeverity",
    "ConfidenceLevel",
    # Constants
    "MAX_TURNS",
    "MAX_TOKENS_IN",
    "MAX_TOKENS_OUT",
    "SESSION_TTL_SECONDS",
    "SESSION_KEY_PREFIX",
    # Configuration
    "TIER_ACCESS",
    # Helper Functions
    "has_coach_access",
    "has_grounding_access",
    "get_feature_level",
    # Exceptions
    "CoachError",
    "SessionNotFoundError",
    "SessionExpiredError",
    "SessionLimitExceededError",
    "GroundingError",
    "IntentExtractionError",
]
