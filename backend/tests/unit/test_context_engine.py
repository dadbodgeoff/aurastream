"""
Unit tests for the Twitch Context Engine.

Tests cover:
- GenerationContext dataclass
- ContextEngine.build_context() method
- Color extraction from colors_extended
- Typography extraction
- Voice extraction
- Logo URL retrieval
- Game meta integration
- Asset directive injection
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from backend.services.twitch.context_engine import GenerationContext, ContextEngine
from backend.services.twitch.game_meta import GameMetaService


class TestGenerationContext:
    """Tests for GenerationContext dataclass."""
    
    def test_creation_with_all_fields(self):
        """Test creating context with all fields populated."""
        context = GenerationContext(
            primary_colors=[{"hex": "#FF0000", "name": "Red"}],
            secondary_colors=[{"hex": "#00FF00", "name": "Green"}],
            accent_colors=[{"hex": "#0000FF", "name": "Blue"}],
            gradients=[{"name": "Sunset", "stops": ["#FF0000", "#FF8800"]}],
            display_font={"family": "Montserrat", "weight": 800},
            headline_font={"family": "Montserrat", "weight": 700},
            body_font={"family": "Inter", "weight": 400},
            tone="competitive",
            personality_traits=["Bold", "Energetic"],
            tagline="Level Up",
            primary_logo_url="https://example.com/logo.png",
            watermark_url="https://example.com/watermark.png",
            watermark_opacity=50,
            style_reference="3D Render style",
            game_meta={"name": "Fortnite", "current_season": "Chapter 5"},
            season_context="Chapter 5 Season 1",
            asset_type="twitch_emote",
            asset_directive="sticker style, solid green background",
        )
        
        assert context.primary_colors[0]["hex"] == "#FF0000"
        assert context.tone == "competitive"
        assert context.asset_type == "twitch_emote"
    
    def test_creation_with_minimal_fields(self):
        """Test creating context with minimal/empty fields."""
        context = GenerationContext(
            primary_colors=[],
            secondary_colors=[],
            accent_colors=[],
            gradients=[],
            display_font=None,
            headline_font=None,
            body_font=None,
            tone="professional",
            personality_traits=[],
            tagline="",
            primary_logo_url=None,
            watermark_url=None,
            watermark_opacity=50,
            style_reference=None,
            game_meta=None,
            season_context=None,
            asset_type="twitch_emote",
            asset_directive="",
        )
        
        assert context.primary_colors == []
        assert context.display_font is None
    
    def test_context_fields_are_accessible(self):
        """Test that all context fields are accessible."""
        context = GenerationContext(
            primary_colors=[{"hex": "#123456"}],
            secondary_colors=[{"hex": "#654321"}],
            accent_colors=[{"hex": "#ABCDEF"}],
            gradients=[{"name": "Test"}],
            display_font={"family": "Arial"},
            headline_font={"family": "Helvetica"},
            body_font={"family": "Georgia"},
            tone="casual",
            personality_traits=["Friendly"],
            tagline="Test Tagline",
            primary_logo_url="https://test.com/logo.png",
            watermark_url="https://test.com/watermark.png",
            watermark_opacity=75,
            style_reference="Flat design",
            game_meta={"name": "Test Game"},
            season_context="Season 1",
            asset_type="youtube_thumbnail",
            asset_directive="high contrast",
        )
        
        # Verify all fields
        assert len(context.primary_colors) == 1
        assert len(context.secondary_colors) == 1
        assert len(context.accent_colors) == 1
        assert len(context.gradients) == 1
        assert context.display_font["family"] == "Arial"
        assert context.headline_font["family"] == "Helvetica"
        assert context.body_font["family"] == "Georgia"
        assert context.tone == "casual"
        assert context.personality_traits == ["Friendly"]
        assert context.tagline == "Test Tagline"
        assert context.primary_logo_url == "https://test.com/logo.png"
        assert context.watermark_url == "https://test.com/watermark.png"
        assert context.watermark_opacity == 75
        assert context.style_reference == "Flat design"
        assert context.game_meta["name"] == "Test Game"
        assert context.season_context == "Season 1"
        assert context.asset_type == "youtube_thumbnail"
        assert context.asset_directive == "high contrast"


class TestContextEngine:
    """Tests for ContextEngine class."""
    
    @pytest.fixture
    def mock_brand_kit_service(self):
        """Create mock brand kit service."""
        service = AsyncMock()
        service.get = AsyncMock(return_value={
            "id": "test-kit-id",
            "user_id": "test-user",
            "colors_extended": {
                "primary": [{"hex": "#FF5733", "name": "Brand Orange"}],
                "secondary": [{"hex": "#33FF57", "name": "Brand Green"}],
                "accent": [{"hex": "#3357FF", "name": "Brand Blue"}],
                "gradients": [{"name": "Sunset", "stops": ["#FF5733", "#FF8800"]}],
            },
            "typography": {
                "display": {"family": "Montserrat", "weight": 800},
                "headline": {"family": "Montserrat", "weight": 700},
                "body": {"family": "Inter", "weight": 400},
            },
            "voice": {
                "tone": "competitive",
                "personality_traits": ["Bold", "Energetic", "Fun"],
                "tagline": "Level Up Your Stream",
            },
            "logos": {
                "primary": {"url": "logo.png"},
                "watermark": {"url": "watermark.png", "opacity": 75},
            },
            "style_reference": "3D Render, vibrant colors",
        })
        return service
    
    @pytest.fixture
    def mock_logo_service(self):
        """Create mock logo service."""
        service = AsyncMock()
        service.get_logo_url = AsyncMock(side_effect=lambda user_id, kit_id, logo_type: 
            f"https://storage.example.com/{kit_id}/{logo_type}.png"
        )
        return service
    
    @pytest.fixture
    def mock_game_meta_service(self):
        """Create mock game meta service."""
        service = AsyncMock()
        service.get_game_meta = AsyncMock(return_value={
            "name": "Fortnite",
            "current_season": "Chapter 5 Season 1",
            "genre": "Battle Royale",
        })
        return service
    
    @pytest.fixture
    def context_engine(self, mock_brand_kit_service, mock_logo_service, mock_game_meta_service):
        """Create context engine with mocked services."""
        return ContextEngine(
            brand_kit_service=mock_brand_kit_service,
            logo_service=mock_logo_service,
            game_meta_service=mock_game_meta_service,
        )
    
    @pytest.mark.asyncio
    async def test_build_context_extracts_colors(self, context_engine):
        """Test that build_context extracts colors from colors_extended."""
        context = await context_engine.build_context(
            user_id="test-user",
            brand_kit_id="test-kit-id",
            asset_type="twitch_emote",
        )
        
        assert len(context.primary_colors) == 1
        assert context.primary_colors[0]["hex"] == "#FF5733"
        assert len(context.secondary_colors) == 1
        assert len(context.accent_colors) == 1
        assert len(context.gradients) == 1
    
    @pytest.mark.asyncio
    async def test_build_context_extracts_typography(self, context_engine):
        """Test that build_context extracts typography hierarchy."""
        context = await context_engine.build_context(
            user_id="test-user",
            brand_kit_id="test-kit-id",
            asset_type="twitch_emote",
        )
        
        assert context.display_font["family"] == "Montserrat"
        assert context.display_font["weight"] == 800
        assert context.headline_font["weight"] == 700
        assert context.body_font["family"] == "Inter"
    
    @pytest.mark.asyncio
    async def test_build_context_extracts_voice(self, context_engine):
        """Test that build_context extracts voice/tone."""
        context = await context_engine.build_context(
            user_id="test-user",
            brand_kit_id="test-kit-id",
            asset_type="twitch_emote",
        )
        
        assert context.tone == "competitive"
        assert "Bold" in context.personality_traits
        assert context.tagline == "Level Up Your Stream"
    
    @pytest.mark.asyncio
    async def test_build_context_gets_logo_urls(self, context_engine, mock_logo_service):
        """Test that build_context retrieves logo URLs."""
        context = await context_engine.build_context(
            user_id="test-user",
            brand_kit_id="test-kit-id",
            asset_type="twitch_emote",
        )
        
        assert "primary.png" in context.primary_logo_url
        assert "watermark.png" in context.watermark_url
        assert context.watermark_opacity == 75
    
    @pytest.mark.asyncio
    async def test_build_context_gets_style_reference(self, context_engine):
        """Test that build_context extracts style_reference."""
        context = await context_engine.build_context(
            user_id="test-user",
            brand_kit_id="test-kit-id",
            asset_type="twitch_emote",
        )
        
        assert context.style_reference == "3D Render, vibrant colors"
    
    @pytest.mark.asyncio
    async def test_build_context_with_game_id(self, context_engine, mock_game_meta_service):
        """Test that build_context fetches game meta when game_id provided."""
        context = await context_engine.build_context(
            user_id="test-user",
            brand_kit_id="test-kit-id",
            asset_type="twitch_emote",
            game_id="fortnite",
        )
        
        mock_game_meta_service.get_game_meta.assert_called_once_with("fortnite")
        assert context.game_meta["name"] == "Fortnite"
        assert context.season_context == "Chapter 5 Season 1"
    
    @pytest.mark.asyncio
    async def test_build_context_without_game_id(self, context_engine, mock_game_meta_service):
        """Test that build_context skips game meta when no game_id."""
        context = await context_engine.build_context(
            user_id="test-user",
            brand_kit_id="test-kit-id",
            asset_type="twitch_emote",
        )
        
        mock_game_meta_service.get_game_meta.assert_not_called()
        assert context.game_meta is None
        assert context.season_context is None
    
    @pytest.mark.asyncio
    async def test_build_context_injects_asset_directive(self, context_engine):
        """Test that build_context injects correct asset directive."""
        context = await context_engine.build_context(
            user_id="test-user",
            brand_kit_id="test-kit-id",
            asset_type="twitch_emote",
        )
        
        assert "sticker style" in context.asset_directive
        assert "solid green background" in context.asset_directive
    
    @pytest.mark.asyncio
    async def test_build_context_different_asset_types(self, context_engine):
        """Test asset directives for different asset types."""
        # Test thumbnail
        context = await context_engine.build_context(
            user_id="test-user",
            brand_kit_id="test-kit-id",
            asset_type="youtube_thumbnail",
        )
        assert "high contrast" in context.asset_directive
        
        # Test banner
        context = await context_engine.build_context(
            user_id="test-user",
            brand_kit_id="test-kit-id",
            asset_type="twitch_banner",
        )
        assert "wide composition" in context.asset_directive
    
    @pytest.mark.asyncio
    async def test_build_context_handles_missing_colors_extended(self, mock_logo_service, mock_game_meta_service):
        """Test graceful handling when colors_extended is missing."""
        mock_service = AsyncMock()
        mock_service.get = AsyncMock(return_value={
            "id": "test-kit-id",
            "user_id": "test-user",
            # No colors_extended
            "typography": {},
            "voice": {},
            "logos": {},
        })
        
        engine = ContextEngine(
            brand_kit_service=mock_service,
            logo_service=mock_logo_service,
            game_meta_service=mock_game_meta_service,
        )
        
        context = await engine.build_context(
            user_id="test-user",
            brand_kit_id="test-kit-id",
            asset_type="twitch_emote",
        )
        
        assert context.primary_colors == []
        assert context.secondary_colors == []
    
    @pytest.mark.asyncio
    async def test_build_context_handles_logo_service_error(self, mock_brand_kit_service, mock_game_meta_service):
        """Test graceful handling when logo service fails."""
        mock_logo = AsyncMock()
        mock_logo.get_logo_url = AsyncMock(side_effect=Exception("Storage error"))
        
        engine = ContextEngine(
            brand_kit_service=mock_brand_kit_service,
            logo_service=mock_logo,
            game_meta_service=mock_game_meta_service,
        )
        
        context = await engine.build_context(
            user_id="test-user",
            brand_kit_id="test-kit-id",
            asset_type="twitch_emote",
        )
        
        # Should gracefully handle error and return None for URLs
        assert context.primary_logo_url is None
        assert context.watermark_url is None
    
    @pytest.mark.asyncio
    async def test_build_context_handles_missing_typography(self, mock_logo_service, mock_game_meta_service):
        """Test graceful handling when typography is missing."""
        mock_service = AsyncMock()
        mock_service.get = AsyncMock(return_value={
            "id": "test-kit-id",
            "user_id": "test-user",
            "colors_extended": {},
            # No typography
            "voice": {},
            "logos": {},
        })
        
        engine = ContextEngine(
            brand_kit_service=mock_service,
            logo_service=mock_logo_service,
            game_meta_service=mock_game_meta_service,
        )
        
        context = await engine.build_context(
            user_id="test-user",
            brand_kit_id="test-kit-id",
            asset_type="twitch_emote",
        )
        
        assert context.display_font is None
        assert context.headline_font is None
        assert context.body_font is None
    
    @pytest.mark.asyncio
    async def test_build_context_handles_missing_voice(self, mock_logo_service, mock_game_meta_service):
        """Test graceful handling when voice is missing."""
        mock_service = AsyncMock()
        mock_service.get = AsyncMock(return_value={
            "id": "test-kit-id",
            "user_id": "test-user",
            "colors_extended": {},
            "typography": {},
            # No voice
            "logos": {},
        })
        
        engine = ContextEngine(
            brand_kit_service=mock_service,
            logo_service=mock_logo_service,
            game_meta_service=mock_game_meta_service,
        )
        
        context = await engine.build_context(
            user_id="test-user",
            brand_kit_id="test-kit-id",
            asset_type="twitch_emote",
        )
        
        # Should use defaults
        assert context.tone == "professional"
        assert context.personality_traits == []
        assert context.tagline == ""
    
    @pytest.mark.asyncio
    async def test_build_context_handles_missing_logos(self, mock_logo_service, mock_game_meta_service):
        """Test graceful handling when logos is missing."""
        mock_service = AsyncMock()
        mock_service.get = AsyncMock(return_value={
            "id": "test-kit-id",
            "user_id": "test-user",
            "colors_extended": {},
            "typography": {},
            "voice": {},
            # No logos
        })
        
        engine = ContextEngine(
            brand_kit_service=mock_service,
            logo_service=mock_logo_service,
            game_meta_service=mock_game_meta_service,
        )
        
        context = await engine.build_context(
            user_id="test-user",
            brand_kit_id="test-kit-id",
            asset_type="twitch_emote",
        )
        
        assert context.primary_logo_url is None
        assert context.watermark_url is None
        assert context.watermark_opacity == 50  # Default
    
    @pytest.mark.asyncio
    async def test_build_context_handles_empty_style_reference(self, mock_logo_service, mock_game_meta_service):
        """Test handling of empty style_reference."""
        mock_service = AsyncMock()
        mock_service.get = AsyncMock(return_value={
            "id": "test-kit-id",
            "user_id": "test-user",
            "colors_extended": {},
            "typography": {},
            "voice": {},
            "logos": {},
            "style_reference": "",
        })
        
        engine = ContextEngine(
            brand_kit_service=mock_service,
            logo_service=mock_logo_service,
            game_meta_service=mock_game_meta_service,
        )
        
        context = await engine.build_context(
            user_id="test-user",
            brand_kit_id="test-kit-id",
            asset_type="twitch_emote",
        )
        
        # Empty string should become None
        assert context.style_reference is None
    
    @pytest.mark.asyncio
    async def test_build_context_game_meta_no_season(self, mock_brand_kit_service, mock_logo_service):
        """Test handling of game meta without current_season."""
        mock_game = AsyncMock()
        mock_game.get_game_meta = AsyncMock(return_value={
            "name": "Minecraft",
            "current_season": None,
            "genre": "Sandbox",
        })
        
        engine = ContextEngine(
            brand_kit_service=mock_brand_kit_service,
            logo_service=mock_logo_service,
            game_meta_service=mock_game,
        )
        
        context = await engine.build_context(
            user_id="test-user",
            brand_kit_id="test-kit-id",
            asset_type="twitch_emote",
            game_id="minecraft",
        )
        
        assert context.game_meta is not None
        assert context.game_meta["name"] == "Minecraft"
        assert context.season_context is None
    
    @pytest.mark.asyncio
    async def test_build_context_unknown_asset_type(self, context_engine):
        """Test handling of unknown asset type returns empty directive."""
        context = await context_engine.build_context(
            user_id="test-user",
            brand_kit_id="test-kit-id",
            asset_type="unknown_asset_type",
        )
        
        assert context.asset_type == "unknown_asset_type"
        assert context.asset_directive == ""


class TestContextEngineServiceProperties:
    """Tests for lazy-loaded service properties."""
    
    def test_brand_kit_service_lazy_load(self):
        """Test that brand_kit_service is lazy loaded."""
        engine = ContextEngine()
        
        with patch('backend.services.brand_kit_service.get_brand_kit_service') as mock_get:
            mock_get.return_value = MagicMock()
            _ = engine.brand_kit_service
            mock_get.assert_called_once()
    
    def test_game_meta_service_lazy_load(self):
        """Test that game_meta_service is lazy loaded."""
        engine = ContextEngine()
        
        # Should create default GameMetaService
        service = engine.game_meta_service
        assert isinstance(service, GameMetaService)
    
    def test_logo_service_lazy_load(self):
        """Test that logo_service is lazy loaded."""
        engine = ContextEngine()
        
        with patch('backend.services.logo_service.get_logo_service') as mock_get:
            mock_get.return_value = MagicMock()
            _ = engine.logo_service
            mock_get.assert_called_once()
    
    def test_services_injected_via_constructor(self):
        """Test that services can be injected via constructor."""
        mock_brand_kit = MagicMock()
        mock_logo = MagicMock()
        mock_game_meta = MagicMock()
        
        engine = ContextEngine(
            brand_kit_service=mock_brand_kit,
            logo_service=mock_logo,
            game_meta_service=mock_game_meta,
        )
        
        assert engine.brand_kit_service is mock_brand_kit
        assert engine.logo_service is mock_logo
        assert engine.game_meta_service is mock_game_meta
    
    def test_game_meta_service_singleton_used(self):
        """Test that game_meta_service uses singleton when not injected."""
        engine1 = ContextEngine()
        engine2 = ContextEngine()
        
        # Both should get the same singleton instance
        service1 = engine1.game_meta_service
        service2 = engine2.game_meta_service
        
        assert service1 is service2


class TestContextEngineColorExtraction:
    """Tests for color extraction logic."""
    
    def test_extract_colors_with_all_fields(self):
        """Test color extraction with all fields present."""
        engine = ContextEngine()
        brand_kit = {
            "colors_extended": {
                "primary": [{"hex": "#FF0000"}],
                "secondary": [{"hex": "#00FF00"}],
                "accent": [{"hex": "#0000FF"}],
                "gradients": [{"name": "Test"}],
            }
        }
        
        colors = engine._extract_colors(brand_kit)
        
        assert colors["primary"] == [{"hex": "#FF0000"}]
        assert colors["secondary"] == [{"hex": "#00FF00"}]
        assert colors["accent"] == [{"hex": "#0000FF"}]
        assert colors["gradients"] == [{"name": "Test"}]
    
    def test_extract_colors_with_missing_fields(self):
        """Test color extraction with missing fields."""
        engine = ContextEngine()
        brand_kit = {
            "colors_extended": {
                "primary": [{"hex": "#FF0000"}],
                # Missing secondary, accent, gradients
            }
        }
        
        colors = engine._extract_colors(brand_kit)
        
        assert colors["primary"] == [{"hex": "#FF0000"}]
        assert colors["secondary"] == []
        assert colors["accent"] == []
        assert colors["gradients"] == []
    
    def test_extract_colors_with_none_colors_extended(self):
        """Test color extraction when colors_extended is None."""
        engine = ContextEngine()
        brand_kit = {"colors_extended": None}
        
        colors = engine._extract_colors(brand_kit)
        
        assert colors["primary"] == []
        assert colors["secondary"] == []
        assert colors["accent"] == []
        assert colors["gradients"] == []


class TestContextEngineTypographyExtraction:
    """Tests for typography extraction logic."""
    
    def test_extract_typography_with_all_fields(self):
        """Test typography extraction with all fields present."""
        engine = ContextEngine()
        brand_kit = {
            "typography": {
                "display": {"family": "Montserrat", "weight": 800},
                "headline": {"family": "Montserrat", "weight": 700},
                "body": {"family": "Inter", "weight": 400},
            }
        }
        
        typography = engine._extract_typography(brand_kit)
        
        assert typography["display"]["family"] == "Montserrat"
        assert typography["headline"]["weight"] == 700
        assert typography["body"]["family"] == "Inter"
    
    def test_extract_typography_with_missing_fields(self):
        """Test typography extraction with missing fields."""
        engine = ContextEngine()
        brand_kit = {
            "typography": {
                "display": {"family": "Arial"},
                # Missing headline and body
            }
        }
        
        typography = engine._extract_typography(brand_kit)
        
        assert typography["display"]["family"] == "Arial"
        assert typography["headline"] is None
        assert typography["body"] is None


class TestContextEngineVoiceExtraction:
    """Tests for voice extraction logic."""
    
    def test_extract_voice_with_all_fields(self):
        """Test voice extraction with all fields present."""
        engine = ContextEngine()
        brand_kit = {
            "voice": {
                "tone": "competitive",
                "personality_traits": ["Bold", "Energetic"],
                "tagline": "Level Up",
            }
        }
        
        voice = engine._extract_voice(brand_kit)
        
        assert voice["tone"] == "competitive"
        assert voice["personality_traits"] == ["Bold", "Energetic"]
        assert voice["tagline"] == "Level Up"
    
    def test_extract_voice_with_defaults(self):
        """Test voice extraction uses defaults for missing fields."""
        engine = ContextEngine()
        brand_kit = {"voice": {}}
        
        voice = engine._extract_voice(brand_kit)
        
        assert voice["tone"] == "professional"
        assert voice["personality_traits"] == []
        assert voice["tagline"] == ""
