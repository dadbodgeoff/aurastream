"""
Unit tests for Intent Extractor.

These tests ensure the intent extractor correctly parses
coach responses and extracts the refined description.

The bug that prompted this refactor was placeholder text
("custom mood, custom mood...") being passed to generation
instead of the actual refined description.
"""

import pytest
from backend.services.coach.intent_extractor import (
    CreativeIntent,
    IntentExtractor,
    get_intent_extractor,
)
from backend.services.coach.models import CoachSession


class TestCreativeIntent:
    """Tests for CreativeIntent dataclass."""
    
    def test_to_generation_input_basic(self):
        """Test basic generation input conversion."""
        intent = CreativeIntent(
            description="A vibrant Fortnite thumbnail",
            confidence_score=0.9,
        )
        assert intent.to_generation_input() == "A vibrant Fortnite thumbnail"
    
    def test_to_generation_input_with_components(self):
        """Test generation input with all components (except mood which is excluded)."""
        intent = CreativeIntent(
            description="gaming thumbnail",
            subject="streamer character",
            action="celebrating victory",
            emotion="hype",  # This should NOT appear in output - mood is style, not content
            elements=["sparkles", "neon glow"],
            confidence_score=0.9,
        )
        result = intent.to_generation_input()
        assert "streamer character" in result
        assert "celebrating victory" in result
        # Mood should NOT be in output - it was being rendered as "HYPE MOOD" text
        assert "hype mood" not in result.lower()
        assert "sparkles" in result
    
    def test_to_generation_input_excludes_custom_mood(self):
        """
        REGRESSION TEST: Ensure 'custom' mood is NOT included in output.
        
        This was the root cause of the 'custom mood, custom mood' bug where
        placeholder text was being passed to image generation.
        """
        intent = CreativeIntent(
            description="A vibrant Fortnite thumbnail with neon effects",
            emotion="custom",  # This should NOT appear in output
            confidence_score=0.9,
        )
        result = intent.to_generation_input()
        assert "custom mood" not in result.lower()
        assert "custom" not in result.lower()
        assert "vibrant Fortnite thumbnail" in result
    
    def test_to_generation_input_excludes_all_moods(self):
        """
        Test that ALL moods are excluded from text output.
        
        Moods should influence style, not be rendered as text on the image.
        Previously "hype mood" was being rendered as visible text "HYPE MOOD".
        """
        intent = CreativeIntent(
            description="A gaming thumbnail",
            emotion="hype",
            confidence_score=0.9,
        )
        result = intent.to_generation_input()
        # Mood should NOT be in the text output - it was being rendered as "HYPE MOOD" text
        assert "hype mood" not in result.lower()
        assert "hype" not in result.lower() or "hype" in "A gaming thumbnail".lower()
        assert "gaming thumbnail" in result.lower()
    
    def test_is_valid_with_good_description(self):
        """Test validation passes for good descriptions."""
        intent = CreativeIntent(
            description="A vibrant Fortnite thumbnail with neon effects",
            confidence_score=0.9,
        )
        assert intent.is_valid() is True
    
    def test_is_valid_rejects_placeholder_text(self):
        """Test validation rejects placeholder text."""
        # This is the exact bug we're preventing
        intent = CreativeIntent(
            description="custom mood, custom mood, custom mood, I want to create a thumbnail. Help me describe exactly what I'm looking for.",
            confidence_score=0.5,
        )
        assert intent.is_valid() is False
    
    def test_is_valid_rejects_help_me_describe(self):
        """Test validation rejects 'help me describe' placeholder."""
        intent = CreativeIntent(
            description="I want to create a thumbnail. Help me describe what I want.",
            confidence_score=0.5,
        )
        assert intent.is_valid() is False
    
    def test_is_valid_rejects_short_description(self):
        """Test validation rejects too-short descriptions."""
        intent = CreativeIntent(
            description="cool",
            confidence_score=0.5,
        )
        assert intent.is_valid() is False
    
    def test_is_valid_rejects_empty_description(self):
        """Test validation rejects empty descriptions."""
        intent = CreativeIntent(
            description="",
            confidence_score=0.5,
        )
        assert intent.is_valid() is False


class TestIntentExtractor:
    """Tests for IntentExtractor class."""
    
    @pytest.fixture
    def extractor(self):
        """Create a fresh extractor for each test."""
        return IntentExtractor()
    
    # =========================================================================
    # Pattern matching tests - these are critical for preventing the bug
    # =========================================================================
    
    def test_extract_ready_pattern(self, extractor):
        """Test extraction of '✨ Ready!' pattern."""
        response = '✨ Ready! A vibrant, high-contrast Fortnite Chapter 7 Season 1 thumbnail featuring a new POI and the text "BEST SEASON EVER." [INTENT_READY]'
        
        intent = extractor.extract_from_response(
            response=response,
            original_description="placeholder text",
            mood="hype",
        )
        
        assert "vibrant" in intent.description.lower()
        assert "Fortnite" in intent.description
        assert "placeholder" not in intent.description.lower()
        assert intent.extraction_method == "ready_marker"
    
    def test_extract_ready_without_emoji(self, extractor):
        """Test extraction of 'Ready!' pattern without emoji."""
        response = 'Ready! A cool gaming emote with fire effects [INTENT_READY]'
        
        intent = extractor.extract_from_response(
            response=response,
            original_description="placeholder",
            mood="intense",
        )
        
        assert "gaming emote" in intent.description.lower()
        assert intent.extraction_method == "ready_marker"
    
    def test_extract_perfect_pattern(self, extractor):
        """Test extraction of '✨ Perfect!' pattern."""
        response = "✨ Perfect! A sleek minimalist banner with your brand colors [INTENT_READY]"
        
        intent = extractor.extract_from_response(
            response=response,
            original_description="placeholder",
            mood="professional",
        )
        
        assert "minimalist banner" in intent.description.lower()
        assert intent.extraction_method == "perfect_marker"
    
    def test_extract_heres_what_pattern(self, extractor):
        """Test extraction of 'Here's what I've got:' pattern."""
        response = "Here's what I've got: a cozy gaming setup with warm lighting and your purple accent colors. Ready to create?"
        
        intent = extractor.extract_from_response(
            response=response,
            original_description="placeholder",
            mood="cozy",
        )
        
        assert "cozy gaming setup" in intent.description.lower()
        assert intent.extraction_method == "heres_what"
    
    def test_extract_going_for_pattern(self, extractor):
        """Test extraction of 'So we're going for' pattern."""
        response = "So we're going for a neon-style cyberpunk emote with glowing eyes. Does that sound right?"
        
        intent = extractor.extract_from_response(
            response=response,
            original_description="placeholder",
            mood="intense",
        )
        
        assert "neon-style" in intent.description.lower()
        assert intent.extraction_method == "going_for"
    
    def test_extract_well_create_pattern(self, extractor):
        """Test extraction of 'we'll create' pattern."""
        response = "Awesome! So we'll create a dynamic action shot with your character mid-jump. [INTENT_READY]"
        
        intent = extractor.extract_from_response(
            response=response,
            original_description="placeholder",
            mood="energetic",
        )
        
        assert "dynamic action shot" in intent.description.lower()
        assert intent.extraction_method == "well_create"
    
    def test_fallback_to_original_when_no_pattern(self, extractor):
        """Test fallback when no pattern matches."""
        response = "What kind of colors are you thinking? Any specific style?"
        
        intent = extractor.extract_from_response(
            response=response,
            original_description="my original description",
            mood="balanced",
        )
        
        assert intent.description == "my original description"
        assert intent.extraction_method == "fallback"
    
    # =========================================================================
    # Ready marker detection tests
    # =========================================================================
    
    def test_check_intent_ready_with_marker(self, extractor):
        """Test ready detection with [INTENT_READY] marker."""
        response = "Here's your prompt [INTENT_READY]"
        assert extractor.check_intent_ready(response) is True
    
    def test_check_intent_ready_with_ready_to_create(self, extractor):
        """Test ready detection with 'Ready to create!' statement (not question)."""
        # Statement with exclamation IS ready
        response = "Ready to create this awesome thumbnail!"
        assert extractor.check_intent_ready(response) is True
    
    def test_check_intent_ready_question_not_ready(self, extractor):
        """Test that 'Ready to create?' question is NOT ready."""
        # Question mark means the coach is asking, not stating readiness
        response = "Ready to create this awesome thumbnail?"
        assert extractor.check_intent_ready(response) is False
    
    def test_check_intent_ready_with_sparkle_ready(self, extractor):
        """Test ready detection with '✨ Ready' text."""
        response = "✨ Ready! Let's make this happen"
        assert extractor.check_intent_ready(response) is True
    
    def test_check_intent_ready_false_for_questions(self, extractor):
        """Test ready detection returns false for questions."""
        response = "What style are you going for?"
        assert extractor.check_intent_ready(response) is False
    
    # =========================================================================
    # Confidence calculation tests
    # =========================================================================
    
    def test_confidence_high_for_ready_marker(self, extractor):
        """Test high confidence when ready marker is present."""
        response = "✨ Ready! A cool thumbnail [INTENT_READY]"
        
        intent = extractor.extract_from_response(
            response=response,
            original_description="placeholder",
            mood="balanced",
        )
        
        assert intent.confidence_score >= 0.85
    
    def test_confidence_lower_for_questions(self, extractor):
        """Test lower confidence when response ends with question."""
        response = "Here's what I've got: a gaming thumbnail. Does that work?"
        
        intent = extractor.extract_from_response(
            response=response,
            original_description="placeholder",
            mood="balanced",
        )
        
        # Should be lower due to question at end
        assert intent.confidence_score < 0.85
    
    def test_confidence_low_for_fallback(self, extractor):
        """Test low confidence for fallback extraction."""
        response = "Tell me more about what you want."
        
        intent = extractor.extract_from_response(
            response=response,
            original_description="placeholder",
            mood="balanced",
        )
        
        assert intent.confidence_score <= 0.50
    
    # =========================================================================
    # Conversation continuation tests
    # =========================================================================
    
    def test_extract_from_conversation(self, extractor):
        """Test extraction from ongoing conversation."""
        session = CoachSession(
            session_id="test-123",
            user_id="user-456",
            current_prompt_draft="a gaming thumbnail",
            mood="hype",
        )
        
        response = "✨ Ready! A gaming thumbnail with neon effects and bold text [INTENT_READY]"
        
        intent = extractor.extract_from_conversation(
            response=response,
            user_message="add neon effects",
            session=session,
        )
        
        assert "neon effects" in intent.description.lower()
        assert intent.confidence_score >= 0.85
    
    def test_extract_from_conversation_builds_from_session(self, extractor):
        """Test building from session when no pattern matches."""
        session = CoachSession(
            session_id="test-123",
            user_id="user-456",
            current_prompt_draft="a cozy gaming setup",
            mood="cozy",
        )
        
        response = "Great! I'll add those warm tones."
        
        intent = extractor.extract_from_conversation(
            response=response,
            user_message="add warm lighting",
            session=session,
        )
        
        # Should build from session + user additions
        assert "cozy gaming setup" in intent.description.lower() or "warm lighting" in intent.description.lower()
    
    # =========================================================================
    # Edge cases
    # =========================================================================
    
    def test_handles_multiline_response(self, extractor):
        """Test handling of multiline responses."""
        response = """Got it! I love the direction.

✨ Ready! A vibrant thumbnail with:
- Bold colors
- Dynamic composition
- Your brand elements

[INTENT_READY]"""
        
        intent = extractor.extract_from_response(
            response=response,
            original_description="placeholder",
            mood="vibrant",
        )
        
        assert "vibrant thumbnail" in intent.description.lower()
    
    def test_cleans_intent_ready_marker(self, extractor):
        """Test that [INTENT_READY] is cleaned from description."""
        response = "✨ Ready! A cool emote [INTENT_READY]"
        
        intent = extractor.extract_from_response(
            response=response,
            original_description="placeholder",
            mood="cool",
        )
        
        assert "[INTENT_READY]" not in intent.description
    
    def test_handles_empty_response(self, extractor):
        """Test handling of empty response."""
        intent = extractor.extract_from_response(
            response="",
            original_description="fallback description",
            mood="balanced",
        )
        
        assert intent.description == "fallback description"
        assert intent.extraction_method == "fallback"


class TestIntentExtractorSingleton:
    """Tests for singleton behavior."""
    
    def test_get_intent_extractor_returns_same_instance(self):
        """Test that get_intent_extractor returns singleton."""
        extractor1 = get_intent_extractor()
        extractor2 = get_intent_extractor()
        assert extractor1 is extractor2


# ============================================================================
# Regression tests for the specific bug
# ============================================================================

class TestPlaceholderBugRegression:
    """
    Regression tests for the placeholder text bug.
    
    The bug: When the coach said "Ready! A vibrant thumbnail...",
    the system was passing "custom mood, custom mood, custom mood,
    I want to create a thumbnail. Help me describe exactly what I'm
    looking for." to the image generation instead.
    
    These tests ensure this specific bug cannot recur.
    """
    
    @pytest.fixture
    def extractor(self):
        return IntentExtractor()
    
    def test_real_world_fortnite_thumbnail_case(self, extractor):
        """Test the exact case from the bug report."""
        # This is the actual response from the coach
        response = '''Got it, we're going full neon-glow and high-saturation for that maximum clickability! I'll frame a stunning new Chapter 7 POI with some explosive action and bold "BEST SEASON EVER" text popping off the screen.

✨ Ready! A vibrant, high-contrast Fortnite Chapter 7 Season 1 thumbnail featuring a new POI and the text "BEST SEASON EVER." [INTENT_READY]'''
        
        # This is the placeholder that was incorrectly being used
        placeholder = "custom mood, custom mood, custom mood, I want to create a thumbnail. Help me describe exactly what I'm looking for."
        
        intent = extractor.extract_from_response(
            response=response,
            original_description=placeholder,
            mood="custom",
        )
        
        # The extracted description should NOT contain the placeholder
        assert "custom mood, custom mood" not in intent.description
        assert "Help me describe" not in intent.description
        
        # It SHOULD contain the actual refined description
        assert "vibrant" in intent.description.lower()
        assert "Fortnite" in intent.description
        assert "thumbnail" in intent.description.lower()
        
        # And it should be marked as ready
        assert intent.confidence_score >= 0.85
        assert intent.is_valid() is True
    
    def test_placeholder_validation_catches_bug(self, extractor):
        """Test that validation would catch if extraction failed."""
        # If extraction somehow failed and returned placeholder
        bad_intent = CreativeIntent(
            description="custom mood, custom mood, custom mood, I want to create a thumbnail. Help me describe exactly what I'm looking for.",
            confidence_score=0.5,
            extraction_method="fallback",
        )
        
        # Validation should catch this
        assert bad_intent.is_valid() is False
    
    def test_multiple_placeholder_patterns_rejected(self, extractor):
        """Test various placeholder patterns are rejected."""
        placeholders = [
            "Help me describe exactly what I'm looking for.",
            "custom mood, custom mood, custom mood",
            "I want to create a thumbnail. Help me figure out the perfect mood",
            "Help me figure out the perfect mood",
        ]
        
        for placeholder in placeholders:
            intent = CreativeIntent(
                description=placeholder,
                confidence_score=0.5,
            )
            assert intent.is_valid() is False, f"Should reject: {placeholder}"
