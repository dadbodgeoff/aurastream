"""
Thumbnail Vision Analyzer

Uses Gemini Vision to analyze thumbnail images and extract:
- Layout patterns (text placement, focal points)
- Color schemes and palettes
- Design elements (faces, characters, effects)
- Recommendations for recreating the style

Architecture (v2 - Per-Thumbnail Analysis):
- Each thumbnail gets its own Gemini Vision call for accurate analysis
- Category patterns are aggregated from individual results
- 80 total calls (10 thumbnails × 8 categories) instead of 8 batched calls
"""

import logging
import asyncio
import json
import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from collections import Counter

from google import genai
from google.genai import types

from backend.services.thumbnail_intel.constants import GEMINI_VISION_MODEL
from backend.services.thumbnail_intel.collector import ThumbnailData

logger = logging.getLogger(__name__)

# Concurrency limit to avoid rate limiting (Gemini allows ~60 RPM on free tier)
MAX_CONCURRENT_CALLS = 5


# ============================================================================
# Helper Functions for New Fields
# ============================================================================

def extract_hashtags(title: str) -> List[str]:
    """Extract hashtags from title string."""
    import re
    return re.findall(r'#(\w+)', title.lower())


def calculate_aspect_ratio(width: int = 1280, height: int = 720) -> str:
    """Calculate aspect ratio string from dimensions."""
    if height == 0:
        return "16:9"
    ratio = width / height
    if abs(ratio - 16/9) < 0.1:
        return "16:9"
    elif abs(ratio - 4/3) < 0.1:
        return "4:3"
    elif abs(ratio - 1) < 0.1:
        return "1:1"
    elif abs(ratio - 9/16) < 0.1:
        return "9:16"
    return "16:9"  # Default for YouTube thumbnails


def classify_format_type(layout_type: str, has_face: bool) -> str:
    """Classify thumbnail format type based on layout analysis."""
    layout_lower = layout_type.lower() if layout_type else ""
    if "split" in layout_lower:
        return "split-screen"
    elif "reaction" in layout_lower or (has_face and "face" in layout_lower):
        return "reaction"
    elif "tutorial" in layout_lower or "guide" in layout_lower:
        return "tutorial"
    elif "gameplay" in layout_lower or "action" in layout_lower:
        return "gameplay"
    elif "vlog" in layout_lower:
        return "vlog"
    return "standard"


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
    
    # NEW: Enhanced metadata for Intel redesign
    aspect_ratio: Optional[str] = None  # "16:9", "4:3", "1:1", "9:16"
    hashtags: Optional[List[str]] = None  # Extracted from title
    format_type: Optional[str] = None  # "split-screen", "reaction", "gameplay", "tutorial", "vlog"
    channel_name: Optional[str] = None  # YouTube channel name
    published_at: Optional[str] = None  # ISO date string


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
    
    V2 Architecture: Per-thumbnail analysis for accuracy
    - Each thumbnail gets its own Gemini call
    - Category patterns aggregated from individual results
    - Concurrent calls with rate limiting
    """
    
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if api_key:
            self._client = genai.Client(api_key=api_key)
            self.model_name = GEMINI_VISION_MODEL
            self.enabled = True
        else:
            logger.warning("GOOGLE_API_KEY not set - Vision analysis disabled")
            self._client = None
            self.enabled = False
        
        # Semaphore for rate limiting concurrent calls
        self._semaphore = asyncio.Semaphore(MAX_CONCURRENT_CALLS)
    
    async def analyze_category_thumbnails(
        self,
        category_key: str,
        category_name: str,
        thumbnails: List[ThumbnailData],
        thumbnail_images: List[bytes],
    ) -> CategoryThumbnailInsight:
        """
        Analyze all thumbnails for a category and generate insights.
        
        V2: Makes individual Gemini calls per thumbnail, then aggregates.
        
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
            # Step 1: Analyze each thumbnail individually (concurrent with rate limiting)
            logger.info(f"Analyzing {len(thumbnails)} thumbnails individually for {category_key}...")
            
            tasks = []
            for i, (thumb, img_bytes) in enumerate(zip(thumbnails, thumbnail_images)):
                if img_bytes:
                    tasks.append(self._analyze_single_thumbnail(
                        thumb=thumb,
                        img_bytes=img_bytes,
                        category_name=category_name,
                        index=i + 1,
                    ))
                else:
                    # No image - create fallback analysis
                    tasks.append(self._create_fallback_analysis(thumb))
            
            # Run all analyses concurrently (semaphore limits concurrency)
            thumb_analyses = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out exceptions and log them
            valid_analyses = []
            for i, result in enumerate(thumb_analyses):
                if isinstance(result, Exception):
                    logger.warning(f"Thumbnail {i+1} analysis failed: {result}")
                    # Create fallback for failed analysis
                    valid_analyses.append(self._create_fallback_analysis_sync(thumbnails[i]))
                elif result is not None:
                    valid_analyses.append(result)
            
            logger.info(f"Successfully analyzed {len(valid_analyses)}/{len(thumbnails)} thumbnails for {category_key}")
            
            # Step 2: Aggregate patterns from individual analyses
            patterns = self._aggregate_category_patterns(valid_analyses, category_name)
            
            from datetime import date
            return CategoryThumbnailInsight(
                category_key=category_key,
                category_name=category_name,
                analysis_date=date.today().isoformat(),
                thumbnails=valid_analyses,
                common_layout=patterns["common_layout"],
                common_colors=patterns["common_colors"],
                common_elements=patterns["common_elements"],
                ideal_layout=patterns["ideal_layout"],
                ideal_color_palette=patterns["ideal_color_palette"],
                must_have_elements=patterns["must_have_elements"],
                avoid_elements=patterns["avoid_elements"],
                category_style_summary=patterns["category_style_summary"],
                pro_tips=patterns["pro_tips"],
            )
            
        except Exception as e:
            logger.error(f"Vision analysis failed for {category_key}: {e}")
            return self._fallback_insight(category_key, category_name, thumbnails)
    
    async def _analyze_single_thumbnail(
        self,
        thumb: ThumbnailData,
        img_bytes: bytes,
        category_name: str,
        index: int,
    ) -> ThumbnailAnalysis:
        """
        Analyze a single thumbnail with Gemini Vision.
        
        Uses semaphore to limit concurrent API calls.
        Uses response_schema for guaranteed valid JSON.
        """
        async with self._semaphore:
            try:
                prompt = self._build_single_thumbnail_prompt(thumb, category_name)
                
                contents = [
                    types.Part.from_text(text=prompt),
                    types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
                ]
                
                # Use structured output for guaranteed valid JSON
                config = types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=1500,
                    response_mime_type="application/json",
                    response_schema={
                        "type": "object",
                        "properties": {
                            "layout_type": {"type": "string"},
                            "text_placement": {"type": "string"},
                            "focal_point": {"type": "string"},
                            "dominant_colors": {"type": "array", "items": {"type": "string"}},
                            "color_mood": {"type": "string"},
                            "background_style": {"type": "string"},
                            "has_face": {"type": "boolean"},
                            "has_text": {"type": "boolean"},
                            "text_content": {"type": "string"},
                            "has_border": {"type": "boolean"},
                            "has_glow_effects": {"type": "boolean"},
                            "has_arrows_circles": {"type": "boolean"},
                            "face_details": {
                                "type": "object",
                                "properties": {
                                    "expression": {"type": "string"},
                                    "position": {"type": "string"},
                                    "size": {"type": "string"},
                                    "looking_direction": {"type": "string"},
                                },
                            },
                            "layout_recipe": {"type": "string"},
                            "color_recipe": {"type": "string"},
                            "why_it_works": {"type": "string"},
                            "difficulty": {"type": "string"},
                        },
                        "required": ["layout_type", "text_placement", "focal_point", "dominant_colors", 
                                     "color_mood", "background_style", "has_face", "has_text", 
                                     "has_border", "has_glow_effects", "has_arrows_circles",
                                     "layout_recipe", "color_recipe", "why_it_works", "difficulty"],
                    },
                )
                
                response = await self._client.aio.models.generate_content(
                    model=self.model_name,
                    contents=contents,
                    config=config,
                )
                
                # Parse the structured JSON response
                analysis = self._parse_single_thumbnail_response(response.text, thumb)
                
                logger.debug(f"Analyzed thumbnail {index}: {thumb.title[:50]}...")
                
                # Small delay to avoid rate limiting
                await asyncio.sleep(0.1)
                
                return analysis
                
            except Exception as e:
                logger.warning(f"Failed to analyze thumbnail {index}: {e}")
                return self._create_fallback_analysis_sync(thumb)
    
    def _build_single_thumbnail_prompt(
        self,
        thumb: ThumbnailData,
        category_name: str,
    ) -> str:
        """Build prompt for analyzing a single thumbnail."""
        return f"""You are a YouTube thumbnail design expert. Analyze this {category_name} gaming thumbnail.

Video: "{thumb.title}" by {thumb.channel_title} ({thumb.view_count:,} views)

Provide a detailed JSON analysis:

{{
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

Rules:
- Be specific about colors (use actual hex codes you see)
- Layout recipe should be actionable for Canva/Photoshop
- Focus on what makes this thumbnail successful
- If has_face is true, fill in face_details completely"""
    
    def _parse_single_thumbnail_response(
        self,
        response: str,
        thumb: ThumbnailData,
    ) -> ThumbnailAnalysis:
        """Parse Gemini response for a single thumbnail."""
        try:
            # Extract JSON from response - try multiple patterns
            json_str = response
            
            # Try to extract JSON block
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                parts = response.split("```")
                if len(parts) >= 2:
                    json_str = parts[1]
            
            # Clean up common issues
            json_str = json_str.strip()
            
            # Try to find JSON object boundaries
            start_idx = json_str.find('{')
            end_idx = json_str.rfind('}')
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                json_str = json_str[start_idx:end_idx + 1]
            
            # Fix common JSON issues from Gemini
            # Remove trailing commas before closing braces/brackets
            import re
            json_str = re.sub(r',\s*}', '}', json_str)
            json_str = re.sub(r',\s*]', ']', json_str)
            
            data = json.loads(json_str)
            
            # Extract face details if present
            face_details = data.get("face_details", {})
            layout_type = data.get("layout_type", "unknown")
            has_face = data.get("has_face", False)
            
            return ThumbnailAnalysis(
                video_id=thumb.video_id,
                title=thumb.title,
                thumbnail_url=thumb.thumbnail_url_hq,
                view_count=thumb.view_count,
                layout_type=layout_type,
                text_placement=data.get("text_placement", "unknown"),
                focal_point=data.get("focal_point", "unknown"),
                dominant_colors=data.get("dominant_colors", []),
                color_mood=data.get("color_mood", "unknown"),
                background_style=data.get("background_style", "unknown"),
                has_face=has_face,
                has_text=data.get("has_text", False),
                has_border=data.get("has_border", False),
                has_glow_effects=data.get("has_glow_effects", False),
                has_arrows_circles=data.get("has_arrows_circles", False),
                layout_recipe=data.get("layout_recipe", ""),
                color_recipe=data.get("color_recipe", ""),
                why_it_works=data.get("why_it_works", ""),
                difficulty=data.get("difficulty", "medium"),
                text_content=data.get("text_content"),
                face_expression=face_details.get("expression") if face_details else None,
                face_position=face_details.get("position") if face_details else None,
                face_size=face_details.get("size") if face_details else None,
                face_looking_direction=face_details.get("looking_direction") if face_details else None,
                # Enhanced metadata
                aspect_ratio=calculate_aspect_ratio(),
                hashtags=extract_hashtags(thumb.title),
                format_type=classify_format_type(layout_type, has_face),
                channel_name=thumb.channel_title,
                published_at=thumb.published_at.isoformat() if hasattr(thumb, 'published_at') and thumb.published_at else None,
            )
            
        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Failed to parse single thumbnail response: {e}")
            return self._create_fallback_analysis_sync(thumb)
    
    async def _create_fallback_analysis(self, thumb: ThumbnailData) -> ThumbnailAnalysis:
        """Async wrapper for fallback analysis."""
        return self._create_fallback_analysis_sync(thumb)
    
    def _create_fallback_analysis_sync(self, thumb: ThumbnailData) -> ThumbnailAnalysis:
        """Create fallback analysis when Gemini call fails."""
        return ThumbnailAnalysis(
            video_id=thumb.video_id,
            title=thumb.title,
            thumbnail_url=thumb.thumbnail_url_hq,
            view_count=thumb.view_count,
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
            aspect_ratio=calculate_aspect_ratio(),
            hashtags=extract_hashtags(thumb.title),
            format_type="standard",
            channel_name=thumb.channel_title,
            published_at=thumb.published_at.isoformat() if hasattr(thumb, 'published_at') and thumb.published_at else None,
        )
    
    def _aggregate_category_patterns(
        self,
        analyses: List[ThumbnailAnalysis],
        category_name: str,
    ) -> Dict[str, Any]:
        """
        Aggregate patterns from individual thumbnail analyses.
        
        Computes common patterns, colors, and generates recommendations
        based on the successful thumbnails analyzed.
        """
        if not analyses:
            return self._default_patterns(category_name)
        
        # Count layout types
        layout_counts = Counter(a.layout_type for a in analyses if a.layout_type != "unknown")
        common_layout = layout_counts.most_common(1)[0][0] if layout_counts else "varied"
        
        # Aggregate colors (flatten and count)
        all_colors = []
        for a in analyses:
            all_colors.extend(a.dominant_colors[:3])  # Top 3 from each
        color_counts = Counter(all_colors)
        common_colors = [c for c, _ in color_counts.most_common(5)]
        
        # Count common elements
        elements = []
        face_count = sum(1 for a in analyses if a.has_face)
        text_count = sum(1 for a in analyses if a.has_text)
        border_count = sum(1 for a in analyses if a.has_border)
        glow_count = sum(1 for a in analyses if a.has_glow_effects)
        
        if face_count > len(analyses) * 0.5:
            elements.append("face/character")
        if text_count > len(analyses) * 0.5:
            elements.append("bold text")
        if glow_count > len(analyses) * 0.3:
            elements.append("glow effects")
        if border_count > len(analyses) * 0.3:
            elements.append("border/frame")
        
        # Color moods
        mood_counts = Counter(a.color_mood for a in analyses if a.color_mood != "unknown")
        dominant_mood = mood_counts.most_common(1)[0][0] if mood_counts else "vibrant"
        
        # Background styles
        bg_counts = Counter(a.background_style for a in analyses if a.background_style != "unknown")
        common_bg = bg_counts.most_common(1)[0][0] if bg_counts else "game-screenshot"
        
        # Generate recommendations based on patterns
        must_have = []
        if face_count > len(analyses) * 0.6:
            must_have.append("expressive face or character")
        if text_count > len(analyses) * 0.6:
            must_have.append("large, readable text")
        if common_colors:
            must_have.append(f"high contrast colors ({dominant_mood} mood)")
        
        avoid = []
        if border_count < len(analyses) * 0.2:
            avoid.append("heavy borders")
        if glow_count < len(analyses) * 0.2:
            avoid.append("excessive glow effects")
        avoid.append("cluttered backgrounds")
        avoid.append("small or hard-to-read text")
        
        # Generate style summary
        face_pct = int(face_count / len(analyses) * 100) if analyses else 0
        text_pct = int(text_count / len(analyses) * 100) if analyses else 0
        
        style_summary = (
            f"{category_name} thumbnails typically use {common_layout} layouts with {dominant_mood} colors. "
            f"{face_pct}% feature faces, {text_pct}% have bold text. "
            f"Most use {common_bg} backgrounds."
        )[:200]
        
        # Generate pro tips based on analysis
        pro_tips = self._generate_pro_tips(analyses, category_name, common_layout, dominant_mood)
        
        return {
            "common_layout": common_layout,
            "common_colors": common_colors,
            "common_elements": elements,
            "ideal_layout": f"Use {common_layout} layout with clear focal point",
            "ideal_color_palette": common_colors[:4] if common_colors else ["#FF0000", "#FFFFFF", "#000000"],
            "must_have_elements": must_have[:3],
            "avoid_elements": avoid[:3],
            "category_style_summary": style_summary,
            "pro_tips": pro_tips,
        }
    
    def _generate_pro_tips(
        self,
        analyses: List[ThumbnailAnalysis],
        category_name: str,
        common_layout: str,
        dominant_mood: str,
    ) -> List[str]:
        """Generate actionable pro tips based on analysis patterns."""
        tips = []
        
        # Tip based on layout
        if common_layout == "face-left-text-right":
            tips.append(f"Place your face on the left third, text on the right for {category_name} thumbnails")
        elif common_layout == "centered-character":
            tips.append("Center your character with text above or below for maximum impact")
        elif common_layout == "split-screen":
            tips.append("Use split-screen to show before/after or comparison content")
        
        # Tip based on mood
        if dominant_mood == "energetic":
            tips.append("Use bright, saturated colors to convey energy and excitement")
        elif dominant_mood == "dark":
            tips.append("Dark backgrounds with bright accents create dramatic contrast")
        elif dominant_mood == "vibrant":
            tips.append("Vibrant color combinations grab attention in the feed")
        
        # Tip based on face usage
        face_with_expression = [a for a in analyses if a.has_face and a.face_expression]
        if face_with_expression:
            expressions = Counter(a.face_expression for a in face_with_expression)
            top_expression = expressions.most_common(1)[0][0] if expressions else "excited"
            tips.append(f"'{top_expression}' facial expressions perform well for {category_name}")
        
        # General tips
        tips.append(f"Study top {category_name} creators and adapt their thumbnail style to your brand")
        
        return tips[:4]  # Return top 4 tips
    
    def _default_patterns(self, category_name: str) -> Dict[str, Any]:
        """Return default patterns when no analyses available."""
        return {
            "common_layout": "face-left-text-right",
            "common_colors": ["#FF0000", "#FFFFFF", "#000000"],
            "common_elements": ["face/character", "bold text"],
            "ideal_layout": "Use face-left-text-right layout with clear focal point",
            "ideal_color_palette": ["#FF0000", "#FFFFFF", "#000000", "#FFFF00"],
            "must_have_elements": ["expressive face", "readable text", "game branding"],
            "avoid_elements": ["cluttered backgrounds", "small text", "low contrast"],
            "category_style_summary": f"Top {category_name} thumbnails feature expressive faces with bold text.",
            "pro_tips": [
                "Use high contrast colors for visibility",
                "Include a face or character for emotional connection",
                "Keep text large and readable on mobile",
            ],
        }
    
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
                # NEW: Enhanced metadata
                aspect_ratio=calculate_aspect_ratio(),
                hashtags=extract_hashtags(t.title),
                format_type="standard",
                channel_name=t.channel_title,
                published_at=t.published_at.isoformat() if hasattr(t, 'published_at') and t.published_at else None,
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
