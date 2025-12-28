"""
Gemini Vision Client for image analysis.

Uses Google's Gemini 1.5 Pro Vision model for multimodal analysis.
Separate from NanoBananaClient (image generation) to maintain SRP.

Features:
- Async image analysis using Google Gemini REST API
- Exponential backoff retry logic (1s, 2s, 4s delays)
- Rate limit handling with Retry-After header support
- Content policy violation detection
- JSON response parsing with markdown code block handling
- Configurable timeout and retry settings

Environment Variables:
- GOOGLE_API_KEY: API key for Gemini
"""

import asyncio
import base64
import hashlib
import json
import os
import time
from dataclasses import dataclass
from typing import Optional

import aiohttp

from backend.services.exceptions import (
    ContentPolicyError,
    GenerationError,
    GenerationTimeoutError,
    RateLimitError,
)


@dataclass
class VisionAnalysisRequest:
    """Request for vision analysis."""
    image_data: bytes          # Raw image bytes
    prompt: str                # Analysis prompt
    mime_type: str = "image/jpeg"


@dataclass  
class VisionAnalysisResponse:
    """Response from vision analysis."""
    result: dict               # Parsed JSON result
    image_hash: str            # SHA256 hash for caching
    raw_response: str          # Raw text response


class GeminiVisionClient:
    """
    Async client for Gemini Vision API.
    
    Used for image analysis tasks like Vibe Branding.
    
    Example:
        client = GeminiVisionClient(api_key="your-api-key")
        request = VisionAnalysisRequest(
            image_data=image_bytes,
            prompt="Analyze this image and extract colors",
            mime_type="image/jpeg"
        )
        response = await client.analyze(request)
        # response.result contains the parsed JSON result
    """
    
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
    MODEL = "gemini-3-flash-preview"  # Vision-capable model for image parsing
    
    # Exponential backoff delays in seconds
    RETRY_DELAYS = [1, 2, 4]
    
    SAFETY_SETTINGS = [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    ]
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        timeout: int = 30,
        max_retries: int = 3
    ):
        """
        Initialize the Gemini Vision client.
        
        Args:
            api_key: Google API key (defaults to GOOGLE_API_KEY env var)
            timeout: Request timeout in seconds (default: 30)
            max_retries: Maximum number of retry attempts (default: 3)
        
        Raises:
            ValueError: If no API key is provided or found in environment
        """
        self.api_key = api_key or os.environ.get("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Google API key is required. Provide api_key parameter or set GOOGLE_API_KEY environment variable."
            )
        
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
    
    async def analyze(self, request: VisionAnalysisRequest) -> VisionAnalysisResponse:
        """
        Analyze an image with the given prompt.
        
        Args:
            request: Vision analysis request with image data and prompt
        
        Returns:
            VisionAnalysisResponse with parsed JSON result and metadata
        
        Raises:
            RateLimitError: If rate limit is exceeded (429 response)
            ContentPolicyError: If content violates policy
            GenerationTimeoutError: If request times out
            GenerationError: For other analysis failures
        """
        return await self._request_with_retry(request)
    
    async def _request_with_retry(
        self,
        request: VisionAnalysisRequest
    ) -> VisionAnalysisResponse:
        """Execute analysis request with exponential backoff retry."""
        last_exception: Optional[Exception] = None
        
        for attempt in range(self.max_retries):
            try:
                return await self._execute_analysis(request)
            
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
                    message=f"Vision analysis failed: {str(e)}",
                    details={"original_error": str(e)}
                )
        
        if last_exception:
            raise last_exception
        raise GenerationError(message="Vision analysis failed after all retries")
    
    async def _execute_analysis(
        self,
        request: VisionAnalysisRequest
    ) -> VisionAnalysisResponse:
        """Execute a single analysis request using Gemini REST API."""
        
        # Calculate image hash for caching
        image_hash = hashlib.sha256(request.image_data).hexdigest()
        
        # Build multimodal request
        request_body = {
            "contents": [{
                "parts": [
                    {"text": request.prompt},
                    {
                        "inlineData": {
                            "mimeType": request.mime_type,
                            "data": base64.b64encode(request.image_data).decode()
                        }
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.2,  # Low temp for consistent extraction
                "topP": 0.8,
                "maxOutputTokens": 2048,
            },
            "safetySettings": self.SAFETY_SETTINGS
        }
        
        url = f"{self.BASE_URL}/models/{self.MODEL}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key
        }
        
        try:
            session = await self._get_session()
            async with session.post(url, json=request_body, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    text = self._extract_text(data)
                    result = self._parse_json_response(text)
                    
                    return VisionAnalysisResponse(
                        result=result,
                        image_hash=image_hash,
                        raw_response=text
                    )
                
                elif response.status == 429:
                    retry_after = int(response.headers.get("Retry-After", 60))
                    raise RateLimitError(retry_after=retry_after)
                
                elif response.status == 400:
                    error_data = await response.json()
                    error_str = str(error_data)
                    
                    if any(term in error_str.lower() for term in ["safety", "blocked", "policy"]):
                        raise ContentPolicyError(reason="Image blocked by safety filters")
                    
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
                message=f"Vision analysis failed: {str(e)}",
                details={"original_error": str(e)}
            )
    
    def _extract_text(self, data: dict) -> str:
        """Extract text from Gemini response."""
        candidates = data.get("candidates", [])
        if not candidates:
            raise GenerationError(
                message="No response from model",
                details={"reason": "Empty candidates"}
            )
        
        parts = candidates[0].get("content", {}).get("parts", [])
        for part in parts:
            if "text" in part:
                return part["text"]
        
        raise GenerationError(
            message="No text in response",
            details={"response": data}
        )
    
    def _parse_json_response(self, text: str) -> dict:
        """Parse JSON from model response, handling markdown code blocks."""
        # Strip markdown code blocks if present
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        
        try:
            return json.loads(text.strip())
        except json.JSONDecodeError as e:
            raise GenerationError(
                message=f"Failed to parse JSON response: {e}",
                details={"raw_response": text[:500]}
            )


# Factory function for creating client from environment
def create_gemini_vision_client(
    timeout: int = 30,
    max_retries: int = 3
) -> GeminiVisionClient:
    """Create a GeminiVisionClient using environment variables."""
    return GeminiVisionClient(
        timeout=timeout,
        max_retries=max_retries
    )


# Singleton instance for convenience
_gemini_vision_client: Optional[GeminiVisionClient] = None


def get_gemini_vision_client() -> GeminiVisionClient:
    """Get or create the Gemini Vision client singleton."""
    global _gemini_vision_client
    if _gemini_vision_client is None:
        _gemini_vision_client = create_gemini_vision_client()
    return _gemini_vision_client
