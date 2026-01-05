"""
Web search, game context grounding, and image references.

This module provides:
- GroundingStrategy: Decides when web search is needed
- GroundingOrchestrator: Coordinates the grounding flow
- GroundingCache: Redis-backed cache for search results
- WebSearchService: Web search implementations
- ImageReferenceService: Game element image fetching
"""

from backend.services.coach.grounding.strategy import (
    GroundingAssessment,
    GroundingDecision,
    GroundingResult,
    GroundingStrategy,
    get_grounding_strategy,
)
from backend.services.coach.grounding.orchestrator import (
    GroundingOrchestrator,
    get_grounding_orchestrator,
)
from backend.services.coach.grounding.cache import (
    GroundingCache,
    get_grounding_cache,
)
from backend.services.coach.grounding.search import (
    SearchResult,
    WebSearchService,
    DuckDuckGoSearchService,
    MockSearchService,
    get_search_service,
)
from backend.services.coach.grounding.image_refs import (
    ElementType,
    GameElement,
    ImageReference,
    ReferenceSearchResult,
    ImageReferenceService,
    get_image_reference_service,
)

__all__ = [
    # Strategy
    "GroundingAssessment",
    "GroundingDecision",
    "GroundingResult",
    "GroundingStrategy",
    "get_grounding_strategy",
    # Orchestrator
    "GroundingOrchestrator",
    "get_grounding_orchestrator",
    # Cache
    "GroundingCache",
    "get_grounding_cache",
    # Search
    "SearchResult",
    "WebSearchService",
    "DuckDuckGoSearchService",
    "MockSearchService",
    "get_search_service",
    # Image References
    "ElementType",
    "GameElement",
    "ImageReference",
    "ReferenceSearchResult",
    "ImageReferenceService",
    "get_image_reference_service",
]
