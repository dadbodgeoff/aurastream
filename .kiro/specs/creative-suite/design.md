# AuraStream Creative Suite - Technical Design Document
**Features:** Vibe Branding + The Aura Lab
**Version:** 1.0.0
**Status:** DRAFT - Awaiting Implementation

---

# PART 1: VIBE BRANDING

## 1. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│  tsx/apps/web/src/                                                          │
│  ├── components/vibe-branding/                                              │
│  │   ├── VibeBrandingModal.tsx      # Main modal component                  │
│  │   ├── UploadDropzone.tsx         # Drag & drop upload                    │
│  │   ├── AnalyzingTerminal.tsx      # Fake terminal animation               │
│  │   ├── VibeResultsDisplay.tsx     # Success state with palette            │
│  │   └── constants.ts               # Terminal messages, etc.               │
│  ├── hooks/useVibeBranding.ts       # API hook                              │
│  └── app/dashboard/vibe-branding/page.tsx  # Dedicated page (optional)      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                         │
│  backend/                                                                    │
│  ├── api/routes/vibe_branding.py    # API endpoints                         │
│  ├── api/schemas/vibe_branding.py   # Pydantic schemas                      │
│  ├── services/vibe_branding_service.py  # Core logic                        │
│  └── services/gemini_vision_client.py   # Gemini Vision wrapper             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                  │
│  ├── Google Gemini Vision API (gemini-1.5-pro-vision)                       │
│  ├── Supabase Storage (image upload)                                        │
│  └── Redis (rate limiting, optional caching)                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. BACKEND IMPLEMENTATION

### 2.1 Gemini Vision Client

**File:** `backend/services/gemini_vision_client.py`

```python
"""
Gemini Vision Client for image analysis.

Uses Google's Gemini 1.5 Pro Vision model for multimodal analysis.
Separate from NanoBananaClient (image generation) to maintain SRP.
"""

import base64
import hashlib
import json
from typing import Optional
from dataclasses import dataclass

import aiohttp

from backend.services.exceptions import (
    ContentPolicyError,
    AnalysisError,
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
    """
    
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
    MODEL = "gemini-1.5-pro"  # Vision-capable model
    
    SAFETY_SETTINGS = [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    ]
    
    def __init__(self, api_key: str, timeout: int = 30):
        self.api_key = api_key
        self.timeout = timeout
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def analyze(self, request: VisionAnalysisRequest) -> VisionAnalysisResponse:
        """Analyze an image with the given prompt."""
        
        # Calculate image hash for caching
        image_hash = hashlib.sha256(request.image_data).hexdigest()
        
        # Build multimodal request
        request_body = {
            "contents": [{
                "parts": [
                    {"text": request.prompt},
                    {
                        "inline_data": {
                            "mime_type": request.mime_type,
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
                raise RateLimitError(retry_after=60)
            
            elif response.status == 400:
                error_data = await response.json()
                if "safety" in str(error_data).lower():
                    raise ContentPolicyError(reason="Image blocked by safety filters")
                raise AnalysisError(f"Bad request: {error_data}")
            
            else:
                raise AnalysisError(f"API error {response.status}")
    
    def _extract_text(self, data: dict) -> str:
        """Extract text from Gemini response."""
        candidates = data.get("candidates", [])
        if not candidates:
            raise AnalysisError("No response from model")
        
        parts = candidates[0].get("content", {}).get("parts", [])
        for part in parts:
            if "text" in part:
                return part["text"]
        
        raise AnalysisError("No text in response")
    
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
            raise AnalysisError(f"Failed to parse JSON: {e}")
    
    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=self.timeout)
            )
        return self._session
    
    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()
```

### 2.2 Vibe Branding Service

**File:** `backend/services/vibe_branding_service.py`

```python
"""
Vibe Branding Service - Extract brand identity from images.

Orchestrates:
1. Image validation
2. Cache lookup
3. Gemini Vision analysis
4. Brand kit creation
"""

import hashlib
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel

from backend.services.gemini_vision_client import GeminiVisionClient, VisionAnalysisRequest
from backend.services.brand_kit_service import BrandKitService
from backend.database.supabase_client import get_supabase_client
from backend.api.schemas.brand_kit import SUPPORTED_FONTS, VALID_TONES


class VibeAnalysis(BaseModel):
    """Validated vibe analysis result."""
    primary_colors: list[str]      # 5 hex codes
    accent_colors: list[str]       # 3 hex codes
    fonts: dict                    # {headline, body}
    tone: str                      # Brand tone
    style_reference: str           # Description for prompts
    lighting_mood: str             # neon/natural/dramatic/cozy/high-contrast
    style_keywords: list[str]      # 3-5 keywords
    text_vibe: Optional[str]       # Typography style description
    confidence: float              # 0-1
    source_image_hash: str
    analyzed_at: str


# The magic prompt that extracts everything we need
VIBE_ANALYSIS_PROMPT = """
You are an expert visual designer analyzing streamer/content creator aesthetics.

Analyze this image and extract the complete visual brand identity. 

Return ONLY valid JSON with this exact structure:

{
  "primary_colors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "accent_colors": ["#hex1", "#hex2", "#hex3"],
  "fonts": {
    "headline": "FontName",
    "body": "FontName"
  },
  "tone": "competitive|casual|educational|comedic|professional",
  "style_reference": "2-3 sentence description of the visual style that could be used as a prompt",
  "lighting_mood": "neon|natural|dramatic|cozy|high-contrast",
  "style_keywords": ["keyword1", "keyword2", "keyword3", "keyword4"],
  "text_vibe": "Description of text style if visible (e.g., 'Bold All-Caps', 'Playful Lowercase')",
  "confidence": 0.0-1.0
}

EXTRACTION RULES:
1. PRIMARY COLORS: Extract exactly 5 colors from most dominant to least, as hex codes (#RRGGBB)
2. ACCENT COLORS: Extract 3 colors used for highlights, CTAs, or emphasis
3. FONTS: Match to the closest from this list ONLY:
   Inter, Roboto, Montserrat, Open Sans, Poppins, Lato, Oswald, Raleway, 
   Nunito, Playfair Display, Merriweather, Source Sans Pro, Ubuntu, Rubik, 
   Work Sans, Fira Sans, Barlow, Quicksand, Karla, Mulish
4. TONE: Choose the single best match for the overall vibe
5. STYLE_REFERENCE: Write a prompt-ready description that captures the aesthetic
6. LIGHTING_MOOD: Describe the lighting/atmosphere
7. STYLE_KEYWORDS: 3-5 single-word descriptors (e.g., "cyberpunk", "minimalist", "retro")
8. TEXT_VIBE: If text is visible, describe its style. If no text, use null
9. CONFIDENCE: How clearly you can extract the brand identity (0.5-1.0)

Focus on extracting a cohesive brand identity that could be used to generate matching assets.
"""


class VibeBrandingService:
    """Service for Vibe Branding feature."""
    
    def __init__(self):
        self.vision_client = GeminiVisionClient(
            api_key=os.environ.get("GOOGLE_API_KEY")
        )
        self.supabase = get_supabase_client()
    
    async def analyze_image(
        self,
        image_data: bytes,
        mime_type: str = "image/jpeg"
    ) -> VibeAnalysis:
        """
        Analyze an image and extract brand identity.
        
        Checks cache first, then calls Gemini Vision.
        """
        # Calculate hash for caching
        image_hash = hashlib.sha256(image_data).hexdigest()
        
        # Check cache
        cached = await self._get_cached_analysis(image_hash)
        if cached:
            return cached
        
        # Call Gemini Vision
        request = VisionAnalysisRequest(
            image_data=image_data,
            prompt=VIBE_ANALYSIS_PROMPT,
            mime_type=mime_type
        )
        
        response = await self.vision_client.analyze(request)
        
        # Validate and normalize the response
        analysis = self._validate_analysis(response.result, image_hash)
        
        # Cache the result
        await self._cache_analysis(image_hash, analysis)
        
        return analysis
    
    def _validate_analysis(self, raw: dict, image_hash: str) -> VibeAnalysis:
        """Validate and normalize the Gemini response."""
        
        # Validate colors are hex format
        primary = [c for c in raw.get("primary_colors", []) if self._is_valid_hex(c)][:5]
        accent = [c for c in raw.get("accent_colors", []) if self._is_valid_hex(c)][:3]
        
        # Pad if needed
        while len(primary) < 5:
            primary.append("#808080")  # Gray fallback
        while len(accent) < 3:
            accent.append("#FFFFFF")
        
        # Validate fonts
        fonts = raw.get("fonts", {})
        headline = fonts.get("headline", "Montserrat")
        body = fonts.get("body", "Inter")
        
        if headline not in SUPPORTED_FONTS:
            headline = "Montserrat"
        if body not in SUPPORTED_FONTS:
            body = "Inter"
        
        # Validate tone
        tone = raw.get("tone", "professional")
        if tone not in ["competitive", "casual", "educational", "comedic", "professional"]:
            tone = "professional"
        
        # Validate lighting mood
        lighting = raw.get("lighting_mood", "natural")
        if lighting not in ["neon", "natural", "dramatic", "cozy", "high-contrast"]:
            lighting = "natural"
        
        return VibeAnalysis(
            primary_colors=primary,
            accent_colors=accent,
            fonts={"headline": headline, "body": body},
            tone=tone,
            style_reference=raw.get("style_reference", "Modern digital aesthetic")[:500],
            lighting_mood=lighting,
            style_keywords=raw.get("style_keywords", ["modern"])[:5],
            text_vibe=raw.get("text_vibe"),
            confidence=min(max(raw.get("confidence", 0.7), 0.0), 1.0),
            source_image_hash=image_hash,
            analyzed_at=datetime.utcnow().isoformat() + "Z"
        )
    
    def _is_valid_hex(self, color: str) -> bool:
        """Check if string is valid hex color."""
        import re
        return bool(re.match(r'^#[0-9A-Fa-f]{6}$', color))
    
    async def _get_cached_analysis(self, image_hash: str) -> Optional[VibeAnalysis]:
        """Check cache for existing analysis."""
        result = self.supabase.table("vibe_analysis_cache") \
            .select("analysis") \
            .eq("image_hash", image_hash) \
            .gt("expires_at", datetime.utcnow().isoformat()) \
            .single() \
            .execute()
        
        if result.data:
            return VibeAnalysis(**result.data["analysis"])
        return None
    
    async def _cache_analysis(self, image_hash: str, analysis: VibeAnalysis):
        """Cache analysis result for 24 hours."""
        self.supabase.table("vibe_analysis_cache").upsert({
            "image_hash": image_hash,
            "analysis": analysis.model_dump(),
            "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat()
        }).execute()
    
    async def create_brand_kit_from_analysis(
        self,
        analysis: VibeAnalysis,
        user_id: str,
        name: Optional[str] = None
    ) -> dict:
        """Create a brand kit from the analysis."""
        
        kit_name = name or f"Vibe from {datetime.now().strftime('%b %d, %Y')}"
        
        brand_kit_data = {
            "name": kit_name,
            "primary_colors": analysis.primary_colors,
            "accent_colors": analysis.accent_colors,
            "fonts": analysis.fonts,
            "tone": analysis.tone,
            "style_reference": analysis.style_reference,
            "extracted_from": "vibe_branding",
            "source_image_hash": analysis.source_image_hash,
        }
        
        return await BrandKitService.create(user_id, brand_kit_data)
    
    async def check_user_quota(self, user_id: str, tier: str) -> dict:
        """Check if user has remaining vibe analyses."""
        limits = {
            "free": 1,
            "pro": 5,
            "studio": 999999  # Effectively unlimited
        }
        
        limit = limits.get(tier, 1)
        
        result = self.supabase.table("users") \
            .select("vibe_analyses_this_month") \
            .eq("id", user_id) \
            .single() \
            .execute()
        
        used = result.data.get("vibe_analyses_this_month", 0) if result.data else 0
        
        return {
            "used": used,
            "limit": limit,
            "remaining": max(0, limit - used),
            "can_analyze": used < limit
        }
    
    async def increment_usage(self, user_id: str):
        """Increment user's vibe analysis count."""
        self.supabase.rpc("increment_vibe_analyses", {"user_id": user_id}).execute()
```

### 2.3 API Schemas

**File:** `backend/api/schemas/vibe_branding.py`

```python
"""
Pydantic schemas for Vibe Branding endpoints.
"""

from typing import Optional, List, Literal
from pydantic import BaseModel, Field, HttpUrl


LightingMood = Literal["neon", "natural", "dramatic", "cozy", "high-contrast"]
BrandTone = Literal["competitive", "casual", "educational", "comedic", "professional"]


class FontsSchema(BaseModel):
    """Font configuration."""
    headline: str = Field(..., description="Headline font name")
    body: str = Field(..., description="Body font name")


class VibeAnalysisSchema(BaseModel):
    """Complete vibe analysis result."""
    primary_colors: List[str] = Field(..., min_length=5, max_length=5)
    accent_colors: List[str] = Field(..., min_length=3, max_length=3)
    fonts: FontsSchema
    tone: BrandTone
    style_reference: str = Field(..., max_length=500)
    lighting_mood: LightingMood
    style_keywords: List[str] = Field(..., min_length=1, max_length=5)
    text_vibe: Optional[str] = None
    confidence: float = Field(..., ge=0, le=1)
    source_image_hash: str
    analyzed_at: str


class AnalyzeURLRequest(BaseModel):
    """Request to analyze image from URL."""
    image_url: HttpUrl
    auto_create_kit: bool = True
    kit_name: Optional[str] = Field(None, max_length=100)


class AnalyzeResponse(BaseModel):
    """Response from vibe analysis."""
    analysis: VibeAnalysisSchema
    brand_kit_id: Optional[str] = None
    cached: bool = False


class UsageResponse(BaseModel):
    """User's vibe branding usage."""
    used: int
    limit: int
    remaining: int
    can_analyze: bool
    resets_at: str
```

### 2.4 API Routes

**File:** `backend/api/routes/vibe_branding.py`

```python
"""
API routes for Vibe Branding feature.
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from typing import Optional

from backend.api.schemas.vibe_branding import (
    AnalyzeURLRequest,
    AnalyzeResponse,
    UsageResponse,
)
from backend.services.vibe_branding_service import VibeBrandingService
from backend.api.dependencies import get_current_user
from backend.api.schemas.auth import TokenPayload


router = APIRouter(prefix="/api/v1/vibe-branding", tags=["Vibe Branding"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/analyze/upload", response_model=AnalyzeResponse)
async def analyze_uploaded_image(
    file: UploadFile = File(...),
    auto_create_kit: bool = Query(True),
    kit_name: Optional[str] = Query(None, max_length=100),
    current_user: TokenPayload = Depends(get_current_user)
):
    """
    Analyze an uploaded image and extract brand identity.
    
    Optionally creates a brand kit from the extracted data.
    """
    service = VibeBrandingService()
    
    # Check quota
    quota = await service.check_user_quota(current_user.sub, current_user.tier)
    if not quota["can_analyze"]:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "quota_exceeded",
                "message": f"You've used all {quota['limit']} vibe analyses this month",
                "upgrade_url": "/dashboard/settings?tab=billing"
            }
        )
    
    # Validate file type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, and WebP images are supported"
        )
    
    # Read and validate size
    image_data = await file.read()
    if len(image_data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Image must be under 10MB"
        )
    
    # Analyze
    try:
        analysis = await service.analyze_image(image_data, file.content_type)
    except ContentPolicyError:
        raise HTTPException(
            status_code=400,
            detail="This image cannot be analyzed due to content restrictions"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Failed to analyze image. Please try a different image."
        )
    
    # Increment usage
    await service.increment_usage(current_user.sub)
    
    # Create brand kit if requested
    brand_kit_id = None
    if auto_create_kit:
        kit = await service.create_brand_kit_from_analysis(
            analysis,
            current_user.sub,
            kit_name
        )
        brand_kit_id = kit["id"]
    
    return AnalyzeResponse(
        analysis=analysis,
        brand_kit_id=brand_kit_id,
        cached=False
    )


@router.post("/analyze/url", response_model=AnalyzeResponse)
async def analyze_image_url(
    request: AnalyzeURLRequest,
    current_user: TokenPayload = Depends(get_current_user)
):
    """Analyze an image from URL."""
    service = VibeBrandingService()
    
    # Check quota
    quota = await service.check_user_quota(current_user.sub, current_user.tier)
    if not quota["can_analyze"]:
        raise HTTPException(status_code=429, detail="Quota exceeded")
    
    # Fetch image from URL
    import aiohttp
    async with aiohttp.ClientSession() as session:
        async with session.get(str(request.image_url)) as resp:
            if resp.status != 200:
                raise HTTPException(400, "Could not fetch image from URL")
            
            content_type = resp.headers.get("content-type", "image/jpeg")
            if content_type not in ALLOWED_MIME_TYPES:
                raise HTTPException(400, "URL must point to a JPEG, PNG, or WebP image")
            
            image_data = await resp.read()
            if len(image_data) > MAX_FILE_SIZE:
                raise HTTPException(400, "Image must be under 10MB")
    
    analysis = await service.analyze_image(image_data, content_type)
    await service.increment_usage(current_user.sub)
    
    brand_kit_id = None
    if request.auto_create_kit:
        kit = await service.create_brand_kit_from_analysis(
            analysis,
            current_user.sub,
            request.kit_name
        )
        brand_kit_id = kit["id"]
    
    return AnalyzeResponse(
        analysis=analysis,
        brand_kit_id=brand_kit_id,
        cached=False
    )


@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    current_user: TokenPayload = Depends(get_current_user)
):
    """Get user's vibe branding usage for current month."""
    service = VibeBrandingService()
    quota = await service.check_user_quota(current_user.sub, current_user.tier)
    
    # Calculate reset date (first of next month)
    from datetime import datetime
    now = datetime.utcnow()
    if now.month == 12:
        resets_at = datetime(now.year + 1, 1, 1)
    else:
        resets_at = datetime(now.year, now.month + 1, 1)
    
    return UsageResponse(
        used=quota["used"],
        limit=quota["limit"],
        remaining=quota["remaining"],
        can_analyze=quota["can_analyze"],
        resets_at=resets_at.isoformat() + "Z"
    )
```

---

## 3. FRONTEND IMPLEMENTATION

### 3.1 Component Structure

```
tsx/apps/web/src/
├── components/vibe-branding/
│   ├── VibeBrandingModal.tsx       # Main modal orchestrator
│   ├── UploadDropzone.tsx          # Drag & drop with preview
│   ├── AnalyzingTerminal.tsx       # Fake terminal animation
│   ├── VibeResultsDisplay.tsx      # Success state with palette
│   ├── ColorPalettePreview.tsx     # Interactive color swatches
│   ├── constants.ts                # Terminal messages, etc.
│   ├── types.ts                    # TypeScript interfaces
│   └── index.ts                    # Barrel export
├── hooks/
│   └── useVibeBranding.ts          # API hook with TanStack Query
└── app/dashboard/vibe-branding/
    └── page.tsx                    # Dedicated page (optional)
```

### 3.2 Types

**File:** `tsx/apps/web/src/components/vibe-branding/types.ts`

```typescript
export interface VibeAnalysis {
  primary_colors: string[];
  accent_colors: string[];
  fonts: {
    headline: string;
    body: string;
  };
  tone: 'competitive' | 'casual' | 'educational' | 'comedic' | 'professional';
  style_reference: string;
  lighting_mood: 'neon' | 'natural' | 'dramatic' | 'cozy' | 'high-contrast';
  style_keywords: string[];
  text_vibe: string | null;
  confidence: number;
  source_image_hash: string;
  analyzed_at: string;
}

export interface AnalyzeResponse {
  analysis: VibeAnalysis;
  brand_kit_id: string | null;
  cached: boolean;
}

export interface UsageResponse {
  used: number;
  limit: number;
  remaining: number;
  can_analyze: boolean;
  resets_at: string;
}

export type VibeBrandingStep = 'upload' | 'analyzing' | 'success' | 'error';
```

### 3.3 Constants

**File:** `tsx/apps/web/src/components/vibe-branding/constants.ts`

```typescript
export const TERMINAL_MESSAGES = [
  "Initializing Gemini Vision...",
  "Extracting hex values...",
  "Identifying font weights...",
  "Analyzing lighting models...",
  "Detecting color harmonies...",
  "Cloning aesthetic DNA...",
  "Constructing Brand Kit...",
  "Finalizing extraction..."
];

export const ACCEPTED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const LIGHTING_MOOD_LABELS: Record<string, string> = {
  neon: '🌃 Neon',
  natural: '☀️ Natural',
  dramatic: '🎭 Dramatic',
  cozy: '☕ Cozy',
  'high-contrast': '⚡ High Contrast',
};

export const TONE_LABELS: Record<string, string> = {
  competitive: '🏆 Competitive',
  casual: '😎 Casual',
  educational: '📚 Educational',
  comedic: '😂 Comedic',
  professional: '💼 Professional',
};
```

### 3.4 API Hook

**File:** `tsx/apps/web/src/hooks/useVibeBranding.ts`

```typescript
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@aurastream/api-client';
import type { AnalyzeResponse, UsageResponse } from '@/components/vibe-branding/types';

interface AnalyzeOptions {
  autoCreateKit?: boolean;
  kitName?: string;
}

export function useAnalyzeImage() {
  return useMutation({
    mutationFn: async ({ 
      file, 
      options 
    }: { 
      file: File; 
      options?: AnalyzeOptions 
    }): Promise<AnalyzeResponse> => {
      const formData = new FormData();
      formData.append('file', file);
      
      if (options?.autoCreateKit !== undefined) {
        formData.append('auto_create_kit', String(options.autoCreateKit));
      }
      if (options?.kitName) {
        formData.append('kit_name', options.kitName);
      }
      
      const response = await fetch('/api/v1/vibe-branding/analyze/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiClient.getToken()}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Analysis failed');
      }
      
      return response.json();
    },
  });
}

export function useAnalyzeUrl() {
  return useMutation({
    mutationFn: async ({ 
      imageUrl, 
      options 
    }: { 
      imageUrl: string; 
      options?: AnalyzeOptions 
    }): Promise<AnalyzeResponse> => {
      const response = await apiClient.post('/api/v1/vibe-branding/analyze/url', {
        image_url: imageUrl,
        auto_create_kit: options?.autoCreateKit ?? true,
        kit_name: options?.kitName,
      });
      
      return response;
    },
  });
}

export function useVibeBrandingUsage() {
  return useQuery({
    queryKey: ['vibe-branding', 'usage'],
    queryFn: async (): Promise<UsageResponse> => {
      return apiClient.get('/api/v1/vibe-branding/usage');
    },
  });
}
```

### 3.5 Main Modal Component

**File:** `tsx/apps/web/src/components/vibe-branding/VibeBrandingModal.tsx`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles, X } from 'lucide-react';

import { useAnalyzeImage, useVibeBrandingUsage } from '@/hooks/useVibeBranding';
import { UploadDropzone } from './UploadDropzone';
import { AnalyzingTerminal } from './AnalyzingTerminal';
import { VibeResultsDisplay } from './VibeResultsDisplay';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from './constants';
import type { VibeAnalysis, VibeBrandingStep } from './types';

interface VibeBrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKitCreated?: (kitId: string) => void;
}

export function VibeBrandingModal({ 
  isOpen, 
  onClose, 
  onKitCreated 
}: VibeBrandingModalProps) {
  const [step, setStep] = useState<VibeBrandingStep>('upload');
  const [analysis, setAnalysis] = useState<VibeAnalysis | null>(null);
  const [brandKitId, setBrandKitId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { data: usage } = useVibeBrandingUsage();
  const analyzeMutation = useAnalyzeImage();
  
  const handleDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('Image must be under 10MB');
      return;
    }
    
    setStep('analyzing');
    setError(null);
    
    try {
      const result = await analyzeMutation.mutateAsync({
        file,
        options: { autoCreateKit: true }
      });
      
      setAnalysis(result.analysis);
      setBrandKitId(result.brand_kit_id);
      setStep('success');
      
      // Celebration!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      if (result.brand_kit_id && onKitCreated) {
        onKitCreated(result.brand_kit_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setStep('error');
    }
  }, [analyzeMutation, onKitCreated]);
  
  const handleReset = () => {
    setStep('upload');
    setAnalysis(null);
    setBrandKitId(null);
    setError(null);
  };
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: 1,
    disabled: step === 'analyzing',
  });
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-background-surface border border-border-subtle rounded-xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-border-subtle flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-interactive-600" />
              Vibe Branding
            </h2>
            <p className="text-text-secondary text-sm">
              Upload a screenshot. Extract the aesthetic.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-background-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Usage indicator */}
        {usage && step === 'upload' && (
          <div className="px-6 py-2 bg-background-elevated border-b border-border-subtle">
            <p className="text-xs text-text-muted">
              {usage.remaining} of {usage.limit} analyses remaining this month
            </p>
          </div>
        )}
        
        {/* Content */}
        <div className="p-8 min-h-[400px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <UploadDropzone
                getRootProps={getRootProps}
                getInputProps={getInputProps}
                isDragActive={isDragActive}
              />
            )}
            
            {step === 'analyzing' && (
              <AnalyzingTerminal />
            )}
            
            {step === 'success' && analysis && (
              <VibeResultsDisplay
                analysis={analysis}
                brandKitId={brandKitId}
                onClose={onClose}
                onReset={handleReset}
              />
            )}
            
            {step === 'error' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <p className="text-red-500 mb-4">{error}</p>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-interactive-600 text-white rounded-lg hover:bg-interactive-500"
                >
                  Try Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
```

### 3.6 Terminal Animation Component

**File:** `tsx/apps/web/src/components/vibe-branding/AnalyzingTerminal.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TERMINAL_MESSAGES } from './constants';

export function AnalyzingTerminal() {
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i >= TERMINAL_MESSAGES.length) {
        clearInterval(interval);
        return;
      }
      setLogs(prev => [...prev, TERMINAL_MESSAGES[i]]);
      i++;
    }, 700);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="font-mono text-sm"
    >
      {/* Status header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <span className="text-interactive-500 font-bold tracking-widest">
          GEMINI VISION ACTIVE
        </span>
      </div>
      
      {/* Terminal logs */}
      <div className="space-y-2 bg-background-elevated p-4 rounded-lg border border-border-subtle">
        {logs.map((log, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-green-400/80"
          >
            <span className="text-text-muted mr-2">{'>'}</span>
            {log}
          </motion.div>
        ))}
        
        {/* Blinking cursor */}
        <motion.div
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="w-2 h-4 bg-green-500 inline-block align-middle ml-4"
        />
      </div>
      
      {/* Progress hint */}
      <p className="text-text-muted text-xs mt-4 text-center">
        Analyzing visual patterns and extracting brand identity...
      </p>
    </motion.div>
  );
}
```

### 3.7 Results Display Component

**File:** `tsx/apps/web/src/components/vibe-branding/VibeResultsDisplay.tsx`

```typescript
'use client';

import { motion } from 'framer-motion';
import { Check, ArrowRight, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { ColorPalettePreview } from './ColorPalettePreview';
import { LIGHTING_MOOD_LABELS, TONE_LABELS } from './constants';
import type { VibeAnalysis } from './types';

interface VibeResultsDisplayProps {
  analysis: VibeAnalysis;
  brandKitId: string | null;
  onClose: () => void;
  onReset: () => void;
}

export function VibeResultsDisplay({
  analysis,
  brandKitId,
  onClose,
  onReset,
}: VibeResultsDisplayProps) {
  const router = useRouter();
  
  const handleGenerateNow = () => {
    if (brandKitId) {
      router.push(`/dashboard/create?vibe_kit=${brandKitId}`);
    }
    onClose();
  };
  
  const handleSaveAndClose = () => {
    onClose();
    // Optionally navigate to brand kits
    router.push('/dashboard/brand-kits');
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Success header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-green-400">
          <Check className="w-5 h-5" />
          <span className="font-bold">Aesthetic Extracted Successfully</span>
        </div>
        <button
          onClick={onReset}
          className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-background-elevated transition-colors"
          title="Analyze another image"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
      
      {/* Color palette */}
      <ColorPalettePreview
        primaryColors={analysis.primary_colors}
        accentColors={analysis.accent_colors}
      />
      
      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-background-elevated p-4 rounded-lg">
          <p className="text-xs text-text-muted uppercase font-bold mb-1">
            Detected Vibe
          </p>
          <p className="text-text-primary">
            {TONE_LABELS[analysis.tone] || analysis.tone}
          </p>
        </div>
        <div className="bg-background-elevated p-4 rounded-lg">
          <p className="text-xs text-text-muted uppercase font-bold mb-1">
            Lighting
          </p>
          <p className="text-text-primary">
            {LIGHTING_MOOD_LABELS[analysis.lighting_mood] || analysis.lighting_mood}
          </p>
        </div>
        <div className="bg-background-elevated p-4 rounded-lg">
          <p className="text-xs text-text-muted uppercase font-bold mb-1">
            Headline Font
          </p>
          <p className="text-text-primary" style={{ fontFamily: analysis.fonts.headline }}>
            {analysis.fonts.headline}
          </p>
        </div>
        <div className="bg-background-elevated p-4 rounded-lg">
          <p className="text-xs text-text-muted uppercase font-bold mb-1">
            Body Font
          </p>
          <p className="text-text-primary" style={{ fontFamily: analysis.fonts.body }}>
            {analysis.fonts.body}
          </p>
        </div>
      </div>
      
      {/* Style keywords */}
      <div className="flex flex-wrap gap-2">
        {analysis.style_keywords.map((keyword, i) => (
          <span
            key={i}
            className="px-3 py-1 bg-interactive-600/20 text-interactive-400 text-xs rounded-full border border-interactive-600/30"
          >
            {keyword}
          </span>
        ))}
      </div>
      
      {/* Confidence indicator */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <div className="flex-1 h-1 bg-background-elevated rounded-full overflow-hidden">
          <div 
            className="h-full bg-interactive-600 rounded-full"
            style={{ width: `${analysis.confidence * 100}%` }}
          />
        </div>
        <span>{Math.round(analysis.confidence * 100)}% confidence</span>
      </div>
      
      {/* CTAs */}
      <div className="pt-4 flex gap-3">
        <button
          onClick={handleSaveAndClose}
          className="flex-1 py-3 bg-background-elevated hover:bg-background-surface text-text-primary rounded-lg font-medium transition-colors border border-border-subtle"
        >
          Save to Brand Kits
        </button>
        <button
          onClick={handleGenerateNow}
          className="flex-[2] py-3 bg-interactive-600 hover:bg-interactive-500 text-white rounded-lg font-bold shadow-lg shadow-interactive-900/20 flex items-center justify-center gap-2 transition-colors"
        >
          Generate Assets Now
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
```

---

## 4. INTEGRATION POINTS

### 4.1 Create Page Integration

When user clicks "Generate Assets Now", redirect to `/dashboard/create?vibe_kit={kit_id}`.

The Create page should:
1. Detect `vibe_kit` query param
2. Auto-select the brand kit
3. Pre-fill prompt with `style_reference` from the kit
4. Show a banner: "Generating with your stolen vibe ✨"

### 4.2 Brand Kits Page Integration

Add "Import from Image" button that opens VibeBrandingModal.

### 4.3 Sidebar Navigation

Add "Vibe Branding" nav item with sparkle icon.

### 4.4 Onboarding Integration

After signup, offer Vibe Branding as an alternative to manual brand kit creation.

---

## 5. TESTING REQUIREMENTS

### 5.1 Backend Tests

```python
# backend/tests/unit/test_vibe_branding_service.py

def test_validate_analysis_normalizes_colors():
    """Test that invalid colors are replaced with fallbacks."""
    
def test_validate_analysis_validates_fonts():
    """Test that unsupported fonts are replaced with defaults."""
    
def test_cache_lookup_returns_cached_result():
    """Test that cached analyses are returned without API call."""
    
def test_quota_check_respects_tier_limits():
    """Test that quota limits are enforced per tier."""
```

### 5.2 Frontend Tests

```typescript
// tsx/apps/web/src/components/vibe-branding/__tests__/VibeBrandingModal.test.tsx

describe('VibeBrandingModal', () => {
  it('shows upload state initially');
  it('transitions to analyzing state on file drop');
  it('shows success state with analysis results');
  it('shows error state on failure');
  it('fires confetti on success');
  it('calls onKitCreated with brand kit ID');
});
```

---

## 6. IMPLEMENTATION TASKS

### Phase 1: Backend (Estimated: 4-6 hours)
- [ ] Create `gemini_vision_client.py`
- [ ] Create `vibe_branding_service.py`
- [ ] Create `vibe_branding.py` schemas
- [ ] Create `vibe_branding.py` routes
- [ ] Add database migrations
- [ ] Add usage tracking RPC function
- [ ] Write unit tests

### Phase 2: Frontend (Estimated: 4-6 hours)
- [ ] Create component structure
- [ ] Implement `VibeBrandingModal`
- [ ] Implement `AnalyzingTerminal`
- [ ] Implement `VibeResultsDisplay`
- [ ] Create `useVibeBranding` hook
- [ ] Add to sidebar navigation
- [ ] Integrate with Create page
- [ ] Write component tests

### Phase 3: Integration (Estimated: 2-3 hours)
- [ ] Add to Brand Kits page
- [ ] Add to onboarding flow
- [ ] Add analytics tracking
- [ ] End-to-end testing

---

## 7. FUTURE ENHANCEMENTS

### 7.1 Side-by-Side Comparison
Show "Inspiration" (blurred original) vs "Your Version" (generated asset).

### 7.2 Viral Sharing
"Tweet this Heist" button with auto-generated comparison image.

### 7.3 Preset Vibes
Pre-analyzed vibes from popular streamers (with permission or public domain).

### 7.4 Batch Analysis
Analyze multiple images and merge into a single brand kit.

---

*This design document serves as the authoritative reference for implementing Vibe Branding. Subagents should follow this spec exactly.*


---

# PART 2: THE AURA LAB

## 8. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│  tsx/apps/web/src/                                                          │
│  ├── app/dashboard/aura-lab/page.tsx    # Main lab page                     │
│  ├── components/aura-lab/                                                   │
│  │   ├── FusionReactor.tsx              # Core fusion interface             │
│  │   ├── TestSubjectSlot.tsx            # Upload/lock subject               │
│  │   ├── ElementGrid.tsx                # Periodic table of elements        │
│  │   ├── ElementCard.tsx                # Individual draggable element      │
│  │   ├── FusionCore.tsx                 # Central animated core             │
│  │   ├── FusionAnimation.tsx            # Processing animation              │
│  │   ├── ResultReveal.tsx               # Result card with rarity           │
│  │   ├── InventoryGallery.tsx           # Saved fusions grid                │
│  │   ├── RarityBadge.tsx                # Common/Rare/Mythic badge          │
│  │   ├── DiscoveryBanner.tsx            # "New Recipe" animation            │
│  │   ├── SquadFusionMode.tsx            # Two-player fusion UI              │
│  │   ├── constants.ts                   # Elements, sounds, etc.            │
│  │   └── types.ts                       # TypeScript interfaces             │
│  └── hooks/                                                                 │
│      ├── useAuraLab.ts                  # Main lab state/API hook           │
│      ├── useFusion.ts                   # Fusion mutation                   │
│      └── useInventory.ts                # Inventory query                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                         │
│  backend/                                                                    │
│  ├── api/routes/aura_lab.py             # API endpoints                     │
│  ├── api/schemas/aura_lab.py            # Pydantic schemas                  │
│  ├── services/aura_lab_service.py       # Core fusion logic                 │
│  ├── services/rarity_service.py         # AI rarity scoring                 │
│  └── prompts/aura-lab/                                                      │
│      ├── fusion_v1.yaml                 # Fusion prompt template            │
│      └── rarity_v1.yaml                 # Rarity scoring prompt             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. BACKEND IMPLEMENTATION

### 9.1 Aura Lab Service

**File:** `backend/services/aura_lab_service.py`

```python
"""
Aura Lab Service - Fusion reactor for emote experimentation.

Handles:
1. Test subject upload and session management
2. Element fusion with identity preservation
3. Rarity scoring via Gemini
4. Recipe discovery tracking
5. Squad fusion invites
"""

import os
import uuid
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel

from backend.services.gemini_vision_client import GeminiVisionClient, VisionAnalysisRequest
from backend.services.storage_service import StorageService
from backend.database.supabase_client import get_supabase_client


class FusionResult(BaseModel):
    """Result of a fusion operation."""
    fusion_id: str
    image_url: str
    rarity: str  # common, rare, mythic
    scores: dict
    is_first_discovery: bool
    recipe_id: Optional[str]


class RarityScores(BaseModel):
    """AI-generated rarity scores."""
    visual_impact: int
    creativity: int
    meme_potential: int
    technical_quality: int
    commentary: str


# Element definitions
ELEMENTS = {
    "fire": {
        "name": "Fire",
        "description": "Blue flames, glowing ember eyes, heat distortion, phoenix energy",
        "premium": False
    },
    "ice": {
        "name": "Ice",
        "description": "Frozen solid, crystalline structure, frost particles, cold blue tones",
        "premium": False
    },
    "clown": {
        "name": "Clown",
        "description": "Rainbow afro hair, red nose, white face paint, colorful makeup",
        "premium": False
    },
    "gigachad": {
        "name": "GigaChad",
        "description": "Chiseled jawline, intense gaze, sigma male energy, black and white",
        "premium": False
    },
    "mecha": {
        "name": "Mecha",
        "description": "Robotic armor plating, LED eyes, chrome finish, transformer aesthetic",
        "premium": False
    },
    "zombie": {
        "name": "Zombie",
        "description": "Green rotting skin, exposed bones, undead eyes, horror movie style",
        "premium": False
    },
    "gold": {
        "name": "Gold",
        "description": "Solid 24k gold statue, luxury shine, trophy aesthetic",
        "premium": False
    },
    "ghost": {
        "name": "Ghost",
        "description": "Translucent ethereal form, floating, spooky glow, paranormal",
        "premium": False
    },
    "pixel": {
        "name": "Pixel",
        "description": "16-bit retro game style, limited color palette, NES aesthetic",
        "premium": False
    },
    "skull": {
        "name": "Skull",
        "description": "Skeletal face, Day of the Dead decorations, bone white, gothic",
        "premium": False
    },
    "rainbow": {
        "name": "Rainbow",
        "description": "Pride flag colors, sparkles, glitter, celebration energy",
        "premium": False
    },
    "electric": {
        "name": "Electric",
        "description": "Lightning bolts, neon glow, energy crackling, storm power",
        "premium": False
    },
    # Premium elements
    "cyberpunk": {
        "name": "Cyberpunk",
        "description": "Neon city reflections, chrome implants, Blade Runner aesthetic",
        "premium": True
    },
    "8bit": {
        "name": "8-Bit",
        "description": "NES-style pixel art, 8-color palette, chunky pixels",
        "premium": True
    },
    "noir": {
        "name": "Noir",
        "description": "Black and white, film grain, dramatic shadows, detective style",
        "premium": True
    },
    "vaporwave": {
        "name": "Vaporwave",
        "description": "Pink and cyan, glitch effects, 80s aesthetic, palm trees",
        "premium": True
    },
    "anime": {
        "name": "Anime",
        "description": "Cel-shaded, big expressive eyes, speed lines, Japanese style",
        "premium": True
    },
    "horror": {
        "name": "Horror",
        "description": "Gore, blood splatter, creepy smile, unsettling, nightmare",
        "premium": True
    },
    "steampunk": {
        "name": "Steampunk",
        "description": "Brass gears, Victorian goggles, steam pipes, clockwork",
        "premium": True
    },
    "hologram": {
        "name": "Hologram",
        "description": "Translucent blue projection, scan lines, futuristic, sci-fi",
        "premium": True
    },
}

FUSION_PROMPT_TEMPLATE = """
You are a visual alchemist specializing in identity transformation.

INPUT A (Base Identity): [Attached Image]
INPUT B (Element): {element_name} - {element_description}

TASK:
Transform INPUT A using the essence of INPUT B to create a "Twitch Emote" style sticker.

CRITICAL RULES:

1. IDENTITY PRESERVATION (Non-negotiable):
   - The facial features, hair shape, and key accessories of INPUT A must be clearly recognizable
   - If Input A is a person, the result must look like that person
   - If Input A is a logo, preserve the overall silhouette and key symbols
   - The result should pass the "squint test" - recognizable at 28px

2. MATERIAL TRANSFORMATION:
   - The texture, color palette, and physical substance must be 100% derived from INPUT B
   - Make the transformation dramatic and obvious

3. STYLE REQUIREMENTS:
   - Thick white sticker outline (3-4px)
   - Vector illustration style
   - High contrast for chat readability
   - Expressive, exaggerated features
   - Clean edges, no fine details that disappear at small sizes

4. OUTPUT:
   - Single square image
   - Solid neon-green background (#00FF00) for easy removal
   - Centered composition
   - No text
"""

RARITY_PROMPT = """
You are an art critic evaluating a generated emote/sticker.

Rate this image on a scale of 1-10 for each category:

1. VISUAL IMPACT: How bold and eye-catching is it? Does it pop?
2. CREATIVITY: How unexpected or clever is the combination?
3. MEME POTENTIAL: Would people share this? Is it funny/cool/cursed?
4. TECHNICAL QUALITY: Are the lines clean? Is the composition good?

Return ONLY valid JSON:
{
  "visual_impact": X,
  "creativity": X,
  "meme_potential": X,
  "technical_quality": X,
  "commentary": "One sentence reaction"
}

Be honest but generous. Most results should score 5-7 average.
Reserve 9-10 for truly exceptional outputs.
"""


class AuraLabService:
    """Service for The Aura Lab feature."""
    
    TIER_LIMITS = {
        "free": 5,
        "pro": 20,
        "studio": 999999
    }
    
    def __init__(self):
        self.vision_client = GeminiVisionClient(
            api_key=os.environ.get("GOOGLE_API_KEY")
        )
        self.storage = StorageService()
        self.supabase = get_supabase_client()
    
    async def set_subject(
        self,
        user_id: str,
        image_data: bytes,
        mime_type: str
    ) -> dict:
        """Upload and lock in a test subject for the session."""
        
        # Upload to storage
        subject_id = str(uuid.uuid4())
        storage_path = f"aura-lab/subjects/{user_id}/{subject_id}.png"
        image_url = await self.storage.upload(storage_path, image_data, mime_type)
        
        # Save to database
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        self.supabase.table("aura_lab_subjects").insert({
            "id": subject_id,
            "user_id": user_id,
            "image_url": image_url,
            "storage_path": storage_path,
            "expires_at": expires_at.isoformat()
        }).execute()
        
        return {
            "subject_id": subject_id,
            "image_url": image_url,
            "expires_at": expires_at.isoformat() + "Z"
        }
    
    async def fuse(
        self,
        user_id: str,
        subject_id: str,
        element_id: str,
        tier: str
    ) -> FusionResult:
        """Perform a fusion between subject and element."""
        
        # Validate element
        if element_id not in ELEMENTS:
            raise ValueError(f"Unknown element: {element_id}")
        
        element = ELEMENTS[element_id]
        
        # Check premium access
        if element["premium"] and tier == "free":
            raise PermissionError("Premium element requires Pro or Studio tier")
        
        # Check daily limit
        can_fuse = await self._check_daily_limit(user_id, tier)
        if not can_fuse:
            raise PermissionError("Daily fusion limit reached")
        
        # Get subject image
        subject = self.supabase.table("aura_lab_subjects") \
            .select("image_url, storage_path") \
            .eq("id", subject_id) \
            .eq("user_id", user_id) \
            .single() \
            .execute()
        
        if not subject.data:
            raise ValueError("Subject not found or expired")
        
        # Download subject image
        subject_image = await self.storage.download(subject.data["storage_path"])
        
        # Build fusion prompt
        prompt = FUSION_PROMPT_TEMPLATE.format(
            element_name=element["name"],
            element_description=element["description"]
        )
        
        # Call Gemini for fusion (image generation)
        from backend.services.nano_banana_client import NanoBananaClient, GenerationRequest
        
        gen_client = NanoBananaClient(api_key=os.environ.get("GOOGLE_API_KEY"))
        
        # For multimodal fusion, we need to use vision + generation
        # This is a simplified version - real implementation would use
        # Gemini's multimodal capabilities with image input
        fusion_prompt = f"{prompt}\n\nBase image is attached."
        
        gen_request = GenerationRequest(
            prompt=fusion_prompt,
            width=512,
            height=512
        )
        
        gen_response = await gen_client.generate(gen_request)
        
        # Upload result
        fusion_id = str(uuid.uuid4())
        storage_path = f"aura-lab/fusions/{user_id}/{fusion_id}.png"
        image_url = await self.storage.upload(
            storage_path, 
            gen_response.image_data, 
            "image/png"
        )
        
        # Score rarity
        scores = await self._score_rarity(gen_response.image_data)
        rarity = self._calculate_rarity(scores)
        
        # Check for first discovery
        is_first, recipe_id = await self._check_discovery(element_id, user_id)
        
        # Save fusion
        self.supabase.table("aura_lab_fusions").insert({
            "id": fusion_id,
            "user_id": user_id,
            "subject_id": subject_id,
            "element_id": element_id,
            "image_url": image_url,
            "storage_path": storage_path,
            "rarity": rarity,
            "scores": scores.model_dump(),
            "recipe_id": recipe_id
        }).execute()
        
        # Increment usage
        await self._increment_usage(user_id)
        
        return FusionResult(
            fusion_id=fusion_id,
            image_url=image_url,
            rarity=rarity,
            scores=scores.model_dump(),
            is_first_discovery=is_first,
            recipe_id=recipe_id
        )
    
    async def _score_rarity(self, image_data: bytes) -> RarityScores:
        """Use Gemini to score the fusion result."""
        
        request = VisionAnalysisRequest(
            image_data=image_data,
            prompt=RARITY_PROMPT,
            mime_type="image/png"
        )
        
        response = await self.vision_client.analyze(request)
        
        return RarityScores(
            visual_impact=response.result.get("visual_impact", 5),
            creativity=response.result.get("creativity", 5),
            meme_potential=response.result.get("meme_potential", 5),
            technical_quality=response.result.get("technical_quality", 5),
            commentary=response.result.get("commentary", "Nice fusion!")
        )
    
    def _calculate_rarity(self, scores: RarityScores) -> str:
        """Calculate rarity tier from scores."""
        total = (
            scores.visual_impact + 
            scores.creativity + 
            scores.meme_potential + 
            scores.technical_quality
        )
        
        if total >= 36:  # 90%+ average
            return "mythic"
        elif total >= 28:  # 70%+ average
            return "rare"
        return "common"
    
    async def _check_discovery(
        self, 
        element_id: str, 
        user_id: str
    ) -> tuple[bool, Optional[str]]:
        """Check if this is a first discovery."""
        
        # Check if recipe exists
        existing = self.supabase.table("aura_lab_recipes") \
            .select("id") \
            .eq("element_id", element_id) \
            .single() \
            .execute()
        
        if existing.data:
            # Increment usage count
            self.supabase.table("aura_lab_recipes") \
                .update({"times_used": existing.data["times_used"] + 1}) \
                .eq("id", existing.data["id"]) \
                .execute()
            return False, existing.data["id"]
        
        # First discovery!
        recipe_id = str(uuid.uuid4())
        self.supabase.table("aura_lab_recipes").insert({
            "id": recipe_id,
            "element_id": element_id,
            "first_user_id": user_id
        }).execute()
        
        return True, recipe_id
    
    async def _check_daily_limit(self, user_id: str, tier: str) -> bool:
        """Check if user can perform another fusion today."""
        limit = self.TIER_LIMITS.get(tier, 5)
        
        result = self.supabase.rpc(
            "check_aura_lab_usage",
            {"p_user_id": user_id, "p_limit": limit}
        ).execute()
        
        return result.data
    
    async def _increment_usage(self, user_id: str):
        """Increment daily fusion count."""
        self.supabase.rpc(
            "increment_aura_lab_usage",
            {"p_user_id": user_id}
        ).execute()
    
    async def keep_fusion(self, user_id: str, fusion_id: str) -> bool:
        """Mark a fusion as kept (saved to inventory)."""
        
        result = self.supabase.table("aura_lab_fusions") \
            .update({"is_kept": True}) \
            .eq("id", fusion_id) \
            .eq("user_id", user_id) \
            .execute()
        
        return len(result.data) > 0
    
    async def get_inventory(
        self, 
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> dict:
        """Get user's saved fusions."""
        
        result = self.supabase.table("aura_lab_fusions") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("is_kept", True) \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()
        
        # Count by rarity
        counts = self.supabase.table("aura_lab_fusions") \
            .select("rarity", count="exact") \
            .eq("user_id", user_id) \
            .eq("is_kept", True) \
            .execute()
        
        mythic = sum(1 for f in result.data if f["rarity"] == "mythic")
        rare = sum(1 for f in result.data if f["rarity"] == "rare")
        common = sum(1 for f in result.data if f["rarity"] == "common")
        
        return {
            "fusions": result.data,
            "total": len(result.data),
            "mythic_count": mythic,
            "rare_count": rare,
            "common_count": common
        }
    
    async def get_usage(self, user_id: str, tier: str) -> dict:
        """Get user's daily fusion usage."""
        
        limit = self.TIER_LIMITS.get(tier, 5)
        
        result = self.supabase.table("users") \
            .select("aura_lab_fusions_today, aura_lab_last_fusion_date") \
            .eq("id", user_id) \
            .single() \
            .execute()
        
        used = result.data.get("aura_lab_fusions_today", 0) if result.data else 0
        last_date = result.data.get("aura_lab_last_fusion_date") if result.data else None
        
        # Reset if new day
        from datetime import date
        if last_date and last_date != str(date.today()):
            used = 0
        
        # Calculate reset time (midnight UTC)
        tomorrow = date.today() + timedelta(days=1)
        resets_at = datetime.combine(tomorrow, datetime.min.time())
        
        return {
            "used_today": used,
            "limit": limit,
            "remaining": max(0, limit - used),
            "resets_at": resets_at.isoformat() + "Z"
        }
```

---

## 10. API SCHEMAS

**File:** `backend/api/schemas/aura_lab.py`

```python
"""
Pydantic schemas for The Aura Lab endpoints.
"""

from typing import Optional, List, Literal
from pydantic import BaseModel, Field


RarityType = Literal["common", "rare", "mythic"]


class SetSubjectResponse(BaseModel):
    """Response after setting test subject."""
    subject_id: str
    image_url: str
    expires_at: str


class FuseRequest(BaseModel):
    """Request to perform a fusion."""
    subject_id: str = Field(..., description="ID of the locked test subject")
    element_id: str = Field(..., description="Element to fuse with")


class RarityScoresSchema(BaseModel):
    """AI-generated rarity scores."""
    visual_impact: int = Field(..., ge=1, le=10)
    creativity: int = Field(..., ge=1, le=10)
    meme_potential: int = Field(..., ge=1, le=10)
    technical_quality: int = Field(..., ge=1, le=10)
    commentary: str


class FuseResponse(BaseModel):
    """Response from fusion operation."""
    fusion_id: str
    image_url: str
    rarity: RarityType
    scores: RarityScoresSchema
    is_first_discovery: bool
    recipe_id: Optional[str] = None


class KeepRequest(BaseModel):
    """Request to keep a fusion."""
    fusion_id: str


class FusionItem(BaseModel):
    """Single fusion in inventory."""
    id: str
    image_url: str
    element_id: str
    rarity: RarityType
    scores: RarityScoresSchema
    created_at: str


class InventoryResponse(BaseModel):
    """User's fusion inventory."""
    fusions: List[FusionItem]
    total: int
    mythic_count: int
    rare_count: int
    common_count: int


class UsageResponse(BaseModel):
    """Daily fusion usage."""
    used_today: int
    limit: int
    remaining: int
    resets_at: str


class ElementSchema(BaseModel):
    """Element definition."""
    id: str
    name: str
    icon: str
    description: str
    premium: bool


class ElementsResponse(BaseModel):
    """Available elements."""
    elements: List[ElementSchema]
    premium_locked: bool


# Squad Fusion schemas
class SquadInviteResponse(BaseModel):
    """Response after creating squad invite."""
    invite_code: str
    invite_url: str
    expires_at: str


class SquadAcceptRequest(BaseModel):
    """Request to accept squad fusion."""
    invite_code: str
    my_subject_id: str


class SquadFusionResponse(BaseModel):
    """Response from squad fusion."""
    fusion_id: str
    image_url: str
    rarity: RarityType
    partner_display_name: str
```

---

## 11. API ROUTES

**File:** `backend/api/routes/aura_lab.py`

```python
"""
API routes for The Aura Lab feature.
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from typing import Optional

from backend.api.schemas.aura_lab import (
    SetSubjectResponse,
    FuseRequest,
    FuseResponse,
    KeepRequest,
    InventoryResponse,
    UsageResponse,
    ElementsResponse,
    ElementSchema,
    SquadInviteResponse,
    SquadAcceptRequest,
    SquadFusionResponse,
)
from backend.services.aura_lab_service import AuraLabService, ELEMENTS
from backend.api.dependencies import get_current_user
from backend.api.schemas.auth import TokenPayload


router = APIRouter(prefix="/api/v1/aura-lab", tags=["Aura Lab"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/set-subject", response_model=SetSubjectResponse)
async def set_subject(
    file: UploadFile = File(...),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Upload and lock in a test subject for fusion experiments."""
    
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, "Only JPEG, PNG, and WebP images supported")
    
    image_data = await file.read()
    if len(image_data) > MAX_FILE_SIZE:
        raise HTTPException(400, "Image must be under 10MB")
    
    service = AuraLabService()
    result = await service.set_subject(
        current_user.sub,
        image_data,
        file.content_type
    )
    
    return SetSubjectResponse(**result)


@router.post("/fuse", response_model=FuseResponse)
async def fuse(
    request: FuseRequest,
    current_user: TokenPayload = Depends(get_current_user)
):
    """Perform a fusion between test subject and element."""
    
    service = AuraLabService()
    
    try:
        result = await service.fuse(
            current_user.sub,
            request.subject_id,
            request.element_id,
            current_user.tier
        )
        return FuseResponse(
            fusion_id=result.fusion_id,
            image_url=result.image_url,
            rarity=result.rarity,
            scores=result.scores,
            is_first_discovery=result.is_first_discovery,
            recipe_id=result.recipe_id
        )
    except PermissionError as e:
        raise HTTPException(403, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/keep")
async def keep_fusion(
    request: KeepRequest,
    current_user: TokenPayload = Depends(get_current_user)
):
    """Save a fusion to inventory."""
    
    service = AuraLabService()
    success = await service.keep_fusion(current_user.sub, request.fusion_id)
    
    if not success:
        raise HTTPException(404, "Fusion not found")
    
    return {"success": True}


@router.get("/inventory", response_model=InventoryResponse)
async def get_inventory(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: TokenPayload = Depends(get_current_user)
):
    """Get user's saved fusions."""
    
    service = AuraLabService()
    result = await service.get_inventory(current_user.sub, limit, offset)
    
    return InventoryResponse(**result)


@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    current_user: TokenPayload = Depends(get_current_user)
):
    """Get daily fusion usage."""
    
    service = AuraLabService()
    result = await service.get_usage(current_user.sub, current_user.tier)
    
    return UsageResponse(**result)


@router.get("/elements", response_model=ElementsResponse)
async def get_elements(
    current_user: TokenPayload = Depends(get_current_user)
):
    """Get available elements."""
    
    is_premium = current_user.tier in ["pro", "studio"]
    
    elements = []
    for element_id, element in ELEMENTS.items():
        elements.append(ElementSchema(
            id=element_id,
            name=element["name"],
            icon=get_element_icon(element_id),
            description=element["description"],
            premium=element["premium"]
        ))
    
    return ElementsResponse(
        elements=elements,
        premium_locked=not is_premium
    )


def get_element_icon(element_id: str) -> str:
    """Get emoji icon for element."""
    icons = {
        "fire": "🔥", "ice": "🧊", "clown": "🤡", "gigachad": "🗿",
        "mecha": "🤖", "zombie": "🧟", "gold": "👑", "ghost": "👻",
        "pixel": "🎮", "skull": "💀", "rainbow": "🌈", "electric": "⚡",
        "cyberpunk": "🌃", "8bit": "👾", "noir": "🎬", "vaporwave": "🌴",
        "anime": "🎌", "horror": "🩸", "steampunk": "⚙️", "hologram": "💠"
    }
    return icons.get(element_id, "✨")


# Squad Fusion endpoints
@router.post("/squad/invite", response_model=SquadInviteResponse)
async def create_squad_invite(
    subject_id: str,
    current_user: TokenPayload = Depends(get_current_user)
):
    """Create a squad fusion invite."""
    
    if current_user.tier == "free":
        raise HTTPException(403, "Squad Fusion requires Pro or Studio tier")
    
    # Implementation would create invite in database
    # and return shareable link
    pass


@router.post("/squad/accept", response_model=SquadFusionResponse)
async def accept_squad_invite(
    request: SquadAcceptRequest,
    current_user: TokenPayload = Depends(get_current_user)
):
    """Accept a squad fusion invite and complete the fusion."""
    
    # Implementation would:
    # 1. Validate invite code
    # 2. Get both subjects
    # 3. Perform 50/50 fusion
    # 4. Return result to both users
    pass
```

---
