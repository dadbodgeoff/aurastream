"""
Avatar schemas for user character customization.

These schemas define the structure for user avatars that can be
used in AI image generation to create consistent character representations.
"""

from datetime import datetime
from typing import Optional, Literal, List
from pydantic import BaseModel, Field


# =============================================================================
# Enum-like Literals for validation
# =============================================================================

GenderType = Literal["male", "female", "neutral", "other"]
BodyType = Literal["slim", "average", "athletic", "curvy", "muscular"]
SkinTone = Literal["very-light", "light", "medium", "tan", "brown", "dark"]
FaceShape = Literal["oval", "round", "square", "heart", "long"]
EyeColor = Literal["brown", "blue", "green", "hazel", "gray", "amber", "heterochromia"]
EyeStyle = Literal["normal", "anime-large", "narrow", "round"]
HairColor = Literal["black", "brown", "blonde", "red", "gray", "white", "pink", "blue", "purple", "green", "rainbow"]
HairStyle = Literal["bald", "buzz", "short", "medium", "long", "ponytail", "braids", "mohawk", "afro", "curly"]
HairTexture = Literal["straight", "wavy", "curly", "coily"]
Expression = Literal["friendly", "serious", "excited", "shocked", "angry", "sad", "mysterious", "playful", "confident"]
ArtStyle = Literal["realistic", "anime", "cartoon", "pixel", "3d-render"]
OutfitStyle = Literal["casual-gamer", "esports-pro", "streetwear", "fantasy", "sci-fi", "tactical"]
GlassesStyle = Literal["round", "square", "gaming", "sunglasses"]
Headwear = Literal["cap", "beanie", "headphones", "crown", "hood"]
FacialHair = Literal["stubble", "beard", "goatee", "mustache"]


# =============================================================================
# Request Schemas
# =============================================================================

class CreateAvatarRequest(BaseModel):
    """Request to create a new avatar."""
    name: str = Field(default="My Avatar", min_length=1, max_length=50)
    is_default: bool = False
    
    # Physical
    gender: GenderType = "neutral"
    body_type: BodyType = "average"
    skin_tone: SkinTone = "medium"
    
    # Face
    face_shape: FaceShape = "oval"
    eye_color: EyeColor = "brown"
    eye_style: EyeStyle = "normal"
    
    # Hair
    hair_color: HairColor = "brown"
    hair_style: HairStyle = "short"
    hair_texture: HairTexture = "straight"
    
    # Expression
    default_expression: Expression = "friendly"
    
    # Style
    art_style: ArtStyle = "realistic"
    outfit_style: OutfitStyle = "casual-gamer"
    
    # Accessories
    glasses: bool = False
    glasses_style: Optional[GlassesStyle] = None
    headwear: Optional[Headwear] = None
    facial_hair: Optional[FacialHair] = None


class UpdateAvatarRequest(BaseModel):
    """Request to update an existing avatar. All fields optional."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    is_default: Optional[bool] = None
    
    # Physical
    gender: Optional[GenderType] = None
    body_type: Optional[BodyType] = None
    skin_tone: Optional[SkinTone] = None
    
    # Face
    face_shape: Optional[FaceShape] = None
    eye_color: Optional[EyeColor] = None
    eye_style: Optional[EyeStyle] = None
    
    # Hair
    hair_color: Optional[HairColor] = None
    hair_style: Optional[HairStyle] = None
    hair_texture: Optional[HairTexture] = None
    
    # Expression
    default_expression: Optional[Expression] = None
    
    # Style
    art_style: Optional[ArtStyle] = None
    outfit_style: Optional[OutfitStyle] = None
    
    # Accessories
    glasses: Optional[bool] = None
    glasses_style: Optional[GlassesStyle] = None
    headwear: Optional[Headwear] = None
    facial_hair: Optional[FacialHair] = None


# =============================================================================
# Response Schemas
# =============================================================================

class AvatarResponse(BaseModel):
    """Single avatar response."""
    id: str
    user_id: str
    name: str
    is_default: bool
    
    # Physical
    gender: str
    body_type: str
    skin_tone: str
    
    # Face
    face_shape: str
    eye_color: str
    eye_style: str
    
    # Hair
    hair_color: str
    hair_style: str
    hair_texture: str
    
    # Expression
    default_expression: str
    
    # Style
    art_style: str
    outfit_style: str
    
    # Accessories
    glasses: bool
    glasses_style: Optional[str]
    headwear: Optional[str]
    facial_hair: Optional[str]
    
    # Timestamps
    created_at: datetime
    updated_at: datetime


class AvatarListResponse(BaseModel):
    """List of avatars response."""
    avatars: List[AvatarResponse]
    total: int


# =============================================================================
# Generation Integration Schema
# =============================================================================

class CharacterCustomization(BaseModel):
    """
    Character customization for a single generation.
    Can reference a saved avatar or provide inline customization.
    """
    # Reference to saved avatar (if provided, uses avatar settings as base)
    avatar_id: Optional[str] = None
    
    # Override expression for this specific generation
    expression: Optional[Expression] = None
    
    # Inline overrides (only used if no avatar_id, or to override avatar)
    gender: Optional[GenderType] = None
    body_type: Optional[BodyType] = None
    skin_tone: Optional[SkinTone] = None
    face_shape: Optional[FaceShape] = None
    eye_color: Optional[EyeColor] = None
    eye_style: Optional[EyeStyle] = None
    hair_color: Optional[HairColor] = None
    hair_style: Optional[HairStyle] = None
    hair_texture: Optional[HairTexture] = None
    art_style: Optional[ArtStyle] = None
    outfit_style: Optional[OutfitStyle] = None
    glasses: Optional[bool] = None
    glasses_style: Optional[GlassesStyle] = None
    headwear: Optional[Headwear] = None
    facial_hair: Optional[FacialHair] = None


# =============================================================================
# Options Response (for frontend dropdowns)
# =============================================================================

class AvatarOptionsResponse(BaseModel):
    """All available options for avatar customization."""
    genders: List[str] = ["male", "female", "neutral", "other"]
    body_types: List[str] = ["slim", "average", "athletic", "curvy", "muscular"]
    skin_tones: List[str] = ["very-light", "light", "medium", "tan", "brown", "dark"]
    face_shapes: List[str] = ["oval", "round", "square", "heart", "long"]
    eye_colors: List[str] = ["brown", "blue", "green", "hazel", "gray", "amber", "heterochromia"]
    eye_styles: List[str] = ["normal", "anime-large", "narrow", "round"]
    hair_colors: List[str] = ["black", "brown", "blonde", "red", "gray", "white", "pink", "blue", "purple", "green", "rainbow"]
    hair_styles: List[str] = ["bald", "buzz", "short", "medium", "long", "ponytail", "braids", "mohawk", "afro", "curly"]
    hair_textures: List[str] = ["straight", "wavy", "curly", "coily"]
    expressions: List[str] = ["friendly", "serious", "excited", "shocked", "angry", "sad", "mysterious", "playful", "confident"]
    art_styles: List[str] = ["realistic", "anime", "cartoon", "pixel", "3d-render"]
    outfit_styles: List[str] = ["casual-gamer", "esports-pro", "streetwear", "fantasy", "sci-fi", "tactical"]
    glasses_styles: List[str] = ["round", "square", "gaming", "sunglasses"]
    headwear_options: List[str] = ["cap", "beanie", "headphones", "crown", "hood"]
    facial_hair_options: List[str] = ["stubble", "beard", "goatee", "mustache"]
