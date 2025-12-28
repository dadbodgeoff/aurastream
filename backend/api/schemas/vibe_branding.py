"""
Pydantic schemas for Vibe Branding endpoints.

This module defines request/response schemas for:
- Image analysis via upload or URL
- Usage quota tracking
- Analysis results with brand identity data

All schemas use Pydantic v2 syntax with comprehensive validation
and OpenAPI documentation.
"""

from typing import Optional, List, Literal
from pydantic import BaseModel, Field, HttpUrl


# ============================================================================
# Type Definitions
# ============================================================================

LightingMood = Literal["neon", "natural", "dramatic", "cozy", "high-contrast"]
BrandTone = Literal["competitive", "casual", "educational", "comedic", "professional"]


# ============================================================================
# Nested Schemas
# ============================================================================

class FontsSchema(BaseModel):
    """Font configuration extracted from image."""
    headline: str = Field(..., description="Headline font name from supported list")
    body: str = Field(..., description="Body font name from supported list")

    model_config = {
        "json_schema_extra": {
            "examples": [{"headline": "Oswald", "body": "Inter"}]
        }
    }


# ============================================================================
# Analysis Result Schema
# ============================================================================

class VibeAnalysisSchema(BaseModel):
    """Complete vibe analysis result from Gemini Vision."""
    primary_colors: List[str] = Field(
        ..., 
        min_length=5, 
        max_length=5,
        description="5 primary colors extracted from image (hex format)"
    )
    accent_colors: List[str] = Field(
        ..., 
        min_length=3, 
        max_length=3,
        description="3 accent colors extracted from image (hex format)"
    )
    fonts: FontsSchema = Field(..., description="Detected font configuration")
    tone: BrandTone = Field(..., description="Detected brand tone/voice")
    style_reference: str = Field(
        ..., 
        max_length=500,
        description="Prompt-ready description of the visual style"
    )
    lighting_mood: LightingMood = Field(..., description="Detected lighting/atmosphere")
    style_keywords: List[str] = Field(
        ..., 
        min_length=1, 
        max_length=5,
        description="3-5 descriptive keywords for the style"
    )
    text_vibe: Optional[str] = Field(
        None, 
        description="Typography style description if text was visible"
    )
    confidence: float = Field(
        ..., 
        ge=0, 
        le=1,
        description="Extraction confidence score (0-1)"
    )
    source_image_hash: str = Field(..., description="SHA256 hash of analyzed image")
    analyzed_at: str = Field(..., description="ISO timestamp of analysis")

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "primary_colors": ["#6441A5", "#9146FF", "#772CE8", "#BF94FF", "#E6D5FF"],
                "accent_colors": ["#FF6B6B", "#FFE66D", "#4ECDC4"],
                "fonts": {"headline": "Oswald", "body": "Inter"},
                "tone": "competitive",
                "style_reference": "High-energy esports aesthetic with deep purple gradients, neon accents, and aggressive typography.",
                "lighting_mood": "neon",
                "style_keywords": ["esports", "cyberpunk", "aggressive", "purple"],
                "text_vibe": "Bold All-Caps",
                "confidence": 0.87,
                "source_image_hash": "sha256:abc123...",
                "analyzed_at": "2025-12-28T10:30:00Z"
            }]
        }
    }


# ============================================================================
# Request Schemas
# ============================================================================

class AnalyzeURLRequest(BaseModel):
    """Request to analyze image from URL."""
    image_url: HttpUrl = Field(..., description="URL of image to analyze")
    auto_create_kit: bool = Field(
        default=True, 
        description="Automatically create brand kit from analysis"
    )
    kit_name: Optional[str] = Field(
        None, 
        max_length=100,
        description="Name for the created brand kit (auto-generated if not provided)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "image_url": "https://example.com/screenshot.png",
                "auto_create_kit": True,
                "kit_name": "xQc Vibe"
            }]
        }
    }


# ============================================================================
# Response Schemas
# ============================================================================

class AnalyzeResponse(BaseModel):
    """Response from vibe analysis."""
    analysis: VibeAnalysisSchema = Field(..., description="Complete analysis result")
    brand_kit_id: Optional[str] = Field(
        None, 
        description="ID of created brand kit (if auto_create_kit was true)"
    )
    cached: bool = Field(
        default=False, 
        description="Whether result was served from cache"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "analysis": {
                    "primary_colors": ["#6441A5", "#9146FF", "#772CE8", "#BF94FF", "#E6D5FF"],
                    "accent_colors": ["#FF6B6B", "#FFE66D", "#4ECDC4"],
                    "fonts": {"headline": "Oswald", "body": "Inter"},
                    "tone": "competitive",
                    "style_reference": "High-energy esports aesthetic with deep purple gradients.",
                    "lighting_mood": "neon",
                    "style_keywords": ["esports", "cyberpunk", "aggressive", "purple"],
                    "text_vibe": "Bold All-Caps",
                    "confidence": 0.87,
                    "source_image_hash": "sha256:abc123...",
                    "analyzed_at": "2025-12-28T10:30:00Z"
                },
                "brand_kit_id": "550e8400-e29b-41d4-a716-446655440000",
                "cached": False
            }]
        }
    }


class UsageResponse(BaseModel):
    """User's vibe branding usage for current month."""
    used: int = Field(..., ge=0, description="Number of analyses used this month")
    limit: int = Field(..., ge=0, description="Maximum analyses allowed for tier")
    remaining: int = Field(..., ge=0, description="Analyses remaining this month")
    can_analyze: bool = Field(..., description="Whether user can perform analysis")
    resets_at: str = Field(..., description="ISO timestamp when usage resets")

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "used": 3,
                "limit": 5,
                "remaining": 2,
                "can_analyze": True,
                "resets_at": "2026-01-01T00:00:00Z"
            }]
        }
    }


# ============================================================================
# Export all schemas
# ============================================================================

__all__ = [
    # Type definitions
    "LightingMood",
    "BrandTone",
    # Nested schemas
    "FontsSchema",
    # Analysis result
    "VibeAnalysisSchema",
    # Request schemas
    "AnalyzeURLRequest",
    # Response schemas
    "AnalyzeResponse",
    "UsageResponse",
]
