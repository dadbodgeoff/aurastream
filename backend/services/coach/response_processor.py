"""
Response Processor for Prompt Coach.

Handles processing of LLM responses including:
- Streaming token handling
- Intent extraction coordination
- Session state updates
- Metadata extraction (keywords, brand elements)

This module coordinates between the LLM client, intent extractor,
and session manager to process coach responses.
"""

import logging
from dataclasses import dataclass
from typing import Dict, Any, Optional, List, AsyncGenerator

from backend.services.coach.models import CoachSession, CoachMessage
from backend.services.coach.intent_extractor import (
    CreativeIntent,
    IntentExtractor,
    get_intent_extractor,
)
from backend.services.coach.session_manager import SessionManager, get_session_manager

logger = logging.getLogger(__name__)


@dataclass
class StreamChunk:
    """
    Single chunk in a streaming response.
    
    Types:
    - "token": A text token from the LLM
    - "intent_ready": Intent extraction status
    - "grounding": Web search started
    - "grounding_complete": Web search finished
    - "done": Stream complete
    - "error": An error occurred
    """
    type: str
    content: str = ""
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ProcessedResponse:
    """
    Result of processing a complete LLM response.
    
    Contains the full response text, extracted intent,
    and metadata about the processing.
    """
    full_text: str
    intent: CreativeIntent
    is_ready: bool
    tokens_in: int = 0
    tokens_out: int = 0
    keywords: List[str] = None
    brand_elements: List[str] = None
    
    def __post_init__(self):
        if self.keywords is None:
            self.keywords = []
        if self.brand_elements is None:
            self.brand_elements = []


class ResponseProcessor:
    """
    Processes LLM responses for the coach.
    
    This class coordinates:
    - Intent extraction from responses
    - Session state updates
    - Metadata extraction (keywords, brand elements)
    - Stream chunk generation
    
    It acts as a facade over the intent extractor and session manager,
    providing a clean interface for the main coach service.
    """
    
    # Stop words for keyword extraction
    STOP_WORDS = {
        "a", "an", "the", "and", "or", "but", "in", "on", "at", "to",
        "for", "of", "with", "by", "from", "as", "is", "was", "are",
        "were", "been", "be", "have", "has", "had", "do", "does", "did",
        "i", "want", "like", "would", "should", "could", "my", "me",
        "it", "this", "that", "these", "those", "what", "which", "who",
    }
    
    def __init__(
        self,
        intent_extractor: Optional[IntentExtractor] = None,
        session_manager: Optional[SessionManager] = None,
    ):
        """
        Initialize the response processor.
        
        Args:
            intent_extractor: Intent extractor instance
            session_manager: Session manager instance
        """
        self._intent_extractor = intent_extractor
        self._session_manager = session_manager
    
    @property
    def extractor(self) -> IntentExtractor:
        """Lazy-load intent extractor."""
        if self._intent_extractor is None:
            self._intent_extractor = get_intent_extractor()
        return self._intent_extractor
    
    @property
    def sessions(self) -> SessionManager:
        """Lazy-load session manager."""
        if self._session_manager is None:
            self._session_manager = get_session_manager()
        return self._session_manager
    
    def process_initial_response(
        self,
        response: str,
        original_description: str,
        mood: str,
        brand_context: Optional[Dict[str, Any]] = None,
    ) -> ProcessedResponse:
        """
        Process the first response in a coaching session.
        
        Args:
            response: The full LLM response text
            original_description: The user's original description
            mood: The selected mood
            brand_context: Optional brand kit context
            
        Returns:
            ProcessedResponse with extracted intent and metadata
        """
        # Extract intent
        intent = self.extractor.extract_from_response(
            response=response,
            original_description=original_description,
            mood=mood,
        )
        
        # Check if ready for generation
        is_ready = self.extractor.check_intent_ready(response)
        
        # Extract keywords
        keywords = self._extract_keywords(intent.description)
        
        # Extract brand elements used
        brand_elements = self._extract_brand_elements(
            intent.description,
            brand_context,
        )
        
        return ProcessedResponse(
            full_text=response,
            intent=intent,
            is_ready=is_ready,
            keywords=keywords,
            brand_elements=brand_elements,
        )
    
    def process_continuation_response(
        self,
        response: str,
        user_message: str,
        session: CoachSession,
    ) -> ProcessedResponse:
        """
        Process a response in an ongoing conversation.
        
        Args:
            response: The full LLM response text
            user_message: The user's message that prompted this
            session: The current coaching session
            
        Returns:
            ProcessedResponse with refined intent and metadata
        """
        # Extract refined intent
        intent = self.extractor.extract_from_conversation(
            response=response,
            user_message=user_message,
            session=session,
        )
        
        # Check if ready for generation
        is_ready = self.extractor.check_intent_ready(response)
        
        # Extract keywords
        keywords = self._extract_keywords(intent.description)
        
        # Extract brand elements
        brand_elements = self._extract_brand_elements(
            intent.description,
            session.brand_context,
        )
        
        # Detect changes from previous version
        changes = self._detect_changes(
            session.current_prompt_draft,
            intent.description,
        )
        
        return ProcessedResponse(
            full_text=response,
            intent=intent,
            is_ready=is_ready,
            keywords=keywords,
            brand_elements=brand_elements,
        )
    
    async def update_session_with_response(
        self,
        session_id: str,
        user_message: str,
        assistant_response: str,
        intent: CreativeIntent,
        tokens_in: int = 0,
        tokens_out: int = 0,
        brand_elements: Optional[List[str]] = None,
    ) -> None:
        """
        Update session state after processing a response.
        
        Args:
            session_id: The session ID
            user_message: The user's message
            assistant_response: The coach's response
            intent: The extracted intent
            tokens_in: Input tokens used
            tokens_out: Output tokens generated
            brand_elements: Brand elements used
        """
        # Add user message
        await self.sessions.add_message(
            session_id,
            CoachMessage(
                role="user",
                content=user_message,
                timestamp=0,  # Will be set by add_message
                tokens_in=tokens_in,
            ),
        )
        
        # Add assistant message
        await self.sessions.add_message(
            session_id,
            CoachMessage(
                role="assistant",
                content=assistant_response,
                timestamp=0,
                tokens_out=tokens_out,
            ),
        )
        
        # Add prompt suggestion if we have a valid intent
        if intent.is_valid():
            await self.sessions.add_prompt_suggestion(
                session_id,
                intent.to_generation_input(),
                brand_elements=brand_elements,
            )
    
    def create_intent_chunk(
        self,
        intent: CreativeIntent,
        is_ready: bool,
        turn: Optional[int] = None,
    ) -> StreamChunk:
        """
        Create a stream chunk for intent status.
        
        Args:
            intent: The extracted intent
            is_ready: Whether ready for generation
            turn: Optional turn number
            
        Returns:
            StreamChunk with intent metadata
        """
        metadata = {
            "is_ready": is_ready,
            "confidence": intent.confidence_score,
            "refined_description": intent.to_generation_input(),
            "extraction_method": intent.extraction_method,
        }
        
        if turn is not None:
            metadata["turn"] = turn
        
        return StreamChunk(
            type="intent_ready",
            content="",
            metadata=metadata,
        )
    
    def create_done_chunk(
        self,
        session_id: str,
        turns_used: int,
        max_turns: int,
        tokens_in: int = 0,
        tokens_out: int = 0,
    ) -> StreamChunk:
        """
        Create a stream chunk for completion.
        
        Args:
            session_id: The session ID
            turns_used: Number of turns used
            max_turns: Maximum allowed turns
            tokens_in: Input tokens used
            tokens_out: Output tokens generated
            
        Returns:
            StreamChunk with completion metadata
        """
        return StreamChunk(
            type="done",
            content="",
            metadata={
                "session_id": session_id,
                "turns_used": turns_used,
                "turns_remaining": max_turns - turns_used,
                "tokens_in": tokens_in,
                "tokens_out": tokens_out,
            },
        )
    
    def _extract_keywords(self, description: str) -> List[str]:
        """
        Extract keywords from a description.
        
        Args:
            description: The description text
            
        Returns:
            List of keywords (max 10)
        """
        if not description:
            return []
        
        words = description.lower().split()
        keywords = [
            w for w in words
            if w not in self.STOP_WORDS and len(w) > 2
        ]
        
        # Deduplicate while preserving order
        seen = set()
        unique = []
        for kw in keywords:
            if kw not in seen:
                seen.add(kw)
                unique.append(kw)
        
        return unique[:10]
    
    def _extract_brand_elements(
        self,
        description: str,
        brand_context: Optional[Dict[str, Any]],
    ) -> List[str]:
        """
        Extract which brand elements were mentioned.
        
        Args:
            description: The description text
            brand_context: The brand kit context
            
        Returns:
            List of brand element identifiers
        """
        if not brand_context or not description:
            return []
        
        elements = []
        desc_lower = description.lower()
        
        # Check colors
        colors = brand_context.get("colors", [])
        for color in colors:
            if isinstance(color, dict):
                name = color.get("name", "").lower()
                if name and name in desc_lower:
                    elements.append(f"color:{name}")
        
        # Check tone
        tone = brand_context.get("tone", "").lower()
        if tone and tone in desc_lower:
            elements.append(f"tone:{tone}")
        
        return elements
    
    def _detect_changes(
        self,
        old_description: Optional[str],
        new_description: str,
    ) -> List[str]:
        """
        Detect what changed between descriptions.
        
        Args:
            old_description: Previous description
            new_description: New description
            
        Returns:
            List of change descriptions
        """
        if not old_description:
            return ["Initial description"]
        
        changes = []
        old_words = set(old_description.lower().split())
        new_words = set(new_description.lower().split())
        
        added = new_words - old_words
        removed = old_words - new_words
        
        if added:
            changes.append(f"Added: {', '.join(list(added)[:5])}")
        if removed:
            changes.append(f"Removed: {', '.join(list(removed)[:5])}")
        
        return changes if changes else ["Refined details"]


# Singleton instance
_response_processor: Optional[ResponseProcessor] = None


def get_response_processor() -> ResponseProcessor:
    """Get or create the response processor singleton."""
    global _response_processor
    if _response_processor is None:
        _response_processor = ResponseProcessor()
    return _response_processor


__all__ = [
    "StreamChunk",
    "ProcessedResponse",
    "ResponseProcessor",
    "get_response_processor",
]
