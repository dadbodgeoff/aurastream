"""
Thumbnail Vision Analyzer

Uses Gemini Vision to analyze thumbnail images and extract:
- Layout patterns (text placement, focal points)
- Color schemes and palettes
- Design elements (faces, characters, effects)
- Recommendations for recreating the style
"""

import logging
import base64
import json
import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

import google.generativeai as genai

from backend.services.thumbnail_intel.constants import GEMINI_VISION_MODEL
from backend.services.thumbnail_intel.collector import ThumbnailData

logger = logging.getLogger(__name__)


@dataclass
class ThumbnailAnalysis:
    """Analysis result for a single thumbnail."""
    video_id: str
    title: str
    thumbnail_url: str
    view_count: int
    
    # Layout Analysis
    layout_type: str  # e.g., "face-left-text-right", "centered-character", "split-screen"
    text_placement: str  # e.g., "top-right", "bottom-center", "none"
    focal_point: str  # e.g., "character-face", "action-scene", "item"
    
    # Color Analysis
    dominant_colors: List[str]  # Hex colors
    color_mood: str  # e.g., "energetic", "dark", "vibrant", "clean"
    background_style: str  # e.g., "gradient", "solid", "game-screenshot", "custom-art"
    
    # Design Elements
    has_face: bool
    has_text: bool
    has_border: bool
    has_glow_effects: bool
    has_arrows_circles: bool  # Common clickbait elements
    
    # Recommendations
    layout_recipe: str  # How to recreate this layout
    color_recipe: str  # How to recreate this color scheme
    why_it_works: str  # Why this thumbnail is effective
    difficulty: str  # "easy", "medium", "hard"
    
    # Optional fields (must come after required fields)
    text_content: Optional[str] = None
    
    # Face Details (for recreation)
    face_expression: Optional[str] = None  # "shocked", "excited", "smiling", "serious", "screaming", "neutral"
    face_position: Optional[str] = None    # "left-third", "center", "right-third"
    face_size: Optional[str] = None        # "large", "medium", "small"
    face_looking_direction: Optional[str] = None  # "camera", "left", "right", "up", "down"


@dataclass
class CategoryThumbnailInsight:
    """Aggregated insights for a gaming category."""
    category_key: str
    category_name: str
    analysis_date: str
    
    # Individual thumbnail analyses
    thumbnails: List[ThumbnailAnalysis]
    
    # Aggregated patterns
    common_layout: str
    common_colors: List[str]
    common_elements: List[str]
    
    # Category-specific recommendations
    ideal_layout: str
    ideal_color_palette: List[str]
    must_have_elements: List[str]
    avoid_elements: List[str]
    
    # Overall insight
    category_style_summary: str
    pro_tips: List[str]


class ThumbnailVisionAnalyzer:
    """
    Analyzes thumbnails using Gemini Vision API.
    
    Sends thumbnail images to Gemini and extracts structured
    design analysis and recommendations.
    """
    
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(GEMINI_VISION_MODEL)
            self.enabled = True
        else:
            logger.warning("GOOGLE_API_KEY not set - Vision analysis disabled")
            self.model = None
            self.enabled = False
    
    async def analyze_category_thumbnails(
        self,
        category_key: str,
        category_name: str,
        thumbnails: List[ThumbnailData],
        thumbnail_images: List[bytes],
    ) -> CategoryThumbnailInsight:
        """
        Analyze all thumbnails for a category and generate insights.
        
        Args:
            category_key: Internal category identifier
            category_name: Display name for category
            thumbnails: List of ThumbnailData with metadata
            thumbnail_images: List of image bytes (same order as thumbnails)
            
        Returns:
            CategoryThumbnailInsight with analysis and recommendations
        """
        if not self.enabled:
            return self._fallback_insight(category_key, category_name, thumbnails)
        
        try:
            # Build the prompt with all images
            prompt = self._build_analysis_prompt(category_name, thumbnails)
            
            # Prepare image parts for Gemini
            image_parts = []
            for i, img_bytes in enumerate(thumbnail_images):
                if img_bytes:
                    image_parts.append({
                        "mime_type": "image/jpeg",
                        "data": base64.b64encode(img_bytes).decode("utf-8"),
                    })
            
            if not image_parts:
                logger.warning(f"No valid images for {category_key}")
                return self._fallback_insight(category_key, category_name, thumbnails)
            
            # Call Gemini Vision
            response = self.model.generate_content(
                [prompt] + image_parts,
                generation_config=genai.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=3000,
                ),
            )
            
            # Parse response
            return self._parse_response(
                response.text,
                category_key,
                category_name,
                thumbnails,
            )
            
        except Exception as e:
            logger.error(f"Vision analysis failed for {category_key}: {e}")
            return self._fallback_insight(category_key, category_name, thumbnails)
    
    def _build_analysis_prompt(
        self,
        category_name: str,
        thumbnails: List[ThumbnailData],
    ) -> str:
        """Build the Gemini Vision prompt."""
        
        # Build context about each thumbnail
        thumb_context = []
        for i, t in enumerate(thumbnails, 1):
            thumb_context.append(
                f"Thumbnail {i}: \"{t.title}\" by {t.channel_title} "
                f"({t.view_count:,} views)"
            )
        
        return f"""You are a YouTube thumbnail design expert analyzing top-performing {category_name} gaming thumbnails.

I'm showing you {len(thumbnails)} thumbnails that are currently performing well:
{chr(10).join(thumb_context)}

Analyze each thumbnail and provide a comprehensive JSON response:

{{
  "thumbnails": [
    {{
      "index": 1,
      "layout_type": "face-left-text-right|centered-character|split-screen|action-scene|item-focus|text-dominant",
      "text_placement": "top-left|top-center|top-right|bottom-left|bottom-center|bottom-right|none",
      "focal_point": "character-face|action-scene|game-item|text|multiple",
      "dominant_colors": ["#hex1", "#hex2", "#hex3"],
      "color_mood": "energetic|dark|vibrant|clean|mysterious|intense",
      "background_style": "gradient|solid|game-screenshot|custom-art|blurred",
      "has_face": true,
      "has_text": true,
      "text_content": "The actual text on thumbnail or null",
      "has_border": false,
      "has_glow_effects": true,
      "has_arrows_circles": false,
      "face_details": {{
        "expression": "shocked|excited|smiling|serious|screaming|neutral|null",
        "position": "left-third|center|right-third|null",
        "size": "large|medium|small|null",
        "looking_direction": "camera|left|right|up|down|null"
      }},
      "layout_recipe": "Step-by-step how to recreate this layout (max 100 chars)",
      "color_recipe": "How to recreate this color scheme (max 100 chars)",
      "why_it_works": "Why this thumbnail is effective (max 150 chars)",
      "difficulty": "easy|medium|hard"
    }}
  ],
  "category_patterns": {{
    "common_layout": "Most common layout pattern across these thumbnails",
    "common_colors": ["#hex1", "#hex2", "#hex3"],
    "common_elements": ["element1", "element2", "element3"],
    "ideal_layout": "Recommended layout for {category_name} thumbnails (max 150 chars)",
    "ideal_color_palette": ["#hex1", "#hex2", "#hex3", "#hex4"],
    "must_have_elements": ["element1", "element2"],
    "avoid_elements": ["element1", "element2"],
    "category_style_summary": "Overall style guide for {category_name} thumbnails (max 200 chars)",
    "pro_tips": [
      "Tip 1 for making great {category_name} thumbnails",
      "Tip 2",
      "Tip 3"
    ]
  }}
}}

Rules:
- Be specific about colors (use actual hex codes you see)
- Layout recipes should be actionable for someone using Canva or Photoshop
- Focus on patterns that make these thumbnails successful
- Consider what makes {category_name} thumbnails unique vs other games
- Pro tips should be specific to this game's community and style
- IMPORTANT: If has_face is true, you MUST fill in face_details with the expression, position, size, and looking direction
- Face expression should describe the emotion shown (shocked, excited, smiling, serious, screaming, neutral)
- Face position describes where in the frame the face is located
- Face size is relative to the thumbnail (large = face takes up significant space)"""
    
    def _parse_response(
        self,
        response: str,
        category_key: str,
        category_name: str,
        thumbnails: List[ThumbnailData],
    ) -> CategoryThumbnailInsight:
        """Parse Gemini response into CategoryThumbnailInsight."""
        try:
            # Extract JSON from response
            json_str = response
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0]
            
            data = json.loads(json_str.strip())
            
            # Parse individual thumbnail analyses
            thumb_analyses = []
            for i, thumb_data in enumerate(data.get("thumbnails", [])):
                if i >= len(thumbnails):
                    break
                
                # Extract face details if present
                face_details = thumb_data.get("face_details", {})
                    
                t = thumbnails[i]
                thumb_analyses.append(ThumbnailAnalysis(
                    video_id=t.video_id,
                    title=t.title,
                    thumbnail_url=t.thumbnail_url_hq,
                    view_count=t.view_count,
                    layout_type=thumb_data.get("layout_type", "unknown"),
                    text_placement=thumb_data.get("text_placement", "unknown"),
                    focal_point=thumb_data.get("focal_point", "unknown"),
                    dominant_colors=thumb_data.get("dominant_colors", []),
                    color_mood=thumb_data.get("color_mood", "unknown"),
                    background_style=thumb_data.get("background_style", "unknown"),
                    has_face=thumb_data.get("has_face", False),
                    has_text=thumb_data.get("has_text", False),
                    has_border=thumb_data.get("has_border", False),
                    has_glow_effects=thumb_data.get("has_glow_effects", False),
                    has_arrows_circles=thumb_data.get("has_arrows_circles", False),
                    layout_recipe=thumb_data.get("layout_recipe", ""),
                    color_recipe=thumb_data.get("color_recipe", ""),
                    why_it_works=thumb_data.get("why_it_works", ""),
                    difficulty=thumb_data.get("difficulty", "medium"),
                    text_content=thumb_data.get("text_content"),
                    face_expression=face_details.get("expression") if face_details else None,
                    face_position=face_details.get("position") if face_details else None,
                    face_size=face_details.get("size") if face_details else None,
                    face_looking_direction=face_details.get("looking_direction") if face_details else None,
                ))
            
            # Parse category patterns
            patterns = data.get("category_patterns", {})
            
            from datetime import date
            return CategoryThumbnailInsight(
                category_key=category_key,
                category_name=category_name,
                analysis_date=date.today().isoformat(),
                thumbnails=thumb_analyses,
                common_layout=patterns.get("common_layout", ""),
                common_colors=patterns.get("common_colors", []),
                common_elements=patterns.get("common_elements", []),
                ideal_layout=patterns.get("ideal_layout", ""),
                ideal_color_palette=patterns.get("ideal_color_palette", []),
                must_have_elements=patterns.get("must_have_elements", []),
                avoid_elements=patterns.get("avoid_elements", []),
                category_style_summary=patterns.get("category_style_summary", ""),
                pro_tips=patterns.get("pro_tips", []),
            )
            
        except (json.JSONDecodeError, KeyError, IndexError) as e:
            logger.warning(f"Failed to parse vision response: {e}")
            return self._fallback_insight(category_key, category_name, thumbnails)
    
    def _fallback_insight(
        self,
        category_key: str,
        category_name: str,
        thumbnails: List[ThumbnailData],
    ) -> CategoryThumbnailInsight:
        """Return fallback insight when analysis fails."""
        from datetime import date
        
        # Create basic analyses from metadata
        thumb_analyses = [
            ThumbnailAnalysis(
                video_id=t.video_id,
                title=t.title,
                thumbnail_url=t.thumbnail_url_hq,
                view_count=t.view_count,
                layout_type="unknown",
                text_placement="unknown",
                focal_point="unknown",
                dominant_colors=[],
                color_mood="unknown",
                background_style="unknown",
                has_face=False,
                has_text=False,
                has_border=False,
                has_glow_effects=False,
                has_arrows_circles=False,
                layout_recipe="Analysis unavailable",
                color_recipe="Analysis unavailable",
                why_it_works="High view count indicates effective design",
                difficulty="medium",
                text_content=None,
            )
            for t in thumbnails
        ]
        
        return CategoryThumbnailInsight(
            category_key=category_key,
            category_name=category_name,
            analysis_date=date.today().isoformat(),
            thumbnails=thumb_analyses,
            common_layout="Analysis unavailable",
            common_colors=[],
            common_elements=[],
            ideal_layout="Use bright colors and clear focal points",
            ideal_color_palette=["#FF0000", "#00FF00", "#0000FF"],
            must_have_elements=["Clear text", "Game character"],
            avoid_elements=["Cluttered backgrounds"],
            category_style_summary=f"Top {category_name} thumbnails typically feature game characters with bold text.",
            pro_tips=[
                "Use high contrast colors",
                "Include a face or character",
                "Keep text large and readable",
            ],
        )


# Singleton instance
_analyzer: Optional[ThumbnailVisionAnalyzer] = None


def get_vision_analyzer() -> ThumbnailVisionAnalyzer:
    """Get or create the vision analyzer singleton."""
    global _analyzer
    if _analyzer is None:
        _analyzer = ThumbnailVisionAnalyzer()
    return _analyzer
