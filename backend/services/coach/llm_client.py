"""
LLM Client for Prompt Coach.

This client handles text chat completions using Google's Gemini API.
It provides async streaming for real-time response delivery.

Features:
- Async streaming chat completions
- Configurable model selection
- Error handling with graceful fallbacks
- Token counting for usage tracking

Environment Variables:
- GOOGLE_GEMINI_API_KEY: API key for Gemini (falls back to GOOGLE_API_KEY)
- COACH_LLM_MODEL: Model to use (default: gemini-2.0-flash)
"""

import asyncio
import os
from dataclasses import dataclass
from typing import AsyncGenerator, List, Dict, Optional, Tuple

from google import genai
from google.genai import types


@dataclass
class TokenUsage:
    """Token usage statistics from a Gemini API call."""
    tokens_in: int = 0
    tokens_out: int = 0


@dataclass
class StreamResult:
    """
    Result from streaming chat completion.
    
    Contains both the full response text and token usage statistics.
    """
    text: str
    usage: TokenUsage


class CoachLLMClient:
    """
    Async LLM client for Prompt Coach text generation.
    
    Uses Google Gemini for streaming chat completions.
    
    Example:
        client = CoachLLMClient()
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello!"}
        ]
        async for token in client.stream_chat(messages):
            print(token, end="")
    """
    
    DEFAULT_MODEL = "gemini-2.0-flash"
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        """
        Initialize the LLM client.
        
        Args:
            api_key: Google API key (defaults to GOOGLE_GEMINI_API_KEY or GOOGLE_API_KEY env var)
            model: Model to use (defaults to COACH_LLM_MODEL env var or gemini-2.0-flash)
        
        Raises:
            ValueError: If no API key is provided or found in environment
        """
        self.api_key = api_key or os.environ.get("GOOGLE_GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Google API key is required. Set GOOGLE_GEMINI_API_KEY or GOOGLE_API_KEY environment variable."
            )
        
        self.model_name = model or os.environ.get("COACH_LLM_MODEL", self.DEFAULT_MODEL)
        
        # Initialize the new google.genai client
        self._client = genai.Client(api_key=self.api_key)
    
    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat completion tokens.
        
        Args:
            messages: List of message dicts with 'role' and 'content' keys.
                     Roles: 'system', 'user', 'assistant'
        
        Yields:
            str: Individual tokens from the response
            
        Raises:
            Exception: If the API call fails
        """
        # Convert messages to Gemini format
        system_prompt = None
        contents = []
        
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            if role == "system":
                system_prompt = content
            elif role == "assistant":
                contents.append(types.Content(role="model", parts=[types.Part(text=content)]))
            else:  # user
                contents.append(types.Content(role="user", parts=[types.Part(text=content)]))
        
        # Build generation config
        config = types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=2048,
            system_instruction=system_prompt,
        )
        
        # Stream the response using async API
        async for chunk in self._client.aio.models.generate_content_stream(
            model=self.model_name,
            contents=contents,
            config=config,
        ):
            if chunk.text:
                yield chunk.text
    
    async def stream_chat_with_usage(
        self,
        messages: List[Dict[str, str]],
    ) -> Tuple[AsyncGenerator[str, None], "UsageAccessor"]:
        """
        Stream chat completion tokens and provide access to usage metadata.
        
        This method returns a tuple of (generator, usage_accessor). The generator
        yields tokens as they arrive. After iteration completes, call
        usage_accessor.get_usage() to retrieve token counts.
        
        Args:
            messages: List of message dicts with 'role' and 'content' keys.
                     Roles: 'system', 'user', 'assistant'
        
        Returns:
            Tuple of (token generator, usage accessor)
            
        Example:
            generator, usage_accessor = await client.stream_chat_with_usage(messages)
            full_text = ""
            async for token in generator:
                full_text += token
            usage = usage_accessor.get_usage()
            print(f"Tokens in: {usage.tokens_in}, out: {usage.tokens_out}")
        """
        # Convert messages to Gemini format
        system_prompt = None
        contents = []
        
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            if role == "system":
                system_prompt = content
            elif role == "assistant":
                contents.append(types.Content(role="model", parts=[types.Part(text=content)]))
            else:  # user
                contents.append(types.Content(role="user", parts=[types.Part(text=content)]))
        
        # Build generation config
        config = types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=2048,
            system_instruction=system_prompt,
        )
        
        # Create usage accessor to collect usage data
        usage_accessor = UsageAccessor()
        
        async def token_generator() -> AsyncGenerator[str, None]:
            """Inner generator that yields tokens and collects usage."""
            async for chunk in self._client.aio.models.generate_content_stream(
                model=self.model_name,
                contents=contents,
                config=config,
            ):
                if chunk.text:
                    yield chunk.text
                # Collect usage metadata from the last chunk
                if hasattr(chunk, 'usage_metadata') and chunk.usage_metadata:
                    usage_accessor._update_usage(chunk.usage_metadata)
            usage_accessor._iteration_complete = True
        
        return token_generator(), usage_accessor


class UsageAccessor:
    """
    Accessor for token usage metadata after streaming completes.
    
    The Gemini SDK provides usage_metadata in response chunks.
    This class collects and provides access to usage after iteration.
    """
    
    def __init__(self):
        """Initialize the usage accessor."""
        self._tokens_in = 0
        self._tokens_out = 0
        self._iteration_complete = False
    
    def _update_usage(self, usage_metadata) -> None:
        """Update usage from a chunk's usage_metadata."""
        if usage_metadata:
            self._tokens_in = getattr(usage_metadata, 'prompt_token_count', 0) or 0
            self._tokens_out = getattr(usage_metadata, 'candidates_token_count', 0) or 0
    
    def get_usage(self) -> TokenUsage:
        """
        Get token usage from the response.
        
        Should be called after the streaming generator has been
        fully consumed. Returns zeros if usage is not available.
        
        Returns:
            TokenUsage with tokens_in and tokens_out
        """
        return TokenUsage(tokens_in=self._tokens_in, tokens_out=self._tokens_out)


# Singleton instance
_llm_client: Optional[CoachLLMClient] = None


def get_llm_client() -> Optional[CoachLLMClient]:
    """
    Get or create the LLM client singleton.
    
    Returns None if API key is not configured, allowing graceful fallback.
    """
    global _llm_client
    
    if _llm_client is not None:
        return _llm_client
    
    try:
        _llm_client = CoachLLMClient()
        return _llm_client
    except ValueError:
        # API key not configured - return None for mock mode
        return None


__all__ = ["CoachLLMClient", "get_llm_client", "TokenUsage", "StreamResult", "UsageAccessor"]
