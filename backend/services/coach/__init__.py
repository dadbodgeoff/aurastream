"""
Coach Service - AI-powered prompt refinement for content creators.

This module provides the Prompt Coach feature, which helps users
articulate their creative vision through conversation without
exposing the actual prompts used for generation.

Public API:
    CoachService          - Main service orchestrator
    get_coach_service     - Get the singleton instance
    
Models:
    CoachSession          - Session data model
    CoachMessage          - Message in a session
    PromptSuggestion      - Prompt version in history
    
Streaming:
    StreamChunk           - Streaming response chunk
    
Intent:
    CreativeIntent        - Extracted user intent
    IntentExtractor       - Extract intent from responses
    
Exceptions:
    SessionNotFoundError  - Session not found
    SessionExpiredError   - Session expired
    SessionLimitExceededError - Limits exceeded

For tips-only users:
    StaticTipsService     - Curated tips for free/pro tiers
"""

# Main service
from backend.services.coach.service import CoachService, get_coach_service

# Core models (from legacy location for backwards compatibility)
from backend.services.coach.models import (
    CoachSession,
    CoachMessage,
    PromptSuggestion,
)

# Core types and exceptions
from backend.services.coach.core import (
    # Types
    AssetType,
    MoodType,
    StreamChunkType,
    SessionStatus,
    TierType,
    ValidationSeverity,
    MAX_TURNS,
    MAX_TOKENS_IN,
    MAX_TOKENS_OUT,
    SESSION_TTL_SECONDS,
    TIER_ACCESS,
    has_coach_access,
    has_grounding_access,
    # Exceptions
    SessionNotFoundError,
    SessionExpiredError,
    SessionLimitExceededError,
    GroundingError,
)

# Streaming
from backend.services.coach.llm import StreamChunk

# Intent
from backend.services.coach.intent import (
    CreativeIntent,
    IntentExtractor,
    get_intent_extractor,
    ValidationIssue,
    ValidationResult,
    OutputValidator,
    get_validator,
)

# Session
from backend.services.coach.session import SessionManager, get_session_manager

# Grounding
from backend.services.coach.grounding import (
    GroundingStrategy,
    GroundingDecision,
    GroundingResult,
    get_grounding_strategy,
    get_grounding_orchestrator,
    get_search_service,
)

# Tips
from backend.services.coach.tips.service import StaticTipsService, get_tips_service

# Analytics
from backend.services.coach.analytics.service import CoachAnalyticsService, get_analytics_service

# LLM Client (for advanced usage)
from backend.services.coach.llm import CoachLLMClient, get_llm_client

# Backwards compatibility aliases
PromptCoachService = CoachService  # Legacy name


__all__ = [
    # Main Service
    "CoachService",
    "get_coach_service",
    "PromptCoachService",  # Legacy alias
    # Models
    "CoachSession",
    "CoachMessage",
    "PromptSuggestion",
    # Types
    "AssetType",
    "MoodType",
    "StreamChunkType",
    "SessionStatus",
    "TierType",
    "ValidationSeverity",
    # Constants
    "MAX_TURNS",
    "MAX_TOKENS_IN",
    "MAX_TOKENS_OUT",
    "SESSION_TTL_SECONDS",
    "TIER_ACCESS",
    # Helper Functions
    "has_coach_access",
    "has_grounding_access",
    # Exceptions
    "SessionNotFoundError",
    "SessionExpiredError",
    "SessionLimitExceededError",
    "GroundingError",
    # Streaming
    "StreamChunk",
    # Intent
    "CreativeIntent",
    "IntentExtractor",
    "get_intent_extractor",
    "ValidationIssue",
    "ValidationResult",
    "OutputValidator",
    "get_validator",
    # Session
    "SessionManager",
    "get_session_manager",
    # Grounding
    "GroundingStrategy",
    "GroundingDecision",
    "GroundingResult",
    "get_grounding_strategy",
    "get_grounding_orchestrator",
    "get_search_service",
    # Tips
    "StaticTipsService",
    "get_tips_service",
    # Analytics
    "CoachAnalyticsService",
    "get_analytics_service",
    # LLM
    "CoachLLMClient",
    "get_llm_client",
]
