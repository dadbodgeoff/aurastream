"""
Unit tests for the Twitch Asset Pipeline.

Tests cover:
- Background removal for emotes/badges
- Color grading (vibrance and contrast boost)
- Text rendering with PIL
- Downscaling with Lanczos
- Export format selection
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from io import BytesIO
from PIL import Image
from backend.services.twitch.asset_pipeline import AssetPipeline
from backend.services.twitch.context_engine import GenerationContext


def create_test_image(width: int = 1024, height: int = 1024, mode: str = "RGB") -> bytes:
    """Create a test image and return as bytes."""
    image = Image.new(mode, (width, height), color=(255, 0, 0))
    output = BytesIO()
    image.save(output, format="PNG")
    output.seek(0)
    return output.read()


def create_test_context(**kwargs) -> GenerationContext:
    """Create a test GenerationContext with defaults."""
    defaults = {
        "primary_colors": [{"hex": "#FF5733", "name": "Brand Orange"}],
        "secondary_colors": [],
        "accent_colors": [],
        "gradients": [],
        "display_font": None,
        "headline_font": {"family": "Arial", "weight": 700},
        "body_font": None,
        "tone": "professional",
        "personality_traits": [],
        "tagline": "",
        "primary_logo_url": None,
        "watermark_url": None,
        "watermark_opacity": 50,
        "style_reference": None,
        "game_meta": None,
        "season_context": None,
        "asset_type": "twitch_emote",
        "asset_directive": "",
    }
    defaults.update(kwargs)
    return GenerationContext(**defaults)


class TestAssetPipeline:
    """Tests for AssetPipeline class."""
    
    @pytest.fixture
    def pipeline(self):
        """Create AssetPipeline instance."""
        return AssetPipeline()
    
    def test_bg_removal_types(self, pipeline):
        """Test that BG_REMOVAL_TYPES contains expected asset types."""
        assert "twitch_emote" in pipeline.BG_REMOVAL_TYPES
        assert "twitch_badge" in pipeline.BG_REMOVAL_TYPES
        assert "overlay" in pipeline.BG_REMOVAL_TYPES
        assert "youtube_thumbnail" not in pipeline.BG_REMOVAL_TYPES
    
    def test_transparency_types(self, pipeline):
        """Test that TRANSPARENCY_TYPES contains expected asset types."""
        assert "twitch_emote" in pipeline.TRANSPARENCY_TYPES
        assert "twitch_badge" in pipeline.TRANSPARENCY_TYPES
        assert "twitch_panel" in pipeline.TRANSPARENCY_TYPES
        assert "youtube_thumbnail" not in pipeline.TRANSPARENCY_TYPES
    
    def test_color_grading_constants(self, pipeline):
        """Test color grading constants are set correctly."""
        assert pipeline.VIBRANCE_BOOST == 1.2
        assert pipeline.CONTRAST_BOOST == 1.1


class TestColorGrading:
    """Tests for _apply_color_grading method."""
    
    @pytest.fixture
    def pipeline(self):
        return AssetPipeline()
    
    def test_applies_vibrance_boost(self, pipeline):
        """Test that vibrance boost is applied."""
        image = Image.new("RGB", (100, 100), color=(128, 64, 64))
        result = pipeline._apply_color_grading(image)
        
        # Result should be different from input
        assert result is not image
        assert result.size == image.size
    
    def test_applies_contrast_boost(self, pipeline):
        """Test that contrast boost is applied."""
        image = Image.new("RGB", (100, 100), color=(128, 128, 128))
        result = pipeline._apply_color_grading(image)
        
        assert result is not image
        assert result.size == image.size
    
    def test_preserves_image_mode(self, pipeline):
        """Test that image mode is preserved."""
        image = Image.new("RGBA", (100, 100), color=(128, 64, 64, 255))
        result = pipeline._apply_color_grading(image)
        
        assert result.mode == "RGBA"


class TestDownscale:
    """Tests for _downscale method."""
    
    @pytest.fixture
    def pipeline(self):
        return AssetPipeline()
    
    def test_downscales_to_target_size(self, pipeline):
        """Test that image is downscaled to exact target size."""
        image = Image.new("RGB", (1024, 1024))
        result = pipeline._downscale(image, (512, 512))
        
        assert result.size == (512, 512)
    
    def test_uses_lanczos_resampling(self, pipeline):
        """Test that Lanczos resampling is used."""
        image = Image.new("RGB", (1024, 1024))
        
        with patch.object(image, 'resize', wraps=image.resize) as mock_resize:
            pipeline._downscale(image, (512, 512))
            mock_resize.assert_called_once_with((512, 512), Image.Resampling.LANCZOS)
    
    def test_handles_non_square_images(self, pipeline):
        """Test downscaling non-square images."""
        image = Image.new("RGB", (1920, 1080))
        result = pipeline._downscale(image, (1280, 720))
        
        assert result.size == (1280, 720)
    
    def test_preserves_image_mode(self, pipeline):
        """Test that image mode is preserved during downscale."""
        image = Image.new("RGBA", (1024, 1024))
        result = pipeline._downscale(image, (512, 512))
        
        assert result.mode == "RGBA"


class TestExport:
    """Tests for _export method."""
    
    @pytest.fixture
    def pipeline(self):
        return AssetPipeline()
    
    def test_exports_emote_as_png(self, pipeline):
        """Test that emotes are exported as PNG."""
        image = Image.new("RGBA", (512, 512))
        result = pipeline._export(image, "twitch_emote")
        
        # Verify it's a valid PNG
        loaded = Image.open(BytesIO(result))
        assert loaded.format == "PNG"
    
    def test_exports_badge_as_png(self, pipeline):
        """Test that badges are exported as PNG."""
        image = Image.new("RGBA", (72, 72))
        result = pipeline._export(image, "twitch_badge")
        
        loaded = Image.open(BytesIO(result))
        assert loaded.format == "PNG"
    
    def test_exports_thumbnail_as_jpeg(self, pipeline):
        """Test that thumbnails are exported as JPEG."""
        image = Image.new("RGB", (1280, 720))
        result = pipeline._export(image, "youtube_thumbnail")
        
        loaded = Image.open(BytesIO(result))
        assert loaded.format == "JPEG"
    
    def test_exports_offline_as_jpeg(self, pipeline):
        """Test that offline screens are exported as JPEG."""
        image = Image.new("RGB", (1920, 1080))
        result = pipeline._export(image, "twitch_offline")
        
        loaded = Image.open(BytesIO(result))
        assert loaded.format == "JPEG"
    
    def test_exports_banner_as_webp(self, pipeline):
        """Test that banners are exported as WebP."""
        image = Image.new("RGB", (1200, 480))
        result = pipeline._export(image, "twitch_banner")
        
        loaded = Image.open(BytesIO(result))
        assert loaded.format == "WEBP"
    
    def test_converts_rgba_to_rgb_for_jpeg(self, pipeline):
        """Test that RGBA images are converted to RGB for JPEG export."""
        image = Image.new("RGBA", (1280, 720), color=(255, 0, 0, 128))
        result = pipeline._export(image, "youtube_thumbnail")
        
        loaded = Image.open(BytesIO(result))
        assert loaded.mode == "RGB"
    
    def test_converts_to_rgba_for_png(self, pipeline):
        """Test that images are converted to RGBA for PNG export."""
        image = Image.new("RGB", (512, 512))
        result = pipeline._export(image, "twitch_emote")
        
        loaded = Image.open(BytesIO(result))
        assert loaded.mode == "RGBA"
    
    def test_preserves_transparency_in_png(self, pipeline):
        """Test that transparency is preserved in PNG export."""
        image = Image.new("RGBA", (512, 512), color=(255, 0, 0, 128))
        result = pipeline._export(image, "twitch_emote")
        
        loaded = Image.open(BytesIO(result))
        assert loaded.mode == "RGBA"


class TestGetExportFormat:
    """Tests for get_export_format method."""
    
    @pytest.fixture
    def pipeline(self):
        return AssetPipeline()
    
    def test_emote_format(self, pipeline):
        """Test emote export format."""
        assert pipeline.get_export_format("twitch_emote") == "PNG"
    
    def test_badge_format(self, pipeline):
        """Test badge export format."""
        assert pipeline.get_export_format("twitch_badge") == "PNG"
    
    def test_thumbnail_format(self, pipeline):
        """Test thumbnail export format."""
        assert pipeline.get_export_format("youtube_thumbnail") == "JPEG"
    
    def test_offline_format(self, pipeline):
        """Test offline screen export format."""
        assert pipeline.get_export_format("twitch_offline") == "JPEG"
    
    def test_banner_format(self, pipeline):
        """Test banner export format."""
        assert pipeline.get_export_format("twitch_banner") == "WEBP"
    
    def test_panel_format(self, pipeline):
        """Test panel export format."""
        assert pipeline.get_export_format("twitch_panel") == "PNG"


class TestTextRendering:
    """Tests for _render_text method."""
    
    @pytest.fixture
    def pipeline(self):
        return AssetPipeline()
    
    @pytest.fixture
    def context(self):
        return create_test_context()
    
    def test_renders_text_on_image(self, pipeline, context):
        """Test that text is rendered on the image."""
        image = Image.new("RGB", (1024, 1024), color=(0, 0, 0))
        result = pipeline._render_text(image, "TEST", context, "center")
        
        # Result should be different from input (text was added)
        assert result is not image
        assert result.size == image.size
    
    def test_text_position_top(self, pipeline, context):
        """Test text positioning at top."""
        image = Image.new("RGB", (1024, 1024), color=(0, 0, 0))
        result = pipeline._render_text(image, "TOP", context, "top")
        
        assert result.size == image.size
    
    def test_text_position_center(self, pipeline, context):
        """Test text positioning at center."""
        image = Image.new("RGB", (1024, 1024), color=(0, 0, 0))
        result = pipeline._render_text(image, "CENTER", context, "center")
        
        assert result.size == image.size
    
    def test_text_position_bottom(self, pipeline, context):
        """Test text positioning at bottom."""
        image = Image.new("RGB", (1024, 1024), color=(0, 0, 0))
        result = pipeline._render_text(image, "BOTTOM", context, "bottom")
        
        assert result.size == image.size
    
    def test_uses_brand_color_for_text(self, pipeline):
        """Test that brand primary color is used for text."""
        context = create_test_context(
            primary_colors=[{"hex": "#FF0000", "name": "Red"}]
        )
        image = Image.new("RGB", (1024, 1024), color=(0, 0, 0))
        result = pipeline._render_text(image, "TEST", context, "center")
        
        # Text should be rendered (image modified)
        assert result is not image
    
    def test_handles_missing_font(self, pipeline, context):
        """Test graceful handling when font is not found."""
        context = create_test_context(
            headline_font={"family": "NonExistentFont", "weight": 700}
        )
        image = Image.new("RGB", (1024, 1024), color=(0, 0, 0))
        
        # Should not raise, should use fallback font
        result = pipeline._render_text(image, "TEST", context, "center")
        assert result is not None
    
    def test_preserves_image_mode(self, pipeline, context):
        """Test that image mode is preserved."""
        image = Image.new("RGBA", (1024, 1024), color=(0, 0, 0, 255))
        result = pipeline._render_text(image, "TEST", context, "center")
        
        assert result.mode == "RGBA"


class TestBackgroundRemoval:
    """Tests for _remove_background method."""
    
    @pytest.fixture
    def pipeline(self):
        return AssetPipeline()
    
    @pytest.mark.asyncio
    async def test_removes_background(self, pipeline):
        """Test that background is removed (mocked)."""
        import sys
        
        image = Image.new("RGB", (512, 512), color=(255, 0, 0))
        
        # Create a mock RGBA result
        mock_result = Image.new("RGBA", (512, 512), color=(255, 0, 0, 255))
        mock_bytes = BytesIO()
        mock_result.save(mock_bytes, format="PNG")
        mock_bytes.seek(0)
        mock_bytes_data = mock_bytes.read()
        
        # Create a mock rembg module
        mock_rembg = MagicMock()
        mock_rembg.remove = MagicMock(return_value=mock_bytes_data)
        
        with patch.dict(sys.modules, {'rembg': mock_rembg}):
            result = await pipeline._remove_background(image)
            
            assert result.mode == "RGBA"
            assert result.size == (512, 512)
    
    @pytest.mark.asyncio
    async def test_output_has_alpha_channel(self, pipeline):
        """Test that output has alpha channel."""
        import sys
        
        image = Image.new("RGB", (512, 512), color=(255, 0, 0))
        
        # Create a mock RGBA result with transparency
        mock_result = Image.new("RGBA", (512, 512), color=(255, 0, 0, 0))
        mock_bytes = BytesIO()
        mock_result.save(mock_bytes, format="PNG")
        mock_bytes.seek(0)
        mock_bytes_data = mock_bytes.read()
        
        # Create a mock rembg module
        mock_rembg = MagicMock()
        mock_rembg.remove = MagicMock(return_value=mock_bytes_data)
        
        with patch.dict(sys.modules, {'rembg': mock_rembg}):
            result = await pipeline._remove_background(image)
            
            assert result.mode == "RGBA"


class TestProcessPipeline:
    """Tests for the full process method."""
    
    @pytest.fixture
    def pipeline(self):
        return AssetPipeline()
    
    @pytest.fixture
    def context(self):
        return create_test_context()
    
    @pytest.mark.asyncio
    async def test_process_emote_with_bg_removal(self, pipeline, context):
        """Test processing an emote triggers background removal."""
        import sys
        
        image_data = create_test_image()
        
        # Mock rembg
        mock_result = Image.new("RGBA", (1024, 1024), color=(255, 0, 0, 255))
        mock_bytes = BytesIO()
        mock_result.save(mock_bytes, format="PNG")
        mock_bytes.seek(0)
        mock_bytes_data = mock_bytes.read()
        
        # Create a mock rembg module
        mock_rembg = MagicMock()
        mock_rembg.remove = MagicMock(return_value=mock_bytes_data)
        
        with patch.dict(sys.modules, {'rembg': mock_rembg}):
            result = await pipeline.process(
                image_data=image_data,
                asset_type="twitch_emote",
                context=context,
            )
            
            # Verify output is valid image
            loaded = Image.open(BytesIO(result))
            assert loaded.format == "PNG"
            assert loaded.mode == "RGBA"
    
    @pytest.mark.asyncio
    async def test_process_thumbnail_no_bg_removal(self, pipeline, context):
        """Test processing a thumbnail skips background removal."""
        image_data = create_test_image()
        
        with patch.object(pipeline, '_remove_background') as mock_remove:
            result = await pipeline.process(
                image_data=image_data,
                asset_type="youtube_thumbnail",
                context=context,
            )
            
            mock_remove.assert_not_called()
            
            # Verify output is valid JPEG
            loaded = Image.open(BytesIO(result))
            assert loaded.format == "JPEG"
    
    @pytest.mark.asyncio
    async def test_process_with_text_overlay(self, pipeline, context):
        """Test processing with text overlay."""
        image_data = create_test_image()
        
        result = await pipeline.process(
            image_data=image_data,
            asset_type="youtube_thumbnail",
            context=context,
            text_overlay="GG",
            text_position="center",
        )
        
        # Verify output is valid image
        loaded = Image.open(BytesIO(result))
        assert loaded is not None
    
    @pytest.mark.asyncio
    async def test_process_downscales_to_export_size(self, pipeline, context):
        """Test that process downscales to correct export size."""
        import sys
        
        # Create 1024x1024 image (generation size for emotes)
        image_data = create_test_image(1024, 1024)
        
        # Mock rembg
        mock_result = Image.new("RGBA", (1024, 1024), color=(255, 0, 0, 255))
        mock_bytes = BytesIO()
        mock_result.save(mock_bytes, format="PNG")
        mock_bytes.seek(0)
        mock_bytes_data = mock_bytes.read()
        
        # Create a mock rembg module
        mock_rembg = MagicMock()
        mock_rembg.remove = MagicMock(return_value=mock_bytes_data)
        
        with patch.dict(sys.modules, {'rembg': mock_rembg}):
            result = await pipeline.process(
                image_data=image_data,
                asset_type="twitch_emote",
                context=context,
            )
            
            # Verify output is 512x512 (export size for twitch_emote)
            loaded = Image.open(BytesIO(result))
            assert loaded.size == (512, 512)
    
    @pytest.mark.asyncio
    async def test_process_unknown_asset_type(self, pipeline, context):
        """Test processing unknown asset type doesn't crash."""
        image_data = create_test_image()
        
        result = await pipeline.process(
            image_data=image_data,
            asset_type="unknown_type",
            context=context,
        )
        
        # Should still produce valid output
        loaded = Image.open(BytesIO(result))
        assert loaded is not None
