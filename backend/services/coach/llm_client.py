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
- COACH_LLM_MODEL: Model to use (default: gemini-1.5-flash)
"""

import os
from typing import AsyncGenerator, List, Dict, Any, Optional

import google.generativeai as genai


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
    
    DEFAULT_MODEL = "gemini-3-flash-preview"
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        """
        Initialize the LLM client.
        
        Args:
            api_key: Google API key (defaults to GOOGLE_GEMINI_API_KEY or GOOGLE_API_KEY env var)
            model: Model to use (defaults to COACH_LLM_MODEL env var or gemini-1.5-flash)
        
        Raises:
            ValueError: If no API key is provided or found in environment
        """
        self.api_key = api_key or os.environ.get("GOOGLE_GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Google API key is required. Set GOOGLE_GEMINI_API_KEY or GOOGLE_API_KEY environment variable."
            )
        
        self.model_name = model or os.environ.get("COACH_LLM_MODEL", self.DEFAULT_MODEL)
        
        # Configure the Google Generative AI SDK
        genai.configure(api_key=self.api_key)
        
        # Initialize the model
        self._model = genai.GenerativeModel(self.model_name)
    
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
        # Gemini uses 'user' and 'model' roles, and system prompt is separate
        system_prompt = None
        chat_history = []
        
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            
            if role == "system":
                system_prompt = content
            elif role == "assistant":
                chat_history.append({"role": "model", "parts": [content]})
            else:  # user
                chat_history.append({"role": "user", "parts": [content]})
        
        # Create chat with system instruction if provided
        generation_config = genai.GenerationConfig(
            temperature=0.7,
            max_output_tokens=2048,
        )
        
        if system_prompt:
            model = genai.GenerativeModel(
                self.model_name,
                system_instruction=system_prompt,
                generation_config=generation_config,
            )
        else:
            model = genai.GenerativeModel(
                self.model_name,
                generation_config=generation_config,
            )
        
        # Start chat with history (excluding the last user message)
        chat = model.start_chat(history=chat_history[:-1] if len(chat_history) > 1 else [])
        
        # Get the last user message
        last_message = chat_history[-1]["parts"][0] if chat_history else ""
        
        # Stream the response
        response = chat.send_message(last_message, stream=True)
        
        for chunk in response:
            if chunk.text:
                yield chunk.text


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


__all__ = ["CoachLLMClient", "get_llm_client"]
