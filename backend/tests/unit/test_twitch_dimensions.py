"""
Unit tests for Twitch dimension specifications module.

Tests cover:
- All dimension specs exist and have correct values
- get_dimension_spec returns correct values
- get_dimension_spec raises ValueError for invalid types
- get_asset_directive returns correct values
- get_all_twitch_asset_types returns all twitch types
"""

import pytest

from backend.services.twitch.dimensions import (
    DimensionSpec,
    DIMENSION_SPECS,
    ASSET_TYPE_DIRECTIVES,
    get_dimension_spec,
    get_asset_directive,
    get_all_twitch_asset_types,
)


# =============================================================================
# Test Dimension Specs Existence
# =============================================================================

class TestDimensionSpecsExistence:
    """Tests that all required dimension specs exist."""
    
    def test_youtube_thumbnail_exists(self):
        """Test youtube_thumbnail spec exists."""
        assert "youtube_thumbnail" in DIMENSION_SPECS
    
    def test_tiktok_story_exists(self):
        """Test tiktok_story spec exists."""
        assert "tiktok_story" in DIMENSION_SPECS
    
    def test_twitch_banner_exists(self):
        """Test twitch_banner spec exists."""
        assert "twitch_banner" in DIMENSION_SPECS
    
    def test_youtube_banner_exists(self):
        """Test youtube_banner spec exists."""
        assert "youtube_banner" in DIMENSION_SPECS
    
    def test_square_pfp_exists(self):
        """Test square_pfp spec exists."""
        assert "square_pfp" in DIMENSION_SPECS
    
    def test_twitch_emote_exists(self):
        """Test twitch_emote spec exists."""
        assert "twitch_emote" in DIMENSION_SPECS
    
    def test_twitch_emote_112_exists(self):
        """Test twitch_emote_112 spec exists."""
        assert "twitch_emote_112" in DIMENSION_SPECS
    
    def test_twitch_emote_56_exists(self):
        """Test twitch_emote_56 spec exists."""
        assert "twitch_emote_56" in DIMENSION_SPECS
    
    def test_twitch_emote_28_exists(self):
        """Test twitch_emote_28 spec exists."""
        assert "twitch_emote_28" in DIMENSION_SPECS
    
    def test_twitch_badge_exists(self):
        """Test twitch_badge spec exists."""
        assert "twitch_badge" in DIMENSION_SPECS
    
    def test_twitch_badge_36_exists(self):
        """Test twitch_badge_36 spec exists."""
        assert "twitch_badge_36" in DIMENSION_SPECS
    
    def test_twitch_badge_18_exists(self):
        """Test twitch_badge_18 spec exists."""
        assert "twitch_badge_18" in DIMENSION_SPECS
    
    def test_twitch_panel_exists(self):
        """Test twitch_panel spec exists."""
        assert "twitch_panel" in DIMENSION_SPECS
    
    def test_twitch_offline_exists(self):
        """Test twitch_offline spec exists."""
        assert "twitch_offline" in DIMENSION_SPECS
    
    def test_all_specs_are_dimension_spec_instances(self):
        """Test all specs are DimensionSpec instances."""
        for asset_type, spec in DIMENSION_SPECS.items():
            assert isinstance(spec, DimensionSpec), f"{asset_type} is not a DimensionSpec"


# =============================================================================
# Test Dimension Spec Values
# =============================================================================

class TestDimensionSpecValues:
    """Tests that dimension specs have correct values."""
    
    def test_youtube_thumbnail_values(self):
        """Test youtube_thumbnail has correct values."""
        spec = DIMENSION_SPECS["youtube_thumbnail"]
        assert spec.generation_size == (1216, 832)
        assert spec.export_size == (1280, 720)
        assert spec.aspect_ratio == "16:9"
    
    def test_tiktok_story_values(self):
        """Test tiktok_story has correct values."""
        spec = DIMENSION_SPECS["tiktok_story"]
        assert spec.generation_size == (832, 1216)
        assert spec.export_size == (1080, 1920)
        assert spec.aspect_ratio == "9:16"
    
    def test_twitch_banner_values(self):
        """Test twitch_banner has correct values."""
        spec = DIMENSION_SPECS["twitch_banner"]
        assert spec.generation_size == (1536, 640)
        assert spec.export_size == (1200, 480)
        assert spec.aspect_ratio == "~3:1"
    
    def test_youtube_banner_values(self):
        """Test youtube_banner has correct values."""
        spec = DIMENSION_SPECS["youtube_banner"]
        assert spec.generation_size == (1536, 640)
        assert spec.export_size == (2560, 1440)
        assert spec.aspect_ratio == "16:9"
    
    def test_square_pfp_values(self):
        """Test square_pfp has correct values."""
        spec = DIMENSION_SPECS["square_pfp"]
        assert spec.generation_size == (1024, 1024)
        assert spec.export_size == (800, 800)
        assert spec.aspect_ratio == "1:1"
    
    def test_twitch_emote_values(self):
        """Test twitch_emote has correct values."""
        spec = DIMENSION_SPECS["twitch_emote"]
        assert spec.generation_size == (1024, 1024)
        assert spec.export_size == (512, 512)
        assert spec.aspect_ratio == "1:1"
    
    def test_twitch_emote_112_values(self):
        """Test twitch_emote_112 has correct values."""
        spec = DIMENSION_SPECS["twitch_emote_112"]
        assert spec.generation_size == (1024, 1024)
        assert spec.export_size == (112, 112)
        assert spec.aspect_ratio == "1:1"
    
    def test_twitch_emote_56_values(self):
        """Test twitch_emote_56 has correct values."""
        spec = DIMENSION_SPECS["twitch_emote_56"]
        assert spec.generation_size == (1024, 1024)
        assert spec.export_size == (56, 56)
        assert spec.aspect_ratio == "1:1"
    
    def test_twitch_emote_28_values(self):
        """Test twitch_emote_28 has correct values."""
        spec = DIMENSION_SPECS["twitch_emote_28"]
        assert spec.generation_size == (1024, 1024)
        assert spec.export_size == (28, 28)
        assert spec.aspect_ratio == "1:1"
    
    def test_twitch_badge_values(self):
        """Test twitch_badge has correct values."""
        spec = DIMENSION_SPECS["twitch_badge"]
        assert spec.generation_size == (1024, 1024)
        assert spec.export_size == (72, 72)
        assert spec.aspect_ratio == "1:1"
    
    def test_twitch_badge_36_values(self):
        """Test twitch_badge_36 has correct values."""
        spec = DIMENSION_SPECS["twitch_badge_36"]
        assert spec.generation_size == (1024, 1024)
        assert spec.export_size == (36, 36)
        assert spec.aspect_ratio == "1:1"
    
    def test_twitch_badge_18_values(self):
        """Test twitch_badge_18 has correct values."""
        spec = DIMENSION_SPECS["twitch_badge_18"]
        assert spec.generation_size == (1024, 1024)
        assert spec.export_size == (18, 18)
        assert spec.aspect_ratio == "1:1"
    
    def test_twitch_panel_values(self):
        """Test twitch_panel has correct values."""
        spec = DIMENSION_SPECS["twitch_panel"]
        assert spec.generation_size == (640, 320)
        assert spec.export_size == (320, 160)
        assert spec.aspect_ratio == "2:1"
    
    def test_twitch_offline_values(self):
        """Test twitch_offline has correct values."""
        spec = DIMENSION_SPECS["twitch_offline"]
        assert spec.generation_size == (1920, 1080)
        assert spec.export_size == (1920, 1080)
        assert spec.aspect_ratio == "16:9"


# =============================================================================
# Test get_dimension_spec Function
# =============================================================================

class TestGetDimensionSpec:
    """Tests for get_dimension_spec function."""
    
    def test_get_dimension_spec_returns_correct_spec(self):
        """Test get_dimension_spec returns correct spec."""
        spec = get_dimension_spec("twitch_emote")
        assert spec.generation_size == (1024, 1024)
        assert spec.export_size == (512, 512)
        assert spec.aspect_ratio == "1:1"
    
    def test_get_dimension_spec_returns_dimension_spec_instance(self):
        """Test get_dimension_spec returns DimensionSpec instance."""
        spec = get_dimension_spec("youtube_thumbnail")
        assert isinstance(spec, DimensionSpec)
    
    def test_get_dimension_spec_raises_value_error_for_invalid_type(self):
        """Test get_dimension_spec raises ValueError for invalid type."""
        with pytest.raises(ValueError) as exc_info:
            get_dimension_spec("invalid_asset_type")
        assert "Unknown asset type" in str(exc_info.value)
        assert "invalid_asset_type" in str(exc_info.value)
    
    def test_get_dimension_spec_raises_value_error_for_empty_string(self):
        """Test get_dimension_spec raises ValueError for empty string."""
        with pytest.raises(ValueError):
            get_dimension_spec("")
    
    def test_get_dimension_spec_all_types(self):
        """Test get_dimension_spec works for all defined types."""
        for asset_type in DIMENSION_SPECS.keys():
            spec = get_dimension_spec(asset_type)
            assert spec == DIMENSION_SPECS[asset_type]


# =============================================================================
# Test get_asset_directive Function
# =============================================================================

class TestGetAssetDirective:
    """Tests for get_asset_directive function."""
    
    def test_get_asset_directive_twitch_emote(self):
        """Test get_asset_directive returns correct directive for twitch_emote."""
        directive = get_asset_directive("twitch_emote")
        assert directive == "vector art style, sticker style, bold thick outlines, flat colors, high contrast, simple iconic design, solid green background, expressive, clear silhouette, scales to 28px"
    
    def test_get_asset_directive_twitch_badge(self):
        """Test get_asset_directive returns correct directive for twitch_badge."""
        directive = get_asset_directive("twitch_badge")
        assert directive == "badge style, solid green background, iconic, simple, bold outlines, flat colors"
    
    def test_get_asset_directive_youtube_thumbnail(self):
        """Test get_asset_directive returns correct directive for youtube_thumbnail."""
        directive = get_asset_directive("youtube_thumbnail")
        assert directive == "high contrast, cinematic lighting, eye-catching, bold"
    
    def test_get_asset_directive_twitch_banner(self):
        """Test get_asset_directive returns correct directive for twitch_banner."""
        directive = get_asset_directive("twitch_banner")
        assert directive == "wide composition, text-safe zones, dynamic"
    
    def test_get_asset_directive_tiktok_story(self):
        """Test get_asset_directive returns correct directive for tiktok_story."""
        directive = get_asset_directive("tiktok_story")
        assert directive == "vertical composition, mobile-optimized, vibrant"
    
    def test_get_asset_directive_twitch_panel(self):
        """Test get_asset_directive returns correct directive for twitch_panel."""
        directive = get_asset_directive("twitch_panel")
        assert directive == "clean design, readable text area, branded"
    
    def test_get_asset_directive_twitch_offline(self):
        """Test get_asset_directive returns correct directive for twitch_offline."""
        directive = get_asset_directive("twitch_offline")
        assert directive == "atmospheric, branded, professional stream offline screen"
    
    def test_get_asset_directive_returns_empty_string_for_unknown_type(self):
        """Test get_asset_directive returns empty string for unknown type."""
        directive = get_asset_directive("unknown_type")
        assert directive == ""
    
    def test_get_asset_directive_returns_empty_string_for_type_without_directive(self):
        """Test get_asset_directive returns empty string for type without directive."""
        # square_pfp exists in DIMENSION_SPECS but not in ASSET_TYPE_DIRECTIVES
        directive = get_asset_directive("square_pfp")
        assert directive == ""


# =============================================================================
# Test get_all_twitch_asset_types Function
# =============================================================================

class TestGetAllTwitchAssetTypes:
    """Tests for get_all_twitch_asset_types function."""
    
    def test_get_all_twitch_asset_types_returns_list(self):
        """Test get_all_twitch_asset_types returns a list."""
        result = get_all_twitch_asset_types()
        assert isinstance(result, list)
    
    def test_get_all_twitch_asset_types_contains_only_twitch_types(self):
        """Test get_all_twitch_asset_types contains only twitch_ prefixed types."""
        result = get_all_twitch_asset_types()
        for asset_type in result:
            assert asset_type.startswith("twitch_"), f"{asset_type} does not start with 'twitch_'"
    
    def test_get_all_twitch_asset_types_contains_expected_types(self):
        """Test get_all_twitch_asset_types contains all expected twitch types."""
        result = get_all_twitch_asset_types()
        expected_types = [
            "twitch_banner",
            "twitch_panel",
            "twitch_offline",
            "twitch_emote",
            "twitch_emote_112",
            "twitch_emote_56",
            "twitch_emote_28",
            "twitch_badge",
            "twitch_badge_36",
            "twitch_badge_18",
        ]
        for expected_type in expected_types:
            assert expected_type in result, f"{expected_type} not in result"
    
    def test_get_all_twitch_asset_types_excludes_non_twitch_types(self):
        """Test get_all_twitch_asset_types excludes non-twitch types."""
        result = get_all_twitch_asset_types()
        non_twitch_types = ["youtube_thumbnail", "youtube_banner", "tiktok_story", "square_pfp"]
        for non_twitch_type in non_twitch_types:
            assert non_twitch_type not in result, f"{non_twitch_type} should not be in result"
    
    def test_get_all_twitch_asset_types_count(self):
        """Test get_all_twitch_asset_types returns correct count."""
        result = get_all_twitch_asset_types()
        # Count twitch_ types in DIMENSION_SPECS
        expected_count = sum(1 for k in DIMENSION_SPECS.keys() if k.startswith("twitch_"))
        assert len(result) == expected_count


# =============================================================================
# Test DimensionSpec Dataclass
# =============================================================================

class TestDimensionSpecDataclass:
    """Tests for DimensionSpec dataclass."""
    
    def test_dimension_spec_creation(self):
        """Test DimensionSpec can be created with valid values."""
        spec = DimensionSpec(
            generation_size=(1024, 1024),
            export_size=(512, 512),
            aspect_ratio="1:1"
        )
        assert spec.generation_size == (1024, 1024)
        assert spec.export_size == (512, 512)
        assert spec.aspect_ratio == "1:1"
    
    def test_dimension_spec_equality(self):
        """Test DimensionSpec equality comparison."""
        spec1 = DimensionSpec(
            generation_size=(1024, 1024),
            export_size=(512, 512),
            aspect_ratio="1:1"
        )
        spec2 = DimensionSpec(
            generation_size=(1024, 1024),
            export_size=(512, 512),
            aspect_ratio="1:1"
        )
        assert spec1 == spec2
    
    def test_dimension_spec_inequality(self):
        """Test DimensionSpec inequality comparison."""
        spec1 = DimensionSpec(
            generation_size=(1024, 1024),
            export_size=(512, 512),
            aspect_ratio="1:1"
        )
        spec2 = DimensionSpec(
            generation_size=(1024, 1024),
            export_size=(256, 256),
            aspect_ratio="1:1"
        )
        assert spec1 != spec2


# =============================================================================
# Test get_dimension_info_for_prompt Function
# =============================================================================

class TestGetDimensionInfoForPrompt:
    """Tests for get_dimension_info_for_prompt function."""
    
    def test_returns_info_for_story_graphic(self):
        """Test returns correct info for story_graphic (vertical)."""
        from backend.services.twitch.dimensions import get_dimension_info_for_prompt
        info = get_dimension_info_for_prompt("story_graphic")
        assert "1080x1920" in info
        assert "9:16" in info
        assert "portrait" in info.lower() or "vertical" in info.lower()
    
    def test_returns_info_for_youtube_thumbnail(self):
        """Test returns correct info for youtube_thumbnail (landscape)."""
        from backend.services.twitch.dimensions import get_dimension_info_for_prompt
        info = get_dimension_info_for_prompt("youtube_thumbnail")
        assert "1280x720" in info
        assert "16:9" in info
        assert "landscape" in info.lower() or "horizontal" in info.lower()
    
    def test_returns_info_for_twitch_emote(self):
        """Test returns correct info for twitch_emote (square)."""
        from backend.services.twitch.dimensions import get_dimension_info_for_prompt
        info = get_dimension_info_for_prompt("twitch_emote")
        assert "512x512" in info
        assert "1:1" in info
        assert "square" in info.lower()
    
    def test_returns_empty_for_unknown_type(self):
        """Test returns empty string for unknown asset type."""
        from backend.services.twitch.dimensions import get_dimension_info_for_prompt
        info = get_dimension_info_for_prompt("unknown_type")
        assert info == ""
    
    def test_returns_info_for_tiktok_story(self):
        """Test returns correct info for tiktok_story."""
        from backend.services.twitch.dimensions import get_dimension_info_for_prompt
        info = get_dimension_info_for_prompt("tiktok_story")
        assert "1080x1920" in info
        assert "9:16" in info


# =============================================================================
# Test get_composition_directive Function
# =============================================================================

class TestGetCompositionDirective:
    """Tests for get_composition_directive function."""
    
    def test_vertical_composition_for_story(self):
        """Test returns vertical composition directive for story assets."""
        from backend.services.twitch.dimensions import get_composition_directive
        directive = get_composition_directive("story_graphic")
        assert "VERTICAL" in directive.upper()
        assert "mobile" in directive.lower()
    
    def test_landscape_composition_for_thumbnail(self):
        """Test returns landscape composition directive for thumbnails."""
        from backend.services.twitch.dimensions import get_composition_directive
        directive = get_composition_directive("youtube_thumbnail")
        assert "LANDSCAPE" in directive.upper()
    
    def test_square_composition_for_emote(self):
        """Test returns square composition directive for emotes."""
        from backend.services.twitch.dimensions import get_composition_directive
        directive = get_composition_directive("twitch_emote")
        assert "SQUARE" in directive.upper()
        assert "center" in directive.lower()
    
    def test_wide_banner_composition(self):
        """Test returns wide banner composition directive."""
        from backend.services.twitch.dimensions import get_composition_directive
        directive = get_composition_directive("twitch_banner")
        assert "WIDE" in directive.upper() or "BANNER" in directive.upper()
    
    def test_returns_empty_for_unknown_type(self):
        """Test returns empty string for unknown asset type."""
        from backend.services.twitch.dimensions import get_composition_directive
        directive = get_composition_directive("unknown_type")
        assert directive == ""


# =============================================================================
# Test New Asset Types
# =============================================================================

class TestNewAssetTypes:
    """Tests for newly added asset types."""
    
    def test_story_graphic_exists(self):
        """Test story_graphic spec exists."""
        assert "story_graphic" in DIMENSION_SPECS
    
    def test_story_graphic_values(self):
        """Test story_graphic has correct values (same as tiktok_story)."""
        spec = DIMENSION_SPECS["story_graphic"]
        assert spec.generation_size == (832, 1216)
        assert spec.export_size == (1080, 1920)
        assert spec.aspect_ratio == "9:16"
    
    def test_instagram_story_exists(self):
        """Test instagram_story spec exists."""
        assert "instagram_story" in DIMENSION_SPECS
    
    def test_instagram_reel_exists(self):
        """Test instagram_reel spec exists."""
        assert "instagram_reel" in DIMENSION_SPECS
    
    def test_overlay_exists(self):
        """Test overlay spec exists."""
        assert "overlay" in DIMENSION_SPECS
    
    def test_overlay_values(self):
        """Test overlay has correct values (1080p landscape)."""
        spec = DIMENSION_SPECS["overlay"]
        assert spec.generation_size == (1920, 1080)
        assert spec.export_size == (1920, 1080)
        assert spec.aspect_ratio == "16:9"
    
    def test_story_graphic_has_directive(self):
        """Test story_graphic has an asset directive."""
        directive = get_asset_directive("story_graphic")
        assert directive != ""
        assert "vertical" in directive.lower()
    
    def test_overlay_has_directive(self):
        """Test overlay has an asset directive."""
        directive = get_asset_directive("overlay")
        assert directive != ""
