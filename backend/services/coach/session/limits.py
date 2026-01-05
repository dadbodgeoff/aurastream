"""
Session Limits for Prompt Coach.

Provides limit checking logic for coach sessions including:
- Turn limits
- Token limits (input and output)
- Session continuation checks

This module extracts limit checking into a dedicated class for
better separation of concerns and testability.
"""

from typing import Dict, Any

from backend.services.coach.core.types import (
    MAX_TURNS,
    MAX_TOKENS_IN,
    MAX_TOKENS_OUT,
)
from backend.services.coach.core.exceptions import SessionLimitExceededError


class SessionLimits:
    """
    Handles session limit checking and enforcement.
    
    Provides methods to check various session limits and determine
    if a session can continue processing messages.
    """
    
    def __init__(
        self,
        max_turns: int = MAX_TURNS,
        max_tokens_in: int = MAX_TOKENS_IN,
        max_tokens_out: int = MAX_TOKENS_OUT,
    ):
        """
        Initialize session limits.
        
        Args:
            max_turns: Maximum number of conversation turns
            max_tokens_in: Maximum input tokens allowed
            max_tokens_out: Maximum output tokens allowed
        """
        self.max_turns = max_turns
        self.max_tokens_in = max_tokens_in
        self.max_tokens_out = max_tokens_out
    
    def check_turn_limit(
        self,
        turns_used: int,
        raise_on_exceeded: bool = False,
    ) -> Dict[str, Any]:
        """
        Check if turn limit has been exceeded.
        
        Args:
            turns_used: Number of turns used in the session
            raise_on_exceeded: If True, raise exception when exceeded
            
        Returns:
            Dict with turn limit status
            
        Raises:
            SessionLimitExceededError: If raise_on_exceeded and limit exceeded
        """
        exceeded = turns_used >= self.max_turns
        remaining = max(0, self.max_turns - turns_used)
        
        if exceeded and raise_on_exceeded:
            raise SessionLimitExceededError(
                limit_type="turns",
                current=turns_used,
                maximum=self.max_turns,
            )
        
        return {
            "exceeded": exceeded,
            "current": turns_used,
            "maximum": self.max_turns,
            "remaining": remaining,
        }
    
    def check_token_limit(
        self,
        tokens_in: int,
        tokens_out: int,
        raise_on_exceeded: bool = False,
    ) -> Dict[str, Any]:
        """
        Check if token limits have been exceeded.
        
        Args:
            tokens_in: Total input tokens used
            tokens_out: Total output tokens used
            raise_on_exceeded: If True, raise exception when exceeded
            
        Returns:
            Dict with token limit status
            
        Raises:
            SessionLimitExceededError: If raise_on_exceeded and limit exceeded
        """
        tokens_in_exceeded = tokens_in >= self.max_tokens_in
        tokens_out_exceeded = tokens_out >= self.max_tokens_out
        
        if tokens_in_exceeded and raise_on_exceeded:
            raise SessionLimitExceededError(
                limit_type="tokens_in",
                current=tokens_in,
                maximum=self.max_tokens_in,
            )
        
        if tokens_out_exceeded and raise_on_exceeded:
            raise SessionLimitExceededError(
                limit_type="tokens_out",
                current=tokens_out,
                maximum=self.max_tokens_out,
            )
        
        return {
            "tokens_in": {
                "exceeded": tokens_in_exceeded,
                "current": tokens_in,
                "maximum": self.max_tokens_in,
                "remaining": max(0, self.max_tokens_in - tokens_in),
            },
            "tokens_out": {
                "exceeded": tokens_out_exceeded,
                "current": tokens_out,
                "maximum": self.max_tokens_out,
                "remaining": max(0, self.max_tokens_out - tokens_out),
            },
        }
    
    def can_continue(
        self,
        turns_used: int,
        tokens_in: int,
        tokens_out: int,
        session_status: str = "active",
    ) -> bool:
        """
        Check if a session can continue processing messages.
        
        Args:
            turns_used: Number of turns used in the session
            tokens_in: Total input tokens used
            tokens_out: Total output tokens used
            session_status: Current session status
            
        Returns:
            True if session can continue, False otherwise
        """
        if session_status != "active":
            return False
        
        if turns_used >= self.max_turns:
            return False
        
        if tokens_in >= self.max_tokens_in:
            return False
        
        if tokens_out >= self.max_tokens_out:
            return False
        
        return True
    
    def get_all_limits(
        self,
        turns_used: int,
        tokens_in: int,
        tokens_out: int,
        session_status: str = "active",
    ) -> Dict[str, Any]:
        """
        Get comprehensive limit status for a session.
        
        Args:
            turns_used: Number of turns used in the session
            tokens_in: Total input tokens used
            tokens_out: Total output tokens used
            session_status: Current session status
            
        Returns:
            Dict with all limit statuses and can_continue flag
        """
        turn_status = self.check_turn_limit(turns_used)
        token_status = self.check_token_limit(tokens_in, tokens_out)
        
        return {
            "turns": turn_status,
            "tokens_in": token_status["tokens_in"],
            "tokens_out": token_status["tokens_out"],
            "turns_exceeded": turn_status["exceeded"],
            "tokens_in_exceeded": token_status["tokens_in"]["exceeded"],
            "tokens_out_exceeded": token_status["tokens_out"]["exceeded"],
            "turns_remaining": turn_status["remaining"],
            "can_continue": self.can_continue(
                turns_used, tokens_in, tokens_out, session_status
            ),
        }


# Default instance with standard limits
_default_limits: SessionLimits = None


def get_session_limits() -> SessionLimits:
    """Get or create the default session limits instance."""
    global _default_limits
    if _default_limits is None:
        _default_limits = SessionLimits()
    return _default_limits


__all__ = [
    "SessionLimits",
    "get_session_limits",
]
