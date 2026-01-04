"""
Grounding Strategy for Prompt Coach.

Uses LLM self-assessment to decide if web search is needed.
Instead of hardcoded rules, we ask the LLM:
"Can you answer this confidently, or do you need current info?"

The LLM knows:
- Its knowledge cutoff date
- What topics change frequently (game seasons, events)
- When it's uncertain vs confident

This prevents hallucination while avoiding unnecessary searches.
"""

import json
import re
import hashlib
import logging
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any
from enum import Enum

logger = logging.getLogger(__name__)


class ConfidenceLevel(str, Enum):
    """LLM's confidence in answering without search."""
    HIGH = "high"           # Can answer confidently, no search needed
    MEDIUM = "medium"       # Probably okay, but search would help
    LOW = "low"             # Likely to hallucinate, must search
    UNKNOWN = "unknown"     # Can't assess, default to search


@dataclass
class GroundingAssessment:
    """LLM's self-assessment on whether it needs grounding."""
    needs_search: bool
    confidence: ConfidenceLevel
    reason: str
    suggested_query: Optional[str] = None
    knowledge_cutoff_issue: bool = False


@dataclass
class GroundingDecision:
    """Final decision on whether to ground."""
    should_ground: bool
    query: Optional[str] = None
    reason: Optional[str] = None
    assessment: Optional[GroundingAssessment] = None


@dataclass
class GroundingResult:
    """Result of grounding search."""
    context: str
    sources: List[str]
    query: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "GroundingResult":
        """Create from dictionary."""
        return cls(
            context=data["context"],
            sources=data["sources"],
            query=data["query"],
        )


class GroundingCache:
    """Redis-backed cache for grounding search results."""
    
    # Game-specific TTLs in seconds
    GAME_TTLS = {
        "fortnite": 3600,       # 1 hour - updates frequently
        "apex legends": 3600,
        "valorant": 7200,       # 2 hours
        "league of legends": 7200,
        "overwatch": 7200,
        "call of duty": 3600,
        "warzone": 3600,
        "minecraft": 86400,     # 24 hours - stable
        "default": 7200,        # 2 hours default
    }
    
    KEY_PREFIX = "grounding:cache:"
    
    def __init__(self, redis_client=None):
        self._redis = redis_client
    
    @property
    def redis(self):
        if self._redis is None:
            from backend.database.redis_client import get_redis_client
            self._redis = get_redis_client()
        return self._redis
    
    def _cache_key(self, game: str, query: str) -> str:
        """Generate cache key from game and query."""
        normalized_query = " ".join(query.lower().split())
        query_hash = hashlib.sha256(normalized_query.encode()).hexdigest()[:16]
        game_normalized = game.lower().replace(" ", "_")
        return f"{self.KEY_PREFIX}{game_normalized}:{query_hash}"
    
    def _get_ttl(self, game: str) -> int:
        """Get TTL for a game."""
        game_lower = game.lower()
        return self.GAME_TTLS.get(game_lower, self.GAME_TTLS["default"])
    
    async def get(self, game: str, query: str) -> Optional[GroundingResult]:
        """Get cached grounding result."""
        try:
            cache_key = self._cache_key(game, query)
            cached_data = await self.redis.get(cache_key)
            
            if cached_data is None:
                logger.debug(f"Cache miss for game={game}, query_hash={cache_key[-16:]}")
                return None
            
            data = json.loads(cached_data)
            logger.debug(f"Cache hit for game={game}, query_hash={cache_key[-16:]}")
            return GroundingResult.from_dict(data)
            
        except Exception as e:
            # Cache errors should not break the flow
            logger.warning(f"Cache get error: {e}")
            return None
    
    async def set(self, game: str, query: str, result: GroundingResult) -> None:
        """Cache a grounding result."""
        try:
            cache_key = self._cache_key(game, query)
            ttl = self._get_ttl(game)
            data = json.dumps(result.to_dict())
            
            await self.redis.setex(cache_key, ttl, data)
            logger.debug(f"Cached grounding result for game={game}, ttl={ttl}s")
            
        except Exception as e:
            # Cache errors should not break the flow
            logger.warning(f"Cache set error: {e}")
    
    async def invalidate(self, game: str) -> int:
        """Invalidate all cache entries for a game. Returns count deleted."""
        try:
            game_normalized = game.lower().replace(" ", "_")
            pattern = f"{self.KEY_PREFIX}{game_normalized}:*"
            
            # Use SCAN to find matching keys
            cursor = 0
            deleted_count = 0
            
            while True:
                cursor, keys = await self.redis.scan(cursor, match=pattern, count=100)
                if keys:
                    deleted_count += await self.redis.delete(*keys)
                if cursor == 0:
                    break
            
            logger.info(f"Invalidated {deleted_count} cache entries for game={game}")
            return deleted_count
            
        except Exception as e:
            logger.warning(f"Cache invalidate error: {e}")
            return 0


# Singleton instance for grounding cache
_grounding_cache: Optional[GroundingCache] = None


def get_grounding_cache(redis_client=None) -> GroundingCache:
    """Get or create the grounding cache singleton."""
    global _grounding_cache
    if _grounding_cache is None or redis_client is not None:
        _grounding_cache = GroundingCache(redis_client=redis_client)
    return _grounding_cache


class GroundingStrategy:
    """
    LLM-driven grounding decision.
    
    Instead of hardcoded rules, we ask the LLM:
    "Can you answer this confidently, or do you need current info?"
    
    The LLM knows:
    - Its knowledge cutoff date
    - What topics change frequently (game seasons, events)
    - When it's uncertain vs confident
    
    This prevents hallucination while avoiding unnecessary searches.
    """
    
    ASSESSMENT_PROMPT = '''You are assessing whether you need web search to answer a user's question about creating gaming/streaming assets.

User message: "{message}"

Assess your confidence in answering WITHOUT web search. Consider:
1. Is this about current/recent game content (seasons, events, updates)?
2. Is this about specific dates, versions, or time-sensitive info?
3. Could your knowledge be outdated for this topic?
4. Is this a general style/design question you can answer confidently?

Respond with JSON only:
{{
    "needs_search": true/false,
    "confidence": "high" | "medium" | "low",
    "reason": "brief explanation",
    "suggested_query": "search query if needed, null otherwise",
    "knowledge_cutoff_issue": true/false
}}

Examples:
- "Make me a Fortnite thumbnail" → needs_search: true (current season matters)
- "Make the colors more vibrant" → needs_search: false (style refinement)
- "What's the current Apex season?" → needs_search: true (time-sensitive)
- "I want a cozy emote style" → needs_search: false (general style)
- "Valorant Episode 8 themed" → needs_search: true (specific version)
'''

    # Skip assessment entirely for these (obvious no-search)
    SKIP_ASSESSMENT_PATTERNS = [
        r"^(yes|no|ok|sure|thanks|perfect|great|good|nice)",  # Confirmations
        r"^make it (more|less|brighter|darker|bolder)",  # Refinements
        r"^(change|adjust|tweak|modify) the",  # Modifications
        r"^use my brand",  # Brand reference
        r"^(add|remove|include|exclude)",  # Simple edits
        r"^(i like|i don't like|i prefer)",  # Preferences
    ]
    
    # Games that frequently update and need grounding
    FREQUENTLY_UPDATING_GAMES = [
        "fortnite", "apex legends", "valorant", "league of legends",
        "overwatch", "call of duty", "warzone", "destiny", "genshin impact",
        "minecraft", "roblox", "pokemon", "fifa", "madden", "nba 2k"
    ]
    
    def __init__(self, llm_client=None):
        """
        Initialize the grounding strategy.
        
        Args:
            llm_client: LLM client for self-assessment (optional)
        """
        self.llm = llm_client
        self._assessment_cache: Dict[str, GroundingAssessment] = {}
    
    async def should_ground(
        self, 
        message: str, 
        is_premium: bool,
        session_context: Optional[str] = None,
    ) -> GroundingDecision:
        """
        Decide if this message needs web search grounding.
        
        Uses LLM self-assessment to determine if it can answer
        confidently or if it risks hallucinating.
        
        Args:
            message: User's message
            is_premium: Whether user has premium access
            session_context: Optional session context
            
        Returns:
            GroundingDecision with should_ground and query
        """
        if not is_premium:
            return GroundingDecision(
                should_ground=False,
                reason="Grounding requires Premium",
            )
        
        message_lower = message.lower().strip()
        
        # Skip assessment for obvious no-search cases
        for pattern in self.SKIP_ASSESSMENT_PATTERNS:
            if re.match(pattern, message_lower):
                return GroundingDecision(
                    should_ground=False,
                    reason="Refinement/confirmation - no search needed",
                )
        
        # Quick check for game mentions that need grounding
        for game in self.FREQUENTLY_UPDATING_GAMES:
            if game in message_lower:
                # Check if it's asking about current/recent content OR specific locations
                current_terms = ["current", "new", "latest", "season", "chapter", "episode", "update", "event"]
                # Also trigger grounding for specific location/POI mentions
                location_terms = ["boulevard", "strip", "towers", "tilted", "pleasant", "retail", "salty", "lazy", "loot", "poi", "location", "spot", "landing"]
                
                if any(term in message_lower for term in current_terms):
                    return GroundingDecision(
                        should_ground=True,
                        query=f"{game} current season 2024",
                        reason=f"Game content changes frequently: {game}",
                    )
                
                # For specific locations, search for what they look like
                if any(term in message_lower for term in location_terms):
                    # Extract the location name from the message
                    # Look for capitalized words that might be location names
                    import re
                    # Find potential location names (capitalized words)
                    potential_locations = re.findall(r'[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*', message)
                    location_query = " ".join(potential_locations[:3]) if potential_locations else message[:50]
                    return GroundingDecision(
                        should_ground=True,
                        query=f"{game} {location_query} location what it looks like",
                        reason=f"Specific game location mentioned - need visual reference",
                    )
        
        # Check cache for similar queries
        cache_key = self._cache_key(message)
        if cache_key in self._assessment_cache:
            cached = self._assessment_cache[cache_key]
            return GroundingDecision(
                should_ground=cached.needs_search,
                query=cached.suggested_query,
                reason=f"Cached: {cached.reason}",
                assessment=cached,
            )
        
        # If no LLM client, use heuristics
        if self.llm is None:
            return self._heuristic_decision(message)
        
        # Ask LLM to self-assess
        assessment = await self._assess_grounding_need(message)
        
        # Cache the assessment
        self._assessment_cache[cache_key] = assessment
        
        return GroundingDecision(
            should_ground=assessment.needs_search,
            query=assessment.suggested_query,
            reason=assessment.reason,
            assessment=assessment,
        )
    
    async def _assess_grounding_need(self, message: str) -> GroundingAssessment:
        """Ask LLM if it needs search to answer this message."""
        prompt = self.ASSESSMENT_PROMPT.format(message=message)
        
        try:
            response = await self.llm.chat([
                {"role": "system", "content": "You assess grounding needs. Respond with JSON only."},
                {"role": "user", "content": prompt},
            ], max_tokens=200)
            
            # Parse JSON response
            content = response.content if hasattr(response, 'content') else str(response)
            
            # Try to extract JSON from response
            json_match = re.search(r'\{[^{}]*\}', content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
            else:
                data = json.loads(content)
            
            return GroundingAssessment(
                needs_search=data.get("needs_search", True),
                confidence=ConfidenceLevel(data.get("confidence", "low")),
                reason=data.get("reason", "Assessment completed"),
                suggested_query=data.get("suggested_query"),
                knowledge_cutoff_issue=data.get("knowledge_cutoff_issue", False),
            )
            
        except (json.JSONDecodeError, Exception) as e:
            # If assessment fails, default to searching (safer)
            return GroundingAssessment(
                needs_search=True,
                confidence=ConfidenceLevel.UNKNOWN,
                reason=f"Assessment failed, defaulting to search: {str(e)}",
                suggested_query=self._fallback_query(message),
                knowledge_cutoff_issue=True,
            )
    
    def _heuristic_decision(self, message: str) -> GroundingDecision:
        """Make grounding decision using heuristics (no LLM)."""
        message_lower = message.lower()
        
        # Time-sensitive keywords
        time_keywords = ["current", "latest", "new", "recent", "today", "now", "2024", "2025"]
        if any(kw in message_lower for kw in time_keywords):
            return GroundingDecision(
                should_ground=True,
                query=self._fallback_query(message),
                reason="Time-sensitive content detected",
            )
        
        # Version/season keywords
        version_keywords = ["season", "chapter", "episode", "update", "patch", "version"]
        if any(kw in message_lower for kw in version_keywords):
            return GroundingDecision(
                should_ground=True,
                query=self._fallback_query(message),
                reason="Version-specific content detected",
            )
        
        # Default: no grounding needed
        return GroundingDecision(
            should_ground=False,
            reason="No time-sensitive content detected",
        )
    
    def _cache_key(self, message: str) -> str:
        """Generate cache key for message."""
        # Normalize message for caching
        normalized = " ".join(message.lower().split())
        return hashlib.sha256(normalized.encode()).hexdigest()[:16]
    
    def _fallback_query(self, message: str) -> str:
        """Build fallback search query if assessment fails."""
        stop_words = {"i", "want", "to", "make", "create", "a", "an", "the", "for", "my", "me", "with"}
        words = [w for w in message.lower().split() if w not in stop_words and len(w) > 2]
        return " ".join(words[:5]) + " gaming 2024"
    
    def clear_cache(self) -> None:
        """Clear the assessment cache."""
        self._assessment_cache.clear()


class GroundingOrchestrator:
    """
    Orchestrates the grounding flow:
    1. Quick pattern check (skip obvious cases)
    2. LLM self-assessment (should I search?)
    3. If yes: check cache first, then search if needed
    4. If no: answer directly
    """
    
    def __init__(self, strategy: GroundingStrategy, search_service=None, cache: Optional[GroundingCache] = None):
        """
        Initialize the orchestrator.
        
        Args:
            strategy: GroundingStrategy instance
            search_service: Web search service (optional)
            cache: GroundingCache instance (optional, will use singleton if not provided)
        """
        self.strategy = strategy
        self.search = search_service
        self._cache = cache
    
    @property
    def cache(self) -> GroundingCache:
        """Get the grounding cache (lazy initialization)."""
        if self._cache is None:
            self._cache = get_grounding_cache()
        return self._cache
    
    def _extract_game_from_query(self, query: str) -> str:
        """Extract game name from query for cache key."""
        query_lower = query.lower()
        for game in GroundingStrategy.FREQUENTLY_UPDATING_GAMES:
            if game in query_lower:
                return game
        return "default"
    
    async def process_with_grounding(
        self,
        message: str,
        is_premium: bool,
    ) -> Dict[str, Any]:
        """
        Process a message with intelligent grounding.
        
        Args:
            message: User's message
            is_premium: Whether user has premium access
            
        Returns:
            Dict with grounding results
        """
        # Step 1: Decide if we need grounding
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
        
        # Step 2: Check cache first
        if decision.query:
            game = self._extract_game_from_query(decision.query)
            cached_result = await self.cache.get(game, decision.query)
            
            if cached_result is not None:
                logger.debug(f"Using cached grounding result for query: {decision.query}")
                result["grounded"] = True
                result["search_query"] = decision.query
                result["search_results"] = cached_result.context
                result["cache_hit"] = True
                return result
        
        # Step 3: Perform search if we have a search service
        if decision.query and self.search is not None:
            try:
                search_results = await self.search.search(
                    query=decision.query,
                    max_results=3,
                )
                
                if search_results:
                    formatted_results = self._format_results(search_results)
                    sources = [getattr(r, 'url', str(r)) for r in search_results[:3]]
                    
                    result["grounded"] = True
                    result["search_query"] = decision.query
                    result["search_results"] = formatted_results
                    
                    # Cache the result
                    game = self._extract_game_from_query(decision.query)
                    grounding_result = GroundingResult(
                        context=formatted_results,
                        sources=sources,
                        query=decision.query,
                    )
                    await self.cache.set(game, decision.query, grounding_result)
                    logger.debug(f"Cached new grounding result for query: {decision.query}")
                    
            except Exception as e:
                # Search failed, continue without grounding
                logger.warning(f"Search failed: {e}")
        
        return result
    
    def _format_results(self, results: List[Any]) -> str:
        """Format search results for injection into context."""
        formatted = ["Current information from web search:"]
        for r in results[:3]:
            title = getattr(r, 'title', str(r))
            snippet = getattr(r, 'snippet', '')[:200]
            formatted.append(f"- {title}: {snippet}")
        return "\n".join(formatted)


# Singleton instances
_grounding_strategy: Optional[GroundingStrategy] = None
_grounding_orchestrator: Optional[GroundingOrchestrator] = None


def get_grounding_strategy(llm_client=None) -> GroundingStrategy:
    """Get or create the grounding strategy singleton."""
    global _grounding_strategy
    if _grounding_strategy is None or llm_client is not None:
        _grounding_strategy = GroundingStrategy(llm_client=llm_client)
    return _grounding_strategy


def get_grounding_orchestrator(
    strategy: Optional[GroundingStrategy] = None,
    search_service=None,
    cache: Optional[GroundingCache] = None,
) -> GroundingOrchestrator:
    """
    Get or create the grounding orchestrator singleton.
    
    If no search_service is provided, automatically initializes one
    using the search_service factory.
    """
    global _grounding_orchestrator
    if _grounding_orchestrator is None:
        # Auto-initialize search service if not provided
        if search_service is None:
            try:
                from backend.services.coach.search_service import get_search_service
                search_service = get_search_service()
            except ImportError:
                pass
        
        _grounding_orchestrator = GroundingOrchestrator(
            strategy=strategy or get_grounding_strategy(),
            search_service=search_service,
            cache=cache,
        )
    return _grounding_orchestrator


__all__ = [
    "ConfidenceLevel",
    "GroundingAssessment",
    "GroundingDecision",
    "GroundingResult",
    "GroundingCache",
    "GroundingStrategy",
    "GroundingOrchestrator",
    "get_grounding_strategy",
    "get_grounding_orchestrator",
    "get_grounding_cache",
]
