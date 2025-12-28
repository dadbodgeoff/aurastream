"""
Nano Banana (Gemini) AI Client for Aurastream.

This client handles image generation using Google's Gemini API.
It provides async HTTP operations with retry logic and proper error handling.

Features:
- Async image generation using Google Gemini REST API
- Exponential backoff retry logic (1s, 2s, 4s delays)
- Rate limit handling with Retry-After header support
- Content policy violation detection
- Configurable timeout and retry settings

Environment Variables:
- GOOGLE_API_KEY: API key for Gemini
- NANO_BANANA_MODEL: Model to use (default: gemini-3-pro-image-preview)
"""

import asyncio
import base64
import logging
import os
import time
import uuid
from dataclasses import dataclass
from typing import Optional

import aiohttp

from backend.services.exceptions import (
    ContentPolicyError,
    GenerationError,
    GenerationTimeoutError,
    RateLimitError,
)

logger = logging.getLogger(__name__)


@dataclass
class GenerationRequest:
    """Request parameters for image generation."""
    prompt: str
    width: int
    height: int
    model: str = "gemini-3-pro-image-preview"
    seed: Optional[int] = None
    input_image: Optional[bytes] = None  # Optional input image for image-to-image
    input_mime_type: str = "image/png"   # MIME type of input image


@dataclass
class GenerationResponse:
    """Response from image generation."""
    image_data: bytes  # Raw image bytes
    generation_id: str
    seed: int
    inference_time_ms: int


class NanoBananaClient:
    """
    Async client for Google Gemini image generation.
    
    This client uses the Gemini REST API directly to generate images
    with proper configuration for image output.
    
    Example:
        client = NanoBananaClient(api_key="your-api-key")
        request = GenerationRequest(
            prompt="A cute banana mascot",
            width=512,
            height=512
        )
        response = await client.generate(request)
        # response.image_data contains the raw image bytes
    """
    
    # Exponential backoff delays in seconds
    RETRY_DELAYS = [1, 2, 4]
    
    # Gemini API base URL
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
    
    # Strict content constraint to prevent hallucination
    # This is prepended to every prompt to ensure the model only renders
    # what is explicitly provided and doesn't invent additional content
    STRICT_CONTENT_CONSTRAINT = """STRICT CONTENT RULES - YOU MUST FOLLOW THESE:

## TEXT RENDERING - HIGHEST PRIORITY
1. If the prompt includes ANY text (title, subtitle, CTA, labels), you MUST render that text EXACTLY as written
2. Text must be clearly legible and prominently displayed
3. Spell every word EXACTLY as provided - no corrections, no changes
4. If text is in quotes, render it EXACTLY including capitalization
5. TEXT MUST NEVER BE COVERED OR OBSCURED by any visual elements, characters, or assets
6. Ensure adequate contrast between text and background for maximum readability
7. Use professional typography hierarchy: headlines largest, subtext smaller, CTAs prominent

## LAYOUT & COMPOSITION - ENTERPRISE GRADE
8. Follow professional design patterns with clear visual hierarchy
9. Leave breathing room around text - no elements should crowd or overlap text
10. Characters/subjects should be positioned to COMPLEMENT text, never cover it
11. Use rule of thirds for balanced composition
12. Maintain consistent margins and padding throughout the design
13. Text placement zones should be kept clear of busy visual elements

## CONTENT RULES
14. DO NOT add any text, words, letters, numbers, dates, or labels unless explicitly specified in the prompt
15. DO NOT invent or add extra items, elements, or details not mentioned in the prompt
16. If the prompt says "3 items" - render EXACTLY 3, not more, not less
17. If the prompt mentions specific days (e.g., "Monday, Wednesday, Friday") - show ONLY those days
18. DO NOT add watermarks, signatures, timestamps, or any identifying marks
19. Render ONLY what is explicitly described - nothing more, nothing less

## CHARACTER RENDERING (when applicable)
20. If character details are provided (hair color, eye color, skin tone, expression, body type), render them EXACTLY as specified
21. Characters should have consistent proportions and professional quality
22. Expressions should be clear and match the mood of the content

## STYLE FREEDOM
23. You may be creative with visual style, colors, and artistic interpretation
24. You may NOT be creative with content, text, quantity, or character appearance when specified

## SCALABILITY FOR EMOTES/BADGES (when applicable)
25. For emotes, badges, or icons: Create VECTOR-STYLE art with bold outlines and flat colors
26. Design must be recognizable when scaled down to 28x28 pixels
27. Use thick outlines (3-4px minimum), high contrast, and simple iconic shapes
28. Avoid fine details, thin lines, or gradients that disappear at small sizes

"""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: int = 120,
        max_retries: int = 3
    ):
        """
        Initialize the Nano Banana client.
        
        Args:
            api_key: Google API key (defaults to GOOGLE_API_KEY env var)
            model: Model to use (defaults to NANO_BANANA_MODEL env var or gemini-3-pro-image-preview)
            timeout: Request timeout in seconds (default: 120 for image generation)
            max_retries: Maximum number of retry attempts (default: 3)
        
        Raises:
            ValueError: If no API key is provided or found in environment
        """
        self.api_key = api_key or os.environ.get("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Google API key is required. Provide api_key parameter or set GOOGLE_API_KEY environment variable."
            )
        
        self.model = model or os.environ.get("NANO_BANANA_MODEL", "gemini-3-pro-image-preview")
        self.timeout = timeout
        self.max_retries = min(max_retries, len(self.RETRY_DELAYS))
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create the aiohttp session."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            )
        return self._session
    
    async def close(self):
        """Close the aiohttp session."""
        if self._session and not self._session.closed:
            await self._session.close()
    
    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        """
        Generate an image using Gemini API.
        
        Args:
            request: Generation request with prompt and dimensions
        
        Returns:
            GenerationResponse with image data and metadata
        
        Raises:
            RateLimitError: If rate limit is exceeded (429 response)
            ContentPolicyError: If content violates policy
            GenerationTimeoutError: If request times out
            GenerationError: For other generation failures
        """
        # Use request model if specified, otherwise use client default
        model_name = request.model or self.model
        
        # Generate with retry logic
        return await self._request_with_retry(
            prompt=request.prompt,
            model_name=model_name,
            seed=request.seed,
            width=request.width,
            height=request.height,
            input_image=request.input_image,
            input_mime_type=request.input_mime_type
        )
    
    async def _request_with_retry(
        self,
        prompt: str,
        model_name: str,
        seed: Optional[int],
        width: int,
        height: int,
        input_image: Optional[bytes] = None,
        input_mime_type: str = "image/png"
    ) -> GenerationResponse:
        """
        Execute generation request with exponential backoff retry.
        """
        last_exception: Optional[Exception] = None
        
        for attempt in range(self.max_retries):
            try:
                return await self._execute_generation(
                    prompt=prompt,
                    model_name=model_name,
                    seed=seed,
                    width=width,
                    height=height,
                    input_image=input_image,
                    input_mime_type=input_mime_type
                )
            
            except ContentPolicyError:
                # Don't retry content policy violations
                raise
            
            except RateLimitError as e:
                last_exception = e
                delay = e.retry_after if e.retry_after else self.RETRY_DELAYS[attempt]
                
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(delay)
                    continue
                raise
            
            except (GenerationTimeoutError, GenerationError) as e:
                last_exception = e
                if attempt < self.max_retries - 1:
                    delay = self.RETRY_DELAYS[attempt]
                    await asyncio.sleep(delay)
                    continue
                raise
            
            except Exception as e:
                last_exception = e
                if attempt < self.max_retries - 1:
                    delay = self.RETRY_DELAYS[attempt]
                    await asyncio.sleep(delay)
                    continue
                
                raise GenerationError(
                    message=f"Image generation failed: {str(e)}",
                    details={"original_error": str(e)}
                )
        
        if last_exception:
            raise last_exception
        raise GenerationError(message="Image generation failed after all retries")
    
    async def _execute_generation(
        self,
        prompt: str,
        model_name: str,
        seed: Optional[int],
        width: int,
        height: int,
        input_image: Optional[bytes] = None,
        input_mime_type: str = "image/png"
    ) -> GenerationResponse:
        """
        Execute a single generation request using Gemini REST API.
        """
        generation_id = str(uuid.uuid4())
        used_seed = seed if seed is not None else int(time.time() * 1000) % (2**31)
        start_time = time.time()
        
        # Prepend strict content constraint to prevent hallucination
        constrained_prompt = f"{self.STRICT_CONTENT_CONSTRAINT}{prompt}"
        
        # Build the parts array - text prompt first
        parts = [{
            "text": f"{constrained_prompt}\n\nGenerate this as a {width}x{height} pixel image."
        }]
        
        # Add input image if provided (for image-to-image transformation)
        if input_image is not None:
            parts.append({
                "inlineData": {
                    "mimeType": input_mime_type,
                    "data": base64.b64encode(input_image).decode()
                }
            })
        
        # Build the request body for image generation
        request_body = {
            "contents": [{
                "parts": parts
            }],
            "generationConfig": {
                "responseModalities": ["IMAGE", "TEXT"],
                "responseMimeType": "text/plain",
            },
            "safetySettings": [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            ]
        }
        
        url = f"{self.BASE_URL}/models/{model_name}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key
        }
        
        try:
            session = await self._get_session()
            async with session.post(url, json=request_body, headers=headers) as response:
                inference_time_ms = int((time.time() - start_time) * 1000)
                
                if response.status == 200:
                    data = await response.json()
                    image_data = self._extract_image_data(data)
                    
                    return GenerationResponse(
                        image_data=image_data,
                        generation_id=generation_id,
                        seed=used_seed,
                        inference_time_ms=inference_time_ms
                    )
                
                elif response.status == 429:
                    retry_after = int(response.headers.get("Retry-After", 60))
                    raise RateLimitError(retry_after=retry_after)
                
                elif response.status == 400:
                    error_data = await response.json()
                    error_str = str(error_data)
                    
                    if any(term in error_str.lower() for term in ["safety", "blocked", "policy"]):
                        raise ContentPolicyError(reason=error_str)
                    
                    raise GenerationError(
                        message=f"Bad request: {error_str}",
                        details=error_data
                    )
                
                else:
                    error_text = await response.text()
                    raise GenerationError(
                        message=f"API error {response.status}: {error_text}",
                        details={"status": response.status}
                    )
        
        except asyncio.TimeoutError:
            raise GenerationTimeoutError(timeout_seconds=self.timeout)
        
        except (RateLimitError, ContentPolicyError, GenerationTimeoutError, GenerationError):
            raise
        
        except Exception as e:
            raise GenerationError(
                message=f"Image generation failed: {str(e)}",
                details={"original_error": str(e)}
            )
    
    def _extract_image_data(self, data: dict) -> bytes:
        """
        Extract image bytes from Gemini API response.
        """
        candidates = data.get("candidates", [])
        if not candidates:
            raise GenerationError(
                message="No image generated",
                details={"reason": "Empty response from API"}
            )
        
        content = candidates[0].get("content", {})
        parts = content.get("parts", [])
        
        for part in parts:
            # Check for inlineData (base64 encoded image)
            if "inlineData" in part:
                inline_data = part["inlineData"]
                if "data" in inline_data:
                    return base64.b64decode(inline_data["data"])
            
            # Check for inline_data (snake_case variant)
            if "inline_data" in part:
                inline_data = part["inline_data"]
                if "data" in inline_data:
                    return base64.b64decode(inline_data["data"])
        
        # If no image found, check if there's text explaining why
        for part in parts:
            if "text" in part:
                text = part["text"]
                raise GenerationError(
                    message=f"No image generated. Model response: {text[:200]}",
                    details={"model_response": text}
                )
        
        raise GenerationError(
            message="No image data found in response",
            details={"response": data}
        )


# Factory function for creating client from environment
def create_nano_banana_client(
    timeout: int = 120,
    max_retries: int = 3
) -> NanoBananaClient:
    """
    Create a NanoBananaClient using environment variables.
    """
    return NanoBananaClient(
        timeout=timeout,
        max_retries=max_retries
    )


# Singleton instance for convenience
_nano_banana_client: Optional[NanoBananaClient] = None


def get_nano_banana_client() -> NanoBananaClient:
    """
    Get or create the Nano Banana client singleton.
    """
    global _nano_banana_client
    if _nano_banana_client is None:
        _nano_banana_client = create_nano_banana_client()
    return _nano_banana_client


__all__ = [
    "GenerationRequest",
    "GenerationResponse",
    "NanoBananaClient",
    "create_nano_banana_client",
    "get_nano_banana_client",
]
