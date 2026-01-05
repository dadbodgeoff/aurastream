"""
Grounding Orchestrator for Prompt Coach.

Coordinates the grounding flow:
1. Quick pattern check (skip obvious cases)
2. LLM self-assessment (should I search?)
3. If yes: check cache first, then search if needed
4. If no: answer directly
"""

import logging
from typing import Dict, Any, Optional, List

from backend.services.coach.grounding.strategy import (
    GroundingStrategy,
    GroundingResult,
    get_grounding_strategy,
)

logger = logging.getLogger(__name__)


class GroundingOrchestrator:
    """Orchestrates the grounding flow with caching."""
    
    # Games that frequently update
    FREQUENTLY_UPDATING_GAMES = [
        "fortnite", "apex legends", "valorant", "league of legends",
        "overwatch", "call of duty", "warzone", "destiny", "genshin impact",
    ]
    
    def __init__(self, strategy: GroundingStrategy, search_service=None, cache=None):
        self.strategy = strategy
        self.search = search_service
        self._cache = cache
    
    @property
    def cache(self):
        if self._cache is None:
            from backend.services.coach.grounding.cache import get_grounding_cache
            self._cache = get_grounding_cache()
        return self._cache
    
    async def process_with_grounding(
        self,
        message: str,
        is_premium: bool,
    ) -> Dict[str, Any]:
        """Process a message with intelligent grounding."""
        decision = await self.strategy.should_ground(message, is_premium)
        
        result = {
            "grounded": False,
            "search_query": None,
            "search_results": None,
            "assessment": decision.assessment,
            "reason": decision.reason,
            "cache_hit": False,
        }
        
        if not decision.should_ground:
            return result
        
        # Check cache first
        if decision.query:
            game = self._extract_game(decision.query)
            cached = await self.cache.get(game, decision.query)
            if cached:
                result.update({
                    "grounded": True,
                    "search_query": decision.query,
                    "search_results": cached.context,
                    "cache_hit": True,
                })
                return result
        
        # Perform search
        if decision.query and self.search:
            try:
                search_results = await self.search.search(decision.query, max_results=3)
                if search_results:
                    formatted = self._format_results(search_results)
                    sources = [r.url for r in search_results[:3]]
                    
                    result.update({
                        "grounded": True,
                        "search_query": decision.query,
                        "search_results": formatted,
                    })
                    
                    # Cache result
                    game = self._extract_game(decision.query)
                    await self.cache.set(
                        game, decision.query,
                        GroundingResult(context=formatted, sources=sources, query=decision.query)
                    )
            except Exception as e:
                logger.warning(f"Search failed: {e}")
        
        return result
    
    def _extract_game(self, query: str) -> str:
        query_lower = query.lower()
        for game in self.FREQUENTLY_UPDATING_GAMES:
            if game in query_lower:
                return game
        return "default"
    
    def _format_results(self, results: List[Any]) -> str:
        lines = ["Current information from web search:"]
        for r in results[:3]:
            lines.append(f"- {r.title}: {r.snippet[:200]}")
        return "\n".join(lines)


# Singleton
_orchestrator: Optional[GroundingOrchestrator] = None


def get_grounding_orchestrator(
    strategy: Optional[GroundingStrategy] = None,
    search_service=None,
    cache=None,
) -> GroundingOrchestrator:
    """Get or create the grounding orchestrator singleton."""
    global _orchestrator
    if _orchestrator is None:
        if search_service is None:
            from backend.services.coach.grounding.search import get_search_service
            search_service = get_search_service()
        _orchestrator = GroundingOrchestrator(
            strategy=strategy or get_grounding_strategy(),
            search_service=search_service,
            cache=cache,
        )
    return _orchestrator


__all__ = ["GroundingOrchestrator", "get_grounding_orchestrator"]
