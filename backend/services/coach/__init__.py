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

Architecture (v2 - Enterprise Refactor):
- IntentExtractor: Extracts refined descriptions from LLM responses
- PromptBuilder: Constructs system prompts and user messages
- ResponseProcessor: Coordinates response processing and session updates
- SessionManager: Handles session storage and retrieval
- GroundingStrategy: Handles web search decisions
- CreativeDirectorService: Main orchestrator (legacy)
- CreativeDirectorServiceV2: Refactored orchestrator with clear SoC
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
# Legacy coach service (still used by routes)
from backend.services.coach.coach_service import (
    StreamChunk,
    CreativeIntent,
    CoachOutput,
    CreativeDirectorService,
    PromptCoachService,  # Backwards compatibility alias
    get_coach_service,
)
# New enterprise components (v2)
from backend.services.coach.intent_extractor import (
    IntentExtractor,
    get_intent_extractor,
)
from backend.services.coach.prompt_builder import (
    PromptContext,
    PromptBuilder,
    get_prompt_builder,
)
from backend.services.coach.response_processor import (
    ProcessedResponse,
    ResponseProcessor,
    get_response_processor,
)
from backend.services.coach.coach_service_v2 import (
    CreativeDirectorServiceV2,
    get_coach_service_v2,
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
from backend.services.coach.search_service import (
    SearchResult,
    WebSearchService,
    DuckDuckGoSearchService,
    MockSearchService,
    get_search_service,
    reset_search_service,
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
    # Coach Service (legacy)
    "StreamChunk",
    "CreativeIntent",
    "CoachOutput",
    "CreativeDirectorService",
    "PromptCoachService",  # Backwards compatibility
    "get_coach_service",
    # Intent Extractor (v2)
    "IntentExtractor",
    "get_intent_extractor",
    # Prompt Builder (v2)
    "PromptContext",
    "PromptBuilder",
    "get_prompt_builder",
    # Response Processor (v2)
    "ProcessedResponse",
    "ResponseProcessor",
    "get_response_processor",
    # Coach Service v2
    "CreativeDirectorServiceV2",
    "get_coach_service_v2",
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
    # Search Service
    "SearchResult",
    "WebSearchService",
    "DuckDuckGoSearchService",
    "MockSearchService",
    "get_search_service",
    "reset_search_service",
]
