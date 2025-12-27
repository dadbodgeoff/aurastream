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
from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from enum import Enum


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
                # Check if it's asking about current/recent content
                current_terms = ["current", "new", "latest", "season", "chapter", "episode", "update", "event"]
                if any(term in message_lower for term in current_terms):
                    return GroundingDecision(
                        should_ground=True,
                        query=f"{game} current season 2024",
                        reason=f"Game content changes frequently: {game}",
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
    3. If yes: search, then answer with context
    4. If no: answer directly
    """
    
    def __init__(self, strategy: GroundingStrategy, search_service=None):
        """
        Initialize the orchestrator.
        
        Args:
            strategy: GroundingStrategy instance
            search_service: Web search service (optional)
        """
        self.strategy = strategy
        self.search = search_service
    
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
        }
        
        if not decision.should_ground:
            return result
        
        # Step 2: Perform search if we have a search service
        if decision.query and self.search is not None:
            try:
                search_results = await self.search.search(
                    query=decision.query,
                    max_results=3,
                )
                
                if search_results:
                    result["grounded"] = True
                    result["search_query"] = decision.query
                    result["search_results"] = self._format_results(search_results)
            except Exception:
                # Search failed, continue without grounding
                pass
        
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
    search_service=None
) -> GroundingOrchestrator:
    """Get or create the grounding orchestrator singleton."""
    global _grounding_orchestrator
    if _grounding_orchestrator is None:
        _grounding_orchestrator = GroundingOrchestrator(
            strategy=strategy or get_grounding_strategy(),
            search_service=search_service,
        )
    return _grounding_orchestrator


__all__ = [
    "ConfidenceLevel",
    "GroundingAssessment",
    "GroundingDecision",
    "GroundingResult",
    "GroundingStrategy",
    "GroundingOrchestrator",
    "get_grounding_strategy",
    "get_grounding_orchestrator",
]
