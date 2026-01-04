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

import logging
import time
from typing import Optional, Dict, Any, AsyncGenerator, List
from dataclasses import dataclass

# Configure logger for prompt debugging
logger = logging.getLogger(__name__)
prompt_logger = logging.getLogger("aurastream.coach.prompts")

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
# Import IntentExtractor - single source of truth for intent extraction
from backend.services.coach.intent_extractor import (
    IntentExtractor,
    CreativeIntent,
    get_intent_extractor,
)


@dataclass
class StreamChunk:
    """Single chunk in a streaming response."""
    type: str  # "token", "intent_ready", "grounding", "grounding_complete", "done", "error"
    content: str = ""
    metadata: Optional[Dict[str, Any]] = None


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

{reference_assets_section}

RULE #1: Do what the user asks. If they request changes, make them. If they ask questions, answer them.

Context: {brand_context} | {game_context} | {mood_context}
Brand colors: {color_list}

Gather (only what's missing): subject, style/mood, any text to include.

Keep responses to 2-3 sentences. Confirm any text spelling. When ready:
"✨ Ready! [DETAILED summary with ALL specific names, locations, characters, and exact text] [INTENT_READY]"

CRITICAL: Your [summary] MUST include ALL specific details - game locations by name (e.g. "Sandy Strip" not "a POI"), character names, skin names, exact text. Generic summaries will fail.
'''
    
    MAX_TURNS = 10
    
    def __init__(
        self,
        session_manager: Optional[SessionManager] = None,
        grounding_strategy: Optional[GroundingStrategy] = None,
        validator: Optional[OutputValidator] = None,
        llm_client=None,
        intent_extractor: Optional[IntentExtractor] = None,
    ):
        """
        Initialize the creative director service.
        
        Args:
            session_manager: Session manager instance
            grounding_strategy: Grounding strategy instance
            validator: Output validator instance (validates intent clarity)
            llm_client: LLM client for chat completions
            intent_extractor: Intent extractor instance (uses singleton if not provided)
        """
        self._session_manager = session_manager
        self._grounding_strategy = grounding_strategy
        self._validator = validator
        self.llm = llm_client
        self._intent_extractor = intent_extractor
    
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
    
    @property
    def intent_extractor(self) -> IntentExtractor:
        """Lazy-load intent extractor."""
        if self._intent_extractor is None:
            self._intent_extractor = get_intent_extractor()
        return self._intent_extractor
    
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
        preferences: Optional[Dict[str, Any]] = None,
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
            preferences: Optional coach preferences (verbosity, style, etc.)
            
        Yields:
            StreamChunk objects with tokens, intent_ready status, etc.
        """
        # Pro and Studio tiers have access (usage limits checked at route level)
        if tier not in ("pro", "studio"):
            yield StreamChunk(type="error", content="Coach requires Pro or Studio subscription")
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
            preferences=preferences,
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
        
        # Log the full messages being sent to the LLM
        prompt_logger.info(
            "=== COACH LLM REQUEST (start_with_context) ===\n"
            f"User ID: {user_id}\n"
            f"Session ID: {session.session_id}\n"
            f"Brand Context Received:\n"
            f"  - brand_kit_id: {brand_context.get('brand_kit_id')}\n"
            f"  - colors: {brand_context.get('colors')}\n"
            f"  - tone: {brand_context.get('tone')}\n"
            f"  - fonts: {brand_context.get('fonts')}\n"
            f"  - logo_url: {brand_context.get('logo_url')}\n"
            f"Messages to LLM:\n"
            f"  [SYSTEM]: {system_prompt}\n"
            f"  [USER]: {first_message}\n"
            "=== END LLM REQUEST ==="
        )
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
        is_ready = self.intent_extractor.check_intent_ready(full_response)
        refined_intent = self.intent_extractor.extract_from_response(
            response=full_response,
            original_description=description,
            mood=mood,
        )
        
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
        reference_assets: list[dict] | None = None,
    ) -> AsyncGenerator[StreamChunk, None]:
        """
        Continue the creative direction conversation.
        
        Args:
            session_id: Session UUID
            user_id: User ID for ownership check
            message: User's response/refinement
            reference_assets: Optional list of reference assets from user's library
            
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
        
        # Store reference assets in session for later use in generation
        if reference_assets:
            await self._store_reference_assets(session_id, reference_assets)
        
        # Rebuild system prompt from stored context
        system_prompt = self._build_system_prompt_from_session(session, reference_assets)
        
        # Build the user message with reference assets context
        user_message_content = message
        if reference_assets:
            # Append reference asset context to the message
            ref_context = self._build_reference_assets_context(reference_assets)
            user_message_content = f"{message}\n\n{ref_context}"
        
        # Build messages including history
        messages = [{"role": "system", "content": system_prompt}]
        for msg in session.messages:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": user_message_content})
        
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
        is_ready = self.intent_extractor.check_intent_ready(full_response)
        
        # Build refined intent from conversation using IntentExtractor
        refined_intent = self.intent_extractor.extract_from_conversation(
            response=full_response,
            user_message=message,
            session=session,
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
        preferences: Optional[Dict[str, Any]] = None,
        reference_assets_section: str = "",
    ) -> str:
        """Build system prompt for creative director mode with optional preferences."""
        colors = brand_context.get("colors", [])
        color_list = ", ".join([
            f"{c.get('name', 'Color')} ({c.get('hex', '#000000')})"
            for c in colors[:3]
        ]) if colors else "none specified"
        
        tone = brand_context.get("tone", "professional")
        brand_section = f"Tone: {tone}" if tone else "No brand"
        
        mood_section = custom_mood or mood or "flexible"
        game_section = game_context if game_context else "none"
        
        system_prompt = self.SYSTEM_PROMPT_BASE.format(
            asset_type=asset_type,
            brand_context=brand_section,
            game_context=game_section,
            mood_context=mood_section,
            color_list=color_list,
            reference_assets_section=reference_assets_section,
        )
        
        # Apply preferences to modify coach behavior
        if preferences:
            pref_additions = self._build_preference_instructions(preferences)
            if pref_additions:
                system_prompt = system_prompt + "\n\n" + pref_additions
        
        # Log the system prompt for debugging
        prompt_logger.info(
            "=== COACH SYSTEM PROMPT ===\n"
            f"Asset Type: {asset_type}\n"
            f"Brand Context: {brand_section}\n"
            f"Colors: {color_list}\n"
            f"Mood: {mood_section}\n"
            f"Game Context: {game_section}\n"
            f"Preferences: {preferences}\n"
            f"Full System Prompt:\n{system_prompt}\n"
            "=== END SYSTEM PROMPT ==="
        )
        
        return system_prompt
    
    def _build_preference_instructions(self, preferences: Dict[str, Any]) -> str:
        """Build additional instructions based on user preferences."""
        instructions = []
        
        verbosity = preferences.get("verbosity", "balanced")
        if verbosity == "concise":
            instructions.append("Keep responses very brief - 1-2 sentences max.")
        elif verbosity == "detailed":
            instructions.append("Provide detailed explanations and multiple suggestions.")
        
        style = preferences.get("style", "friendly")
        if style == "professional":
            instructions.append("Use a professional, business-like tone.")
        elif style == "creative":
            instructions.append("Be creative and enthusiastic in your suggestions.")
        elif style == "technical":
            instructions.append("Focus on technical details and specific terminology.")
        # friendly is the default, no extra instruction needed
        
        emoji_level = preferences.get("emoji_level", "normal")
        if emoji_level == "none":
            instructions.append("Do not use any emojis.")
        elif emoji_level == "minimal":
            instructions.append("Use emojis sparingly - only for key moments.")
        
        if not preferences.get("show_tips", True):
            instructions.append("Skip tips and focus only on the task at hand.")
        
        if not preferences.get("auto_suggest", True):
            instructions.append("Only respond to what the user asks - don't proactively suggest changes.")
        
        return " ".join(instructions) if instructions else ""
    
    def _build_reference_assets_context(self, reference_assets: list[dict]) -> str:
        """
        Build context string for reference assets attached to a message.
        
        This provides the coach with information about visual references
        the user has attached to help understand their vision.
        
        Args:
            reference_assets: List of reference asset dictionaries with
                asset_id, display_name, asset_type, url, and optional description
                
        Returns:
            Formatted context string for the LLM
        """
        if not reference_assets:
            return ""
        
        lines = ["📎 Reference images attached:"]
        for i, asset in enumerate(reference_assets, 1):
            asset_type = asset.get("asset_type", "image")
            display_name = asset.get("display_name", f"Reference {i}")
            description = asset.get("description", "")
            url = asset.get("url", "")
            
            # Build the reference line
            ref_line = f"  {i}. [{asset_type}] \"{display_name}\""
            if description:
                ref_line += f" - {description}"
            if url:
                ref_line += f" (URL: {url})"
            
            lines.append(ref_line)
        
        lines.append("")
        lines.append("Please consider these visual references when refining the creative direction.")
        
        return "\n".join(lines)
    
    def _build_system_prompt_from_session(self, session: CoachSession, reference_assets: list[dict] | None = None) -> str:
        """Rebuild system prompt from session data, including any reference assets."""
        brand_context = session.brand_context or {}
        
        # Add current understanding if we have one
        history_section = ""
        if session.current_prompt_draft:
            history_section = f"\nCurrent vision: {session.current_prompt_draft}"
        
        # Build reference assets section if provided
        ref_section = ""
        if reference_assets:
            ref_section = self._build_reference_assets_context(reference_assets)
        
        base_prompt = self._build_system_prompt(
            brand_context=brand_context,
            asset_type=session.asset_type or "asset",
            mood=session.mood or "balanced",
            custom_mood=None,
            game_context=session.game_context or "",
            reference_assets_section=ref_section,
        )
        
        return base_prompt + history_section
    
    async def _store_reference_assets(self, session_id: str, reference_assets: list[dict]) -> None:
        """
        Store reference assets in the session for use during generation.
        
        These assets will be passed to NanoBanana when the user generates.
        
        Args:
            session_id: Session UUID
            reference_assets: List of reference asset dictionaries
        """
        try:
            session = await self.sessions.get(session_id)
            if session:
                # Initialize reference_assets list if not present
                if not hasattr(session, 'reference_assets') or session.reference_assets is None:
                    session.reference_assets = []
                
                # Add new reference assets (avoid duplicates by asset_id)
                existing_ids = {a.get('asset_id') for a in session.reference_assets}
                for asset in reference_assets:
                    if asset.get('asset_id') not in existing_ids:
                        session.reference_assets.append(asset)
                        existing_ids.add(asset.get('asset_id'))
                
                # Save the updated session
                await self.sessions._save(session)
                
                logger.info(
                    f"Stored {len(reference_assets)} reference assets in session: "
                    f"session_id={session_id}, total={len(session.reference_assets)}"
                )
        except Exception as e:
            logger.warning(f"Failed to store reference assets: {e}")
    
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
