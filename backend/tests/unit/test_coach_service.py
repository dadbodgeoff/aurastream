"""
Unit tests for Creative Director Coach Service.

Tests cover:
- System prompt building
- Intent extraction
- Refinement detection
- Keyword extraction
- Mock response generation
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from backend.services.coach.coach_service import (
    CreativeDirectorService,
    PromptCoachService,  # Backwards compat alias
    StreamChunk,
    CreativeIntent,
    CoachOutput,
)
from backend.services.coach.models import CoachSession


class TestCreativeDirectorService:
    """Tests for CreativeDirectorService class."""
    
    @pytest.fixture
    def service(self):
        """Create a coach service without LLM."""
        return CreativeDirectorService()
    
    @pytest.fixture
    def brand_context(self):
        """Sample brand context."""
        return {
            "brand_kit_id": "test-brand-kit-id",
            "colors": [
                {"hex": "#FF5733", "name": "Sunset Orange"},
                {"hex": "#3498DB", "name": "Ocean Blue"},
            ],
            "tone": "competitive",
            "fonts": {"headline": "Montserrat", "body": "Inter"},
        }
    
    # =========================================================================
    # System Prompt Building Tests
    # =========================================================================
    
    def test_build_system_prompt_includes_brand_colors(self, service, brand_context):
        """Test that system prompt includes brand colors."""
        prompt = service._build_system_prompt(
            brand_context=brand_context,
            asset_type="twitch_emote",
            mood="hype",
            custom_mood=None,
            game_context="",
        )
        
        assert "Sunset Orange" in prompt
        assert "#FF5733" in prompt
    
    def test_build_system_prompt_includes_asset_type(self, service, brand_context):
        """Test that system prompt includes asset type."""
        prompt = service._build_system_prompt(
            brand_context=brand_context,
            asset_type="youtube_thumbnail",
            mood="hype",
            custom_mood=None,
            game_context="",
        )
        
        assert "youtube_thumbnail" in prompt
    
    def test_build_system_prompt_includes_mood(self, service, brand_context):
        """Test that system prompt includes mood."""
        prompt = service._build_system_prompt(
            brand_context=brand_context,
            asset_type="twitch_emote",
            mood="cozy",
            custom_mood=None,
            game_context="",
        )
        
        assert "cozy" in prompt.lower()
    
    def test_build_system_prompt_uses_custom_mood(self, service, brand_context):
        """Test that system prompt uses custom mood when provided."""
        prompt = service._build_system_prompt(
            brand_context=brand_context,
            asset_type="twitch_emote",
            mood="custom",
            custom_mood="nostalgic retro vibes",
            game_context="",
        )
        
        assert "nostalgic retro vibes" in prompt
    
    def test_build_system_prompt_includes_game_context(self, service, brand_context):
        """Test that system prompt includes game context."""
        prompt = service._build_system_prompt(
            brand_context=brand_context,
            asset_type="twitch_emote",
            mood="hype",
            custom_mood=None,
            game_context="Fortnite Chapter 5 Season 1",
        )
        
        assert "Fortnite" in prompt
    
    # =========================================================================
    # First Message Building Tests
    # =========================================================================
    
    def test_build_first_message_includes_asset_type(self, service):
        """Test that first message includes asset type."""
        message = service._build_first_message(
            asset_type="twitch_emote",
            mood="hype",
            custom_mood=None,
            game_name=None,
            description="Victory celebration",
        )
        
        assert "twitch_emote" in message
    
    def test_build_first_message_includes_game(self, service):
        """Test that first message includes game when provided."""
        message = service._build_first_message(
            asset_type="twitch_emote",
            mood="hype",
            custom_mood=None,
            game_name="Fortnite",
            description="Victory celebration",
        )
        
        assert "Fortnite" in message
    
    def test_build_first_message_includes_description(self, service):
        """Test that first message includes user description."""
        message = service._build_first_message(
            asset_type="twitch_emote",
            mood="hype",
            custom_mood=None,
            game_name=None,
            description="Epic victory celebration with confetti",
        )
        
        assert "Epic victory celebration with confetti" in message
    
    # =========================================================================
    # Intent Ready Detection Tests (now delegated to IntentExtractor)
    # =========================================================================
    
    def test_check_intent_ready_detects_marker(self, service):
        """Test detecting [INTENT_READY] marker via IntentExtractor."""
        response = "✨ Perfect! Here's what I've got: Victory fist pump. Ready to create? [INTENT_READY]"
        assert service.intent_extractor.check_intent_ready(response) is True
    
    def test_check_intent_ready_detects_ready_phrase(self, service):
        """Test detecting 'Ready to create!' statement (not question)."""
        # Statement with exclamation mark IS ready
        response = "Got it! So we're going for a hype celebration. Ready to create!"
        assert service.intent_extractor.check_intent_ready(response) is True
    
    def test_check_intent_ready_question_not_ready(self, service):
        """Test that 'Ready to create?' question is NOT ready."""
        # Question mark means the coach is asking, not stating readiness
        response = "Got it! So we're going for a hype celebration. Ready to create?"
        assert service.intent_extractor.check_intent_ready(response) is False
    
    def test_check_intent_ready_detects_perfect_emoji(self, service):
        """Test detecting ✨ Perfect phrase."""
        response = "✨ Perfect! That sounds amazing. Let's make it happen."
        assert service.intent_extractor.check_intent_ready(response) is True
    
    def test_check_intent_ready_returns_false_for_questions(self, service):
        """Test that questions are not detected as ready."""
        response = "Love the idea! Is this more of a fist-pump moment or jumping-for-joy energy?"
        assert service.intent_extractor.check_intent_ready(response) is False
    
    # =========================================================================
    # Intent Extraction Tests (now delegated to IntentExtractor)
    # =========================================================================
    
    def test_extract_intent_from_summary(self, service):
        """Test extracting intent from coach summary via IntentExtractor."""
        response = "Here's what I've got: Victory celebration with fist pump and sparkles."
        intent = service.intent_extractor.extract_from_response(response, "victory emote", "hype")
        
        assert intent is not None
        assert "Victory celebration" in intent.description or "fist pump" in intent.description
    
    def test_extract_intent_uses_original_when_no_summary(self, service):
        """Test that original description is used when no summary found."""
        response = "Love the idea! What pose are you thinking?"
        intent = service.intent_extractor.extract_from_response(response, "victory emote", "hype")
        
        assert intent is not None
        assert intent.description == "victory emote"
    
    def test_extract_intent_confidence_high_when_ready(self, service):
        """Test that confidence is high when intent is ready."""
        response = "✨ Perfect! Here's what I've got: Victory fist pump. [INTENT_READY]"
        intent = service.intent_extractor.extract_from_response(response, "victory emote", "hype")
        
        assert intent is not None
        assert intent.confidence_score >= 0.8
    
    # =========================================================================
    # Refinement Detection Tests
    # =========================================================================
    
    def test_is_refinement_detects_make_it(self, service):
        """Test that 'make it' is detected as refinement."""
        assert service._is_refinement("make it more vibrant")
        assert service._is_refinement("Make it brighter")
    
    def test_is_refinement_detects_more_less(self, service):
        """Test that 'more' and 'less' are detected as refinement."""
        assert service._is_refinement("more energy please")
        assert service._is_refinement("less dark")
    
    def test_is_refinement_detects_change_adjust(self, service):
        """Test that 'change' and 'adjust' are detected as refinement."""
        assert service._is_refinement("change the colors")
        assert service._is_refinement("adjust the brightness")
    
    def test_is_refinement_returns_false_for_new_request(self, service):
        """Test that new requests are not detected as refinement."""
        assert not service._is_refinement("I want a new emote")
        assert not service._is_refinement("Create a thumbnail")
    
    # =========================================================================
    # Keyword Extraction Tests
    # =========================================================================
    
    def test_extract_keywords_removes_stop_words(self, service):
        """Test that keyword extraction removes stop words."""
        keywords = service._extract_keywords(
            "A happy character with bright colors and dynamic pose"
        )
        
        assert "a" not in keywords
        assert "with" not in keywords
        assert "and" not in keywords
    
    def test_extract_keywords_returns_unique(self, service):
        """Test that keyword extraction returns unique keywords."""
        keywords = service._extract_keywords(
            "happy happy character character bright"
        )
        
        assert keywords.count("happy") == 1
        assert keywords.count("character") == 1
    
    def test_extract_keywords_limits_to_10(self, service):
        """Test that keyword extraction limits to 10 keywords."""
        keywords = service._extract_keywords(
            "one two three four five six seven eight nine ten eleven twelve thirteen"
        )
        
        assert len(keywords) <= 10
    
    def test_extract_keywords_empty_description(self, service):
        """Test keyword extraction with empty description."""
        keywords = service._extract_keywords("")
        
        assert keywords == []
    
    # =========================================================================
    # Brand Element Extraction Tests
    # =========================================================================
    
    def test_extract_brand_elements_finds_colors(self, service, brand_context):
        """Test that brand element extraction finds colors."""
        elements = service._extract_brand_elements(
            "A character with Sunset Orange highlights",
            brand_context,
        )
        
        assert any("color:sunset orange" in e.lower() for e in elements)
    
    def test_extract_brand_elements_finds_hex_codes(self, service, brand_context):
        """Test that brand element extraction finds color names (not hex codes directly)."""
        # The method looks for color names, not hex codes in the description
        elements = service._extract_brand_elements(
            "Using Sunset Orange as the primary color",
            brand_context,
        )
        
        assert len(elements) > 0
        assert any("sunset orange" in e.lower() for e in elements)
    
    def test_extract_brand_elements_finds_tone(self, service, brand_context):
        """Test that brand element extraction finds tone."""
        elements = service._extract_brand_elements(
            "A competitive gaming style emote",
            brand_context,
        )
        
        assert any("tone:competitive" in e.lower() for e in elements)
    
    # =========================================================================
    # Change Detection Tests
    # =========================================================================
    
    def test_detect_changes_initial_description(self, service):
        """Test change detection for initial description."""
        changes = service._detect_changes(None, "New description")
        
        assert "Initial description" in changes
    
    def test_detect_changes_finds_added_words(self, service):
        """Test that change detection finds added words."""
        changes = service._detect_changes(
            "A happy character",
            "A happy character with bright colors",
        )
        
        assert any("Added" in c for c in changes)
    
    def test_detect_changes_finds_removed_words(self, service):
        """Test that change detection finds removed words."""
        changes = service._detect_changes(
            "A happy character with dark colors",
            "A happy character",
        )
        
        assert any("Removed" in c for c in changes)
    
    # =========================================================================
    # Mock Response Tests
    # =========================================================================
    
    def test_mock_response_no_prompt_block(self, service, brand_context):
        """Test that mock response does NOT include prompt blocks (secret sauce)."""
        response = service._generate_mock_response(
            asset_type="twitch_emote",
            mood="hype",
            description="Victory celebration",
            brand_context=brand_context,
        )
        
        # Creative Director mode should NEVER expose prompts
        assert "```prompt" not in response
        assert "```PROMPT" not in response
    
    def test_mock_response_includes_brand_colors(self, service, brand_context):
        """Test that mock response references brand colors."""
        response = service._generate_mock_response(
            asset_type="twitch_emote",
            mood="hype",
            description="Victory celebration",
            brand_context=brand_context,
        )
        
        assert "Sunset Orange" in response or "brand colors" in response.lower()
    
    def test_mock_response_asks_clarifying_questions(self, service, brand_context):
        """Test that mock response asks clarifying questions like a creative director."""
        response = service._generate_mock_response(
            asset_type="twitch_emote",
            mood="hype",
            description="Victory celebration",
            brand_context=brand_context,
        )
        
        # Should ask questions to understand the vision
        assert "?" in response


class TestStreamChunk:
    """Tests for StreamChunk dataclass."""
    
    def test_stream_chunk_creation(self):
        """Test creating a stream chunk."""
        chunk = StreamChunk(
            type="token",
            content="Hello",
            metadata={"key": "value"},
        )
        
        assert chunk.type == "token"
        assert chunk.content == "Hello"
        assert chunk.metadata == {"key": "value"}
    
    def test_stream_chunk_defaults(self):
        """Test stream chunk default values."""
        chunk = StreamChunk(type="done")
        
        assert chunk.content == ""
        assert chunk.metadata is None
    
    def test_stream_chunk_types(self):
        """Test various stream chunk types."""
        types = ["token", "intent_ready", "grounding", "grounding_complete", "done", "error"]
        
        for chunk_type in types:
            chunk = StreamChunk(type=chunk_type)
            assert chunk.type == chunk_type


class TestCreativeIntent:
    """Tests for CreativeIntent dataclass."""
    
    def test_creative_intent_creation(self):
        """Test creating a creative intent."""
        intent = CreativeIntent(
            description="A happy character celebrating",
            subject="character",
            action="celebrating",
            emotion="happy",
            elements=["sparkles"],
            confidence_score=0.85,
        )
        
        assert intent.description == "A happy character celebrating"
        assert intent.confidence_score == 0.85
        assert intent.emotion == "happy"
        assert len(intent.elements) == 1
    
    def test_creative_intent_to_generation_input(self):
        """Test converting intent to generation input."""
        intent = CreativeIntent(
            description="Victory celebration",
            subject="streamer",
            action="fist pump",
            emotion="hype",
            elements=["sparkles", "confetti"],
            confidence_score=0.9,
        )
        
        output = intent.to_generation_input()
        assert "streamer" in output
        assert "fist pump" in output
        assert "hype" in output
        assert "sparkles" in output


class TestCoachOutput:
    """Tests for CoachOutput dataclass."""
    
    def test_coach_output_creation(self):
        """Test creating a coach output."""
        intent = CreativeIntent(
            description="Victory celebration",
            confidence_score=0.85,
        )
        output = CoachOutput(
            refined_intent=intent,
            metadata={"session_id": "test-123"},
            suggested_asset_type="twitch_emote",
            keywords=["victory", "celebration"],
        )
        
        assert output.refined_intent.description == "Victory celebration"
        assert output.suggested_asset_type == "twitch_emote"
        assert len(output.keywords) == 2
    
    def test_coach_output_final_prompt_property(self):
        """Test that final_prompt property returns the generation input."""
        intent = CreativeIntent(
            description="A vibrant gaming thumbnail",
            emotion="hype",
            confidence_score=0.9,
        )
        output = CoachOutput(
            refined_intent=intent,
            metadata={},
            suggested_asset_type="youtube_thumbnail",
            keywords=["gaming", "thumbnail"],
        )
        
        assert output.final_prompt == intent.to_generation_input()
        assert "hype mood" in output.final_prompt
    
    def test_coach_output_confidence_score_property(self):
        """Test that confidence_score property returns the intent's score."""
        intent = CreativeIntent(
            description="Test description",
            confidence_score=0.92,
        )
        output = CoachOutput(
            refined_intent=intent,
            metadata={},
            suggested_asset_type="twitch_emote",
            keywords=[],
        )
        
        assert output.confidence_score == 0.92
    
    def test_coach_output_final_prompt_excludes_custom_mood(self):
        """
        REGRESSION TEST: Ensure final_prompt doesn't include 'custom mood'.
        """
        intent = CreativeIntent(
            description="A Fortnite thumbnail with neon effects",
            emotion="custom",  # This should NOT appear in final_prompt
            confidence_score=0.85,
        )
        output = CoachOutput(
            refined_intent=intent,
            metadata={},
            suggested_asset_type="youtube_thumbnail",
            keywords=["fortnite", "neon"],
        )
        
        assert "custom mood" not in output.final_prompt.lower()
        assert "Fortnite thumbnail" in output.final_prompt


class TestCreativeDirectorServiceEdgeCases:
    """Edge case tests for CreativeDirectorService."""
    
    @pytest.fixture
    def service(self):
        """Create a coach service without LLM."""
        return CreativeDirectorService()
    
    @pytest.fixture
    def brand_context(self):
        """Sample brand context."""
        return {
            "brand_kit_id": "test-brand-kit-id",
            "colors": [
                {"hex": "#FF5733", "name": "Sunset Orange"},
            ],
            "tone": "competitive",
            "fonts": {},
        }
    
    def test_build_system_prompt_empty_colors(self, service):
        """Test system prompt with empty colors list."""
        brand_context = {
            "brand_kit_id": "test",
            "colors": [],
            "tone": "professional",
            "fonts": {},
        }
        
        prompt = service._build_system_prompt(
            brand_context=brand_context,
            asset_type="twitch_emote",
            mood="hype",
            custom_mood=None,
            game_context="",
        )
        
        assert "none specified" in prompt
    
    def test_build_system_prompt_no_fonts(self, service):
        """Test system prompt with missing fonts."""
        brand_context = {
            "brand_kit_id": "test",
            "colors": [],
            "tone": "professional",
        }
        
        prompt = service._build_system_prompt(
            brand_context=brand_context,
            asset_type="twitch_emote",
            mood="hype",
            custom_mood=None,
            game_context="",
        )
        
        # Should not raise an error
        assert "twitch_emote" in prompt
    
    def test_build_first_message_with_custom_mood(self, service):
        """Test first message with custom mood."""
        message = service._build_first_message(
            asset_type="twitch_emote",
            mood="custom",
            custom_mood="nostalgic 90s vibes",
            game_name=None,
            description="Retro gaming",
        )
        
        assert "nostalgic 90s vibes" in message
    
    def test_extract_intent_from_summary_pattern(self, service):
        """Test intent extraction from 'Here's what I've got' pattern via IntentExtractor."""
        response = "Here's what I've got: A happy character celebrating victory."
        intent = service.intent_extractor.extract_from_response(response, "original", "hype")
        
        assert intent is not None
        assert "happy character" in intent.description.lower()
    
    def test_extract_intent_from_going_for_pattern(self, service):
        """Test intent extraction from 'So we're going for' pattern via IntentExtractor."""
        response = "So we're going for a dynamic fist pump with sparkles. Ready to create?"
        intent = service.intent_extractor.extract_from_response(response, "original", "hype")
        
        assert intent is not None
        assert "fist pump" in intent.description.lower() or "sparkles" in intent.description.lower()
    
    def test_is_refinement_case_insensitive(self, service):
        """Test refinement detection is case insensitive."""
        assert service._is_refinement("MAKE IT brighter")
        assert service._is_refinement("MORE energy")
        assert service._is_refinement("CHANGE the colors")
    
    def test_extract_keywords_filters_short_words(self, service):
        """Test that short words are filtered from keywords."""
        keywords = service._extract_keywords("A is to be or not")
        
        # All these are stop words or too short
        assert len(keywords) == 0 or all(len(k) > 2 for k in keywords)
    
    def test_extract_brand_elements_empty_context(self, service):
        """Test brand element extraction with empty context."""
        elements = service._extract_brand_elements(
            "A character with colors",
            {},
        )
        
        assert elements == []
    
    def test_extract_brand_elements_case_insensitive(self, service, brand_context):
        """Test brand element extraction is case insensitive."""
        elements = service._extract_brand_elements(
            "A character with SUNSET ORANGE highlights",
            brand_context,
        )
        
        assert any("sunset orange" in e.lower() for e in elements)
    
    def test_detect_changes_same_description(self, service):
        """Test change detection when descriptions are the same."""
        changes = service._detect_changes(
            "A happy character",
            "A happy character",
        )
        
        # Should return refined details or empty
        assert "Refined details" in changes or len(changes) == 0
    
    def test_mock_response_empty_brand_colors(self, service):
        """Test mock response with empty brand colors."""
        brand_context = {
            "brand_kit_id": "test",
            "colors": [],
            "tone": "professional",
        }
        
        response = service._generate_mock_response(
            asset_type="twitch_emote",
            mood="hype",
            description="Victory celebration",
            brand_context=brand_context,
        )
        
        # Should still generate a response without prompt blocks
        assert len(response) > 0
        assert "```prompt" not in response  # No prompts exposed


class TestPromptCoachServiceAsync:
    """Async tests for PromptCoachService."""
    
    @pytest.fixture
    def mock_session_manager(self):
        """Create a mock session manager."""
        manager = AsyncMock()
        return manager
    
    @pytest.fixture
    def mock_grounding_strategy(self):
        """Create a mock grounding strategy."""
        strategy = AsyncMock()
        return strategy
    
    @pytest.fixture
    def mock_validator(self):
        """Create a mock validator."""
        from backend.services.coach.validator import ValidationResult, ValidationSeverity
        
        validator = MagicMock()
        validator.validate.return_value = ValidationResult(
            is_valid=True,
            is_generation_ready=True,
            issues=[],
            quality_score=0.95,
        )
        return validator
    
    @pytest.fixture
    def service_with_mocks(self, mock_session_manager, mock_grounding_strategy, mock_validator):
        """Create a coach service with mocked dependencies."""
        return PromptCoachService(
            session_manager=mock_session_manager,
            grounding_strategy=mock_grounding_strategy,
            validator=mock_validator,
        )
    
    @pytest.mark.asyncio
    async def test_start_with_context_non_studio_returns_error(self, service_with_mocks):
        """Test that non-studio users get an error."""
        chunks = []
        async for chunk in service_with_mocks.start_with_context(
            user_id="test-user",
            brand_context={},
            asset_type="twitch_emote",
            mood="hype",
            description="Test",
            tier="free",  # Non-studio tier
        ):
            chunks.append(chunk)
        
        assert len(chunks) == 1
        assert chunks[0].type == "error"
        assert "Studio" in chunks[0].content
    
    @pytest.mark.asyncio
    async def test_start_with_context_streams_response(
        self, service_with_mocks, mock_session_manager, mock_grounding_strategy
    ):
        """Test that start_with_context streams response chunks."""
        from backend.services.coach.models import CoachSession
        from backend.services.coach.grounding import GroundingDecision
        
        # Setup mocks
        mock_session = CoachSession(
            session_id="test-session-id",
            user_id="test-user",
            brand_context={},
        )
        mock_session_manager.create_with_context.return_value = mock_session
        mock_session_manager.add_message.return_value = None
        mock_session_manager.add_prompt_suggestion.return_value = None
        
        mock_grounding_strategy.should_ground.return_value = GroundingDecision(
            should_ground=False,
            reason="No grounding needed",
        )
        
        chunks = []
        async for chunk in service_with_mocks.start_with_context(
            user_id="test-user",
            brand_context={"colors": [], "tone": "professional"},
            asset_type="twitch_emote",
            mood="hype",
            description="Victory celebration",
            tier="studio",  # Must be studio tier
        ):
            chunks.append(chunk)
        
        # Should have at least token and done chunks
        assert len(chunks) >= 2
        assert any(c.type == "token" for c in chunks)
        assert any(c.type == "done" for c in chunks)
    
    @pytest.mark.asyncio
    async def test_continue_chat_session_not_found(self, service_with_mocks, mock_session_manager):
        """Test continue_chat with non-existent session."""
        from backend.services.coach.session_manager import SessionNotFoundError
        
        mock_session_manager.get_or_raise.side_effect = SessionNotFoundError("Session not found")
        
        chunks = []
        async for chunk in service_with_mocks.continue_chat(
            session_id="non-existent",
            user_id="test-user",
            message="Make it brighter",
        ):
            chunks.append(chunk)
        
        assert len(chunks) == 1
        assert chunks[0].type == "error"
        assert "not found" in chunks[0].content.lower()
    
    @pytest.mark.asyncio
    async def test_end_session_returns_coach_output(self, service_with_mocks, mock_session_manager):
        """Test that end_session returns CoachOutput."""
        from backend.services.coach.models import CoachSession, PromptSuggestion
        import time
        
        mock_session = CoachSession(
            session_id="test-session-id",
            user_id="test-user",
            brand_context={},
            current_prompt_draft="A happy character celebrating",
            turns_used=3,
            prompt_history=[
                PromptSuggestion(version=1, prompt="Initial prompt", timestamp=time.time()),
                PromptSuggestion(version=2, prompt="Refined prompt", timestamp=time.time()),
            ],
        )
        mock_session_manager.end.return_value = mock_session
        
        output = await service_with_mocks.end_session(
            session_id="test-session-id",
            user_id="test-user",
        )
        
        assert isinstance(output, CoachOutput)
        assert output.refined_intent.description == "A happy character celebrating"
        assert output.metadata["turns_used"] == 3
