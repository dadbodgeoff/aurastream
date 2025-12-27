"""
Partial Validator for Coach Streaming.

Uses Pydantic 2.10's experimental partial validation to validate
streaming JSON chunks as they arrive from LLM responses.

This enables real-time validation of incomplete JSON during SSE streaming,
allowing the coach service to provide validated partial data to clients
as it becomes available.
"""

from typing import Optional, Any, Dict
from pydantic import BaseModel, Field, TypeAdapter


class StreamingCoachResponse(BaseModel):
    """
    Schema for streaming coach response validation.
    
    This model represents the structured output from the LLM during
    a coach session. All fields have defaults to support partial
    validation of incomplete JSON chunks.
    
    Fields:
        content: The accumulated text content from the LLM
        intent_ready: Whether the creative intent has been fully parsed
        confidence: Confidence score for the extracted intent (0.0-1.0)
        subject: Extracted subject from the user's description
        action: Extracted action or pose
        emotion: Extracted emotion or mood
    """
    content: str = Field(
        default="",
        description="The accumulated text content from the LLM"
    )
    intent_ready: bool = Field(
        default=False,
        description="Whether the creative intent has been fully parsed"
    )
    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Confidence score for the extracted intent"
    )
    subject: Optional[str] = Field(
        default=None,
        description="Extracted subject from the user's description"
    )
    action: Optional[str] = Field(
        default=None,
        description="Extracted action or pose"
    )
    emotion: Optional[str] = Field(
        default=None,
        description="Extracted emotion or mood"
    )


class StreamingValidator:
    """
    Validator for streaming JSON chunks using Pydantic 2.10's partial validation.
    
    This class wraps Pydantic's TypeAdapter with experimental_allow_partial=True
    to enable validation of incomplete JSON data during LLM streaming.
    
    Usage:
        validator = StreamingValidator()
        
        # As chunks arrive from the LLM stream
        partial_json = '{"content": "Here is a", "intent_ready": false'
        result = validator.validate_partial(partial_json)
        
        if result:
            print(f"Content so far: {result.content}")
    
    Attributes:
        adapter: TypeAdapter configured for partial validation
        _last_valid: Cache of the last successfully validated response
    """
    
    def __init__(self) -> None:
        """Initialize the streaming validator with a TypeAdapter."""
        self.adapter: TypeAdapter[StreamingCoachResponse] = TypeAdapter(
            StreamingCoachResponse
        )
        self._last_valid: Optional[StreamingCoachResponse] = None
    
    def validate_partial(
        self,
        json_str: str
    ) -> Optional[StreamingCoachResponse]:
        """
        Validate partial JSON, returning what's valid so far.
        
        Uses Pydantic 2.10's experimental_allow_partial flag to parse
        incomplete JSON and return a validated model with whatever
        fields were successfully parsed.
        
        Args:
            json_str: Potentially incomplete JSON string from LLM stream
            
        Returns:
            StreamingCoachResponse with validated partial data, or None
            if the JSON is too malformed to parse at all.
            
        Note:
            Missing fields will use their default values from the model.
            This method caches the last valid result for recovery.
        """
        if not json_str or not json_str.strip():
            return self._last_valid
        
        try:
            result = self.adapter.validate_json(
                json_str,
                experimental_allow_partial=True,
            )
            self._last_valid = result
            return result
        except Exception:
            # Return last valid result if current chunk is unparseable
            return self._last_valid
    
    def validate_partial_dict(
        self,
        data: Dict[str, Any]
    ) -> Optional[StreamingCoachResponse]:
        """
        Validate partial data from a dictionary.
        
        Useful when the JSON has already been parsed but may be incomplete.
        
        Args:
            data: Dictionary with potentially incomplete data
            
        Returns:
            StreamingCoachResponse with validated partial data, or None
            if validation fails completely.
        """
        if not data:
            return self._last_valid
        
        try:
            result = self.adapter.validate_python(
                data,
                experimental_allow_partial=True,
            )
            self._last_valid = result
            return result
        except Exception:
            return self._last_valid
    
    def reset(self) -> None:
        """
        Reset the validator state.
        
        Clears the cached last valid result. Call this when starting
        a new streaming session.
        """
        self._last_valid = None
    
    def get_last_valid(self) -> Optional[StreamingCoachResponse]:
        """
        Get the last successfully validated response.
        
        Returns:
            The most recent valid StreamingCoachResponse, or None
            if no valid response has been parsed yet.
        """
        return self._last_valid


# Singleton instance for convenience
_validator: Optional[StreamingValidator] = None


def get_streaming_validator() -> StreamingValidator:
    """
    Get or create the streaming validator singleton.
    
    Returns:
        StreamingValidator instance
    """
    global _validator
    if _validator is None:
        _validator = StreamingValidator()
    return _validator


__all__ = [
    "StreamingCoachResponse",
    "StreamingValidator",
    "get_streaming_validator",
]
