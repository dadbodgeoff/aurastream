"""
Context Engine for Twitch Asset Pipeline.

This module implements Layer 1 of the asset generation pipeline - the "Brain"
that gathers live data before prompt construction.

The Context Engine extracts all relevant data from Brand Kit and external sources
to build a complete generation context that can be used by the Prompt Engine.
"""

from dataclasses import dataclass
from typing import Optional, List, Dict, Any
import logging

from backend.services.twitch.dimensions import get_asset_directive
from backend.services.twitch.game_meta import GameMetaService, get_game_meta_service

logger = logging.getLogger(__name__)


@dataclass
class GenerationContext:
    """Complete context for asset generation."""
    # Brand Identity
    primary_colors: List[Dict[str, str]]
    secondary_colors: List[Dict[str, str]]
    accent_colors: List[Dict[str, str]]
    gradients: List[Dict[str, Any]]
    
    # Typography
    display_font: Optional[Dict[str, Any]]
    headline_font: Optional[Dict[str, Any]]
    body_font: Optional[Dict[str, Any]]
    
    # Voice
    tone: str
    personality_traits: List[str]
    tagline: str
    
    # Subject Reference
    primary_logo_url: Optional[str]
    watermark_url: Optional[str]
    watermark_opacity: int
    style_reference: Optional[str]
    
    # Meta Context
    game_meta: Optional[Dict[str, str]]
    season_context: Optional[str]
    
    # Asset Type
    asset_type: str
    asset_directive: str


class ContextEngine:
    """
    Layer 1: The "Brain" - Gathers live data before prompt construction.
    
    Extracts all relevant data from Brand Kit and external sources
    to build a complete generation context.
    """
    
    def __init__(self, brand_kit_service=None, logo_service=None, game_meta_service=None):
        """
        Initialize the Context Engine.
        
        Args:
            brand_kit_service: Brand kit service instance (lazy-loaded if not provided)
            logo_service: Logo service instance (lazy-loaded if not provided)
            game_meta_service: Game meta service instance (lazy-loaded if not provided)
        """
        self._brand_kit_service = brand_kit_service
        self._logo_service = logo_service
        self._game_meta_service = game_meta_service
    
    @property
    def brand_kit_service(self):
        """Lazy-load brand kit service."""
        if self._brand_kit_service is None:
            from backend.services.brand_kit_service import get_brand_kit_service
            self._brand_kit_service = get_brand_kit_service()
        return self._brand_kit_service
    
    @property
    def logo_service(self):
        """Lazy-load logo service."""
        if self._logo_service is None:
            from backend.services.logo_service import get_logo_service
            self._logo_service = get_logo_service()
        return self._logo_service
    
    @property
    def game_meta_service(self) -> GameMetaService:
        """Lazy-load game meta service."""
        if self._game_meta_service is None:
            self._game_meta_service = get_game_meta_service()
        return self._game_meta_service
    
    async def build_context(
        self,
        user_id: str,
        brand_kit_id: Optional[str],
        asset_type: str,
        game_id: Optional[str] = None
    ) -> GenerationContext:
        """
        Build complete generation context from Brand Kit and external sources.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit to use (optional - uses defaults if not provided)
            asset_type: Type of asset being generated
            game_id: Optional game ID for meta context
            
        Returns:
            GenerationContext with all extracted data
        """
        # If no brand kit provided, use default context
        if not brand_kit_id:
            return self._build_default_context(asset_type, game_id)
        
        # Fetch brand kit data
        brand_kit = await self.brand_kit_service.get(user_id, brand_kit_id)
        
        # Extract colors from colors_extended
        colors = self._extract_colors(brand_kit)
        
        # Extract typography
        typography = self._extract_typography(brand_kit)
        
        # Extract voice
        voice = self._extract_voice(brand_kit)
        
        # Extract logo URLs
        logo_data = await self._extract_logos(user_id, brand_kit_id, brand_kit)
        
        # Get style reference
        style_reference = brand_kit.get("style_reference") or None
        
        # Get game meta if game_id provided
        game_meta = None
        season_context = None
        if game_id:
            game_meta = await self.game_meta_service.get_game_meta(game_id)
            if game_meta:
                season_context = game_meta.get("current_season")
        
        # Get asset directive
        asset_directive = get_asset_directive(asset_type)
        
        return GenerationContext(
            # Brand Identity
            primary_colors=colors["primary"],
            secondary_colors=colors["secondary"],
            accent_colors=colors["accent"],
            gradients=colors["gradients"],
            
            # Typography
            display_font=typography["display"],
            headline_font=typography["headline"],
            body_font=typography["body"],
            
            # Voice
            tone=voice["tone"],
            personality_traits=voice["personality_traits"],
            tagline=voice["tagline"],
            
            # Subject Reference
            primary_logo_url=logo_data["primary_url"],
            watermark_url=logo_data["watermark_url"],
            watermark_opacity=logo_data["watermark_opacity"],
            style_reference=style_reference,
            
            # Meta Context
            game_meta=game_meta,
            season_context=season_context,
            
            # Asset Type
            asset_type=asset_type,
            asset_directive=asset_directive,
        )
    
    def _extract_colors(self, brand_kit: Dict[str, Any]) -> Dict[str, List]:
        """
        Extract colors from brand kit's colors_extended field.
        
        Args:
            brand_kit: Brand kit dictionary
            
        Returns:
            Dictionary with primary, secondary, accent, and gradients lists
        """
        colors_extended = brand_kit.get("colors_extended") or {}
        
        return {
            "primary": colors_extended.get("primary") or [],
            "secondary": colors_extended.get("secondary") or [],
            "accent": colors_extended.get("accent") or [],
            "gradients": colors_extended.get("gradients") or [],
        }
    
    def _extract_typography(self, brand_kit: Dict[str, Any]) -> Dict[str, Optional[Dict]]:
        """
        Extract typography from brand kit's typography field.
        
        Args:
            brand_kit: Brand kit dictionary
            
        Returns:
            Dictionary with display, headline, and body font configurations
        """
        typography = brand_kit.get("typography") or {}
        
        return {
            "display": typography.get("display") or None,
            "headline": typography.get("headline") or None,
            "body": typography.get("body") or None,
        }
    
    def _extract_voice(self, brand_kit: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract voice/tone from brand kit's voice field.
        
        Args:
            brand_kit: Brand kit dictionary
            
        Returns:
            Dictionary with tone, personality_traits, and tagline
        """
        voice = brand_kit.get("voice") or {}
        
        return {
            "tone": voice.get("tone") or "professional",
            "personality_traits": voice.get("personality_traits") or [],
            "tagline": voice.get("tagline") or "",
        }
    
    async def _extract_logos(
        self,
        user_id: str,
        brand_kit_id: str,
        brand_kit: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract logo URLs from brand kit's logos field.
        
        Args:
            user_id: User's ID
            brand_kit_id: Brand kit ID
            brand_kit: Brand kit dictionary
            
        Returns:
            Dictionary with primary_url, watermark_url, and watermark_opacity
        """
        logos = brand_kit.get("logos") or {}
        
        primary_url = None
        watermark_url = None
        watermark_opacity = 50  # Default opacity
        
        # Get primary logo URL
        primary_logo = logos.get("primary")
        if primary_logo and primary_logo.get("url"):
            try:
                primary_url = await self.logo_service.get_logo_url(
                    user_id, brand_kit_id, "primary"
                )
            except Exception as e:
                logger.warning(f"Failed to get primary logo URL: {e}")
                primary_url = None
        
        # Get watermark URL and opacity
        watermark = logos.get("watermark")
        if watermark:
            if watermark.get("url"):
                try:
                    watermark_url = await self.logo_service.get_logo_url(
                        user_id, brand_kit_id, "watermark"
                    )
                except Exception as e:
                    logger.warning(f"Failed to get watermark URL: {e}")
                    watermark_url = None
            
            if watermark.get("opacity") is not None:
                watermark_opacity = watermark["opacity"]
        
        return {
            "primary_url": primary_url,
            "watermark_url": watermark_url,
            "watermark_opacity": watermark_opacity,
        }
    
    async def _build_default_context(
        self,
        asset_type: str,
        game_id: Optional[str] = None
    ) -> GenerationContext:
        """
        Build a default generation context when no brand kit is provided.
        
        Uses sensible defaults that allow generation to proceed without
        brand-specific customization.
        
        Args:
            asset_type: Type of asset being generated
            game_id: Optional game ID for meta context
            
        Returns:
            GenerationContext with default values
        """
        # Get game meta if game_id provided
        game_meta = None
        season_context = None
        if game_id:
            game_meta = await self.game_meta_service.get_game_meta(game_id)
            if game_meta:
                season_context = game_meta.get("current_season")
        
        # Get asset directive
        asset_directive = get_asset_directive(asset_type)
        
        return GenerationContext(
            # Default Brand Identity - neutral colors
            primary_colors=[{"hex": "#6366F1", "name": "Indigo"}],
            secondary_colors=[{"hex": "#8B5CF6", "name": "Violet"}],
            accent_colors=[{"hex": "#EC4899", "name": "Pink"}],
            gradients=[],
            
            # Default Typography
            display_font={"family": "Inter", "weight": "bold"},
            headline_font={"family": "Inter", "weight": "semibold"},
            body_font={"family": "Inter", "weight": "regular"},
            
            # Default Voice
            tone="professional",
            personality_traits=["creative", "modern"],
            tagline="",
            
            # No logos for default context
            primary_logo_url=None,
            watermark_url=None,
            watermark_opacity=50,
            style_reference=None,
            
            # Meta Context
            game_meta=game_meta,
            season_context=season_context,
            
            # Asset Type
            asset_type=asset_type,
            asset_directive=asset_directive,
        )


# Singleton instance
_context_engine: Optional[ContextEngine] = None


def get_context_engine() -> ContextEngine:
    """Get or create the context engine singleton."""
    global _context_engine
    if _context_engine is None:
        _context_engine = ContextEngine()
    return _context_engine
