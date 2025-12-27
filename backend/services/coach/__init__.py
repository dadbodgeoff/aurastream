"""
Creative Director Coach service package.

This package contains all services for the Creative Director Coach feature:
- Session management
- Output validation
- Grounding strategy
- Static tips
- Main coach service

The Creative Director Coach is a Premium-only feature that helps users
articulate their creative vision through conversation, without exposing
the actual prompts used for generation.
"""

from backend.services.coach.models import (
    CoachSession,
    CoachMessage,
    PromptSuggestion,
)
from backend.services.coach.session_manager import (
    SessionManager,
    SessionNotFoundError,
    SessionExpiredError,
    SessionLimitExceededError,
    get_session_manager,
)
from backend.services.coach.validator import (
    ValidationSeverity,
    ValidationIssue,
    ValidationResult,
    OutputValidator,
    get_validator,
)
from backend.services.coach.grounding import (
    ConfidenceLevel,
    GroundingAssessment,
    GroundingDecision,
    GroundingResult,
    GroundingStrategy,
    GroundingOrchestrator,
    get_grounding_strategy,
    get_grounding_orchestrator,
)
from backend.services.coach.coach_service import (
    StreamChunk,
    CreativeIntent,
    CoachOutput,
    CreativeDirectorService,
    PromptCoachService,  # Backwards compatibility alias
    get_coach_service,
)
from backend.services.coach.tips_service import (
    PromptTip,
    StaticTipsService,
    get_tips_service,
)
from backend.services.coach.llm_client import (
    CoachLLMClient,
    get_llm_client,
)
from backend.services.coach.partial_validator import (
    StreamingCoachResponse,
    StreamingValidator,
    get_streaming_validator,
)

__all__ = [
    # Models
    "CoachSession",
    "CoachMessage",
    "PromptSuggestion",
    # Session Manager
    "SessionManager",
    "SessionNotFoundError",
    "SessionExpiredError",
    "SessionLimitExceededError",
    "get_session_manager",
    # Validator
    "ValidationSeverity",
    "ValidationIssue",
    "ValidationResult",
    "OutputValidator",
    "get_validator",
    # Grounding
    "ConfidenceLevel",
    "GroundingAssessment",
    "GroundingDecision",
    "GroundingResult",
    "GroundingStrategy",
    "GroundingOrchestrator",
    "get_grounding_strategy",
    "get_grounding_orchestrator",
    # Coach Service
    "StreamChunk",
    "CreativeIntent",
    "CoachOutput",
    "CreativeDirectorService",
    "PromptCoachService",  # Backwards compatibility
    "get_coach_service",
    # Tips Service
    "PromptTip",
    "StaticTipsService",
    "get_tips_service",
    # LLM Client
    "CoachLLMClient",
    "get_llm_client",
    # Partial Validator
    "StreamingCoachResponse",
    "StreamingValidator",
    "get_streaming_validator",
]
