"""
Creative Director Coach Service v2 - Enterprise Refactor.

This is the refactored version of the coach service with clear
separation of concerns:

- IntentExtractor: Extracts refined descriptions from LLM responses
- PromptBuilder: Constructs system prompts and user messages
- ResponseProcessor: Coordinates response processing and session updates
- SessionManager: Handles session storage and retrieval
- GroundingStrategy: Handles web search decisions

The main service orchestrates these components to provide the
coaching experience.

This is a Premium-only feature (Studio tier).
"""

import logging
import time
from typing import Optional, Dict, Any, AsyncGenerator, List
from dataclasses import dataclass

from backend.services.coach.models import CoachSession, CoachMessage
from backend.services.coach.session_manager import (
    SessionManager,
    SessionNotFoundError,
    get_session_manager,
)
from backend.services.coach.intent_extractor import (
    CreativeIntent,
    IntentExtractor,
    get_intent_extractor,
)
from backend.services.coach.prompt_builder import (
    PromptContext,
    PromptBuilder,
    get_prompt_builder,
)
from backend.services.coach.response_processor import (
    StreamChunk,
    ResponseProcessor,
    get_response_processor,
)
from backend.services.coach.grounding import (
    GroundingStrategy,
    get_grounding_strategy,
)

logger = logging.getLogger(__name__)


@dataclass
class CoachOutput:
    """Final output from Creative Director Coach."""
    refined_intent: CreativeIntent
    metadata: Dict[str, Any]
    suggested_asset_type: Optional[str]
    keywords: List[str]


class CreativeDirectorServiceV2:
    """
    Creative Director Coach v2 - Enterprise Architecture.
    
    This service orchestrates the coaching flow using dedicated
    components for each responsibility:
    
    - IntentExtractor: Extracts what the user wants from LLM responses
    - PromptBuilder: Builds prompts for the LLM
    - ResponseProcessor: Processes responses and updates state
    - SessionManager: Manages session storage
    - GroundingStrategy: Decides when to use web search
    
    Flow:
    1. Client provides context (brand kit, asset type, game, mood)
    2. Coach asks clarifying questions to understand the vision
    3. User refines their description through conversation
    4. Coach confirms when the description is clear enough
    5. Refined "intent" is passed to generation
    """
    
    MAX_TURNS = 10
    
    def __init__(
        self,
        session_manager: Optional[SessionManager] = None,
        intent_extractor: Optional[IntentExtractor] = None,
        prompt_builder: Optional[PromptBuilder] = None,
        response_processor: Optional[ResponseProcessor] = None,
        grounding_strategy: Optional[GroundingStrategy] = None,
        llm_client=None,
    ):
        """
        Initialize the creative director service.
        
        All dependencies are optional and will be lazy-loaded
        from singletons if not provided.
        """
        self._session_manager = session_manager
        self._intent_extractor = intent_extractor
        self._prompt_builder = prompt_builder
        self._response_processor = response_processor
        self._grounding_strategy = grounding_strategy
        self.llm = llm_client
    
    # =========================================================================
    # Lazy-loaded dependencies
    # =========================================================================
    
    @property
    def sessions(self) -> SessionManager:
        if self._session_manager is None:
            self._session_manager = get_session_manager()
        return self._session_manager
    
    @property
    def extractor(self) -> IntentExtractor:
        if self._intent_extractor is None:
            self._intent_extractor = get_intent_extractor()
        return self._intent_extractor
    
    @property
    def prompts(self) -> PromptBuilder:
        if self._prompt_builder is None:
            self._prompt_builder = get_prompt_builder()
        return self._prompt_builder
    
    @property
    def processor(self) -> ResponseProcessor:
        if self._response_processor is None:
            self._response_processor = get_response_processor()
        return self._response_processor
    
    @property
    def grounding(self) -> GroundingStrategy:
        if self._grounding_strategy is None:
            self._grounding_strategy = get_grounding_strategy(self.llm)
        return self._grounding_strategy
    
    # =========================================================================
    # Main API
    # =========================================================================
    
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
        
        Args:
            user_id: Authenticated user's ID
            brand_context: Brand kit context from client
            asset_type: Type of asset being created
            mood: Selected mood/style
            description: User's initial description
            custom_mood: Custom mood if mood='custom'
            game_id: Optional game ID
            game_name: Optional game name
            tier: User's subscription tier
            
        Yields:
            StreamChunk objects with tokens, intent status, etc.
        """
        # Tier check - Pro and Studio have access
        if tier not in ("pro", "studio"):
            yield StreamChunk(
                type="error",
                content="Creative Director requires Pro or Studio subscription",
            )
            return
        
        # Handle game grounding if needed
        game_context = ""
        if game_id and game_name:
            async for chunk in self._handle_grounding(game_name, description):
                if chunk.type == "grounding_complete":
                    game_context = chunk.metadata.get("context", "")
                yield chunk
        
        # Build prompt context
        context = PromptContext(
            asset_type=asset_type,
            mood=mood,
            custom_mood=custom_mood,
            brand_context=brand_context,
            game_name=game_name,
            game_context=game_context,
            description=description,
        )
        
        # Build prompts
        system_prompt = self.prompts.build_system_prompt(context)
        first_message = self.prompts.build_first_message(context)
        
        # Create session
        session = await self.sessions.create_with_context(
            user_id=user_id,
            brand_context=brand_context,
            asset_type=asset_type,
            mood=mood,
            game_context=game_context,
        )
        
        # Stream LLM response
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": first_message},
        ]
        
        full_response = ""
        tokens_in = 0
        tokens_out = 0
        
        async for chunk in self._stream_llm_response(messages):
            if chunk.type == "token":
                full_response += chunk.content
            elif chunk.type == "usage":
                tokens_in = chunk.metadata.get("tokens_in", 0)
                tokens_out = chunk.metadata.get("tokens_out", 0)
            yield chunk
        
        # Process the response
        processed = self.processor.process_initial_response(
            response=full_response,
            original_description=description,
            mood=mood,
            brand_context=brand_context,
        )
        
        # Log if extraction used fallback
        if processed.intent.extraction_method == "fallback":
            logger.warning(
                f"Intent extraction fell back to original description. "
                f"Session: {session.session_id}"
            )
        
        # Update session
        await self.sessions.add_message(
            session.session_id,
            CoachMessage(
                role="user",
                content=first_message,
                timestamp=time.time(),
                tokens_in=tokens_in,
            ),
        )
        await self.sessions.add_message(
            session.session_id,
            CoachMessage(
                role="assistant",
                content=full_response,
                timestamp=time.time(),
                tokens_out=tokens_out,
            ),
        )
        
        # Store intent
        if processed.intent.is_valid():
            await self.sessions.add_prompt_suggestion(
                session.session_id,
                processed.intent.to_generation_input(),
                brand_elements=processed.brand_elements,
            )
        
        # Yield intent status
        yield self.processor.create_intent_chunk(
            intent=processed.intent,
            is_ready=processed.is_ready,
        )
        
        # Yield done
        yield self.processor.create_done_chunk(
            session_id=session.session_id,
            turns_used=1,
            max_turns=self.MAX_TURNS,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
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
        # Get session
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
        
        # Build the user message with reference assets context
        user_message_content = message
        if reference_assets:
            ref_context = self._build_reference_assets_context(reference_assets)
            user_message_content = f"{message}\n\n{ref_context}"
        
        # Build messages
        messages = self.prompts.build_conversation_messages(session, user_message_content)
        
        # Stream response
        full_response = ""
        tokens_in = 0
        tokens_out = 0
        
        async for chunk in self._stream_llm_response(messages):
            if chunk.type == "token":
                full_response += chunk.content
            elif chunk.type == "usage":
                tokens_in = chunk.metadata.get("tokens_in", 0)
                tokens_out = chunk.metadata.get("tokens_out", 0)
            yield chunk
        
        # Process response
        processed = self.processor.process_continuation_response(
            response=full_response,
            user_message=message,
            session=session,
        )
        
        # Update session
        await self.sessions.add_message(
            session_id,
            CoachMessage(
                role="user",
                content=message,
                timestamp=time.time(),
                tokens_in=tokens_in,
            ),
        )
        await self.sessions.add_message(
            session_id,
            CoachMessage(
                role="assistant",
                content=full_response,
                timestamp=time.time(),
                tokens_out=tokens_out,
            ),
        )
        
        # Store refined intent
        if processed.intent.is_valid():
            await self.sessions.add_prompt_suggestion(
                session_id,
                processed.intent.to_generation_input(),
                refinement_request=message,
                brand_elements=processed.brand_elements,
            )
        
        # Yield intent status
        yield self.processor.create_intent_chunk(
            intent=processed.intent,
            is_ready=processed.is_ready,
            turn=session.turns_used + 1,
        )
        
        # Yield done
        yield self.processor.create_done_chunk(
            session_id=session_id,
            turns_used=session.turns_used + 1,
            max_turns=self.MAX_TURNS,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
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
        
        # Build final intent
        final_description = session.current_prompt_draft or ""
        keywords = self.processor._extract_keywords(final_description)
        
        # Calculate confidence
        confidence = 0.5
        if session.prompt_history:
            confidence = min(0.95, 0.5 + (len(session.prompt_history) * 0.1))
        
        refined_intent = CreativeIntent(
            description=final_description,
            confidence_score=confidence,
            extraction_method="session_end",
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
    
    # =========================================================================
    # Private helpers
    # =========================================================================
    
    async def _handle_grounding(
        self,
        game_name: str,
        description: str,
    ) -> AsyncGenerator[StreamChunk, None]:
        """Handle game context grounding via web search."""
        grounding_decision = await self.grounding.should_ground(
            message=f"{game_name} {description}",
            is_premium=True,
        )
        
        if not grounding_decision.should_ground:
            return
        
        yield StreamChunk(
            type="grounding",
            content="",
            metadata={
                "searching": game_name,
                "query": grounding_decision.query,
            },
        )
        
        # Perform search
        search_context = await self._perform_search(grounding_decision.query)
        
        yield StreamChunk(
            type="grounding_complete",
            content="",
            metadata={
                "game": game_name,
                "search_performed": bool(search_context),
                "context": search_context or f"Game: {game_name}",
            },
        )
    
    async def _perform_search(self, query: str) -> Optional[str]:
        """Perform a web search and format results."""
        try:
            from backend.services.coach.search_service import get_search_service
            
            search_service = get_search_service()
            if search_service is None:
                return None
            
            results = await search_service.search(query, max_results=3)
            if not results:
                return None
            
            formatted = ["Current information from web search:"]
            for r in results:
                title = r.title[:100] if r.title else ""
                snippet = r.snippet[:200] if r.snippet else ""
                source = r.source or ""
                formatted.append(f"- {title} ({source}): {snippet}")
            
            return "\n".join(formatted)
            
        except Exception as e:
            logger.warning(f"Search failed: {e}")
            return None
    
    def _build_reference_assets_context(self, reference_assets: list[dict]) -> str:
        """
        Build context string for reference assets attached to a message.
        
        Args:
            reference_assets: List of reference asset dictionaries
                
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
            
            ref_line = f"  {i}. [{asset_type}] \"{display_name}\""
            if description:
                ref_line += f" - {description}"
            if url:
                ref_line += f" (URL: {url})"
            
            lines.append(ref_line)
        
        lines.append("")
        lines.append("Please consider these visual references when refining the creative direction.")
        
        return "\n".join(lines)
    
    async def _stream_llm_response(
        self,
        messages: List[Dict[str, str]],
    ) -> AsyncGenerator[StreamChunk, None]:
        """Stream response from LLM."""
        import asyncio
        
        if self.llm is None:
            # Mock mode
            logger.warning("Coach running in MOCK MODE - LLM not configured")
            mock_response = self._generate_mock_response(messages)
            yield StreamChunk(type="token", content=mock_response)
            return
        
        try:
            if hasattr(self.llm, 'stream_chat_with_usage'):
                generator, usage_accessor = await self.llm.stream_chat_with_usage(messages)
                async for token in generator:
                    yield StreamChunk(type="token", content=token)
                
                usage = usage_accessor.get_usage()
                yield StreamChunk(
                    type="usage",
                    content="",
                    metadata={
                        "tokens_in": usage.tokens_in,
                        "tokens_out": usage.tokens_out,
                    },
                )
            else:
                async for token in self.llm.stream_chat(messages):
                    yield StreamChunk(type="token", content=token)
                    
        except Exception as e:
            logger.error(f"LLM error: {e}")
            yield StreamChunk(type="error", content=f"LLM error: {str(e)}")
    
    def _generate_mock_response(
        self,
        messages: List[Dict[str, str]],
    ) -> str:
        """Generate mock response for testing."""
        # Extract context from messages
        user_msg = messages[-1]["content"] if messages else ""
        
        return f'''I love the direction you're going! Let me help you refine this.

Based on what you've described, I'm thinking we could create something really eye-catching.

✨ Ready! A dynamic, high-energy asset based on your vision [INTENT_READY]'''


# Singleton instance
_coach_service_v2: Optional[CreativeDirectorServiceV2] = None


def get_coach_service_v2(llm_client=None) -> CreativeDirectorServiceV2:
    """Get or create the v2 coach service singleton."""
    global _coach_service_v2
    
    if _coach_service_v2 is None or llm_client is not None:
        if llm_client is None:
            try:
                from backend.services.coach.llm_client import get_llm_client
                llm_client = get_llm_client()
            except ImportError:
                pass
        
        _coach_service_v2 = CreativeDirectorServiceV2(llm_client=llm_client)
    
    return _coach_service_v2


__all__ = [
    "StreamChunk",
    "CreativeIntent",
    "CoachOutput",
    "CreativeDirectorServiceV2",
    "get_coach_service_v2",
]
