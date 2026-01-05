"""
Core exceptions for the Coach module.

This module defines all custom exceptions used throughout the Coach service.
Each exception includes a `to_dict()` method for consistent API error responses.

Exception Hierarchy:
- CoachError (base)
  - SessionNotFoundError
  - SessionExpiredError
  - SessionLimitExceededError
  - GroundingError
  - IntentExtractionError

All exceptions are designed to be caught and converted to appropriate
HTTP responses with structured error details.
"""

from typing import Dict, Any, Optional


class CoachError(Exception):
    """
    Base exception for all Coach-related errors.
    
    All Coach exceptions inherit from this class, allowing for
    broad exception handling when needed.
    
    Attributes:
        message: Human-readable error message
        error_code: Machine-readable error code for client handling
    """
    
    error_code: str = "coach_error"
    
    def __init__(self, message: str, error_code: Optional[str] = None):
        """
        Initialize the CoachError.
        
        Args:
            message: Human-readable error message
            error_code: Optional override for the error code
        """
        self.message = message
        if error_code:
            self.error_code = error_code
        super().__init__(message)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert exception to dictionary for API responses.
        
        Returns:
            Dict with error details suitable for JSON serialization
        """
        return {
            "error": self.error_code,
            "message": self.message,
        }


class SessionNotFoundError(CoachError):
    """
    Raised when a session is not found.
    
    This can occur when:
    - The session ID is invalid
    - The session has been deleted
    - The session belongs to a different user (security: don't reveal existence)
    
    Attributes:
        session_id: The session ID that was not found
    """
    
    error_code: str = "session_not_found"
    
    def __init__(self, session_id: str):
        """
        Initialize SessionNotFoundError.
        
        Args:
            session_id: The session ID that was not found
        """
        self.session_id = session_id
        super().__init__(
            message=f"Session {session_id} not found or expired",
            error_code=self.error_code,
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert exception to dictionary for API responses.
        
        Returns:
            Dict with error details including session_id
        """
        return {
            "error": self.error_code,
            "message": self.message,
            "session_id": self.session_id,
        }


class SessionExpiredError(CoachError):
    """
    Raised when a session has expired.
    
    Sessions expire after SESSION_TTL_SECONDS (30 minutes) of inactivity.
    Users should start a new session when this occurs.
    
    Attributes:
        session_id: The session ID that expired
    """
    
    error_code: str = "session_expired"
    
    def __init__(self, session_id: str):
        """
        Initialize SessionExpiredError.
        
        Args:
            session_id: The session ID that expired
        """
        self.session_id = session_id
        super().__init__(
            message=f"Session {session_id} has expired. Please start a new session.",
            error_code=self.error_code,
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert exception to dictionary for API responses.
        
        Returns:
            Dict with error details including session_id
        """
        return {
            "error": self.error_code,
            "message": self.message,
            "session_id": self.session_id,
        }


class SessionLimitExceededError(CoachError):
    """
    Raised when session limits are exceeded.
    
    Limits that can be exceeded:
    - turns: Maximum conversation turns (MAX_TURNS)
    - tokens_in: Maximum input tokens (MAX_TOKENS_IN)
    - tokens_out: Maximum output tokens (MAX_TOKENS_OUT)
    
    Attributes:
        limit_type: Type of limit exceeded (turns, tokens_in, tokens_out)
        current: Current value
        maximum: Maximum allowed value
    """
    
    error_code: str = "limit_exceeded"
    
    def __init__(self, limit_type: str, current: int, maximum: int):
        """
        Initialize SessionLimitExceededError.
        
        Args:
            limit_type: Type of limit exceeded
            current: Current value
            maximum: Maximum allowed value
        """
        self.limit_type = limit_type
        self.current = current
        self.maximum = maximum
        super().__init__(
            message=f"{limit_type} limit exceeded: {current}/{maximum}",
            error_code=self.error_code,
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert exception to dictionary for API responses.
        
        Returns:
            Dict with error details including limit information
        """
        return {
            "error": self.error_code,
            "message": self.message,
            "limit_type": self.limit_type,
            "current": self.current,
            "maximum": self.maximum,
        }


class GroundingError(CoachError):
    """
    Raised when grounding (web search) fails.
    
    This can occur when:
    - Web search service is unavailable
    - Search query fails
    - Results cannot be parsed
    - Rate limits are exceeded
    
    Grounding errors are typically non-fatal - the coach can continue
    without grounding context, though responses may be less accurate
    for time-sensitive content.
    
    Attributes:
        query: The search query that failed (if available)
        reason: Detailed reason for the failure
    """
    
    error_code: str = "grounding_error"
    
    def __init__(
        self,
        message: str,
        query: Optional[str] = None,
        reason: Optional[str] = None,
    ):
        """
        Initialize GroundingError.
        
        Args:
            message: Human-readable error message
            query: The search query that failed (optional)
            reason: Detailed reason for the failure (optional)
        """
        self.query = query
        self.reason = reason
        super().__init__(message=message, error_code=self.error_code)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert exception to dictionary for API responses.
        
        Returns:
            Dict with error details including query and reason
        """
        result: Dict[str, Any] = {
            "error": self.error_code,
            "message": self.message,
        }
        if self.query:
            result["query"] = self.query
        if self.reason:
            result["reason"] = self.reason
        return result


class IntentExtractionError(CoachError):
    """
    Raised when intent extraction from LLM response fails.
    
    This can occur when:
    - LLM response is malformed
    - Required fields are missing from the response
    - JSON parsing fails
    - Response doesn't match expected schema
    
    Intent extraction errors may indicate issues with the LLM
    or prompt configuration.
    
    Attributes:
        raw_response: The raw LLM response that failed to parse (if available)
        field: The specific field that failed extraction (if applicable)
    """
    
    error_code: str = "intent_extraction_error"
    
    def __init__(
        self,
        message: str,
        raw_response: Optional[str] = None,
        field: Optional[str] = None,
    ):
        """
        Initialize IntentExtractionError.
        
        Args:
            message: Human-readable error message
            raw_response: The raw LLM response that failed (optional)
            field: The specific field that failed extraction (optional)
        """
        self.raw_response = raw_response
        self.field = field
        super().__init__(message=message, error_code=self.error_code)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert exception to dictionary for API responses.
        
        Returns:
            Dict with error details including field information
        """
        result: Dict[str, Any] = {
            "error": self.error_code,
            "message": self.message,
        }
        if self.field:
            result["field"] = self.field
        # Note: raw_response is intentionally not included in API response
        # to avoid leaking internal LLM details
        return result


__all__ = [
    "CoachError",
    "SessionNotFoundError",
    "SessionExpiredError",
    "SessionLimitExceededError",
    "GroundingError",
    "IntentExtractionError",
]
