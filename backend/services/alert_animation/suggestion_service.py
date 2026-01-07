"""
Animation Suggestion Service

Generates AI-powered animation suggestions based on asset analysis.
Uses structured JSON output from Nano Banana to recommend animations.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from backend.api.schemas.alert_animation import (
    AnimationSuggestion,
    AnimationConfig,
    EntryAnimation,
    LoopAnimation,
    DepthEffect,
    ParticleEffect,
)

logger = logging.getLogger(__name__)


# Vibe-to-animation mapping for fallback suggestions
VIBE_PRESETS = {
    "cute": {
        "entry": {"type": "bounce", "duration_ms": 600, "bounces": 3, "height": 40},
        "loop": {"type": "float", "amplitude_y": 6, "amplitude_x": 2, "frequency": 0.4},
        "particles": {"type": "hearts", "count": 20, "color": "#ff69b4", "float_speed": 0.5, "sway_amount": 15, "lifetime_ms": 3500},
        "depth_effect": {"type": "tilt", "max_angle_x": 8, "max_angle_y": 8, "perspective": 1000},
        "recommended_event": "new_subscriber",
        "reasoning": "Cute mascots work great with bouncy, playful animations and heart particles",
    },
    "aggressive": {
        "entry": {"type": "burst", "duration_ms": 500, "scale_from": 2.5, "opacity_from": 0, "rotation_from": 15},
        "loop": {"type": "pulse", "scale_min": 0.95, "scale_max": 1.08, "frequency": 1.2},
        "particles": {"type": "fire", "count": 45, "colors": ["#ff4500", "#ff6600", "#ff8c00"], "speed": 1.5, "turbulence": 0.4, "lifetime_ms": 1800},
        "depth_effect": {"type": "pop_out", "depth_scale": 50, "trigger": "on_enter", "duration_ms": 700},
        "recommended_event": "raid",
        "reasoning": "Aggressive esports logos need explosive entries with fire effects for maximum impact",
    },
    "chill": {
        "entry": {"type": "fade_in", "duration_ms": 600, "scale_from": 0.95, "opacity_from": 0},
        "loop": {"type": "float", "amplitude_y": 4, "amplitude_x": 1, "frequency": 0.3},
        "particles": {"type": "sparkles", "count": 12, "color": "#87ceeb", "color_variance": 0.3, "size_min": 2, "size_max": 5, "lifetime_ms": 2500},
        "depth_effect": {"type": "parallax", "intensity": 0.3, "trigger": "mouse"},
        "recommended_event": "new_follower",
        "reasoning": "Chill vibes call for smooth, gentle animations that don't overwhelm",
    },
    "hype": {
        "entry": {"type": "pop_in", "duration_ms": 400, "scale_from": 0, "bounce": 0.4},
        "loop": {"type": "glow", "color": "#ffd700", "intensity_min": 0.3, "intensity_max": 0.9, "frequency": 0.8, "blur_radius": 20},
        "particles": {"type": "confetti", "count": 60, "colors": ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff"], "gravity": 0.4, "spread": 180, "lifetime_ms": 3000},
        "depth_effect": {"type": "pop_out", "depth_scale": 40, "trigger": "on_enter", "duration_ms": 600},
        "recommended_event": "donation_large",
        "reasoning": "Hype moments deserve maximum celebration with confetti and glowing effects",
    },
    "professional": {
        "entry": {"type": "slide_in", "duration_ms": 400, "direction": "left", "distance_percent": 100},
        "loop": {"type": "pulse", "scale_min": 0.98, "scale_max": 1.02, "frequency": 0.6},
        "particles": None,
        "depth_effect": {"type": "parallax", "intensity": 0.25, "trigger": "mouse"},
        "recommended_event": "milestone",
        "reasoning": "Professional branding needs clean, subtle animations that maintain credibility",
    },
    "playful": {
        "entry": {"type": "pop_in", "duration_ms": 500, "scale_from": 0.1, "bounce": 0.35},
        "loop": {"type": "wiggle", "angle_max": 4, "frequency": 3, "decay": 0},
        "particles": {"type": "sparkles", "count": 20, "color": "#ffd700", "color_variance": 0.4, "size_min": 3, "size_max": 7, "lifetime_ms": 2000},
        "depth_effect": {"type": "tilt", "max_angle_x": 12, "max_angle_y": 12, "perspective": 800},
        "recommended_event": "bits",
        "reasoning": "Playful assets shine with bouncy, wiggly animations and sparkle effects",
    },
    "dark": {
        "entry": {"type": "fade_in", "duration_ms": 800, "scale_from": 1.1, "opacity_from": 0},
        "loop": {"type": "glow", "color": "#8b0000", "intensity_min": 0.1, "intensity_max": 0.5, "frequency": 0.4, "blur_radius": 25},
        "particles": {"type": "fire", "count": 25, "colors": ["#8b0000", "#4a0000", "#2d0000"], "speed": 0.8, "turbulence": 0.2, "lifetime_ms": 2500},
        "depth_effect": {"type": "parallax", "intensity": 0.4, "trigger": "mouse", "invert": True},
        "recommended_event": "raid",
        "reasoning": "Dark aesthetics work best with moody glows and subtle, ominous particle effects",
    },
    "retro": {
        "entry": {"type": "glitch", "duration_ms": 400, "glitch_intensity": 0.6},
        "loop": {"type": "rgb_glow", "speed": 1.5, "saturation": 0.8},
        "particles": {"type": "pixels", "count": 30, "colors": ["#00ff00", "#ff00ff", "#00ffff"], "size": 4, "lifetime_ms": 2000},
        "depth_effect": None,
        "recommended_event": "bits",
        "reasoning": "Retro/pixel art looks amazing with glitch effects and RGB color cycling",
    },
}


class AnimationSuggestionService:
    """Service for generating AI-powered animation suggestions."""

    def __init__(self):
        self._nano_banana_client = None

    async def _get_nano_banana_client(self):
        """Lazy-load Nano Banana client."""
        if self._nano_banana_client is None:
            from backend.services.nano_banana_client import get_nano_banana_client
            self._nano_banana_client = get_nano_banana_client()
        return self._nano_banana_client

    async def analyze_asset_and_suggest(
        self,
        asset_url: str,
        asset_type: str,
        asset_name: Optional[str] = None,
    ) -> Optional[AnimationSuggestion]:
        """
        Analyze an asset and generate animation suggestions.
        
        Uses Nano Banana (Gemini) to analyze the asset's visual characteristics
        and returns a structured animation suggestion.
        
        Args:
            asset_url: URL of the asset to analyze
            asset_type: Type of asset (twitch_emote, youtube_thumbnail, etc.)
            asset_name: Optional name/description of the asset
            
        Returns:
            AnimationSuggestion with recommended config, or None if analysis fails
        """
        try:
            # Download the asset image
            import httpx
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(asset_url)
                if response.status_code != 200:
                    logger.warning(f"Failed to download asset for analysis: {asset_url}")
                    return self._get_fallback_suggestion(asset_type)
                
                # Image data downloaded successfully - reserved for future AI analysis
                _ = response.content

            # Build analysis prompt (reserved for future AI integration)
            _ = self._build_analysis_prompt(asset_type, asset_name)

            # TODO: Add AI-powered analysis using Nano Banana
            # For now, use heuristic-based suggestion
            logger.info(f"Generating animation suggestion for asset: {asset_url[:50]}...")
            
            # Use heuristic-based suggestion for now
            return self._get_heuristic_suggestion(asset_type, asset_name)

        except Exception as e:
            logger.warning(f"Failed to analyze asset for animation suggestion: {e}")
            return self._get_fallback_suggestion(asset_type)

    def _build_analysis_prompt(self, asset_type: str, asset_name: Optional[str]) -> str:
        """Build the prompt for asset analysis."""
        name_context = f" named '{asset_name}'" if asset_name else ""
        
        return f"""Analyze this {asset_type}{name_context} and suggest the best animation style.

Return a JSON object with:
{{
  "vibe": "one of: cute, aggressive, chill, hype, professional, playful, dark, retro",
  "reasoning": "brief explanation of why this vibe fits",
  "recommended_event": "best stream event: new_subscriber, raid, donation_small, donation_medium, donation_large, new_follower, milestone, bits, gift_sub"
}}

Consider:
- Color palette (bright = playful, dark = aggressive/dark, pastel = cute)
- Subject matter (mascot = cute/playful, logo = professional, character = varies)
- Style (pixel art = retro, clean vectors = professional, detailed = varies)
- Energy level (action poses = aggressive/hype, calm poses = chill)

Return ONLY the JSON object, no other text."""

    def _get_heuristic_suggestion(
        self,
        asset_type: str,
        asset_name: Optional[str],
    ) -> AnimationSuggestion:
        """
        Generate suggestion based on asset type and name heuristics.
        
        This is used when AI analysis isn't available or fails.
        """
        # Determine vibe from asset type and name
        vibe = "playful"  # Default
        
        name_lower = (asset_name or "").lower()
        
        # Check name for vibe hints
        if any(word in name_lower for word in ["cute", "kawaii", "chibi", "uwu", "heart"]):
            vibe = "cute"
        elif any(word in name_lower for word in ["fire", "rage", "angry", "skull", "death", "war"]):
            vibe = "aggressive"
        elif any(word in name_lower for word in ["chill", "relax", "calm", "zen", "cozy"]):
            vibe = "chill"
        elif any(word in name_lower for word in ["hype", "epic", "legendary", "mega", "ultra"]):
            vibe = "hype"
        elif any(word in name_lower for word in ["pro", "esport", "team", "logo", "brand"]):
            vibe = "professional"
        elif any(word in name_lower for word in ["pixel", "retro", "8bit", "arcade", "game"]):
            vibe = "retro"
        elif any(word in name_lower for word in ["dark", "shadow", "night", "goth", "demon"]):
            vibe = "dark"
        
        # Asset type hints
        if asset_type in ["twitch_emote", "twitch_emote_112"]:
            if vibe == "playful":
                vibe = "cute"  # Emotes tend to be cute/playful
        elif asset_type in ["twitch_banner", "youtube_thumbnail"]:
            if vibe == "playful":
                vibe = "hype"  # Banners/thumbnails tend to be attention-grabbing
        
        return self._build_suggestion_from_vibe(vibe)

    def _get_fallback_suggestion(self, asset_type: str) -> AnimationSuggestion:
        """Get a safe fallback suggestion based on asset type."""
        # Map asset types to default vibes
        type_vibes = {
            "twitch_emote": "cute",
            "twitch_emote_112": "cute",
            "twitch_badge": "professional",
            "twitch_banner": "hype",
            "youtube_thumbnail": "hype",
            "overlay": "professional",
        }
        
        vibe = type_vibes.get(asset_type, "playful")
        return self._build_suggestion_from_vibe(vibe)

    def _build_suggestion_from_vibe(self, vibe: str) -> AnimationSuggestion:
        """Build a complete AnimationSuggestion from a vibe."""
        preset_data = VIBE_PRESETS.get(vibe, VIBE_PRESETS["playful"])
        
        # Build config
        config = AnimationConfig(
            entry=EntryAnimation(**preset_data["entry"]) if preset_data.get("entry") else None,
            loop=LoopAnimation(**preset_data["loop"]) if preset_data.get("loop") else None,
            depth_effect=DepthEffect(**preset_data["depth_effect"]) if preset_data.get("depth_effect") else None,
            particles=ParticleEffect(**preset_data["particles"]) if preset_data.get("particles") else None,
            duration_ms=3000,
            loop_count=1,
        )
        
        # Get alternative vibes
        all_vibes = list(VIBE_PRESETS.keys())
        alternatives = [v for v in all_vibes if v != vibe][:3]
        
        return AnimationSuggestion(
            vibe=vibe,
            recommended_preset=f"{vibe.title()} Style",
            recommended_event=preset_data.get("recommended_event"),
            config=config,
            reasoning=preset_data.get("reasoning", f"This {vibe} style matches the asset's visual characteristics"),
            alternatives=alternatives,
        )

    async def store_suggestion(
        self,
        asset_id: str,
        suggestion: AnimationSuggestion,
    ) -> bool:
        """
        Store animation suggestion in the asset record.
        
        Args:
            asset_id: Asset UUID
            suggestion: AnimationSuggestion to store
            
        Returns:
            True if stored successfully
        """
        try:
            from backend.database.supabase_client import get_supabase_client
            
            db = get_supabase_client()
            
            # Convert suggestion to dict for JSONB storage
            suggestion_data = {
                "vibe": suggestion.vibe,
                "recommended_preset": suggestion.recommended_preset,
                "recommended_event": suggestion.recommended_event,
                "config": suggestion.config.model_dump(),
                "reasoning": suggestion.reasoning,
                "alternatives": suggestion.alternatives,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            }
            
            result = (
                db.table("assets")
                .update({"animation_suggestions": suggestion_data})
                .eq("id", asset_id)
                .execute()
            )
            
            if result.data:
                logger.info(f"Stored animation suggestion for asset: {asset_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to store animation suggestion: {e}")
            return False


# Singleton instance
_suggestion_service: Optional[AnimationSuggestionService] = None


def get_animation_suggestion_service() -> AnimationSuggestionService:
    """Get the singleton AnimationSuggestionService instance."""
    global _suggestion_service
    if _suggestion_service is None:
        _suggestion_service = AnimationSuggestionService()
    return _suggestion_service
