"""
Streaming utilities for the Coach LLM integration.

This module provides data structures and utilities for handling
streaming responses from the LLM.
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class StreamChunk:
    """
    Single chunk in a streaming response.
    
    Used to communicate streaming events from the coach service
    to the API layer and ultimately to the client via SSE.
    
    Attributes:
        type: The type of chunk. One of:
            - "token": A text token from the LLM response
            - "intent_ready": Indicates the coach has gathered enough info
            - "grounding": Web search is being performed
            - "grounding_complete": Web search has completed
            - "done": The streaming response is complete
            - "error": An error occurred
        content: The text content (for token chunks) or error message
        metadata: Additional metadata for the chunk, varies by type:
            - For "intent_ready": {"is_ready": bool, "confidence": float, "refined_description": str}
            - For "grounding": {"searching": str, "query": str}
            - For "grounding_complete": {"game": str, "search_performed": bool}
            - For "done": {"session_id": str, "turns_used": int, "turns_remaining": int, "tokens_in": int, "tokens_out": int}
            - For "error": None (error message is in content)
    """
    type: str  # "token", "intent_ready", "grounding", "grounding_complete", "done", "error"
    content: str = ""
    metadata: Optional[Dict[str, Any]] = None


__all__ = [
    "StreamChunk",
]
