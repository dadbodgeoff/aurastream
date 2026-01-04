"""
Pydantic schemas for Thumbnail Intelligence API.
"""

from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field


class ThumbnailAnalysisResponse(BaseModel):
    """Analysis result for a single thumbnail."""
    video_id: str = Field(..., description="YouTube video ID")
    title: str = Field(..., description="Video title")
    thumbnail_url: str = Field(..., description="Thumbnail image URL")
    view_count: int = Field(default=0, description="Video view count")
    
    # Layout Analysis
    layout_type: str = Field(..., description="Layout pattern type")
    text_placement: str = Field(default="center", description="Where text is positioned")
    focal_point: str = Field(default="center", description="Main visual focus")
    
    # Color Analysis
    dominant_colors: List[str] = Field(default_factory=list, description="Hex color codes")
    color_mood: str = Field(default="vibrant", description="Overall color mood")
    background_style: str = Field(default="solid", description="Background type")
    
    # Design Elements
    has_face: bool = Field(default=False)
    has_text: bool = Field(default=False)
    text_content: Optional[str] = Field(default=None)
    has_border: bool = Field(default=False)
    has_glow_effects: bool = Field(default=False)
    has_arrows_circles: bool = Field(default=False)
    
    # Face Details (for recreation)
    face_expression: Optional[str] = Field(
        default=None,
        description="Detected face expression: shocked, excited, smiling, serious, screaming, neutral"
    )
    face_position: Optional[str] = Field(
        default=None,
        description="Face position in frame: left-third, center, right-third"
    )
    face_size: Optional[str] = Field(
        default=None,
        description="Relative face size: large, medium, small"
    )
    face_looking_direction: Optional[str] = Field(
        default=None,
        description="Where face is looking: camera, left, right, up, down"
    )
    
    # Recommendations - now optional with defaults for recreation flow
    layout_recipe: str = Field(default="", description="How to recreate this layout")
    color_recipe: str = Field(default="", description="How to recreate colors")
    why_it_works: str = Field(default="", description="Why this thumbnail is effective")
    difficulty: str = Field(default="medium", description="Difficulty to recreate")
    
    # NEW: Enhanced metadata for Intel redesign
    aspect_ratio: Optional[str] = Field(
        default=None,
        description="Aspect ratio string: '16:9', '4:3', '1:1', '9:16'"
    )
    hashtags: List[str] = Field(
        default_factory=list,
        description="Extracted hashtags from title/description"
    )
    format_type: Optional[str] = Field(
        default=None,
        description="Format classification: 'split-screen', 'reaction', 'gameplay', 'tutorial', 'vlog'"
    )
    channel_name: Optional[str] = Field(
        default=None,
        description="YouTube channel name for display"
    )
    published_at: Optional[str] = Field(
        default=None,
        description="Video publish date ISO string"
    )


class CategoryInsightResponse(BaseModel):
    """Aggregated insights for a gaming category."""
    category_key: str = Field(..., description="Internal category ID")
    category_name: str = Field(..., description="Display name")
    analysis_date: str = Field(..., description="Date of analysis")
    
    # Individual thumbnails
    thumbnails: List[ThumbnailAnalysisResponse] = Field(default_factory=list)
    
    # Aggregated patterns
    common_layout: str = Field(..., description="Most common layout pattern")
    common_colors: List[str] = Field(default_factory=list)
    common_elements: List[str] = Field(default_factory=list)
    
    # Recommendations
    ideal_layout: str = Field(..., description="Recommended layout for this category")
    ideal_color_palette: List[str] = Field(default_factory=list)
    must_have_elements: List[str] = Field(default_factory=list)
    avoid_elements: List[str] = Field(default_factory=list)
    
    # Summary
    category_style_summary: str = Field(..., description="Overall style guide")
    pro_tips: List[str] = Field(default_factory=list)


class ThumbnailIntelOverviewResponse(BaseModel):
    """Overview of all category insights."""
    analysis_date: str = Field(..., description="Date of latest analysis")
    categories: List[CategoryInsightResponse] = Field(default_factory=list)
    total_thumbnails_analyzed: int = Field(default=0)


class CategoryListItem(BaseModel):
    """Summary item for category list."""
    category_key: str
    category_name: str
    color_theme: str
    thumbnail_count: int
    latest_analysis: Optional[str] = None
