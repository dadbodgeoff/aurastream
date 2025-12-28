"""
Pydantic schemas for The Aura Lab endpoints.

This module defines request/response schemas for:
- Test subject upload and management
- Element fusion operations
- Rarity scoring
- Inventory management
- Usage tracking
"""

from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# ============================================================================
# Type Definitions
# ============================================================================

RarityType = Literal["common", "rare", "mythic"]


# ============================================================================
# Rarity Scores Schema
# ============================================================================

class RarityScoresSchema(BaseModel):
    """AI-generated rarity scores for a fusion."""
    visual_impact: int = Field(..., ge=1, le=10, description="How bold and eye-catching (1-10)")
    creativity: int = Field(..., ge=1, le=10, description="How unexpected or clever (1-10)")
    meme_potential: int = Field(..., ge=1, le=10, description="Shareability and humor (1-10)")
    technical_quality: int = Field(..., ge=1, le=10, description="Line quality and composition (1-10)")
    commentary: str = Field(..., description="AI's one-sentence reaction")


# ============================================================================
# Test Subject Schemas
# ============================================================================

class SetSubjectResponse(BaseModel):
    """Response after setting/uploading a test subject."""
    subject_id: str = Field(..., description="Unique identifier for the test subject")
    image_url: str = Field(..., description="URL to the uploaded subject image")
    expires_at: str = Field(..., description="ISO timestamp when subject expires (24h)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "subject_id": "550e8400-e29b-41d4-a716-446655440000",
                    "image_url": "https://storage.aurastream.shop/aura-lab/subjects/user123/subject.png",
                    "expires_at": "2025-01-02T12:00:00Z"
                }
            ]
        }
    }


# ============================================================================
# Fusion Schemas
# ============================================================================

class FuseRequest(BaseModel):
    """Request to perform a fusion between subject and element."""
    subject_id: str = Field(..., description="ID of the locked test subject")
    element_id: str = Field(..., description="Element ID to fuse with (e.g., 'fire', 'ice')")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "subject_id": "550e8400-e29b-41d4-a716-446655440000",
                    "element_id": "fire"
                }
            ]
        }
    }


class FuseResponse(BaseModel):
    """Response from a fusion operation."""
    fusion_id: str = Field(..., description="Unique identifier for this fusion")
    image_url: str = Field(..., description="URL to the generated fusion image")
    rarity: RarityType = Field(..., description="Rarity tier based on scores")
    scores: RarityScoresSchema = Field(..., description="AI-generated rarity scores")
    is_first_discovery: bool = Field(..., description="True if this is the first time anyone used this element")
    recipe_id: Optional[str] = Field(None, description="Recipe ID if this was a discovery")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "fusion_id": "660e8400-e29b-41d4-a716-446655440001",
                    "image_url": "https://storage.aurastream.shop/aura-lab/fusions/user123/fusion.png",
                    "rarity": "rare",
                    "scores": {
                        "visual_impact": 8,
                        "creativity": 7,
                        "meme_potential": 9,
                        "technical_quality": 7,
                        "commentary": "Fire transformation looks epic! Great meme potential."
                    },
                    "is_first_discovery": False,
                    "recipe_id": None
                }
            ]
        }
    }


class KeepRequest(BaseModel):
    """Request to keep or trash a fusion."""
    fusion_id: str = Field(..., description="ID of the fusion to keep/trash")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "fusion_id": "660e8400-e29b-41d4-a716-446655440001"
                }
            ]
        }
    }


# ============================================================================
# Inventory Schemas
# ============================================================================

class FusionItem(BaseModel):
    """Single fusion item in inventory."""
    id: str = Field(..., description="Fusion ID")
    image_url: str = Field(..., description="URL to the fusion image")
    element_id: str = Field(..., description="Element used in fusion")
    rarity: RarityType = Field(..., description="Rarity tier")
    scores: dict = Field(..., description="Rarity scores dictionary")
    created_at: str = Field(..., description="ISO timestamp when fusion was created")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "660e8400-e29b-41d4-a716-446655440001",
                    "image_url": "https://storage.aurastream.shop/aura-lab/fusions/user123/fusion.png",
                    "element_id": "fire",
                    "rarity": "rare",
                    "scores": {
                        "visual_impact": 8,
                        "creativity": 7,
                        "meme_potential": 9,
                        "technical_quality": 7,
                        "commentary": "Fire transformation looks epic!"
                    },
                    "created_at": "2025-01-01T12:00:00Z"
                }
            ]
        }
    }


class InventoryResponse(BaseModel):
    """User's fusion inventory."""
    fusions: List[FusionItem] = Field(..., description="List of saved fusions")
    total: int = Field(..., description="Total number of saved fusions")
    mythic_count: int = Field(..., description="Number of mythic rarity fusions")
    rare_count: int = Field(..., description="Number of rare rarity fusions")
    common_count: int = Field(..., description="Number of common rarity fusions")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "fusions": [],
                    "total": 15,
                    "mythic_count": 1,
                    "rare_count": 5,
                    "common_count": 9
                }
            ]
        }
    }


# ============================================================================
# Usage Schemas
# ============================================================================

class UsageResponse(BaseModel):
    """Daily fusion usage information."""
    used_today: int = Field(..., description="Number of fusions used today")
    limit: int = Field(..., description="Daily fusion limit for user's tier")
    remaining: int = Field(..., description="Remaining fusions for today")
    resets_at: str = Field(..., description="ISO timestamp when usage resets (midnight UTC)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "used_today": 3,
                    "limit": 5,
                    "remaining": 2,
                    "resets_at": "2025-01-02T00:00:00Z"
                }
            ]
        }
    }


# ============================================================================
# Element Schemas
# ============================================================================

class ElementSchema(BaseModel):
    """Element definition for fusion."""
    id: str = Field(..., description="Unique element identifier")
    name: str = Field(..., description="Display name")
    icon: str = Field(..., description="Emoji icon")
    description: str = Field(..., description="Description of the transformation effect")
    premium: bool = Field(..., description="Whether this is a premium element")
    locked: bool = Field(False, description="Whether element is locked for current user")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "fire",
                    "name": "Fire",
                    "icon": "🔥",
                    "description": "Blue flames, glowing ember eyes, heat distortion, phoenix energy",
                    "premium": False,
                    "locked": False
                }
            ]
        }
    }


class ElementsResponse(BaseModel):
    """Available elements for fusion."""
    elements: List[ElementSchema] = Field(..., description="List of available elements")
    premium_locked: bool = Field(..., description="Whether premium elements are locked for user")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "elements": [],
                    "premium_locked": True
                }
            ]
        }
    }


# ============================================================================
# Success Response
# ============================================================================

class SuccessResponse(BaseModel):
    """Generic success response."""
    success: bool = Field(True, description="Operation success status")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "success": True
                }
            ]
        }
    }
