"""
LLM Client for Prompt Coach.

This client handles text chat completions using Google's Gemini API.
It provides async streaming for real-time response delivery.

Features:
- Async streaming chat completions
- Native Google Search grounding for real-time information
- Configurable model selection
- Error handling with graceful fallbacks
- Token counting for usage tracking

Environment Variables:
- GOOGLE_GEMINI_API_KEY: API key for Gemini (falls back to GOOGLE_API_KEY)
- COACH_LLM_MODEL: Model to use (default: gemini-2.0-flash)
- COACH_ENABLE_GROUNDING: Enable Google Search grounding (default: true)
"""

import asyncio
import os
from dataclasses import dataclass, field
from typing import AsyncGenerator, List, Dict, Optional, Tuple, Any

from google import genai
from google.genai import types


@dataclass
class TokenUsage:
    """Token usage statistics from a Gemini API call."""
    tokens_in: int = 0
    tokens_out: int = 0


@dataclass
class GroundingMetadata:
    """Grounding metadata from a grounded response."""
    search_queries: List[str] = field(default_factory=list)
    sources: List[Dict[str, str]] = field(default_factory=list)
    grounding_supports: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class StreamResult:
    """
    Result from streaming chat completion.
    
    Contains both the full response text and token usage statistics.
    """
    text: str
    usage: TokenUsage
    grounding: Optional[GroundingMetadata] = None


class CoachLLMClient:
    """
    Async LLM client for Prompt Coach text generation.
    
    Uses Google Gemini for streaming chat completions with native
    Google Search grounding for real-time information.
    
    Example:
        client = CoachLLMClient()
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello!"}
        ]
        async for token in client.stream_chat(messages):
            print(token, end="")
    """
    
    DEFAULT_MODEL = "gemini-3-flash-preview"
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        enable_grounding: Optional[bool] = None,
    ):
        """
        Initialize the LLM client.
        
        Args:
            api_key: Google API key (defaults to GOOGLE_GEMINI_API_KEY or GOOGLE_API_KEY env var)
            model: Model to use (defaults to COACH_LLM_MODEL env var or gemini-2.0-flash)
            enable_grounding: Enable Google Search grounding (defaults to COACH_ENABLE_GROUNDING env var or True)
        
        Raises:
            ValueError: If no API key is provided or found in environment
        """
        self.api_key = api_key or os.environ.get("GOOGLE_GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Google API key is required. Set GOOGLE_GEMINI_API_KEY or GOOGLE_API_KEY environment variable."
            )
        
        self.model_name = model or os.environ.get("COACH_LLM_MODEL", self.DEFAULT_MODEL)
        
        # Enable grounding by default for real-time information
        grounding_env = os.environ.get("COACH_ENABLE_GROUNDING", "true").lower()
        self.enable_grounding = enable_grounding if enable_grounding is not None else (grounding_env == "true")
        
        # Initialize the new google.genai client
        self._client = genai.Client(api_key=self.api_key)
    
    def _build_tools(self) -> Optional[List[types.Tool]]:
        """Build tools list including Google Search if grounding is enabled."""
        if not self.enable_grounding:
            return None
        
        # Enable native Google Search grounding for Gemini 2.0+
        # The model will automatically decide when to search based on the query
        return [types.Tool(google_search=types.GoogleSearch())]
    
    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        enable_grounding: Optional[bool] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat completion tokens.
        
        Args:
            messages: List of message dicts with 'role' and 'content' keys.
                     Roles: 'system', 'user', 'assistant'
            enable_grounding: Override grounding setting for this call (optional)
        
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
        
        # Determine if grounding should be enabled for this call
        use_grounding = enable_grounding if enable_grounding is not None else self.enable_grounding
        tools = self._build_tools() if use_grounding else None
        
        # Build generation config with Google Search grounding
        config = types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=2048,
            system_instruction=system_prompt,
            tools=tools,
        )
        
        # Stream the response using async API
        stream = await self._client.aio.models.generate_content_stream(
            model=self.model_name,
            contents=contents,
            config=config,
        )
        async for chunk in stream:
            if chunk.text:
                yield chunk.text
    
    async def stream_chat_with_usage(
        self,
        messages: List[Dict[str, str]],
        enable_grounding: Optional[bool] = None,
    ) -> Tuple[AsyncGenerator[str, None], "UsageAccessor"]:
        """
        Stream chat completion tokens and provide access to usage metadata.
        
        This method returns a tuple of (generator, usage_accessor). The generator
        yields tokens as they arrive. After iteration completes, call
        usage_accessor.get_usage() to retrieve token counts and grounding info.
        
        Args:
            messages: List of message dicts with 'role' and 'content' keys.
                     Roles: 'system', 'user', 'assistant'
            enable_grounding: Override grounding setting for this call (optional)
        
        Returns:
            Tuple of (token generator, usage accessor)
            
        Example:
            generator, usage_accessor = await client.stream_chat_with_usage(messages)
            full_text = ""
            async for token in generator:
                full_text += token
            usage = usage_accessor.get_usage()
            grounding = usage_accessor.get_grounding()
            print(f"Tokens in: {usage.tokens_in}, out: {usage.tokens_out}")
            if grounding:
                print(f"Search queries: {grounding.search_queries}")
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
        
        # Determine if grounding should be enabled for this call
        use_grounding = enable_grounding if enable_grounding is not None else self.enable_grounding
        tools = self._build_tools() if use_grounding else None
        
        # Build generation config with Google Search grounding
        config = types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=2048,
            system_instruction=system_prompt,
            tools=tools,
        )
        
        # Create usage accessor to collect usage data and grounding metadata
        usage_accessor = UsageAccessor()
        
        async def token_generator() -> AsyncGenerator[str, None]:
            """Inner generator that yields tokens and collects usage."""
            stream = await self._client.aio.models.generate_content_stream(
                model=self.model_name,
                contents=contents,
                config=config,
            )
            async for chunk in stream:
                if chunk.text:
                    yield chunk.text
                # Collect usage metadata from the last chunk
                if hasattr(chunk, 'usage_metadata') and chunk.usage_metadata:
                    usage_accessor._update_usage(chunk.usage_metadata)
                # Collect grounding metadata if present
                if hasattr(chunk, 'candidates') and chunk.candidates:
                    for candidate in chunk.candidates:
                        if hasattr(candidate, 'grounding_metadata') and candidate.grounding_metadata:
                            usage_accessor._update_grounding(candidate.grounding_metadata)
            usage_accessor._iteration_complete = True
        
        return token_generator(), usage_accessor


class UsageAccessor:
    """
    Accessor for token usage metadata and grounding info after streaming completes.
    
    The Gemini SDK provides usage_metadata and grounding_metadata in response chunks.
    This class collects and provides access to both after iteration.
    """
    
    def __init__(self):
        """Initialize the usage accessor."""
        self._tokens_in = 0
        self._tokens_out = 0
        self._iteration_complete = False
        self._grounding: Optional[GroundingMetadata] = None
    
    def _update_usage(self, usage_metadata) -> None:
        """Update usage from a chunk's usage_metadata."""
        if usage_metadata:
            self._tokens_in = getattr(usage_metadata, 'prompt_token_count', 0) or 0
            self._tokens_out = getattr(usage_metadata, 'candidates_token_count', 0) or 0
    
    def _update_grounding(self, grounding_metadata) -> None:
        """Update grounding info from a candidate's grounding_metadata."""
        if not grounding_metadata:
            return
        
        # Extract search queries
        search_queries = []
        if hasattr(grounding_metadata, 'web_search_queries'):
            search_queries = list(grounding_metadata.web_search_queries or [])
        
        # Extract sources from grounding chunks
        sources = []
        if hasattr(grounding_metadata, 'grounding_chunks'):
            for chunk in (grounding_metadata.grounding_chunks or []):
                if hasattr(chunk, 'web') and chunk.web:
                    sources.append({
                        'uri': getattr(chunk.web, 'uri', ''),
                        'title': getattr(chunk.web, 'title', ''),
                    })
        
        # Extract grounding supports (which parts of response are grounded)
        grounding_supports = []
        if hasattr(grounding_metadata, 'grounding_supports'):
            for support in (grounding_metadata.grounding_supports or []):
                support_data = {}
                if hasattr(support, 'segment') and support.segment:
                    support_data['segment'] = {
                        'start_index': getattr(support.segment, 'start_index', 0),
                        'end_index': getattr(support.segment, 'end_index', 0),
                        'text': getattr(support.segment, 'text', ''),
                    }
                if hasattr(support, 'grounding_chunk_indices'):
                    support_data['chunk_indices'] = list(support.grounding_chunk_indices or [])
                if support_data:
                    grounding_supports.append(support_data)
        
        self._grounding = GroundingMetadata(
            search_queries=search_queries,
            sources=sources,
            grounding_supports=grounding_supports,
        )
    
    def get_usage(self) -> TokenUsage:
        """
        Get token usage from the response.
        
        Should be called after the streaming generator has been
        fully consumed. Returns zeros if usage is not available.
        
        Returns:
            TokenUsage with tokens_in and tokens_out
        """
        return TokenUsage(tokens_in=self._tokens_in, tokens_out=self._tokens_out)
    
    def get_grounding(self) -> Optional[GroundingMetadata]:
        """
        Get grounding metadata from the response.
        
        Should be called after the streaming generator has been
        fully consumed. Returns None if no grounding was performed.
        
        Returns:
            GroundingMetadata with search queries and sources, or None
        """
        return self._grounding
    
    def was_grounded(self) -> bool:
        """Check if the response was grounded with Google Search."""
        return self._grounding is not None and len(self._grounding.search_queries) > 0


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


__all__ = ["CoachLLMClient", "get_llm_client", "TokenUsage", "StreamResult", "UsageAccessor", "GroundingMetadata"]
