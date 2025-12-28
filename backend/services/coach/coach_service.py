"""
Creative Director Coach Service for Aurastream.

Main service that orchestrates the coaching flow as a "Creative Director":
- Helps users articulate and refine their creative vision
- NEVER exposes the actual prompts sent to image generation
- Stores refined "intent" that gets wrapped in our secret sauce later
- Context-first session start with pre-loaded brand kit
- Streaming responses via async generators

The coach helps users describe WHAT they want, not HOW to prompt for it.
The actual mega-prompt construction happens in the generation pipeline.

This is a Premium-only feature.
"""

import time
from typing import Optional, Dict, Any, AsyncGenerator, List
from dataclasses import dataclass

from backend.services.coach.models import CoachSession, CoachMessage
from backend.services.coach.session_manager import (
    SessionManager,
    SessionNotFoundError,
    get_session_manager,
)
from backend.services.coach.validator import OutputValidator, get_validator
from backend.services.coach.grounding import (
    GroundingStrategy,
    get_grounding_strategy,
)


@dataclass
class StreamChunk:
    """Single chunk in a streaming response."""
    type: str  # "token", "intent_ready", "grounding", "grounding_complete", "done", "error"
    content: str = ""
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class CreativeIntent:
    """
    User's refined creative intent - NOT a prompt.
    
    This is what the user wants, described in natural language.
    The actual prompt construction happens in the generation pipeline.
    """
    description: str  # User's refined description
    subject: Optional[str] = None  # Main subject (character, object, scene)
    action: Optional[str] = None  # What's happening (pose, expression, movement)
    emotion: Optional[str] = None  # Emotional tone (hype, cozy, intense)
    elements: List[str] = None  # Additional elements (sparkles, effects, etc.)
    confidence_score: float = 0.0
    
    def __post_init__(self):
        if self.elements is None:
            self.elements = []
    
    def to_generation_input(self) -> str:
        """
        Convert intent to a clean description for the generation pipeline.
        This is NOT the final prompt - just the user's refined intent.
        """
        parts = []
        if self.subject:
            parts.append(self.subject)
        if self.action:
            parts.append(self.action)
        # Don't include "custom" as an emotion - it's just a placeholder
        if self.emotion and self.emotion.lower() != "custom":
            parts.append(f"{self.emotion} mood")
        if self.elements:
            parts.append(", ".join(self.elements))
        if self.description and self.description not in " ".join(parts):
            parts.append(self.description)
        return ", ".join(parts) if parts else self.description


@dataclass
class CoachOutput:
    """Final output from Creative Director Coach."""
    refined_intent: CreativeIntent
    metadata: Dict[str, Any]
    suggested_asset_type: Optional[str]
    keywords: List[str]
    
    @property
    def final_prompt(self) -> str:
        """Get the final prompt from the refined intent."""
        return self.refined_intent.to_generation_input()
    
    @property
    def confidence_score(self) -> float:
        """Get the confidence score from the refined intent."""
        return self.refined_intent.confidence_score


class CreativeDirectorService:
    """
    Creative Director Coach - helps users articulate their vision.
    
    KEY PRINCIPLE: We help users describe WHAT they want, not HOW to prompt.
    The actual prompt engineering is our secret sauce in the generation pipeline.
    
    Flow:
    1. Client pre-loads context (brand kit, asset type, game, mood)
    2. Coach asks clarifying questions to understand the vision
    3. User refines their description through conversation
    4. Coach confirms when the description is clear enough
    5. Refined "intent" is passed to generation (where we add our magic)
    """
    
    # System prompt - concise creative assistant
    SYSTEM_PROMPT_BASE = '''You help streamers create {asset_type} assets.

RULE #1: Do what the user asks. If they request changes, make them. If they ask questions, answer them.

Context: {brand_context} | {game_context} | {mood_context}
Brand colors: {color_list}

Gather (only what's missing): subject, style/mood, any text to include.

Keep responses to 2-3 sentences. Confirm any text spelling. When ready:
"✨ Ready! [summary] [INTENT_READY]"
'''
    
    MAX_TURNS = 10
    
    def __init__(
        self,
        session_manager: Optional[SessionManager] = None,
        grounding_strategy: Optional[GroundingStrategy] = None,
        validator: Optional[OutputValidator] = None,
        llm_client=None,
    ):
        """
        Initialize the creative director service.
        
        Args:
            session_manager: Session manager instance
            grounding_strategy: Grounding strategy instance
            validator: Output validator instance (validates intent clarity)
            llm_client: LLM client for chat completions
        """
        self._session_manager = session_manager
        self._grounding_strategy = grounding_strategy
        self._validator = validator
        self.llm = llm_client
    
    @property
    def sessions(self) -> SessionManager:
        """Lazy-load session manager."""
        if self._session_manager is None:
            self._session_manager = get_session_manager()
        return self._session_manager
    
    @property
    def grounding(self) -> GroundingStrategy:
        """Lazy-load grounding strategy."""
        if self._grounding_strategy is None:
            self._grounding_strategy = get_grounding_strategy(self.llm)
        return self._grounding_strategy
    
    @property
    def validator(self) -> OutputValidator:
        """Lazy-load validator."""
        if self._validator is None:
            self._validator = get_validator()
        return self._validator
    
    async def start_with_context(
        self,
        user_id: str,
        brand_context: Dict[str, Any],
        asset_type: str,
        mood: str,
        description: str,
        custom_mood: Optional[str] = None,
        game_id: Optional[str] = None,
        game_name: Optional[str] = None,
        tier: str = "studio",
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Start a creative director session with pre-loaded context.
        
        The coach will help the user articulate their vision through
        conversation, without ever exposing actual prompts.
        
        Args:
            user_id: Authenticated user's ID
            brand_context: Brand kit context from client
            asset_type: Type of asset being created
            mood: Selected mood/style
            description: User's initial description of what they want
            custom_mood: Custom mood if mood='custom'
            game_id: Optional game ID
            game_name: Optional game name
            tier: User's subscription tier
            
        Yields:
            StreamChunk objects with tokens, intent_ready status, etc.
        """
        # Studio tier only
        if tier != "studio":
            yield StreamChunk(type="error", content="Creative Director requires Studio subscription")
            return
        
        # Check if game needs current context (web search)
        game_context = ""
        search_context = ""
        if game_id and game_name:
            grounding_decision = await self.grounding.should_ground(
                message=f"{game_name} {description}",
                is_premium=True,
            )
            
            if grounding_decision.should_ground:
                yield StreamChunk(
                    type="grounding",
                    content="",
                    metadata={"searching": game_name, "query": grounding_decision.query},
                )
                
                # Actually perform the web search
                search_results = await self._perform_search(grounding_decision.query)
                if search_results:
                    search_context = search_results
                    game_context = f"Game: {game_name}\n\n{search_context}"
                else:
                    game_context = f"Game: {game_name} (current season context requested)"
                
                yield StreamChunk(
                    type="grounding_complete",
                    content="",
                    metadata={
                        "game": game_name,
                        "search_performed": bool(search_results),
                    },
                )
        
        # Build system prompt for creative director mode
        system_prompt = self._build_system_prompt(
            brand_context=brand_context,
            asset_type=asset_type,
            mood=mood,
            custom_mood=custom_mood,
            game_context=game_context,
        )
        
        # Create session with context
        session = await self.sessions.create_with_context(
            user_id=user_id,
            brand_context=brand_context,
            asset_type=asset_type,
            mood=mood,
            game_context=game_context,
        )
        
        # Build first user message
        first_message = self._build_first_message(
            asset_type=asset_type,
            mood=mood,
            custom_mood=custom_mood,
            game_name=game_name,
            description=description,
        )
        
        # Stream response
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": first_message},
        ]
        
        full_response = ""
        tokens_in = 0
        tokens_out = 0
        
        if self.llm is not None:
            try:
                # Use the new stream_chat_with_usage method if available
                if hasattr(self.llm, 'stream_chat_with_usage'):
                    generator, usage_accessor = await self.llm.stream_chat_with_usage(messages)
                    async for token in generator:
                        full_response += token
                        yield StreamChunk(type="token", content=token)
                    # Get token usage after streaming completes
                    usage = usage_accessor.get_usage()
                    tokens_in = usage.tokens_in
                    tokens_out = usage.tokens_out
                else:
                    # Fallback to original stream_chat for backwards compatibility
                    async for token in self.llm.stream_chat(messages):
                        full_response += token
                        yield StreamChunk(type="token", content=token)
            except Exception as e:
                yield StreamChunk(type="error", content=f"LLM error: {str(e)}")
                return
        else:
            import logging
            logging.warning(
                "Creative Director running in MOCK MODE - LLM client not configured."
            )
            full_response = self._generate_mock_response(
                asset_type=asset_type,
                mood=mood,
                description=description,
                brand_context=brand_context,
            )
            yield StreamChunk(type="token", content=full_response)
        
        # Check if intent is ready (coach indicated description is clear)
        is_ready = self._check_intent_ready(full_response)
        refined_intent = self._extract_intent(full_response, description, mood)
        
        # Store the current intent
        if refined_intent:
            await self.sessions.add_prompt_suggestion(
                session.session_id,
                refined_intent.to_generation_input(),
                brand_elements=self._extract_brand_elements(refined_intent.description, brand_context),
            )
        
        # Send intent status
        yield StreamChunk(
            type="intent_ready",
            content="",
            metadata={
                "is_ready": is_ready,
                "confidence": refined_intent.confidence_score if refined_intent else 0.0,
                "refined_description": refined_intent.to_generation_input() if refined_intent else description,
            },
        )
        
        # Save messages with token counts
        await self.sessions.add_message(
            session.session_id,
            CoachMessage(role="user", content=first_message, timestamp=time.time(), tokens_in=tokens_in),
        )
        await self.sessions.add_message(
            session.session_id,
            CoachMessage(role="assistant", content=full_response, timestamp=time.time(), tokens_out=tokens_out),
        )
        
        yield StreamChunk(
            type="done",
            content="",
            metadata={
                "session_id": session.session_id,
                "turns_used": 1,
                "turns_remaining": self.MAX_TURNS - 1,
                "tokens_in": tokens_in,
                "tokens_out": tokens_out,
            },
        )
    
    async def continue_chat(
        self,
        session_id: str,
        user_id: str,
        message: str,
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Continue the creative direction conversation.
        
        Args:
            session_id: Session UUID
            user_id: User ID for ownership check
            message: User's response/refinement
            
        Yields:
            StreamChunk objects with tokens, intent status, etc.
        """
        try:
            session = await self.sessions.get_or_raise(session_id, user_id)
        except SessionNotFoundError as e:
            yield StreamChunk(type="error", content=str(e))
            return
        
        # Check limits
        limits = await self.sessions.check_limits(session)
        if not limits["can_continue"]:
            yield StreamChunk(
                type="error",
                content="Session limit reached",
                metadata=limits,
            )
            return
        
        # Rebuild system prompt from stored context
        system_prompt = self._build_system_prompt_from_session(session)
        
        # Build messages including history
        messages = [{"role": "system", "content": system_prompt}]
        for msg in session.messages:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": message})
        
        # Stream response
        full_response = ""
        tokens_in = 0
        tokens_out = 0
        
        if self.llm is not None:
            try:
                # Use the new stream_chat_with_usage method if available
                if hasattr(self.llm, 'stream_chat_with_usage'):
                    generator, usage_accessor = await self.llm.stream_chat_with_usage(messages)
                    async for token in generator:
                        full_response += token
                        yield StreamChunk(type="token", content=token)
                    # Get token usage after streaming completes
                    usage = usage_accessor.get_usage()
                    tokens_in = usage.tokens_in
                    tokens_out = usage.tokens_out
                else:
                    # Fallback to original stream_chat for backwards compatibility
                    async for token in self.llm.stream_chat(messages):
                        full_response += token
                        yield StreamChunk(type="token", content=token)
            except Exception as e:
                yield StreamChunk(type="error", content=f"LLM error: {str(e)}")
                return
        else:
            import logging
            logging.warning(
                "Creative Director running in MOCK MODE for continue_chat."
            )
            full_response = self._generate_mock_refinement(message, session)
            yield StreamChunk(type="token", content=full_response)
        
        # Check if intent is ready
        is_ready = self._check_intent_ready(full_response)
        
        # Build refined intent from conversation
        refined_intent = self._extract_intent_from_conversation(
            full_response,
            message,
            session,
        )
        
        if refined_intent:
            await self.sessions.add_prompt_suggestion(
                session_id,
                refined_intent.to_generation_input(),
                refinement_request=message,
                changes_made=self._detect_changes(
                    session.current_prompt_draft,
                    refined_intent.to_generation_input()
                ),
            )
        
        # Send intent status
        yield StreamChunk(
            type="intent_ready",
            content="",
            metadata={
                "is_ready": is_ready,
                "confidence": refined_intent.confidence_score if refined_intent else 0.0,
                "refined_description": refined_intent.to_generation_input() if refined_intent else "",
                "turn": session.turns_used + 1,
            },
        )
        
        # Save messages with token counts
        await self.sessions.add_message(
            session_id,
            CoachMessage(role="user", content=message, timestamp=time.time(), tokens_in=tokens_in),
        )
        await self.sessions.add_message(
            session_id,
            CoachMessage(role="assistant", content=full_response, timestamp=time.time(), tokens_out=tokens_out),
        )
        
        yield StreamChunk(
            type="done",
            content="",
            metadata={
                "turns_used": session.turns_used + 1,
                "turns_remaining": self.MAX_TURNS - session.turns_used - 1,
                "tokens_in": tokens_in,
                "tokens_out": tokens_out,
            },
        )
    
    async def end_session(
        self,
        session_id: str,
        user_id: str,
    ) -> CoachOutput:
        """
        End a session and return the refined creative intent.
        
        Args:
            session_id: Session UUID
            user_id: User ID for ownership check
            
        Returns:
            CoachOutput with refined intent and metadata
        """
        session = await self.sessions.end(session_id, user_id)
        
        # Build final intent from session
        final_description = session.current_prompt_draft or ""
        keywords = self._extract_keywords(final_description)
        
        # Calculate confidence based on conversation depth
        confidence = 0.5
        if session.prompt_history:
            confidence = min(0.95, 0.5 + (len(session.prompt_history) * 0.1))
        
        refined_intent = CreativeIntent(
            description=final_description,
            confidence_score=confidence,
        )
        
        return CoachOutput(
            refined_intent=refined_intent,
            metadata={
                "session_id": session_id,
                "turns_used": session.turns_used,
                "grounding_calls": session.grounding_calls,
                "tokens_in": session.tokens_in_total,
                "tokens_out": session.tokens_out_total,
            },
            suggested_asset_type=session.asset_type,
            keywords=keywords,
        )
    
    async def _perform_search(self, query: str) -> Optional[str]:
        """
        Perform a web search and format results for context injection.
        
        Args:
            query: Search query string
            
        Returns:
            Formatted search results string, or None if search fails/unavailable
        """
        try:
            from backend.services.coach.search_service import get_search_service
            
            search_service = get_search_service()
            if search_service is None:
                return None
            
            results = await search_service.search(query, max_results=3)
            if not results:
                return None
            
            # Format results for context injection
            formatted = ["Current information from web search:"]
            for r in results:
                title = r.title[:100] if r.title else ""
                snippet = r.snippet[:200] if r.snippet else ""
                source = r.source or ""
                formatted.append(f"- {title} ({source}): {snippet}")
            
            return "\n".join(formatted)
            
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Search failed: {e}")
            return None
    
    def _build_system_prompt(
        self,
        brand_context: Dict[str, Any],
        asset_type: str,
        mood: str,
        custom_mood: Optional[str],
        game_context: str,
    ) -> str:
        """Build system prompt for creative director mode."""
        colors = brand_context.get("colors", [])
        color_list = ", ".join([
            f"{c.get('name', 'Color')} ({c.get('hex', '#000000')})"
            for c in colors[:3]
        ]) if colors else "none specified"
        
        tone = brand_context.get("tone", "professional")
        brand_section = f"Tone: {tone}" if tone else "No brand"
        
        mood_section = custom_mood or mood or "flexible"
        game_section = game_context if game_context else "none"
        
        return self.SYSTEM_PROMPT_BASE.format(
            asset_type=asset_type,
            brand_context=brand_section,
            game_context=game_section,
            mood_context=mood_section,
            color_list=color_list,
        )
    
    def _build_system_prompt_from_session(self, session: CoachSession) -> str:
        """Rebuild system prompt from session data."""
        brand_context = session.brand_context or {}
        
        # Add current understanding if we have one
        history_section = ""
        if session.current_prompt_draft:
            history_section = f"\nCurrent vision: {session.current_prompt_draft}"
        
        base_prompt = self._build_system_prompt(
            brand_context=brand_context,
            asset_type=session.asset_type or "asset",
            mood=session.mood or "balanced",
            custom_mood=None,
            game_context=session.game_context or "",
        )
        
        return base_prompt + history_section
    
    def _build_first_message(
        self,
        asset_type: str,
        mood: str,
        custom_mood: Optional[str],
        game_name: Optional[str],
        description: str,
    ) -> str:
        """Build the first user message from their selections."""
        parts = [f"I want to create a {asset_type}."]
        
        if game_name:
            parts.append(f"It's for {game_name} content.")
        
        if mood != "custom":
            parts.append(f"I want it to feel {mood}.")
        elif custom_mood:
            parts.append(f"The vibe I'm going for: {custom_mood}")
        
        parts.append(f"My idea: {description}")
        
        return " ".join(parts)
    
    def _check_intent_ready(self, response: str) -> bool:
        """Check if the coach indicated the intent is clear enough."""
        markers = ["[INTENT_READY]", "Ready to create", "ready to create", "✨ Perfect"]
        return any(marker in response for marker in markers)
    
    def _extract_intent(
        self,
        response: str,
        original_description: str,
        mood: str,
    ) -> Optional[CreativeIntent]:
        """Extract creative intent from coach response."""
        import re
        
        # Look for summary patterns - order matters, most specific first
        summary_patterns = [
            # "✨ Ready! A vibrant thumbnail..." or "Ready! A cool emote..."
            r"(?:✨\s*)?Ready[!:]?\s*(.+?)(?:\[INTENT_READY\]|$)",
            # "Here's what I've got: a cool thumbnail"
            r"Here's what I've got:\s*(.+?)(?:\.|Ready|\[INTENT_READY\]|$)",
            # "So we're going for a neon-style emote"
            r"So we're going for\s*(.+?)(?:\.|Ready|\[INTENT_READY\]|$)",
            # "we'll create a dynamic banner"
            r"we'll create\s*(.+?)(?:\.|Ready|\[INTENT_READY\]|$)",
            # "Perfect! A high-energy thumbnail"
            r"(?:✨\s*)?Perfect[!:]?\s*(.+?)(?:\[INTENT_READY\]|$)",
        ]
        
        description = None
        for pattern in summary_patterns:
            match = re.search(pattern, response, re.IGNORECASE | re.DOTALL)
            if match:
                extracted = match.group(1).strip()
                # Clean up the extracted text
                extracted = re.sub(r'\[INTENT_READY\]', '', extracted).strip()
                # Remove trailing punctuation if it's just a period
                extracted = extracted.rstrip('.')
                if extracted and len(extracted) > 10:  # Ensure we got something meaningful
                    description = extracted
                    break
        
        # Fallback to original only if we couldn't extract anything
        if not description:
            description = original_description
        
        # Calculate confidence based on response quality
        confidence = 0.5
        if self._check_intent_ready(response):
            confidence = 0.85
        elif "?" not in response[-50:]:  # No questions at end = more confident
            confidence = 0.7
        
        return CreativeIntent(
            description=description,
            emotion=mood,
            confidence_score=confidence,
        )
    
    def _extract_intent_from_conversation(
        self,
        response: str,
        user_message: str,
        session: CoachSession,
    ) -> Optional[CreativeIntent]:
        """Extract refined intent from ongoing conversation."""
        import re
        
        # Start with previous intent
        base_description = session.current_prompt_draft or ""
        
        # Look for updated summary in response - order matters, most specific first
        summary_patterns = [
            # "✨ Ready! A vibrant thumbnail..." or "Ready! A cool emote..."
            r"(?:✨\s*)?Ready[!:]?\s*(.+?)(?:\[INTENT_READY\]|$)",
            # "Here's what I've got: a cool thumbnail"
            r"Here's what I've got:\s*(.+?)(?:\.|Ready|\[INTENT_READY\]|$)",
            # "So we're going for a neon-style emote"
            r"So we're going for\s*(.+?)(?:\.|Ready|\[INTENT_READY\]|$)",
            # "Updated: a dynamic banner with neon effects"
            r"Updated:\s*(.+?)(?:\.|Ready|\[INTENT_READY\]|$)",
            # "Perfect! A high-energy thumbnail"
            r"(?:✨\s*)?Perfect[!:]?\s*(.+?)(?:\[INTENT_READY\]|$)",
        ]
        
        for pattern in summary_patterns:
            match = re.search(pattern, response, re.IGNORECASE | re.DOTALL)
            if match:
                extracted = match.group(1).strip()
                # Clean up the extracted text
                extracted = re.sub(r'\[INTENT_READY\]', '', extracted).strip()
                extracted = extracted.rstrip('.')
                if extracted and len(extracted) > 10:  # Ensure we got something meaningful
                    base_description = extracted
                    break
        
        # If no summary found, combine previous with user additions
        if not base_description and session.current_prompt_draft:
            # Extract key additions from user message
            additions = self._extract_additions(user_message)
            if additions:
                base_description = f"{session.current_prompt_draft}, {additions}"
            else:
                base_description = session.current_prompt_draft
        
        confidence = 0.6
        if self._check_intent_ready(response):
            confidence = 0.9
        elif len(session.messages) > 4:  # More conversation = more refined
            confidence = 0.75
        
        return CreativeIntent(
            description=base_description,
            emotion=session.mood,
            confidence_score=confidence,
        )
    
    def _extract_additions(self, message: str) -> str:
        """Extract key additions from user message."""
        # Remove common filler words
        fillers = ["yes", "yeah", "sure", "ok", "okay", "sounds good", "perfect", "great"]
        cleaned = message.lower()
        for filler in fillers:
            cleaned = cleaned.replace(filler, "")
        
        # If there's substantial content left, return it
        cleaned = cleaned.strip()
        if len(cleaned) > 10:
            return message.strip()
        return ""
    
    def _is_refinement(self, message: str) -> bool:
        """Check if message is a refinement request."""
        keywords = [
            "make it", "more", "less", "change", "adjust", "brighter",
            "darker", "bolder", "subtler", "add", "remove", "tweak",
        ]
        return any(kw in message.lower() for kw in keywords)
    
    def _extract_keywords(self, description: str) -> List[str]:
        """Extract keywords from description."""
        if not description:
            return []
        
        stop_words = {
            "a", "an", "the", "and", "or", "but", "in", "on", "at", "to",
            "for", "of", "with", "by", "from", "as", "is", "was", "are",
            "were", "been", "be", "have", "has", "had", "do", "does", "did",
            "i", "want", "like", "would", "should", "could", "my", "me",
        }
        
        words = description.lower().split()
        keywords = [w for w in words if w not in stop_words and len(w) > 2]
        
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
        brand_context: Dict[str, Any],
    ) -> List[str]:
        """Extract which brand elements were mentioned."""
        elements = []
        desc_lower = description.lower()
        
        colors = brand_context.get("colors", [])
        for c in colors:
            name = c.get("name", "").lower()
            if name and name in desc_lower:
                elements.append(f"color:{name}")
        
        tone = brand_context.get("tone", "").lower()
        if tone and tone in desc_lower:
            elements.append(f"tone:{tone}")
        
        return elements
    
    def _detect_changes(
        self,
        old_description: Optional[str],
        new_description: str,
    ) -> List[str]:
        """Detect what changed between descriptions."""
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
    
    def _generate_mock_response(
        self,
        asset_type: str,
        mood: str,
        description: str,
        brand_context: Dict[str, Any],
    ) -> str:
        """Generate mock response for testing without LLM."""
        colors = brand_context.get("colors", [])
        color_mention = ""
        if colors:
            color_mention = f" We can definitely incorporate your {colors[0].get('name', 'brand colors')} to make it pop!"
        
        return f'''Love the idea! A {mood} {asset_type} sounds awesome.{color_mention}

Let me make sure I understand what you're going for:

You mentioned "{description}" - is this more of a:
- **Celebratory moment** (like winning or achieving something)?
- **Reaction shot** (responding to something exciting/funny)?
- **Mood piece** (setting a vibe for your stream)?

Also, any specific pose or expression you're imagining? Like fist pump, jumping, or something else?'''
    
    def _generate_mock_refinement(
        self,
        message: str,
        session: CoachSession,
    ) -> str:
        """Generate mock refinement response for testing."""
        current = session.current_prompt_draft or "your asset"
        
        # Check if user confirmed
        confirmations = ["yes", "yeah", "sure", "perfect", "sounds good", "let's do it", "ready"]
        if any(c in message.lower() for c in confirmations):
            return f'''✨ Perfect! Here's what I've got: {current} with a {session.mood or "dynamic"} vibe.

Ready to create? [INTENT_READY]'''
        
        return f'''Got it! So we're adding "{message.lower()}" to the mix.

Updated vision: {current}, {message.lower()}

Does that capture what you're going for? Any other details to add, or ready to create?'''


# Singleton instance
_coach_service: Optional[CreativeDirectorService] = None


def get_coach_service(llm_client=None) -> CreativeDirectorService:
    """
    Get or create the creative director service singleton.
    
    If no LLM client is provided, attempts to create one from environment.
    If that fails, the service will operate in mock mode (for testing only).
    """
    global _coach_service
    
    if _coach_service is None or llm_client is not None:
        if llm_client is None:
            try:
                from backend.services.coach.llm_client import get_llm_client
                llm_client = get_llm_client()
            except ImportError:
                pass
        
        _coach_service = CreativeDirectorService(llm_client=llm_client)
    
    return _coach_service


# Backwards compatibility alias
PromptCoachService = CreativeDirectorService


__all__ = [
    "StreamChunk",
    "CreativeIntent",
    "CoachOutput",
    "CreativeDirectorService",
    "PromptCoachService",  # Backwards compatibility
    "get_coach_service",
]
