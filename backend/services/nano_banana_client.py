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
from typing import List, Optional

import aiohttp

from backend.services.exceptions import (
    ContentPolicyError,
    GenerationError,
    GenerationTimeoutError,
    RateLimitError,
)

logger = logging.getLogger(__name__)


@dataclass
class ConversationTurn:
    """Single turn in a multi-turn conversation."""
    role: str  # "user" or "model"
    text: Optional[str] = None
    image_data: Optional[bytes] = None
    image_mime_type: str = "image/png"


@dataclass
class MediaAssetInput:
    """A media asset to be included in generation."""
    image_data: bytes
    mime_type: str = "image/png"
    asset_id: str = ""
    display_name: str = ""
    asset_type: str = "image"  # logo, face, character, etc.


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
    # Multi-turn conversation support for refinements
    conversation_history: Optional[list] = None  # List of ConversationTurn or dicts
    # Media assets to include in generation (logos, faces, characters, etc.)
    media_assets: Optional[List["MediaAssetInput"]] = None
    # Enable Google Search grounding for real-time information (game content, current events, etc.)
    enable_grounding: bool = False


@dataclass
class GenerationResponse:
    """Response from image generation."""
    image_data: bytes  # Raw image bytes
    generation_id: str
    seed: int
    inference_time_ms: int
    # Thought signature for multi-turn refinements (required by Gemini for referencing model-generated images)
    thought_signature: Optional[bytes] = None


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

## REFERENCE IMAGE / CANVAS LAYOUT - HIGHEST PRIORITY
0. If a reference image or canvas layout is provided (the first image in this request):
   - REPLICATE the exact composition, layout, and spatial arrangement shown
   - PRESERVE all element positions, sizes, and relationships from the reference
   - The reference image defines WHERE things go - your job is to make it look polished
   - DO NOT rearrange, reposition, or ignore elements shown in the reference
   - Treat sketches, annotations, and placeholders as placement guides

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
            input_mime_type=request.input_mime_type,
            conversation_history=request.conversation_history,
            media_assets=request.media_assets,
            enable_grounding=request.enable_grounding,
        )
    
    def _build_multi_turn_contents(
        self,
        conversation_history: list,
        refinement_prompt: str,
        width: int,
        height: int,
    ) -> list:
        """
        Build multi-turn contents array from conversation history.
        
        This enables cheaper refinements by maintaining context of previous
        generations without re-uploading images.
        
        Args:
            conversation_history: List of previous turns (user prompts + model images)
            refinement_prompt: The new refinement request
            width: Target width
            height: Target height
            
        Returns:
            List of content objects for Gemini API
        """
        contents = []
        
        # Add previous turns from history
        for turn in conversation_history:
            if isinstance(turn, dict):
                role = turn.get("role", "user")
                parts = []
                
                # Add text if present
                if turn.get("text"):
                    parts.append({"text": turn["text"]})
                
                # Add image if present (for model responses)
                if turn.get("image_data"):
                    image_data = turn["image_data"]
                    # Handle both bytes and base64 string
                    if isinstance(image_data, bytes):
                        image_b64 = base64.b64encode(image_data).decode()
                    else:
                        image_b64 = image_data
                    
                    image_part = {
                        "inlineData": {
                            "mimeType": turn.get("image_mime_type", "image/png"),
                            "data": image_b64,
                        }
                    }
                    
                    # CRITICAL: Include thought_signature for model-generated images
                    # This is required by Gemini API for multi-turn image refinements
                    if turn.get("thought_signature"):
                        sig = turn["thought_signature"]
                        # Handle both bytes and base64 string
                        if isinstance(sig, bytes):
                            sig_b64 = base64.b64encode(sig).decode()
                        else:
                            sig_b64 = sig
                        image_part["thoughtSignature"] = sig_b64
                    
                    parts.append(image_part)
                
                if parts:
                    contents.append({"role": role, "parts": parts})
        
        # Add the new refinement request
        # For refinements, we use a lighter constraint since context is established
        refinement_constraint = """Apply this refinement to the previous image while maintaining:
- The same overall composition and layout
- The same style and artistic approach
- Any text exactly as it was (unless the refinement specifically changes it)
- The same dimensions and aspect ratio

Refinement request: """
        
        contents.append({
            "role": "user",
            "parts": [{
                "text": f"{refinement_constraint}{refinement_prompt}\n\nKeep the image at {width}x{height} pixels."
            }]
        })
        
        return contents
    
    async def _request_with_retry(
        self,
        prompt: str,
        model_name: str,
        seed: Optional[int],
        width: int,
        height: int,
        input_image: Optional[bytes] = None,
        input_mime_type: str = "image/png",
        conversation_history: Optional[list] = None,
        media_assets: Optional[List["MediaAssetInput"]] = None,
        enable_grounding: bool = False,
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
                    input_mime_type=input_mime_type,
                    conversation_history=conversation_history,
                    media_assets=media_assets,
                    enable_grounding=enable_grounding,
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
        input_mime_type: str = "image/png",
        conversation_history: Optional[list] = None,
        media_assets: Optional[List["MediaAssetInput"]] = None,
        enable_grounding: bool = False,
    ) -> GenerationResponse:
        """
        Execute a single generation request using Gemini REST API.
        
        Supports multi-turn conversations for refinements. When conversation_history
        is provided, the prompt is treated as a refinement of the previous generation.
        
        Media assets (logos, faces, characters, etc.) are attached as inline images
        and referenced in the prompt by their index and type.
        """
        generation_id = str(uuid.uuid4())
        used_seed = seed if seed is not None else int(time.time() * 1000) % (2**31)
        start_time = time.time()
        
        # Build contents array based on whether this is multi-turn or single-turn
        if conversation_history and len(conversation_history) > 0:
            # Multi-turn: Build from conversation history + new refinement
            contents = self._build_multi_turn_contents(
                conversation_history=conversation_history,
                refinement_prompt=prompt,
                width=width,
                height=height,
            )
        else:
            # Single-turn: Original behavior
            # For canvas/reference image mode, use minimal prompt (the canvas IS the instruction)
            # For regular generation, prepend strict content constraint
            if input_image is not None:
                # Canvas mode - prompt is already optimized, just add dimensions
                constrained_prompt = f"{prompt}\n\nOutput: {width}x{height} pixels."
            else:
                # Regular mode - use full constraint to prevent hallucination
                constrained_prompt = f"{self.STRICT_CONTENT_CONSTRAINT}{prompt}\n\nGenerate this as a {width}x{height} pixel image."
            
            # Build the parts array
            # IMPORTANT: For canvas/reference images, put the image FIRST so Gemini
            # understands it's a reference to follow, not just an afterthought
            parts = []
            
            # Add input image FIRST if provided (canvas snapshot or reference image)
            # This ensures Gemini sees the visual reference before the instructions
            if input_image is not None:
                logger.info(f"[CANVAS DEBUG] NanoBanana: Adding input_image to request, size={len(input_image)} bytes")
                parts.append({
                    "inlineData": {
                        "mimeType": input_mime_type,
                        "data": base64.b64encode(input_image).decode()
                    }
                })
            else:
                logger.info("[CANVAS DEBUG] NanoBanana: No input_image provided")
            
            # Add the text prompt after the reference image
            parts.append({
                "text": constrained_prompt
            })
            
            # Add media assets (logos, faces, characters, etc.)
            # These are referenced in the prompt by index: "Image 1 is the user's logo..."
            if media_assets:
                for asset in media_assets:
                    parts.append({
                        "inlineData": {
                            "mimeType": asset.mime_type,
                            "data": base64.b64encode(asset.image_data).decode()
                        }
                    })
            
            # DEBUG: Log the structure of what we're sending
            logger.info(f"[CANVAS DEBUG] NanoBanana: Building request with {len(parts)} parts")
            for i, part in enumerate(parts):
                if "inlineData" in part:
                    logger.info(f"[CANVAS DEBUG] NanoBanana: Part {i} = IMAGE ({part['inlineData']['mimeType']}, {len(part['inlineData']['data'])} base64 chars)")
                elif "text" in part:
                    logger.info(f"[CANVAS DEBUG] NanoBanana: Part {i} = TEXT ({len(part['text'])} chars)")
            
            contents = [{"parts": parts}]
        
        # Build the request body for image generation
        request_body = {
            "contents": contents,
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
        
        # Add Google Search grounding tool if enabled
        # This allows the model to search for real-time information (game content, current events, etc.)
        # to avoid hallucinating details about things like new game locations, skins, POIs
        if enable_grounding:
            request_body["tools"] = [{"google_search": {}}]
            logger.info("[GROUNDING] Google Search grounding enabled for this generation request")
        
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
                    image_data, thought_signature = self._extract_image_data(data)
                    
                    return GenerationResponse(
                        image_data=image_data,
                        generation_id=generation_id,
                        seed=used_seed,
                        inference_time_ms=inference_time_ms,
                        thought_signature=thought_signature,
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
    
    def _extract_image_data(self, data: dict) -> tuple[bytes, Optional[bytes]]:
        """
        Extract image bytes and thought_signature from Gemini API response.
        
        Returns:
            Tuple of (image_data, thought_signature)
        """
        candidates = data.get("candidates", [])
        if not candidates:
            raise GenerationError(
                message="No image generated",
                details={"reason": "Empty response from API"}
            )
        
        content = candidates[0].get("content", {})
        parts = content.get("parts", [])
        
        image_data = None
        thought_signature = None
        
        for part in parts:
            # Check for inlineData (base64 encoded image)
            if "inlineData" in part:
                inline_data = part["inlineData"]
                if "data" in inline_data:
                    image_data = base64.b64decode(inline_data["data"])
                # Extract thought_signature if present (camelCase from API)
                if "thoughtSignature" in part:
                    thought_signature = base64.b64decode(part["thoughtSignature"])
            
            # Check for inline_data (snake_case variant)
            if "inline_data" in part:
                inline_data = part["inline_data"]
                if "data" in inline_data:
                    image_data = base64.b64decode(inline_data["data"])
                # Extract thought_signature if present (snake_case variant)
                if "thought_signature" in part:
                    thought_signature = base64.b64decode(part["thought_signature"])
        
        if image_data:
            return image_data, thought_signature
        
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
    "ConversationTurn",
    "GenerationRequest",
    "GenerationResponse",
    "MediaAssetInput",
    "NanoBananaClient",
    "create_nano_banana_client",
    "get_nano_banana_client",
]
