"""
Unified Coach Service - Single orchestrator for all coaching flows.

This is the main entry point for the Coach module, replacing the
legacy coach_service.py and coach_service_v2.py.

The coach helps users articulate WHAT they want, not HOW to prompt.
The actual prompt engineering happens in the generation pipeline.

Intent-Based Readiness:
- Generation is ready when required intent parameters are filled
- Ambiguous annotations must be clarified (render vs display text)
- User must explicitly confirm the final vision
- First turn can NEVER be ready (must have user confirmation)
"""

import logging
import time
from typing import Optional, Dict, Any, AsyncGenerator, List

from backend.services.coach.core.types import MAX_TURNS, has_coach_access
from backend.services.coach.core.exceptions import SessionNotFoundError
from backend.services.coach.models import CoachMessage
from backend.services.coach.session import SessionManager, get_session_manager
from backend.services.coach.llm import CoachLLMClient, get_llm_client, StreamChunk
from backend.services.coach.llm.prompts import (
    PromptBuilder,
    PromptContext,
    get_prompt_builder,
)
from backend.services.coach.intent import (
    # Legacy extractor (for backwards compatibility)
    IntentExtractor,
    get_intent_extractor,
    # New intent schema system
    CreativeIntentSchema,
    IntentParser,
    get_intent_parser,
    # Canvas classification (Coach → Nano Banana flow)
    CanvasIntentSchema as CanvasSchema,
    classify_canvas_elements,
    apply_clarification_response,
)
from backend.services.coach.grounding import (
    GroundingStrategy,
    get_grounding_strategy,
    get_search_service,
)

logger = logging.getLogger(__name__)


class CoachService:
    """
    Unified Coach Service - orchestrates all coaching flows.

    Responsibilities:
    - Start sessions with pre-loaded context
    - Continue conversations with refinement
    - End sessions and extract final intent
    - Coordinate grounding, validation, analytics
    - Track intent parameters for generation readiness
    """

    def __init__(
        self,
        session_manager: Optional[SessionManager] = None,
        llm_client: Optional[CoachLLMClient] = None,
        intent_extractor: Optional[IntentExtractor] = None,
        intent_parser: Optional[IntentParser] = None,
        prompt_builder: Optional[PromptBuilder] = None,
        grounding_strategy: Optional[GroundingStrategy] = None,
    ):
        self._sessions = session_manager
        self._llm = llm_client
        self._extractor = intent_extractor
        self._parser = intent_parser
        self._prompts = prompt_builder
        self._grounding = grounding_strategy

    @property
    def sessions(self) -> SessionManager:
        if self._sessions is None:
            self._sessions = get_session_manager()
        return self._sessions

    @property
    def llm(self) -> Optional[CoachLLMClient]:
        if self._llm is None:
            self._llm = get_llm_client()
        return self._llm

    @property
    def extractor(self) -> IntentExtractor:
        if self._extractor is None:
            self._extractor = get_intent_extractor()
        return self._extractor

    @property
    def parser(self) -> IntentParser:
        if self._parser is None:
            self._parser = get_intent_parser()
        return self._parser

    @property
    def prompts(self) -> PromptBuilder:
        if self._prompts is None:
            self._prompts = get_prompt_builder()
        return self._prompts

    @property
    def grounding(self) -> GroundingStrategy:
        if self._grounding is None:
            self._grounding = get_grounding_strategy(self.llm)
        return self._grounding

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
        media_asset_placements: Optional[List[Dict[str, Any]]] = None,
        canvas_snapshot_url: Optional[str] = None,
        canvas_snapshot_description: Optional[str] = None,
        canvas_context: Optional[Dict[str, Any]] = None,  # NEW: Compact canvas JSON
    ) -> AsyncGenerator[StreamChunk, None]:
        """Start a coaching session with pre-loaded context."""
        if not has_coach_access(tier):
            yield StreamChunk(
                type="error", content="Coach requires Pro or Studio subscription"
            )
            return

        # Handle grounding if game specified
        game_context = ""
        if game_id and game_name:
            decision = await self.grounding.should_ground(
                f"{game_name} {description}", is_premium=True
            )
            if decision.should_ground:
                yield StreamChunk(
                    type="grounding",
                    metadata={"searching": game_name, "query": decision.query},
                )
                search_context = await self._perform_search(decision.query)
                game_context = (
                    f"Game: {game_name}\n\n{search_context}"
                    if search_context
                    else f"Game: {game_name}"
                )
                yield StreamChunk(
                    type="grounding_complete",
                    metadata={
                        "game": game_name,
                        "search_performed": bool(search_context),
                    },
                )

        # Extract community hub assets from placements
        community_assets = self._extract_community_assets(media_asset_placements)

        # If community assets are present and no game context, infer from assets
        if community_assets and not game_name:
            # Use the first community asset's game as context
            first_asset = community_assets[0]
            inferred_game = first_asset.get("game_name")
            if inferred_game:
                game_name = inferred_game
                game_context = f"Game: {inferred_game} (from community hub assets)"

        # Process canvas context if provided (compact JSON format)
        canvas_schema: Optional[CanvasSchema] = None
        canvas_clarification: Optional[str] = None

        if canvas_context:
            # Classify canvas elements using the new system
            canvas_schema = classify_canvas_elements(canvas_context)
            canvas_schema.snapshot_url = canvas_snapshot_url

            # Check if any elements need clarification
            canvas_clarification = canvas_schema.generate_clarification_message()

            # Generate compact description for prompts if not provided
            if not canvas_snapshot_description:
                canvas_snapshot_description = self._generate_canvas_description(canvas_schema)

            logger.info(
                f"Canvas classified: {len(canvas_schema.elements)} elements, "
                f"{len(canvas_schema.get_ambiguous_elements())} ambiguous"
            )

        # Build prompts
        context = PromptContext(
            asset_type=asset_type,
            mood=mood,
            custom_mood=custom_mood,
            brand_context=brand_context,
            game_name=game_name,
            game_context=game_context,
            description=description,
            preferences=preferences,
            community_assets=community_assets,
            media_asset_placements=media_asset_placements,
            canvas_snapshot_url=canvas_snapshot_url,
            canvas_snapshot_description=canvas_snapshot_description,
        )
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

        # Initialize intent schema using the new parser
        intent_schema = self.parser.parse_initial_request(
            description=description,
            asset_type=asset_type,
            mood=mood,
            game_context=game_name,
            canvas_description=canvas_snapshot_description,
            brand_context=brand_context,
        )
        intent_schema.turn_count = 0  # First turn

        # Store schemas in session
        session.intent_schema = intent_schema.to_dict()
        if canvas_schema:
            session.canvas_schema = canvas_schema.to_dict()
        await self.sessions.update(session)

        # Stream LLM response
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": first_message},
        ]

        full_response, tokens_in, tokens_out = await self._stream_response(messages)
        for chunk in self._yield_tokens(full_response):
            yield chunk

        # Parse coach response to update intent schema
        intent_schema = self.parser.parse_coach_response(full_response, intent_schema)

        # Get readiness from intent schema (NOT from [INTENT_READY] marker)
        # First turn can NEVER be ready - this is enforced by the schema
        readiness = intent_schema.get_readiness()
        is_ready = intent_schema.is_ready()  # Will always be False on turn 0

        # Log if LLM tried to say ready on first turn
        if self.extractor.check_intent_ready(full_response):
            logger.info(
                "LLM said [INTENT_READY] on first turn, "
                "but intent schema says NOT ready (turn_count=0)"
            )

        # Get clarification questions for frontend
        clarification_questions = intent_schema.get_clarification_questions()
        missing_info = intent_schema.get_missing_info()

        # Update session with parsed schema
        session.intent_schema = intent_schema.to_dict()
        await self.sessions.update(session)

        # Legacy: also extract using old extractor for backwards compatibility
        legacy_intent = self.extractor.extract_from_response(
            full_response, description, mood
        )
        if legacy_intent.is_valid():
            await self.sessions.add_prompt_suggestion(
                session.session_id, legacy_intent.to_generation_input()
            )

        # Use schema's generation description if available, else fall back to legacy
        refined_description = intent_schema.to_generation_description()
        if not refined_description:
            refined_description = legacy_intent.to_generation_input()

        yield StreamChunk(
            type="intent_ready",
            metadata={
                "is_ready": is_ready,
                "readiness_state": readiness.value,
                "confidence": legacy_intent.confidence_score,
                "refined_description": refined_description,
                "community_assets_used": len(community_assets)
                if community_assets
                else 0,
                # New intent schema metadata
                "clarification_questions": clarification_questions,
                "missing_info": missing_info,
                "scene_elements_count": len(intent_schema.scene_elements),
                "display_texts_count": len(intent_schema.display_texts),
                "ambiguous_count": len(
                    [a for a in intent_schema.ambiguous_annotations if not a.resolved]
                ),
                # Canvas schema metadata
                "canvas_clarification": canvas_clarification,
                "canvas_elements_count": len(canvas_schema.elements) if canvas_schema else 0,
                "canvas_ambiguous_count": len(canvas_schema.get_ambiguous_elements()) if canvas_schema else 0,
                "nano_banana_prompt": canvas_schema.to_nano_banana_prompt() if canvas_schema and canvas_schema.is_ready() else None,
            },
        )

        # Save messages
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

        yield StreamChunk(
            type="done",
            metadata={
                "session_id": session.session_id,
                "turns_used": 1,
                "turns_remaining": MAX_TURNS - 1,
                "tokens_in": tokens_in,
                "tokens_out": tokens_out,
            },
        )

    def _extract_community_assets(
        self, placements: Optional[List[Dict[str, Any]]]
    ) -> List[Dict[str, Any]]:
        """
        Extract community hub assets from media asset placements.

        Community hub assets are identified by:
        - is_community_asset=True flag
        - OR asset_id starting with 'community_'

        Args:
            placements: List of media asset placement dicts

        Returns:
            List of community hub asset dicts with game context
        """
        if not placements:
            return []

        community_assets = []
        for p in placements:
            is_community = p.get("is_community_asset", False)
            asset_id = p.get("asset_id", "")

            # Check if it's a community asset
            if is_community or asset_id.startswith("community_"):
                community_assets.append(
                    {
                        "asset_id": asset_id,
                        "display_name": p.get("display_name", "Community Asset"),
                        "asset_type": p.get("asset_type", "background"),
                        "game_category": p.get("game_category"),
                        "game_name": p.get("game_name"),
                        "url": p.get("url"),
                        "x": p.get("x", 50),
                        "y": p.get("y", 50),
                        "width": p.get("width", 100),
                        "height": p.get("height", 100),
                    }
                )

        return community_assets

    def _generate_canvas_description(self, canvas_schema: CanvasSchema) -> str:
        """
        Generate a compact description from classified canvas elements.
        
        Args:
            canvas_schema: Classified canvas schema
            
        Returns:
            Compact description string for prompts
        """
        parts = []

        # Base layer
        if canvas_schema.base_layer:
            parts.append(f"Background: {canvas_schema.base_layer.content}")

        # Kept assets
        kept = [e for e in canvas_schema.elements
                if e.intent.value == "keep_asset" and e != canvas_schema.base_layer]
        if kept:
            asset_names = [e.content for e in kept if e.content]
            if asset_names:
                parts.append(f"Assets: {', '.join(asset_names)}")

        # Display texts
        if canvas_schema.display_texts:
            texts = [f'"{e.content}"' for e in canvas_schema.display_texts if e.content]
            if texts:
                parts.append(f"Text: {', '.join(texts)}")

        # Render elements
        if canvas_schema.render_elements:
            renders = [e.render_description or e.content for e in canvas_schema.render_elements]
            renders = [r for r in renders if r]
            if renders:
                parts.append(f"Render: {', '.join(renders)}")

        # Ambiguous (needs clarification)
        ambiguous = canvas_schema.get_ambiguous_elements()
        if ambiguous:
            amb_texts = [e.content for e in ambiguous if e.content]
            if amb_texts:
                parts.append(f"Unclear: {', '.join(amb_texts)}")

        return " | ".join(parts) if parts else "Canvas design"

    async def continue_chat(
        self,
        session_id: str,
        user_id: str,
        message: str,
        reference_assets: Optional[List[Dict]] = None,
    ) -> AsyncGenerator[StreamChunk, None]:
        """Continue the coaching conversation."""
        try:
            session = await self.sessions.get_or_raise(session_id, user_id)
        except SessionNotFoundError as e:
            yield StreamChunk(type="error", content=str(e))
            return

        limits = await self.sessions.check_limits(session)
        if not limits["can_continue"]:
            yield StreamChunk(
                type="error", content="Session limit reached", metadata=limits
            )
            return

        # Load intent schema from session (or create new if missing)
        if session.intent_schema:
            intent_schema = CreativeIntentSchema.from_dict(session.intent_schema)
        else:
            # Legacy session without schema - create one
            # Note: Legacy sessions start with user_confirmed_vision=False
            # so they can't accidentally become "ready" without proper flow
            intent_schema = CreativeIntentSchema(
                asset_type=session.asset_type,
                game_context=session.game_context,
                brand_context=session.brand_context,
                turn_count=session.turns_used,
                user_confirmed_vision=False,  # Explicit: legacy sessions need confirmation
            )

        # Load canvas schema from session if present
        canvas_schema: Optional[CanvasSchema] = None
        if hasattr(session, 'canvas_schema') and session.canvas_schema:
            canvas_schema = CanvasSchema.from_dict(session.canvas_schema)

            # Check if user message is a canvas clarification response
            if canvas_schema.get_ambiguous_elements():
                canvas_schema = apply_clarification_response(canvas_schema, message)
                session.canvas_schema = canvas_schema.to_dict()
                logger.info(
                    f"Canvas clarification applied: "
                    f"{len(canvas_schema.get_ambiguous_elements())} still ambiguous"
                )

        # Get last coach message for context
        last_coach_message = None
        for msg in reversed(session.messages):
            if msg.role == "assistant":
                last_coach_message = msg.content
                break

        # Parse user message to update intent schema
        intent_schema, is_confirmation = self.parser.parse_user_message(
            message=message,
            schema=intent_schema,
            last_coach_message=last_coach_message,
        )

        logger.info(
            f"User message parsed: is_confirmation={is_confirmation}, "
            f"turn={intent_schema.turn_count}"
        )

        # Build messages
        system_prompt = self.prompts.build_system_prompt_from_session(session)
        messages = [{"role": "system", "content": system_prompt}]
        for msg in session.messages:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": message})

        # Stream response
        full_response, tokens_in, tokens_out = await self._stream_response(messages)
        for chunk in self._yield_tokens(full_response):
            yield chunk

        # Parse coach response to update intent schema
        intent_schema = self.parser.parse_coach_response(full_response, intent_schema)

        # Get readiness from intent schema (NOT from [INTENT_READY] marker)
        readiness = intent_schema.get_readiness()
        is_ready = intent_schema.is_ready()

        # For Canvas Studio sessions, also consider canvas_schema readiness
        # Canvas is ready when the coach has said [INTENT_READY]
        # We trust the LLM's judgment that the user's vision is clear
        if canvas_schema:
            llm_said_ready = self.extractor.check_intent_ready(full_response)
            canvas_ready = canvas_schema.is_ready()

            # Canvas Studio: ready when LLM says ready (trusting the coach's judgment)
            # OR when canvas has no ambiguous elements AND user confirmed vision
            if llm_said_ready:
                is_ready = True
                logger.info(
                    f"Canvas Studio ready: LLM said [INTENT_READY], "
                    f"canvas_ready={canvas_ready}, turn={intent_schema.turn_count}"
                )
            elif canvas_ready and intent_schema.user_confirmed_vision:
                # Also ready if user confirmed vision (from previous turn)
                is_ready = True
                logger.info(
                    f"Canvas Studio ready via user confirmation: "
                    f"canvas_ready={canvas_ready}, user_confirmed={intent_schema.user_confirmed_vision}"
                )

        # Log if LLM said ready but schema disagrees (for non-canvas sessions)
        llm_said_ready = self.extractor.check_intent_ready(full_response)
        if llm_said_ready and not is_ready and not canvas_schema:
            logger.info(
                f"LLM said [INTENT_READY] but intent schema says {readiness.value}"
            )

        # Get clarification questions for frontend
        clarification_questions = intent_schema.get_clarification_questions()
        missing_info = intent_schema.get_missing_info()

        # Update session with new schema
        session.intent_schema = intent_schema.to_dict()
        if canvas_schema:
            session.canvas_schema = canvas_schema.to_dict()
        await self.sessions.update(session)

        # Legacy: also extract using old extractor for backwards compatibility
        legacy_intent = self.extractor.extract_from_conversation(
            full_response, message, session
        )
        if legacy_intent.is_valid():
            await self.sessions.add_prompt_suggestion(
                session_id,
                legacy_intent.to_generation_input(),
                refinement_request=message,
            )

        # Use schema's generation description if available, else fall back to legacy
        refined_description = intent_schema.to_generation_description()
        if not refined_description:
            refined_description = legacy_intent.to_generation_input()

        # For Canvas Studio, COMBINE canvas description with user's transformation requests
        # The canvas description tells what's ON the canvas (layout reference)
        # The intent description tells what the user WANTS (transformations, changes)
        if canvas_schema and is_ready:
            canvas_prompt = canvas_schema.to_nano_banana_prompt()

            # Build combined prompt with user requests as PRIMARY instructions
            if canvas_prompt:
                # Extract user's actual requests from conversation history
                # SKIP the first message (auto-generated canvas description) - it's redundant
                # Focus on user's actual refinement requests
                user_requests = []
                for i, msg in enumerate(session.messages):
                    if msg.role == "user":
                        # Skip first user message if it looks like auto-generated canvas description
                        if i == 0 and "I've designed a" in msg.content and "Canvas Studio" in msg.content:
                            continue
                        # Only include actual user requests, not the verbose auto-description
                        user_requests.append(msg.content)

                # The coach summary is the refined understanding - this is the key part
                coach_summary = intent_schema.last_coach_summary

                # Build a CONCISE prompt for Nano Banana
                # Priority: Coach summary > User requests > Canvas layout
                combined_parts = []

                # Coach's refined understanding is the PRIMARY instruction
                if coach_summary:
                    combined_parts.append(f"CREATE THIS:\n{coach_summary}")

                # User's specific requests (if coach summary is missing)
                elif user_requests:
                    combined_parts.append(f"USER WANTS:\n" + "\n".join(user_requests[-2:]))  # Last 2 only

                # Canvas layout as reference (keep it brief)
                combined_parts.append(f"\nCANVAS REFERENCE:\n{canvas_prompt}")

                refined_description = "\n".join(combined_parts)
                logger.info(f"Combined canvas + intent prompt, length={len(refined_description)}")
                logger.info(f"[COACH PROMPT DEBUG] Coach summary: {coach_summary[:300] if coach_summary else 'NONE'}...")
                logger.info(f"[COACH PROMPT DEBUG] User requests (filtered): {user_requests}")

        # Get canvas clarification if still needed
        canvas_clarification = canvas_schema.generate_clarification_message() if canvas_schema else None

        yield StreamChunk(
            type="intent_ready",
            metadata={
                "is_ready": is_ready,
                "readiness_state": readiness.value,
                "confidence": legacy_intent.confidence_score,
                "refined_description": refined_description,
                "turn": intent_schema.turn_count,
                # New intent schema metadata
                "is_confirmation": is_confirmation,
                "user_confirmed_vision": intent_schema.user_confirmed_vision,
                "clarification_questions": clarification_questions,
                "missing_info": missing_info,
                "scene_elements_count": len(intent_schema.scene_elements),
                "display_texts_count": len(intent_schema.display_texts),
                "ambiguous_count": len(
                    [a for a in intent_schema.ambiguous_annotations if not a.resolved]
                ),
                # Canvas schema metadata
                "canvas_clarification": canvas_clarification,
                "canvas_elements_count": len(canvas_schema.elements) if canvas_schema else 0,
                "canvas_ambiguous_count": len(canvas_schema.get_ambiguous_elements()) if canvas_schema else 0,
                "nano_banana_prompt": canvas_schema.to_nano_banana_prompt() if canvas_schema and canvas_schema.is_ready() else None,
            },
        )

        # Save messages
        await self.sessions.add_message(
            session_id,
            CoachMessage(
                role="user", content=message, timestamp=time.time(), tokens_in=tokens_in
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

        yield StreamChunk(
            type="done",
            metadata={
                "turns_used": intent_schema.turn_count,
                "turns_remaining": MAX_TURNS - intent_schema.turn_count,
                "tokens_in": tokens_in,
                "tokens_out": tokens_out,
            },
        )

    async def end_session(self, session_id: str, user_id: str) -> Dict[str, Any]:
        """End a session and return the final intent."""
        session = await self.sessions.end(session_id, user_id)

        final_description = session.current_prompt_draft or ""
        confidence = (
            min(0.95, 0.5 + (len(session.prompt_history) * 0.1))
            if session.prompt_history
            else 0.5
        )

        return {
            "session_id": session_id,
            "final_prompt": final_description,
            "confidence_score": confidence,
            "turns_used": session.turns_used,
            "tokens_in": session.tokens_in_total,
            "tokens_out": session.tokens_out_total,
        }

    async def _stream_response(
        self, messages: List[Dict[str, str]]
    ) -> tuple[str, int, int]:
        """Stream LLM response and collect full text."""
        full_response = ""
        tokens_in, tokens_out = 0, 0

        if self.llm is None:
            full_response = self._mock_response()
            return full_response, 0, 0

        try:
            if hasattr(self.llm, "stream_chat_with_usage"):
                generator, usage = await self.llm.stream_chat_with_usage(messages)
                async for token in generator:
                    full_response += token
                usage_data = usage.get_usage()
                tokens_in, tokens_out = usage_data.tokens_in, usage_data.tokens_out
            else:
                async for token in self.llm.stream_chat(messages):
                    full_response += token
        except Exception as e:
            logger.error(f"LLM error: {e}")
            full_response = f"Error: {e}"

        return full_response, tokens_in, tokens_out

    def _yield_tokens(self, text: str) -> List[StreamChunk]:
        """Yield text as token chunks."""
        return [StreamChunk(type="token", content=text)]

    async def _perform_search(self, query: str) -> Optional[str]:
        """Perform web search for grounding."""
        try:
            search_service = get_search_service()
            if search_service is None:
                return None
            results = await search_service.search(query, max_results=3)
            if not results:
                return None
            lines = ["Current information from web search:"]
            for r in results:
                lines.append(f"- {r.title}: {r.snippet[:200]}")
            return "\n".join(lines)
        except Exception as e:
            logger.warning(f"Search failed: {e}")
            return None

    def _mock_response(self) -> str:
        """Generate mock response for testing."""
        return (
            "I love the direction! Let me help refine this.\n\n"
            "✨ Ready! A dynamic asset based on your vision [INTENT_READY]"
        )


# Singleton
_coach_service: Optional[CoachService] = None


def get_coach_service() -> CoachService:
    """Get or create the coach service singleton."""
    global _coach_service
    if _coach_service is None:
        _coach_service = CoachService()
    return _coach_service


__all__ = [
    "CoachService",
    "get_coach_service",
]
