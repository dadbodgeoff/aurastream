"""
Grounding Strategy for Prompt Coach.

Uses LLM self-assessment to decide if web search is needed.
"""

import re
import hashlib
import logging
from dataclasses import dataclass
from typing import Optional, List, Dict, Any

from backend.services.coach.core.types import ConfidenceLevel

logger = logging.getLogger(__name__)


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
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "GroundingResult":
        return cls(context=data["context"], sources=data["sources"], query=data["query"])


class GroundingStrategy:
    """LLM-driven grounding decision maker."""
    
    SKIP_PATTERNS = [
        r"^(yes|no|ok|sure|thanks|perfect|great)",
        r"^make it (more|less|brighter|darker)",
        r"^(change|adjust|tweak) the",
        r"^(add|remove|include)",
    ]
    
    # Games that frequently update content - ALWAYS ground these
    UPDATING_GAMES = [
        "fortnite", "apex legends", "valorant", "league of legends",
        "overwatch", "call of duty", "warzone", "genshin impact",
        "minecraft", "roblox", "destiny", "fifa", "madden",
    ]
    
    # Keywords that indicate specific game elements needing visual reference
    GAME_ELEMENT_KEYWORDS = [
        "skin", "character", "map", "location", "weapon", "item",
        "emote", "dance", "outfit", "cosmetic", "battle pass",
        "season", "chapter", "poi", "landmark", "arena",
    ]
    
    def __init__(self, llm_client=None):
        self.llm = llm_client
        self._cache: Dict[str, GroundingAssessment] = {}
    
    async def should_ground(
        self, 
        message: str, 
        is_premium: bool,
        force_for_generation: bool = False,
    ) -> GroundingDecision:
        """
        Decide if this message needs web search grounding.
        
        Args:
            message: The user message or prompt
            is_premium: Whether user has premium tier
            force_for_generation: If True, always ground for game content
        """
        if not is_premium:
            return GroundingDecision(should_ground=False, reason="Requires Premium")
        
        msg_lower = message.lower().strip()
        
        # Skip simple refinement messages (unless forcing for generation)
        if not force_for_generation:
            for pattern in self.SKIP_PATTERNS:
                if re.match(pattern, msg_lower):
                    return GroundingDecision(should_ground=False, reason="Refinement")
        
        # Check for game mentions - if found, ALWAYS ground
        detected_game = None
        for game in self.UPDATING_GAMES:
            if game in msg_lower:
                detected_game = game
                break
        
        if detected_game:
            # Build a smart search query
            query = self._build_game_query(message, detected_game)
            return GroundingDecision(
                should_ground=True,
                query=query,
                reason=f"Game content: {detected_game}",
            )
        
        # Check for game element keywords even without explicit game name
        has_game_elements = any(kw in msg_lower for kw in self.GAME_ELEMENT_KEYWORDS)
        if has_game_elements and force_for_generation:
            query = self._build_query(message)
            return GroundingDecision(
                should_ground=True,
                query=query,
                reason="Game elements detected",
            )
        
        # Check cache
        cache_key = hashlib.sha256(msg_lower.encode()).hexdigest()[:16]
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            return GroundingDecision(
                should_ground=cached.needs_search,
                query=cached.suggested_query,
                reason=f"Cached: {cached.reason}",
                assessment=cached,
            )
        
        return self._heuristic_decision(message)
    
    def _build_game_query(self, message: str, game: str) -> str:
        """Build an optimized search query for game content."""
        msg_lower = message.lower()
        
        # Extract specific elements to search for
        query_parts = [game]
        
        # Look for skin/character names (capitalized words or quoted text)
        # Pattern: "The Bride" or Kingston or Marty McFly
        name_patterns = [
            r'"([^"]+)"',  # Quoted names
            r'\*\*([^*]+)\*\*',  # Bold names
            r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b',  # Capitalized names
        ]
        
        found_names = []
        for pattern in name_patterns:
            matches = re.findall(pattern, message)
            for match in matches:
                if len(match) > 2 and match.lower() not in ["the", "and", "for", "with"]:
                    found_names.append(match)
        
        if found_names:
            # Search for specific skins/characters
            query_parts.extend(found_names[:3])  # Limit to 3 names
            query_parts.append("skin character")
        
        # Check for map/location references
        if any(kw in msg_lower for kw in ["map", "location", "chapter", "season"]):
            # Extract chapter/season info
            chapter_match = re.search(r'chapter\s*(\d+)', msg_lower)
            season_match = re.search(r'season\s*(\d+)', msg_lower)
            
            if chapter_match:
                query_parts.append(f"chapter {chapter_match.group(1)}")
            if season_match:
                query_parts.append(f"season {season_match.group(1)}")
            
            query_parts.append("map")
        
        # Add current year for freshness
        query_parts.append("2025")
        
        return " ".join(query_parts[:8])  # Limit query length
    
    def _heuristic_decision(self, message: str) -> GroundingDecision:
        msg_lower = message.lower()
        time_keywords = ["current", "latest", "new", "recent", "2024", "2025", "2026"]
        if any(kw in msg_lower for kw in time_keywords):
            return GroundingDecision(
                should_ground=True,
                query=self._build_query(message),
                reason="Time-sensitive content",
            )
        return GroundingDecision(should_ground=False, reason="No time-sensitive content")
    
    def _build_query(self, message: str) -> str:
        stop_words = {"i", "want", "to", "make", "create", "a", "an", "the", "for", "my"}
        words = [w for w in message.lower().split() if w not in stop_words and len(w) > 2]
        return " ".join(words[:5]) + " gaming 2025"


_strategy: Optional[GroundingStrategy] = None


def get_grounding_strategy(llm_client=None) -> GroundingStrategy:
    """Get or create the grounding strategy singleton."""
    global _strategy
    if _strategy is None or llm_client is not None:
        _strategy = GroundingStrategy(llm_client=llm_client)
    return _strategy


__all__ = [
    "GroundingAssessment",
    "GroundingDecision",
    "GroundingResult",
    "GroundingStrategy",
    "get_grounding_strategy",
]
