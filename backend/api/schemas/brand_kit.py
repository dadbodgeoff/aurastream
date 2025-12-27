"""
Pydantic schemas for brand kit endpoints.

This module defines request/response schemas for:
- Brand kit creation and updates
- Brand kit extraction from assets
- Font and color validation

All schemas use Pydantic v2 syntax with comprehensive validation
and OpenAPI documentation.
"""

import re
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime

# ============================================================================
# Constants
# ============================================================================

HEX_PATTERN = re.compile(r'^#[0-9A-Fa-f]{6}$')

SUPPORTED_FONTS = [
    'Inter', 'Roboto', 'Montserrat', 'Open Sans', 'Poppins',
    'Lato', 'Oswald', 'Raleway', 'Nunito', 'Playfair Display',
    'Merriweather', 'Source Sans Pro', 'Ubuntu', 'Rubik', 'Work Sans',
    'Fira Sans', 'Barlow', 'Quicksand', 'Karla', 'Mulish'
]

VALID_TONES = Literal['competitive', 'casual', 'educational', 'comedic', 'professional']


# ============================================================================
# Helper Functions
# ============================================================================

def is_valid_hex_color(color: str) -> bool:
    """Check if a string is a valid hex color."""
    return bool(HEX_PATTERN.match(color))


def normalize_hex_color(color: str) -> str:
    """Normalize hex color to uppercase."""
    return color.upper()


def validate_hex_colors(colors: List[str]) -> List[str]:
    """Validate and normalize a list of hex colors."""
    validated = []
    for color in colors:
        if not is_valid_hex_color(color):
            raise ValueError(f"Invalid hex color format: {color}. Expected format: #RRGGBB")
        validated.append(normalize_hex_color(color))
    return validated


def validate_font(font: str) -> str:
    """Validate that a font is in the supported fonts list."""
    if font not in SUPPORTED_FONTS:
        raise ValueError(f"Unsupported font: {font}. Must be one of: {', '.join(SUPPORTED_FONTS)}")
    return font


# ============================================================================
# Nested Schemas
# ============================================================================

class BrandKitFonts(BaseModel):
    """Font configuration for a brand kit."""
    headline: str = Field(
        ...,
        description="Font for headlines and titles",
        examples=["Montserrat"]
    )
    body: str = Field(
        ...,
        description="Font for body text",
        examples=["Inter"]
    )
    
    @field_validator('headline', 'body')
    @classmethod
    def validate_font(cls, v: str) -> str:
        if v not in SUPPORTED_FONTS:
            raise ValueError(f"Unsupported font: {v}. Must be one of: {', '.join(SUPPORTED_FONTS)}")
        return v

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "headline": "Montserrat",
                    "body": "Inter"
                }
            ]
        }
    }


class BrandKitFontsUpdate(BaseModel):
    """Optional font configuration for brand kit updates."""
    headline: Optional[str] = Field(
        default=None,
        description="Font for headlines and titles",
        examples=["Montserrat"]
    )
    body: Optional[str] = Field(
        default=None,
        description="Font for body text",
        examples=["Inter"]
    )
    
    @field_validator('headline', 'body')
    @classmethod
    def validate_font(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in SUPPORTED_FONTS:
            raise ValueError(f"Unsupported font: {v}. Must be one of: {', '.join(SUPPORTED_FONTS)}")
        return v


# ============================================================================
# Request Schemas
# ============================================================================

class BrandKitCreate(BaseModel):
    """Request body for creating a brand kit."""
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Name of the brand kit",
        examples=["My Gaming Brand"]
    )
    primary_colors: List[str] = Field(
        ...,
        min_length=1,
        max_length=5,
        description="Primary brand colors (1-5 hex codes)",
        examples=[["#FF5733", "#3498DB", "#2ECC71"]]
    )
    accent_colors: List[str] = Field(
        default_factory=list,
        max_length=3,
        description="Accent colors (0-3 hex codes)",
        examples=[["#F1C40F"]]
    )
    fonts: BrandKitFonts = Field(
        ...,
        description="Font configuration for the brand kit"
    )
    tone: VALID_TONES = Field(
        default='professional',
        description="Brand tone/voice",
        examples=["competitive"]
    )
    style_reference: str = Field(
        default="",
        max_length=500,
        description="Style reference notes or description",
        examples=["Modern, minimalist gaming aesthetic with bold colors"]
    )
    logo_url: Optional[str] = Field(
        default=None,
        description="URL to the brand logo",
        examples=["https://cdn.streamerstudio.com/logos/my-brand.png"]
    )
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty or whitespace only")
        return v
    
    @field_validator('primary_colors')
    @classmethod
    def validate_primary_colors(cls, v: List[str]) -> List[str]:
        return validate_hex_colors(v)
    
    @field_validator('accent_colors')
    @classmethod
    def validate_accent_colors(cls, v: List[str]) -> List[str]:
        return validate_hex_colors(v)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "My Gaming Brand",
                    "primary_colors": ["#FF5733", "#3498DB", "#2ECC71"],
                    "accent_colors": ["#F1C40F"],
                    "fonts": {
                        "headline": "Montserrat",
                        "body": "Inter"
                    },
                    "tone": "competitive",
                    "style_reference": "Modern, minimalist gaming aesthetic with bold colors",
                    "logo_url": "https://cdn.streamerstudio.com/logos/my-brand.png"
                }
            ]
        }
    }


class BrandKitUpdate(BaseModel):
    """Request body for updating a brand kit (all fields optional)."""
    name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=100,
        description="Name of the brand kit",
        examples=["My Gaming Brand"]
    )
    primary_colors: Optional[List[str]] = Field(
        default=None,
        min_length=1,
        max_length=5,
        description="Primary brand colors (1-5 hex codes)",
        examples=[["#FF5733", "#3498DB", "#2ECC71"]]
    )
    accent_colors: Optional[List[str]] = Field(
        default=None,
        max_length=3,
        description="Accent colors (0-3 hex codes)",
        examples=[["#F1C40F"]]
    )
    fonts: Optional[BrandKitFontsUpdate] = Field(
        default=None,
        description="Font configuration for the brand kit"
    )
    tone: Optional[VALID_TONES] = Field(
        default=None,
        description="Brand tone/voice",
        examples=["competitive"]
    )
    style_reference: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Style reference notes or description",
        examples=["Modern, minimalist gaming aesthetic with bold colors"]
    )
    logo_url: Optional[str] = Field(
        default=None,
        description="URL to the brand logo",
        examples=["https://cdn.streamerstudio.com/logos/my-brand.png"]
    )
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Name cannot be empty or whitespace only")
        return v
    
    @field_validator('primary_colors')
    @classmethod
    def validate_primary_colors(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            return validate_hex_colors(v)
        return v
    
    @field_validator('accent_colors')
    @classmethod
    def validate_accent_colors(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            return validate_hex_colors(v)
        return v

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "Updated Brand Name",
                    "primary_colors": ["#FF5733", "#3498DB"],
                    "tone": "casual"
                }
            ]
        }
    }


# ============================================================================
# Response Schemas
# ============================================================================

class BrandKitResponse(BaseModel):
    """Response schema for a brand kit."""
    id: str = Field(..., description="Unique brand kit identifier (UUID)")
    user_id: str = Field(..., description="Owner's user ID")
    name: str = Field(..., description="Name of the brand kit")
    is_active: bool = Field(..., description="Whether this is the active brand kit")
    primary_colors: List[str] = Field(..., description="Primary brand colors")
    accent_colors: List[str] = Field(..., description="Accent colors")
    fonts: BrandKitFonts = Field(..., description="Font configuration")
    logo_url: Optional[str] = Field(None, description="URL to the brand logo")
    tone: VALID_TONES = Field(..., description="Brand tone/voice")
    style_reference: str = Field(..., description="Style reference notes")
    extracted_from: Optional[str] = Field(
        None, 
        description="Source asset ID if brand kit was extracted from existing assets"
    )
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "user_id": "660e8400-e29b-41d4-a716-446655440001",
                    "name": "My Gaming Brand",
                    "is_active": True,
                    "primary_colors": ["#FF5733", "#3498DB", "#2ECC71"],
                    "accent_colors": ["#F1C40F"],
                    "fonts": {
                        "headline": "Montserrat",
                        "body": "Inter"
                    },
                    "logo_url": "https://cdn.streamerstudio.com/logos/my-brand.png",
                    "tone": "competitive",
                    "style_reference": "Modern, minimalist gaming aesthetic with bold colors",
                    "extracted_from": None,
                    "created_at": "2024-01-15T10:30:00Z",
                    "updated_at": "2024-01-20T14:22:00Z"
                }
            ]
        }
    }


class BrandKitExtractionResponse(BaseModel):
    """Response schema for brand kit extraction from assets."""
    primary_colors: List[str] = Field(
        ..., 
        description="Extracted primary colors"
    )
    accent_colors: List[str] = Field(
        ..., 
        description="Extracted accent colors"
    )
    detected_fonts: List[str] = Field(
        ..., 
        description="Detected fonts from the assets"
    )
    suggested_tone: VALID_TONES = Field(
        ..., 
        description="AI-suggested brand tone based on analysis"
    )
    confidence: float = Field(
        ..., 
        ge=0, 
        le=1, 
        description="Confidence score of the extraction (0-1)"
    )
    source_files: List[str] = Field(
        ..., 
        description="List of source file names/IDs used for extraction"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "primary_colors": ["#FF5733", "#3498DB", "#2ECC71"],
                    "accent_colors": ["#F1C40F"],
                    "detected_fonts": ["Montserrat", "Inter"],
                    "suggested_tone": "competitive",
                    "confidence": 0.87,
                    "source_files": ["logo.png", "banner.jpg", "overlay.png"]
                }
            ]
        }
    }


class BrandKitListResponse(BaseModel):
    """Response schema for listing brand kits."""
    brand_kits: List[BrandKitResponse] = Field(
        ..., 
        description="List of user's brand kits"
    )
    total: int = Field(..., description="Total number of brand kits")
    active_id: Optional[str] = Field(
        None, 
        description="ID of the currently active brand kit"
    )


# ============================================================================
# Export all schemas
# ============================================================================

__all__ = [
    # Constants
    "HEX_PATTERN",
    "SUPPORTED_FONTS",
    "VALID_TONES",
    # Helper functions
    "is_valid_hex_color",
    "normalize_hex_color",
    "validate_hex_colors",
    "validate_font",
    # Schemas
    "BrandKitFonts",
    "BrandKitFontsUpdate",
    "BrandKitCreate",
    "BrandKitUpdate",
    "BrandKitResponse",
    "BrandKitExtractionResponse",
    "BrandKitListResponse",
]
