"""
Unit tests for Partial Validator for Coach Streaming.

Tests Pydantic 2.10's experimental partial validation for streaming
JSON chunks from LLM responses.
"""

import pytest
from backend.services.coach.partial_validator import (
    StreamingCoachResponse,
    StreamingValidator,
    get_streaming_validator,
)


class TestStreamingCoachResponse:
    """Tests for the StreamingCoachResponse model."""
    
    def test_default_values(self):
        """Test that all fields have sensible defaults."""
        response = StreamingCoachResponse()
        
        assert response.content == ""
        assert response.intent_ready is False
        assert response.confidence == 0.0
        assert response.subject is None
        assert response.action is None
        assert response.emotion is None
    
    def test_full_response(self):
        """Test creating a fully populated response."""
        response = StreamingCoachResponse(
            content="A vibrant victory emote",
            intent_ready=True,
            confidence=0.95,
            subject="character",
            action="celebrating",
            emotion="excited",
        )
        
        assert response.content == "A vibrant victory emote"
        assert response.intent_ready is True
        assert response.confidence == 0.95
        assert response.subject == "character"
        assert response.action == "celebrating"
        assert response.emotion == "excited"
    
    def test_partial_response(self):
        """Test creating a partially populated response."""
        response = StreamingCoachResponse(
            content="Starting to generate",
            confidence=0.5,
        )
        
        assert response.content == "Starting to generate"
        assert response.intent_ready is False  # default
        assert response.confidence == 0.5
        assert response.subject is None  # default
    
    def test_confidence_bounds(self):
        """Test that confidence is bounded between 0 and 1."""
        # Valid bounds
        response_low = StreamingCoachResponse(confidence=0.0)
        response_high = StreamingCoachResponse(confidence=1.0)
        
        assert response_low.confidence == 0.0
        assert response_high.confidence == 1.0
        
        # Invalid bounds should raise validation error
        with pytest.raises(ValueError):
            StreamingCoachResponse(confidence=-0.1)
        
        with pytest.raises(ValueError):
            StreamingCoachResponse(confidence=1.1)


class TestStreamingValidator:
    """Tests for the StreamingValidator class."""
    
    def test_validate_complete_json(self):
        """Test validating complete JSON."""
        validator = StreamingValidator()
        
        json_str = '{"content": "Hello world", "intent_ready": true, "confidence": 0.9}'
        result = validator.validate_partial(json_str)
        
        assert result is not None
        assert result.content == "Hello world"
        assert result.intent_ready is True
        assert result.confidence == 0.9
    
    def test_validate_partial_json_missing_closing_brace(self):
        """Test validating JSON missing closing brace."""
        validator = StreamingValidator()
        
        # Partial JSON without closing brace
        json_str = '{"content": "Hello", "intent_ready": false'
        result = validator.validate_partial(json_str)
        
        assert result is not None
        assert result.content == "Hello"
        assert result.intent_ready is False
    
    def test_validate_partial_json_truncated_string(self):
        """Test validating JSON with truncated string value."""
        validator = StreamingValidator()
        
        # JSON with truncated string
        json_str = '{"content": "Hello wor'
        result = validator.validate_partial(json_str)
        
        # Should return partial content or None depending on Pydantic behavior
        # The key is it shouldn't raise an exception
        assert result is None or isinstance(result, StreamingCoachResponse)
    
    def test_validate_partial_json_incomplete_key(self):
        """Test validating JSON with incomplete key."""
        validator = StreamingValidator()
        
        # First validate something valid
        validator.validate_partial('{"content": "test"}')
        
        # Then try incomplete JSON with partial key
        # Pydantic's partial validation may return a default model
        # or the last valid result depending on how it parses
        json_str = '{"con'
        result = validator.validate_partial(json_str)
        
        # Should return either:
        # - None if completely unparseable
        # - Last valid result if cached
        # - Default model if Pydantic parses it as empty object
        assert result is None or isinstance(result, StreamingCoachResponse)
    
    def test_validate_empty_string(self):
        """Test validating empty string returns last valid."""
        validator = StreamingValidator()
        
        # First validate something
        validator.validate_partial('{"content": "previous"}')
        
        # Empty string should return last valid
        result = validator.validate_partial("")
        
        assert result is not None
        assert result.content == "previous"
    
    def test_validate_whitespace_only(self):
        """Test validating whitespace-only string."""
        validator = StreamingValidator()
        
        validator.validate_partial('{"content": "test"}')
        result = validator.validate_partial("   \n\t  ")
        
        assert result is not None
        assert result.content == "test"
    
    def test_validate_invalid_json(self):
        """Test that invalid JSON returns last valid result."""
        validator = StreamingValidator()
        
        # First validate something valid
        validator.validate_partial('{"content": "valid"}')
        
        # Invalid JSON should return last valid
        result = validator.validate_partial("not json at all")
        
        assert result is not None
        assert result.content == "valid"
    
    def test_validate_partial_dict(self):
        """Test validating partial data from dictionary."""
        validator = StreamingValidator()
        
        data = {"content": "From dict", "confidence": 0.75}
        result = validator.validate_partial_dict(data)
        
        assert result is not None
        assert result.content == "From dict"
        assert result.confidence == 0.75
        assert result.intent_ready is False  # default
    
    def test_validate_partial_dict_empty(self):
        """Test validating empty dictionary."""
        validator = StreamingValidator()
        
        validator.validate_partial('{"content": "previous"}')
        result = validator.validate_partial_dict({})
        
        assert result is not None
        assert result.content == "previous"
    
    def test_reset(self):
        """Test resetting validator state."""
        validator = StreamingValidator()
        
        validator.validate_partial('{"content": "cached"}')
        assert validator.get_last_valid() is not None
        
        validator.reset()
        assert validator.get_last_valid() is None
    
    def test_get_last_valid(self):
        """Test getting last valid result."""
        validator = StreamingValidator()
        
        # Initially None
        assert validator.get_last_valid() is None
        
        # After validation
        validator.validate_partial('{"content": "test"}')
        last = validator.get_last_valid()
        
        assert last is not None
        assert last.content == "test"
    
    def test_streaming_simulation(self):
        """Test simulating a streaming scenario with multiple chunks."""
        validator = StreamingValidator()
        
        # Simulate chunks arriving over time
        chunks = [
            '{"content": "H',
            '{"content": "Hello',
            '{"content": "Hello world", "intent_ready": false',
            '{"content": "Hello world", "intent_ready": true, "confidence": 0.8',
            '{"content": "Hello world", "intent_ready": true, "confidence": 0.85, "subject": "greeting"}',
        ]
        
        results = []
        for chunk in chunks:
            result = validator.validate_partial(chunk)
            if result:
                results.append(result)
        
        # Should have accumulated valid results
        assert len(results) > 0
        
        # Final result should have all fields
        final = results[-1]
        assert final.content == "Hello world"
        assert final.intent_ready is True
        assert final.confidence == 0.85
        assert final.subject == "greeting"
    
    def test_progressive_field_population(self):
        """Test that fields are progressively populated as JSON grows."""
        validator = StreamingValidator()
        
        # Start with just content
        result1 = validator.validate_partial('{"content": "test"}')
        assert result1 is not None
        assert result1.content == "test"
        assert result1.subject is None
        
        # Add more fields
        result2 = validator.validate_partial(
            '{"content": "test", "subject": "character"}'
        )
        assert result2 is not None
        assert result2.content == "test"
        assert result2.subject == "character"
        
        # Add even more
        result3 = validator.validate_partial(
            '{"content": "test", "subject": "character", "action": "waving", "emotion": "happy"}'
        )
        assert result3 is not None
        assert result3.subject == "character"
        assert result3.action == "waving"
        assert result3.emotion == "happy"


class TestGetStreamingValidator:
    """Tests for the singleton getter function."""
    
    def test_returns_validator(self):
        """Test that get_streaming_validator returns a StreamingValidator."""
        validator = get_streaming_validator()
        assert isinstance(validator, StreamingValidator)
    
    def test_returns_same_instance(self):
        """Test that get_streaming_validator returns the same instance."""
        validator1 = get_streaming_validator()
        validator2 = get_streaming_validator()
        assert validator1 is validator2


class TestEdgeCases:
    """Tests for edge cases and error handling."""
    
    def test_nested_json_objects(self):
        """Test handling of nested JSON (not expected but shouldn't crash)."""
        validator = StreamingValidator()
        
        # Nested object in content field (as string)
        json_str = '{"content": "{\\"nested\\": true}"}'
        result = validator.validate_partial(json_str)
        
        assert result is not None
        assert "nested" in result.content
    
    def test_unicode_content(self):
        """Test handling of unicode content."""
        validator = StreamingValidator()
        
        json_str = '{"content": "Hello 世界 🎮", "emotion": "excited"}'
        result = validator.validate_partial(json_str)
        
        assert result is not None
        assert "世界" in result.content
        assert "🎮" in result.content
    
    def test_special_characters_in_content(self):
        """Test handling of special characters."""
        validator = StreamingValidator()
        
        json_str = '{"content": "Line1\\nLine2\\tTabbed"}'
        result = validator.validate_partial(json_str)
        
        assert result is not None
        assert "\n" in result.content
        assert "\t" in result.content
    
    def test_very_long_content(self):
        """Test handling of very long content."""
        validator = StreamingValidator()
        
        long_content = "A" * 10000
        json_str = f'{{"content": "{long_content}"}}'
        result = validator.validate_partial(json_str)
        
        assert result is not None
        assert len(result.content) == 10000
    
    def test_null_values(self):
        """Test handling of explicit null values."""
        validator = StreamingValidator()
        
        json_str = '{"content": "test", "subject": null, "action": null}'
        result = validator.validate_partial(json_str)
        
        assert result is not None
        assert result.content == "test"
        assert result.subject is None
        assert result.action is None
    
    def test_boolean_edge_cases(self):
        """Test boolean field handling."""
        validator = StreamingValidator()
        
        # Explicit false
        result1 = validator.validate_partial('{"intent_ready": false}')
        assert result1 is not None
        assert result1.intent_ready is False
        
        # Explicit true
        result2 = validator.validate_partial('{"intent_ready": true}')
        assert result2 is not None
        assert result2.intent_ready is True
    
    def test_float_precision(self):
        """Test float field precision."""
        validator = StreamingValidator()
        
        json_str = '{"confidence": 0.123456789}'
        result = validator.validate_partial(json_str)
        
        assert result is not None
        assert abs(result.confidence - 0.123456789) < 0.0001
    
    def test_recovery_after_bad_chunk(self):
        """Test that validator recovers after receiving bad data."""
        validator = StreamingValidator()
        
        # Good chunk
        result1 = validator.validate_partial('{"content": "good"}')
        assert result1 is not None
        assert result1.content == "good"
        
        # Bad chunk
        result2 = validator.validate_partial("garbage data")
        assert result2 is not None
        assert result2.content == "good"  # Returns last valid
        
        # Good chunk again
        result3 = validator.validate_partial('{"content": "recovered"}')
        assert result3 is not None
        assert result3.content == "recovered"
