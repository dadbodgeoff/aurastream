"""
Vibe Branding Service - Extract brand identity from images.

Orchestrates:
1. Image validation
2. Cache lookup
3. Gemini Vision analysis
4. Brand kit creation

This service uses the GeminiVisionClient to analyze images and extract
comprehensive brand identity information including colors, fonts, tone,
and style references. Results are cached for 24 hours to reduce API calls.

Features:
- Image analysis via Gemini Vision
- Result validation and normalization
- 24-hour caching in vibe_analysis_cache table
- Brand kit creation from analysis
- Tier-based usage quota tracking

Tier Limits:
- free: 1 analysis/month
- pro: 5 analyses/month
- studio: unlimited (999999)
"""

import hashlib
import re
from datetime import datetime, timedelta, timezone
from typing import Optional, List

from pydantic import BaseModel

from backend.services.gemini_vision_client import (
    GeminiVisionClient,
    VisionAnalysisRequest,
    get_gemini_vision_client,
)
from backend.services.brand_kit_service import BrandKitService, get_brand_kit_service
from backend.database.supabase_client import get_supabase_client
from backend.api.schemas.brand_kit import SUPPORTED_FONTS


# ============================================================================
# Models
# ============================================================================

class VibeAnalysis(BaseModel):
    """Validated vibe analysis result."""
    primary_colors: List[str]      # 5 hex codes
    accent_colors: List[str]       # 3 hex codes
    fonts: dict                    # {headline, body}
    tone: str                      # Brand tone
    style_reference: str           # Description for prompts
    lighting_mood: str             # neon/natural/dramatic/cozy/high-contrast
    style_keywords: List[str]      # 3-5 keywords
    text_vibe: Optional[str]       # Typography style description
    confidence: float              # 0-1
    source_image_hash: str
    analyzed_at: str


# ============================================================================
# Constants
# ============================================================================

# Note: Tier limits are now managed by usage_limit_service (migration 031)
# These are kept for reference but the actual limits come from the database
TIER_LIMITS = {
    "free": 1,   # 1/month
    "pro": 10,   # 10/month
    "studio": 10 # 10/month
}

VALID_TONES = ["competitive", "casual", "educational", "comedic", "professional"]
VALID_LIGHTING_MOODS = ["neon", "natural", "dramatic", "cozy", "high-contrast"]

VIBE_ANALYSIS_PROMPT = """You are an expert visual designer analyzing streamer/content creator aesthetics.

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

Focus on extracting a cohesive brand identity that could be used to generate matching assets."""


# ============================================================================
# Service
# ============================================================================

class VibeBrandingService:
    """
    Service for Vibe Branding feature.
    
    Provides image analysis capabilities to extract brand identity
    from uploaded images using Gemini Vision AI.
    
    Example:
        service = VibeBrandingService()
        
        # Check quota first
        quota = await service.check_user_quota(user_id, "pro")
        if quota["can_analyze"]:
            analysis = await service.analyze_image(image_bytes, "image/jpeg")
            brand_kit = await service.create_brand_kit_from_analysis(
                analysis, user_id, "My New Brand"
            )
            await service.increment_usage(user_id)
    """
    
    def __init__(
        self,
        vision_client: Optional[GeminiVisionClient] = None,
        supabase_client=None,
        brand_kit_service: Optional[BrandKitService] = None
    ):
        """
        Initialize the Vibe Branding service.
        
        Args:
            vision_client: GeminiVisionClient instance (uses singleton if not provided)
            supabase_client: Supabase client instance (uses singleton if not provided)
            brand_kit_service: BrandKitService instance (uses singleton if not provided)
        """
        self._vision_client = vision_client
        self._supabase = supabase_client
        self._brand_kit_service = brand_kit_service
    
    @property
    def vision_client(self) -> GeminiVisionClient:
        """Lazy-load Gemini Vision client."""
        if self._vision_client is None:
            self._vision_client = get_gemini_vision_client()
        return self._vision_client
    
    @property
    def supabase(self):
        """Lazy-load Supabase client."""
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    @property
    def brand_kit_service(self) -> BrandKitService:
        """Lazy-load BrandKitService."""
        if self._brand_kit_service is None:
            self._brand_kit_service = get_brand_kit_service()
        return self._brand_kit_service
    
    async def analyze_image(
        self,
        image_data: bytes,
        mime_type: str = "image/jpeg"
    ) -> VibeAnalysis:
        """
        Analyze an image and extract brand identity.
        
        Args:
            image_data: Raw image bytes
            mime_type: MIME type of the image (default: image/jpeg)
        
        Returns:
            VibeAnalysis with extracted brand identity
        
        Raises:
            RateLimitError: If Gemini API rate limit is exceeded
            ContentPolicyError: If image violates content policy
            GenerationError: For other analysis failures
        """
        # Calculate hash for caching
        image_hash = hashlib.sha256(image_data).hexdigest()
        
        # Check cache first
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
        
        # Validate and normalize
        analysis = self._validate_analysis(response.result, image_hash)
        
        # Cache the result
        await self._cache_analysis(image_hash, analysis)
        
        return analysis
    
    def _validate_analysis(self, raw: dict, image_hash: str) -> VibeAnalysis:
        """
        Validate and normalize the Gemini response.
        
        Ensures all fields are present and valid, applying defaults
        where necessary to guarantee a complete VibeAnalysis.
        
        Args:
            raw: Raw dictionary from Gemini Vision response
            image_hash: SHA256 hash of the source image
        
        Returns:
            Validated and normalized VibeAnalysis
        """
        # Validate colors are hex format
        primary = [c for c in raw.get("primary_colors", []) if self._is_valid_hex(c)][:5]
        accent = [c for c in raw.get("accent_colors", []) if self._is_valid_hex(c)][:3]
        
        # Pad if needed with neutral colors
        while len(primary) < 5:
            primary.append("#808080")
        while len(accent) < 3:
            accent.append("#FFFFFF")
        
        # Validate fonts - must be from SUPPORTED_FONTS list
        fonts = raw.get("fonts", {})
        headline = fonts.get("headline", "Montserrat")
        body = fonts.get("body", "Inter")
        
        if headline not in SUPPORTED_FONTS:
            headline = "Montserrat"
        if body not in SUPPORTED_FONTS:
            body = "Inter"
        
        # Validate tone
        tone = raw.get("tone", "professional")
        if tone not in VALID_TONES:
            tone = "professional"
        
        # Validate lighting mood
        lighting = raw.get("lighting_mood", "natural")
        if lighting not in VALID_LIGHTING_MOODS:
            lighting = "natural"
        
        # Validate style keywords (3-5 keywords)
        style_keywords = raw.get("style_keywords", ["modern"])
        if not isinstance(style_keywords, list):
            style_keywords = ["modern"]
        style_keywords = [str(kw) for kw in style_keywords[:5]]
        if not style_keywords:
            style_keywords = ["modern"]
        
        # Validate text_vibe (can be null)
        text_vibe = raw.get("text_vibe")
        if text_vibe is not None:
            text_vibe = str(text_vibe)[:200]  # Limit length
        
        # Validate confidence (0.0-1.0)
        confidence = raw.get("confidence", 0.7)
        try:
            confidence = float(confidence)
        except (TypeError, ValueError):
            confidence = 0.7
        confidence = min(max(confidence, 0.0), 1.0)
        
        # Validate style_reference
        style_reference = raw.get("style_reference", "Modern digital aesthetic")
        if not isinstance(style_reference, str):
            style_reference = "Modern digital aesthetic"
        style_reference = style_reference[:500]  # Limit length
        
        return VibeAnalysis(
            primary_colors=primary,
            accent_colors=accent,
            fonts={"headline": headline, "body": body},
            tone=tone,
            style_reference=style_reference,
            lighting_mood=lighting,
            style_keywords=style_keywords,
            text_vibe=text_vibe,
            confidence=confidence,
            source_image_hash=image_hash,
            analyzed_at=datetime.now(timezone.utc).isoformat() + "Z"
        )
    
    def _is_valid_hex(self, color: str) -> bool:
        """
        Check if string is valid hex color.
        
        Args:
            color: String to validate
        
        Returns:
            True if valid #RRGGBB format, False otherwise
        """
        if not isinstance(color, str):
            return False
        return bool(re.match(r'^#[0-9A-Fa-f]{6}$', color))
    
    async def _get_cached_analysis(self, image_hash: str) -> Optional[VibeAnalysis]:
        """
        Check cache for existing analysis.
        
        Args:
            image_hash: SHA256 hash of the image
        
        Returns:
            Cached VibeAnalysis if found and not expired, None otherwise
        """
        try:
            result = self.supabase.table("vibe_analysis_cache") \
                .select("analysis") \
                .eq("image_hash", image_hash) \
                .gt("expires_at", datetime.now(timezone.utc).isoformat()) \
                .limit(1) \
                .execute()
            
            if result.data and len(result.data) > 0:
                return VibeAnalysis(**result.data[0]["analysis"])
        except Exception:
            # Cache miss or error - proceed without cache
            pass
        
        return None
    
    async def _cache_analysis(self, image_hash: str, analysis: VibeAnalysis):
        """
        Cache analysis result for 24 hours.
        
        Args:
            image_hash: SHA256 hash of the image
            analysis: VibeAnalysis to cache
        """
        try:
            expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
            
            self.supabase.table("vibe_analysis_cache").upsert({
                "image_hash": image_hash,
                "analysis": analysis.model_dump(),
                "expires_at": expires_at.isoformat()
            }).execute()
        except Exception:
            # Cache write failure is non-critical - continue without caching
            pass
    
    async def create_brand_kit_from_analysis(
        self,
        analysis: VibeAnalysis,
        user_id: str,
        name: Optional[str] = None
    ) -> dict:
        """
        Create a brand kit from the analysis.
        
        Args:
            analysis: VibeAnalysis result from analyze_image
            user_id: User ID to create the brand kit for
            name: Optional name for the brand kit (auto-generated if not provided)
        
        Returns:
            Created brand kit dictionary
        
        Raises:
            BrandKitLimitExceededError: If user has reached brand kit limit
        """
        kit_name = name or f"Vibe from {datetime.now().strftime('%b %d, %Y')}"
        
        # Create a data object that matches BrandKitCreate structure
        class BrandKitData:
            def __init__(self, data: dict):
                self.name = data["name"]
                self.primary_colors = data["primary_colors"]
                self.accent_colors = data["accent_colors"]
                self.fonts = data["fonts"]
                self.tone = data["tone"]
                self.style_reference = data["style_reference"]
                self.logo_url = data.get("logo_url")
        
        brand_kit_data = BrandKitData({
            "name": kit_name,
            "primary_colors": analysis.primary_colors,
            "accent_colors": analysis.accent_colors,
            "fonts": analysis.fonts,
            "tone": analysis.tone,
            "style_reference": analysis.style_reference,
            "logo_url": None,
        })
        
        # Use BrandKitService to create
        brand_kit = await self.brand_kit_service.create(user_id, brand_kit_data)
        
        # Update with vibe branding metadata
        update_data = {
            "extracted_from": "vibe_branding",
            "source_image_hash": analysis.source_image_hash,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        self.supabase.table("brand_kits") \
            .update(update_data) \
            .eq("id", brand_kit["id"]) \
            .execute()
        
        # Return updated brand kit
        brand_kit["extracted_from"] = "vibe_branding"
        brand_kit["source_image_hash"] = analysis.source_image_hash
        
        return brand_kit
    
    async def check_user_quota(self, user_id: str, tier: str) -> dict:
        """
        Check if user has remaining vibe analyses.
        
        Args:
            user_id: User ID to check quota for
            tier: User's subscription tier (free, pro, studio)
        
        Returns:
            Dictionary with quota information:
            - used: Number of analyses used this month
            - limit: Maximum analyses allowed for tier
            - remaining: Analyses remaining
            - can_analyze: Boolean indicating if user can perform analysis
        """
        limit = TIER_LIMITS.get(tier, 1)
        
        try:
            result = self.supabase.table("users") \
                .select("vibe_analyses_this_month") \
                .eq("id", user_id) \
                .single() \
                .execute()
            
            used = result.data.get("vibe_analyses_this_month", 0) if result.data else 0
        except Exception:
            # Default to 0 if query fails
            used = 0
        
        return {
            "used": used,
            "limit": limit,
            "remaining": max(0, limit - used),
            "can_analyze": used < limit
        }
    
    async def increment_usage(self, user_id: str):
        """
        Increment user's vibe analysis count.
        
        Should be called after a successful analysis to track usage.
        
        Args:
            user_id: User ID to increment usage for
        """
        try:
            self.supabase.rpc("increment_vibe_analyses", {"p_user_id": user_id}).execute()
        except Exception:
            # Usage tracking failure is non-critical
            # Log error in production but don't fail the request
            pass


# ============================================================================
# Factory Functions
# ============================================================================

# Singleton instance for convenience
_vibe_branding_service: Optional[VibeBrandingService] = None


def get_vibe_branding_service() -> VibeBrandingService:
    """Get or create the Vibe Branding service singleton."""
    global _vibe_branding_service
    if _vibe_branding_service is None:
        _vibe_branding_service = VibeBrandingService()
    return _vibe_branding_service


def create_vibe_branding_service(
    vision_client: Optional[GeminiVisionClient] = None,
    supabase_client=None,
    brand_kit_service: Optional[BrandKitService] = None
) -> VibeBrandingService:
    """
    Create a new VibeBrandingService instance with custom dependencies.
    
    Useful for testing with mocked dependencies.
    
    Args:
        vision_client: Optional GeminiVisionClient instance
        supabase_client: Optional Supabase client instance
        brand_kit_service: Optional BrandKitService instance
    
    Returns:
        New VibeBrandingService instance
    """
    return VibeBrandingService(
        vision_client=vision_client,
        supabase_client=supabase_client,
        brand_kit_service=brand_kit_service
    )
