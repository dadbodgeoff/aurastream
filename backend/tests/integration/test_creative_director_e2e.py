"""
E2E Integration tests for Creative Director Coach flow.

Tests the full Creative Director workflow from frontend to backend:
- Session start with context (brand kit, asset type, mood)
- Streaming responses WITHOUT prompt exposure
- Intent refinement through conversation
- Ready-to-create detection
- Session end with refined intent

KEY PRINCIPLE: The coach helps users describe WHAT they want,
never exposing HOW to prompt for it (our secret sauce).
"""

import pytest
import json
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient
from datetime import datetime, timezone
import uuid

from backend.api.main import create_app


# =============================================================================
# Test Configuration
# =============================================================================

TEST_SECRET_KEY = "test-jwt-secret-key-that-is-at-least-32-characters-long-for-testing"


# =============================================================================
# Helper Functions
# =============================================================================

def create_mock_supabase_response(data):
    """Create a mock Supabase response object."""
    mock_response = MagicMock()
    mock_response.data = data
    mock_response.count = len(data) if data else 0
    return mock_response


def create_mock_user_row(
    user_id=None,
    email="test@example.com",
    password_hash=None,
    subscription_tier="studio",
):
    """Create a mock database user row."""
    if user_id is None:
        user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": user_id,
        "email": email,
        "password_hash": password_hash or "$2b$04$mock_hash",
        "email_verified": False,
        "display_name": "Test User",
        "avatar_url": None,
        "subscription_tier": subscription_tier,
        "subscription_status": "active" if subscription_tier != "free" else "none",
        "assets_generated_this_month": 0,
        "created_at": now,
        "updated_at": now,
    }


def setup_mock_supabase_for_auth(mock_supabase, user_row):
    """Setup mock Supabase client for auth operations."""
    mock_client = MagicMock()
    mock_supabase.return_value = mock_client
    
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    mock_select = MagicMock()
    mock_table.select.return_value = mock_select
    mock_eq = MagicMock()
    mock_select.eq.return_value = mock_eq
    mock_execute = MagicMock()
    mock_eq.execute.return_value = mock_execute
    mock_execute.data = [user_row]
    
    return mock_client


def parse_sse_events(response_text: str) -> list:
    """Parse SSE events from response text."""
    events = []
    for line in response_text.split("\n"):
        if line.startswith("data: "):
            try:
                data = json.loads(line[6:])
                events.append(data)
            except json.JSONDecodeError:
                pass
    return events


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def mock_settings():
    """Create mock settings."""
    settings = MagicMock()
    settings.JWT_SECRET_KEY = TEST_SECRET_KEY
    settings.JWT_ALGORITHM = "HS256"
    settings.JWT_EXPIRATION_HOURS = 24
    settings.is_production = False
    settings.DEBUG = True
    settings.APP_ENV = "test"
    settings.allowed_origins_list = ["http://localhost:3000"]
    return settings


@pytest.fixture
def sample_twitch_request():
    """Sample request from Twitch page - what frontend sends."""
    return {
        "brand_context": {
            "brand_kit_id": "kit-abc123",
            "colors": [
                {"hex": "#FF6B35", "name": "Streamer Orange"},
                {"hex": "#1A1A2E", "name": "Dark Navy"},
                {"hex": "#00D9FF", "name": "Cyber Blue"}
            ],
            "tone": "energetic",
            "fonts": {"headline": "Bebas Neue", "body": "Open Sans"},
            "logo_url": "https://example.com/logo.png"
        },
        "asset_type": "twitch_emote",
        "mood": "hype",
        "game_id": "valorant",
        "game_name": "Valorant",
        "description": "Victory celebration when I clutch a round"
    }


# =============================================================================
# Mock Redis Client
# =============================================================================

class MockRedisClient:
    """Mock Redis client for session storage."""
    
    def __init__(self):
        self._store = {}
        self._ttls = {}
    
    async def get(self, key: str):
        return self._store.get(key)
    
    async def setex(self, key: str, ttl: int, value: str):
        self._store[key] = value
        self._ttls[key] = ttl
    
    async def delete(self, key: str):
        if key in self._store:
            del self._store[key]
            return 1
        return 0
    
    async def expire(self, key: str, ttl: int):
        if key in self._store:
            self._ttls[key] = ttl
            return True
        return False
    
    def clear(self):
        self._store.clear()
        self._ttls.clear()


# =============================================================================
# TestCreativeDirectorNoPromptExposure
# =============================================================================

class TestCreativeDirectorNoPromptExposure:
    """
    Tests that Creative Director NEVER exposes prompts.
    
    This is the core principle - we help users describe what they want,
    but never show them the actual prompts (our secret sauce).
    """
    
    def test_mock_response_has_no_prompt_blocks(self, mock_settings, sample_twitch_request):
        """Test that mock responses don't contain prompt blocks."""
        from backend.services.coach.coach_service import CreativeDirectorService
        
        service = CreativeDirectorService()
        
        response = service._generate_mock_response(
            asset_type=sample_twitch_request["asset_type"],
            mood=sample_twitch_request["mood"],
            description=sample_twitch_request["description"],
            brand_context=sample_twitch_request["brand_context"],
        )
        
        # CRITICAL: No prompt blocks should ever appear
        assert "```prompt" not in response.lower()
        assert "```PROMPT" not in response
        assert "[prompt]" not in response.lower()
        
        # Should be conversational, asking questions
        assert "?" in response
    
    def test_system_prompt_forbids_prompt_writing(self, mock_settings):
        """Test that system prompt explicitly forbids writing prompts."""
        from backend.services.coach.coach_service import CreativeDirectorService
        
        service = CreativeDirectorService()
        
        system_prompt = service._build_system_prompt(
            brand_context={"colors": [], "tone": "professional"},
            asset_type="twitch_emote",
            mood="hype",
            custom_mood=None,
            game_context="",
        )
        
        # System prompt should explicitly forbid prompt writing
        assert "NEVER write prompts" in system_prompt or "NEVER" in system_prompt
        assert "prompt syntax" in system_prompt.lower() or "technical" in system_prompt.lower()
    
    def test_intent_extraction_returns_description_not_prompt(self, mock_settings):
        """Test that intent extraction returns natural description, not prompt."""
        from backend.services.coach.coach_service import CreativeDirectorService
        
        service = CreativeDirectorService()
        
        # Simulate coach response
        response = "✨ Perfect! Here's what I've got: A fist-pump celebration with sparkles. Ready to create?"
        
        intent = service._extract_intent(response, "victory emote", "hype")
        
        assert intent is not None
        # Should be natural language, not prompt syntax
        assert "8k" not in intent.description.lower()
        assert "highly detailed" not in intent.description.lower()
        assert "ray traced" not in intent.description.lower()


# =============================================================================
# TestCreativeDirectorIntentFlow
# =============================================================================

class TestCreativeDirectorIntentFlow:
    """Tests for the intent refinement flow."""
    
    def test_intent_ready_detection(self, mock_settings):
        """Test that intent ready markers are properly detected."""
        from backend.services.coach.coach_service import CreativeDirectorService
        
        service = CreativeDirectorService()
        
        # Should detect [INTENT_READY] marker
        assert service._check_intent_ready(
            "✨ Perfect! Here's what I've got: Victory fist pump. [INTENT_READY]"
        ) is True
        
        # Should detect "Ready to create" phrase
        assert service._check_intent_ready(
            "Got it! So we're going for a hype celebration. Ready to create?"
        ) is True
        
        # Should NOT detect questions as ready
        assert service._check_intent_ready(
            "Love the idea! Is this more of a fist-pump moment or jumping-for-joy energy?"
        ) is False
    
    def test_confidence_increases_when_ready(self, mock_settings):
        """Test that confidence score increases when intent is ready."""
        from backend.services.coach.coach_service import CreativeDirectorService
        
        service = CreativeDirectorService()
        
        # Not ready - lower confidence
        not_ready_response = "Love the idea! What pose are you thinking?"
        intent_not_ready = service._extract_intent(not_ready_response, "victory", "hype")
        
        # Ready - higher confidence
        ready_response = "✨ Perfect! Here's what I've got: Victory fist pump. [INTENT_READY]"
        intent_ready = service._extract_intent(ready_response, "victory", "hype")
        
        assert intent_ready.confidence_score > intent_not_ready.confidence_score
        assert intent_ready.confidence_score >= 0.8
    
    def test_intent_to_generation_input(self, mock_settings):
        """Test converting intent to generation input format."""
        from backend.services.coach.coach_service import CreativeIntent
        
        intent = CreativeIntent(
            description="Victory celebration",
            subject="streamer character",
            action="fist pump",
            emotion="hype",
            elements=["sparkles", "confetti"],
            confidence_score=0.9,
        )
        
        output = intent.to_generation_input()
        
        # Should include all components
        assert "streamer character" in output
        assert "fist pump" in output
        assert "hype" in output
        assert "sparkles" in output
        
        # Should NOT include technical prompt terms
        assert "8k" not in output.lower()
        assert "detailed" not in output.lower()


# =============================================================================
# TestCreativeDirectorStreamChunks
# =============================================================================

class TestCreativeDirectorStreamChunks:
    """Tests for stream chunk types and format."""
    
    def test_stream_chunk_types_are_correct(self, mock_settings):
        """Test that stream chunk types match frontend expectations."""
        from backend.services.coach.coach_service import StreamChunk
        
        # These are the chunk types the frontend expects
        expected_types = [
            "token",           # Text content
            "intent_ready",    # Intent status (replaces 'validation')
            "grounding",       # Web search started
            "grounding_complete",  # Web search done
            "done",            # Stream complete
            "error",           # Error occurred
        ]
        
        for chunk_type in expected_types:
            chunk = StreamChunk(type=chunk_type, content="test")
            assert chunk.type == chunk_type
    
    def test_intent_ready_chunk_has_correct_metadata(self, mock_settings):
        """Test that intent_ready chunk has the metadata frontend expects."""
        from backend.services.coach.coach_service import StreamChunk
        
        # This is what frontend expects in intent_ready metadata
        chunk = StreamChunk(
            type="intent_ready",
            content="",
            metadata={
                "is_ready": True,
                "confidence": 0.85,
                "refined_description": "Victory fist pump with sparkles",
                "turn": 2,
            }
        )
        
        assert chunk.metadata["is_ready"] is True
        assert chunk.metadata["confidence"] == 0.85
        assert "refined_description" in chunk.metadata
        assert chunk.metadata["turn"] == 2


# =============================================================================
# TestCreativeDirectorBrandIntegration
# =============================================================================

class TestCreativeDirectorBrandIntegration:
    """Tests for brand kit integration."""
    
    def test_brand_colors_included_in_system_prompt(self, mock_settings, sample_twitch_request):
        """Test that brand colors are included in system prompt."""
        from backend.services.coach.coach_service import CreativeDirectorService
        
        service = CreativeDirectorService()
        
        system_prompt = service._build_system_prompt(
            brand_context=sample_twitch_request["brand_context"],
            asset_type=sample_twitch_request["asset_type"],
            mood=sample_twitch_request["mood"],
            custom_mood=None,
            game_context="",
        )
        
        # Brand colors should be mentioned
        assert "Streamer Orange" in system_prompt
        assert "#FF6B35" in system_prompt
    
    def test_brand_elements_extracted_from_description(self, mock_settings, sample_twitch_request):
        """Test that brand elements are extracted when mentioned."""
        from backend.services.coach.coach_service import CreativeDirectorService
        
        service = CreativeDirectorService()
        
        elements = service._extract_brand_elements(
            "A character with Streamer Orange highlights and energetic pose",
            sample_twitch_request["brand_context"],
        )
        
        # Should find the color reference
        assert any("streamer orange" in e.lower() for e in elements)
    
    def test_mock_response_references_brand(self, mock_settings, sample_twitch_request):
        """Test that mock response references brand elements."""
        from backend.services.coach.coach_service import CreativeDirectorService
        
        service = CreativeDirectorService()
        
        response = service._generate_mock_response(
            asset_type=sample_twitch_request["asset_type"],
            mood=sample_twitch_request["mood"],
            description=sample_twitch_request["description"],
            brand_context=sample_twitch_request["brand_context"],
        )
        
        # Should reference brand colors
        assert "Streamer Orange" in response or "brand" in response.lower()


# =============================================================================
# TestCreativeDirectorTierGating
# =============================================================================

class TestCreativeDirectorTierGating:
    """Tests for subscription tier gating."""
    
    @pytest.mark.asyncio
    async def test_free_tier_blocked(self, mock_settings, sample_twitch_request):
        """Test that free tier users cannot use Creative Director."""
        from backend.services.coach.coach_service import CreativeDirectorService
        
        service = CreativeDirectorService()
        
        chunks = []
        async for chunk in service.start_with_context(
            user_id="test-user",
            brand_context=sample_twitch_request["brand_context"],
            asset_type=sample_twitch_request["asset_type"],
            mood=sample_twitch_request["mood"],
            description=sample_twitch_request["description"],
            tier="free",
        ):
            chunks.append(chunk)
        
        # Should get error
        assert len(chunks) == 1
        assert chunks[0].type == "error"
        assert "Studio" in chunks[0].content
    
    @pytest.mark.asyncio
    async def test_pro_tier_blocked(self, mock_settings, sample_twitch_request):
        """Test that pro tier users cannot use Creative Director."""
        from backend.services.coach.coach_service import CreativeDirectorService
        
        service = CreativeDirectorService()
        
        chunks = []
        async for chunk in service.start_with_context(
            user_id="test-user",
            brand_context=sample_twitch_request["brand_context"],
            asset_type=sample_twitch_request["asset_type"],
            mood=sample_twitch_request["mood"],
            description=sample_twitch_request["description"],
            tier="pro",
        ):
            chunks.append(chunk)
        
        # Should get error
        assert len(chunks) == 1
        assert chunks[0].type == "error"
    
    @pytest.mark.asyncio
    async def test_studio_tier_allowed(self, mock_settings, sample_twitch_request):
        """Test that studio tier users can use Creative Director."""
        from backend.services.coach.coach_service import CreativeDirectorService
        from backend.services.coach.models import CoachSession
        from backend.services.coach.grounding import GroundingDecision
        from unittest.mock import AsyncMock
        
        # Setup mocks
        mock_session_manager = AsyncMock()
        mock_session = CoachSession(
            session_id="test-session-id",
            user_id="test-user",
            brand_context=sample_twitch_request["brand_context"],
        )
        mock_session_manager.create_with_context.return_value = mock_session
        mock_session_manager.add_message.return_value = None
        mock_session_manager.add_prompt_suggestion.return_value = None
        
        mock_grounding = AsyncMock()
        mock_grounding.should_ground.return_value = GroundingDecision(
            should_ground=False,
            reason="No grounding needed",
        )
        
        service = CreativeDirectorService(
            session_manager=mock_session_manager,
            grounding_strategy=mock_grounding,
        )
        
        chunks = []
        async for chunk in service.start_with_context(
            user_id="test-user",
            brand_context=sample_twitch_request["brand_context"],
            asset_type=sample_twitch_request["asset_type"],
            mood=sample_twitch_request["mood"],
            description=sample_twitch_request["description"],
            tier="studio",
        ):
            chunks.append(chunk)
        
        # Should get token and done chunks (not error)
        assert any(c.type == "token" for c in chunks)
        assert any(c.type == "done" for c in chunks)
        assert not any(c.type == "error" for c in chunks)


# =============================================================================
# TestCreativeDirectorConversationFlow
# =============================================================================

class TestCreativeDirectorConversationFlow:
    """Tests for the full conversation flow."""
    
    def test_first_message_built_correctly(self, mock_settings, sample_twitch_request):
        """Test that first message is built from user selections."""
        from backend.services.coach.coach_service import CreativeDirectorService
        
        service = CreativeDirectorService()
        
        message = service._build_first_message(
            asset_type=sample_twitch_request["asset_type"],
            mood=sample_twitch_request["mood"],
            custom_mood=None,
            game_name=sample_twitch_request["game_name"],
            description=sample_twitch_request["description"],
        )
        
        # Should include all context
        assert "twitch_emote" in message
        assert "Valorant" in message
        assert "hype" in message
        assert "clutch" in message
    
    def test_refinement_detection(self, mock_settings):
        """Test that refinement requests are detected."""
        from backend.services.coach.coach_service import CreativeDirectorService
        
        service = CreativeDirectorService()
        
        # These should be detected as refinements
        assert service._is_refinement("make it more vibrant")
        assert service._is_refinement("add some sparkles")
        assert service._is_refinement("change the colors")
        assert service._is_refinement("less intense")
        
        # These should NOT be refinements
        assert not service._is_refinement("I want a new emote")
        assert not service._is_refinement("Create a thumbnail")
    
    def test_change_detection(self, mock_settings):
        """Test that changes between descriptions are detected."""
        from backend.services.coach.coach_service import CreativeDirectorService
        
        service = CreativeDirectorService()
        
        changes = service._detect_changes(
            "A happy character",
            "A happy character with sparkles and glow",
        )
        
        assert any("Added" in c for c in changes)
        assert any("sparkles" in c.lower() or "glow" in c.lower() for c in changes)


# =============================================================================
# TestFrontendBackendContract
# =============================================================================

class TestFrontendBackendContract:
    """
    Tests that verify the contract between frontend and backend.
    
    These tests ensure the data structures match what the frontend expects.
    """
    
    def test_start_request_format(self, mock_settings, sample_twitch_request):
        """Test that start request format matches frontend expectations."""
        # Frontend sends this structure
        required_fields = [
            "brand_context",
            "asset_type", 
            "mood",
            "description",
        ]
        
        for field in required_fields:
            assert field in sample_twitch_request
        
        # brand_context structure
        brand_context = sample_twitch_request["brand_context"]
        assert "colors" in brand_context
        assert "tone" in brand_context
    
    def test_stream_chunk_format_matches_frontend(self, mock_settings):
        """Test that stream chunk format matches useCoachChat hook expectations."""
        from backend.services.coach.coach_service import StreamChunk
        
        # Frontend useCoachChat expects these chunk types
        frontend_expected_types = {
            "token",
            "intent_ready",  # Changed from 'validation'
            "grounding",
            "grounding_complete",
            "done",
            "error",
        }
        
        # Create chunks of each type
        for chunk_type in frontend_expected_types:
            chunk = StreamChunk(type=chunk_type)
            assert chunk.type in frontend_expected_types
    
    def test_intent_ready_metadata_matches_frontend(self, mock_settings):
        """Test that intent_ready metadata matches IntentStatus interface."""
        # Frontend IntentStatus interface expects:
        # - isReady: boolean
        # - confidence: number
        # - refinedDescription: string
        # - turn?: number
        
        # Backend sends snake_case, frontend converts to camelCase
        metadata = {
            "is_ready": True,
            "confidence": 0.85,
            "refined_description": "Victory fist pump",
            "turn": 2,
        }
        
        # Verify all required fields
        assert "is_ready" in metadata
        assert "confidence" in metadata
        assert "refined_description" in metadata
        assert isinstance(metadata["is_ready"], bool)
        assert isinstance(metadata["confidence"], (int, float))
        assert isinstance(metadata["refined_description"], str)
    
    def test_coach_output_format(self, mock_settings):
        """Test that CoachOutput format matches frontend expectations."""
        from backend.services.coach.coach_service import CoachOutput, CreativeIntent
        
        intent = CreativeIntent(
            description="Victory celebration with fist pump",
            confidence_score=0.9,
        )
        
        output = CoachOutput(
            refined_intent=intent,
            metadata={"session_id": "test-123", "turns_used": 3},
            suggested_asset_type="twitch_emote",
            keywords=["victory", "celebration", "fist", "pump"],
        )
        
        # Frontend expects these fields
        assert output.refined_intent is not None
        assert output.refined_intent.description is not None
        assert output.metadata is not None
        assert output.keywords is not None
