"""
LLM integration layer for Gemini API and prompt construction.

This module provides:
- CoachLLMClient: Async streaming chat with Gemini
- PromptBuilder: System prompt and message construction
- StreamChunk: Streaming response data structure
"""

from backend.services.coach.llm.client import (
    CoachLLMClient,
    get_llm_client,
    TokenUsage,
    GroundingMetadata,
    UsageAccessor,
)
from backend.services.coach.llm.prompts import (
    PromptContext,
    PromptBuilder,
    get_prompt_builder,
)
from backend.services.coach.llm.streaming import StreamChunk

__all__ = [
    # Client
    "CoachLLMClient",
    "get_llm_client",
    "TokenUsage",
    "GroundingMetadata",
    "UsageAccessor",
    # Prompts
    "PromptContext",
    "PromptBuilder",
    "get_prompt_builder",
    # Streaming
    "StreamChunk",
]
