"""
Property-based tests for brand kit services.

These tests validate the correctness properties for brand kit functionality:
- Property 4: Hex Color Validation
- Property 5: Brand Kit Serialization Round-Trip
- Property 6: Brand Kit Color Array Bounds

Additional properties:
- Font validation (supported fonts pass, unsupported fail)
- Name trimming (whitespace is stripped)
- Tone validation (only valid tones accepted)

Uses Hypothesis for property-based testing with 100+ iterations.
"""

import re
from typing import List

import pytest
from hypothesis import given, strategies as st, settings, assume
from pydantic import ValidationError

from backend.api.schemas.brand_kit import (
    is_valid_hex_color,
    normalize_hex_color,
    validate_hex_colors,
    validate_font,
    BrandKitCreate,
    BrandKitUpdate,
    BrandKitFonts,
    BrandKitResponse,
    SUPPORTED_FONTS,
    VALID_TONES,
    HEX_PATTERN,
)


# ============================================================================
# Constants
# ============================================================================

# Valid tones as a list for strategies
VALID_TONE_LIST = ['competitive', 'casual', 'educational', 'comedic', 'professional']


# ============================================================================
# Hypothesis Strategies
# ============================================================================

# Strategy for valid hex colors
valid_hex_strategy = st.from_regex(r'#[0-9A-Fa-f]{6}', fullmatch=True)

# Strategy for invalid hex colors (various invalid formats)
invalid_hex_strategy = st.one_of(
    st.text(max_size=20).filter(lambda s: not HEX_PATTERN.match(s)),
    st.just(""),
    st.just("#"),
    st.just("#FFF"),  # Too short
    st.just("#FFFFFFF"),  # Too long
    st.just("FF5733"),  # Missing #
    st.just("#GGGGGG"),  # Invalid hex chars
    st.just("#ff573"),  # 5 chars
    st.just("rgb(255,0,0)"),  # RGB format
)

# Strategy for supported fonts
supported_font_strategy = st.sampled_from(SUPPORTED_FONTS)

# Strategy for unsupported fonts
unsupported_font_strategy = st.text(min_size=1, max_size=50).filter(
    lambda f: f not in SUPPORTED_FONTS and f.strip() != ""
)

# Strategy for valid tones
valid_tone_strategy = st.sampled_from(VALID_TONE_LIST)

# Strategy for valid brand kit names
valid_name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z')),
    min_size=1,
    max_size=100
).filter(lambda s: s.strip() != "")

# Strategy for style reference
style_reference_strategy = st.text(max_size=500)

# Strategy for brand kit fonts
brand_kit_fonts_strategy = st.builds(
    BrandKitFonts,
    headline=supported_font_strategy,
    body=supported_font_strategy,
)

# Strategy for primary colors (1-5 valid hex colors)
primary_colors_strategy = st.lists(
    valid_hex_strategy,
    min_size=1,
    max_size=5
)

# Strategy for accent colors (0-3 valid hex colors)
accent_colors_strategy = st.lists(
    valid_hex_strategy,
    min_size=0,
    max_size=3
)


def brand_kit_strategy():
    """Strategy for generating valid BrandKitCreate objects."""
    return st.builds(
        BrandKitCreate,
        name=valid_name_strategy,
        primary_colors=primary_colors_strategy,
        accent_colors=accent_colors_strategy,
        fonts=brand_kit_fonts_strategy,
        tone=valid_tone_strategy,
        style_reference=style_reference_strategy,
        logo_url=st.none(),
    )


# ============================================================================
# Property 4: Hex Color Validation
# ============================================================================

class TestHexColorValidation:
    """Property 4: Hex color validation correctness."""
    
    @settings(max_examples=100)
    @given(s=st.text(max_size=20))
    def test_hex_validation_rejects_invalid(self, s: str):
        """For any string, hex validator returns True only for valid hex codes."""
        is_valid = is_valid_hex_color(s)
        if is_valid:
            assert HEX_PATTERN.match(s), f"Validator accepted invalid hex: {s}"
    
    @settings(max_examples=100)
    @given(hex_color=valid_hex_strategy)
    def test_hex_validation_accepts_valid(self, hex_color: str):
        """All valid hex codes pass validation."""
        assert is_valid_hex_color(hex_color) is True
    
    @settings(max_examples=100)
    @given(hex_color=valid_hex_strategy)
    def test_hex_normalization_uppercase(self, hex_color: str):
        """Normalized hex colors are uppercase."""
        normalized = normalize_hex_color(hex_color)
        assert normalized == hex_color.upper()
        assert normalized.startswith("#")
        assert len(normalized) == 7
    
    @settings(max_examples=100)
    @given(colors=st.lists(valid_hex_strategy, min_size=1, max_size=5))
    def test_validate_hex_colors_list(self, colors: List[str]):
        """List of valid hex colors passes validation."""
        validated = validate_hex_colors(colors)
        assert len(validated) == len(colors)
        for color in validated:
            assert color == color.upper()
            assert HEX_PATTERN.match(color)
    
    @settings(max_examples=50)
    @given(
        valid_colors=st.lists(valid_hex_strategy, min_size=1, max_size=3),
        invalid_color=invalid_hex_strategy
    )
    def test_validate_hex_colors_rejects_invalid_in_list(
        self, valid_colors: List[str], invalid_color: str
    ):
        """List containing invalid hex color raises ValueError."""
        assume(not HEX_PATTERN.match(invalid_color))
        mixed_colors = valid_colors + [invalid_color]
        
        with pytest.raises(ValueError) as exc_info:
            validate_hex_colors(mixed_colors)
        
        assert "Invalid hex color format" in str(exc_info.value)
    
    def test_hex_validation_edge_cases(self):
        """Test specific edge cases for hex validation."""
        # Valid cases
        assert is_valid_hex_color("#000000") is True
        assert is_valid_hex_color("#FFFFFF") is True
        assert is_valid_hex_color("#ffffff") is True
        assert is_valid_hex_color("#AbCdEf") is True
        assert is_valid_hex_color("#123456") is True
        
        # Invalid cases
        assert is_valid_hex_color("") is False
        assert is_valid_hex_color("#") is False
        assert is_valid_hex_color("#FFF") is False
        assert is_valid_hex_color("#FFFFFFF") is False
        assert is_valid_hex_color("FFFFFF") is False
        assert is_valid_hex_color("#GGGGGG") is False
        assert is_valid_hex_color("rgb(255,255,255)") is False
        assert is_valid_hex_color("#FF 5733") is False


# ============================================================================
# Property 5: Brand Kit Serialization Round-Trip
# ============================================================================

class TestBrandKitRoundTrip:
    """Property 5: Brand kit serialization round-trip correctness."""
    
    @settings(max_examples=100)
    @given(brand_kit=brand_kit_strategy())
    def test_brand_kit_roundtrip(self, brand_kit: BrandKitCreate):
        """Serializing then deserializing produces equivalent object."""
        json_str = brand_kit.model_dump_json()
        restored = BrandKitCreate.model_validate_json(json_str)
        
        assert restored.name == brand_kit.name
        assert restored.primary_colors == brand_kit.primary_colors
        assert restored.accent_colors == brand_kit.accent_colors
        assert restored.fonts.headline == brand_kit.fonts.headline
        assert restored.fonts.body == brand_kit.fonts.body
        assert restored.tone == brand_kit.tone
        assert restored.style_reference == brand_kit.style_reference
        assert restored.logo_url == brand_kit.logo_url
    
    @settings(max_examples=100)
    @given(brand_kit=brand_kit_strategy())
    def test_brand_kit_dict_roundtrip(self, brand_kit: BrandKitCreate):
        """Converting to dict and back produces equivalent object."""
        data = brand_kit.model_dump()
        restored = BrandKitCreate.model_validate(data)
        
        assert restored.name == brand_kit.name
        assert restored.primary_colors == brand_kit.primary_colors
        assert restored.accent_colors == brand_kit.accent_colors
        assert restored.tone == brand_kit.tone
    
    @settings(max_examples=50)
    @given(
        name=valid_name_strategy,
        primary=primary_colors_strategy,
        accent=accent_colors_strategy,
        headline=supported_font_strategy,
        body=supported_font_strategy,
        tone=valid_tone_strategy,
    )
    def test_brand_kit_from_components(
        self,
        name: str,
        primary: List[str],
        accent: List[str],
        headline: str,
        body: str,
        tone: str,
    ):
        """Brand kit can be created from individual components."""
        brand_kit = BrandKitCreate(
            name=name,
            primary_colors=primary,
            accent_colors=accent,
            fonts=BrandKitFonts(headline=headline, body=body),
            tone=tone,
        )
        
        assert brand_kit.name == name.strip()
        # Colors are normalized to uppercase
        assert all(c.upper() in [p.upper() for p in primary] for c in brand_kit.primary_colors)
        assert brand_kit.fonts.headline == headline
        assert brand_kit.fonts.body == body
        assert brand_kit.tone == tone


# ============================================================================
# Property 6: Brand Kit Color Array Bounds
# ============================================================================

class TestBrandKitColorBounds:
    """Property 6: Brand kit color array bounds validation."""
    
    @settings(max_examples=100)
    @given(
        primary=st.lists(valid_hex_strategy, min_size=1, max_size=5),
        accent=st.lists(valid_hex_strategy, min_size=0, max_size=3)
    )
    def test_brand_kit_color_bounds(self, primary: List[str], accent: List[str]):
        """Color arrays are within valid bounds."""
        assert 1 <= len(primary) <= 5
        assert 0 <= len(accent) <= 3
    
    @settings(max_examples=50)
    @given(
        primary=st.lists(valid_hex_strategy, min_size=1, max_size=5),
        accent=st.lists(valid_hex_strategy, min_size=0, max_size=3),
        fonts=brand_kit_fonts_strategy,
    )
    def test_brand_kit_accepts_valid_color_counts(
        self, primary: List[str], accent: List[str], fonts: BrandKitFonts
    ):
        """Brand kit accepts valid color array sizes."""
        brand_kit = BrandKitCreate(
            name="Test Brand",
            primary_colors=primary,
            accent_colors=accent,
            fonts=fonts,
        )
        
        assert len(brand_kit.primary_colors) == len(primary)
        assert len(brand_kit.accent_colors) == len(accent)
    
    def test_brand_kit_rejects_empty_primary_colors(self):
        """Brand kit rejects empty primary colors list."""
        with pytest.raises(ValidationError) as exc_info:
            BrandKitCreate(
                name="Test Brand",
                primary_colors=[],
                fonts=BrandKitFonts(headline="Inter", body="Roboto"),
            )
        
        assert "primary_colors" in str(exc_info.value).lower()
    
    def test_brand_kit_rejects_too_many_primary_colors(self):
        """Brand kit rejects more than 5 primary colors."""
        with pytest.raises(ValidationError) as exc_info:
            BrandKitCreate(
                name="Test Brand",
                primary_colors=["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"],
                fonts=BrandKitFonts(headline="Inter", body="Roboto"),
            )
        
        assert "primary_colors" in str(exc_info.value).lower()
    
    def test_brand_kit_rejects_too_many_accent_colors(self):
        """Brand kit rejects more than 3 accent colors."""
        with pytest.raises(ValidationError) as exc_info:
            BrandKitCreate(
                name="Test Brand",
                primary_colors=["#FF0000"],
                accent_colors=["#FF0000", "#00FF00", "#0000FF", "#FFFF00"],
                fonts=BrandKitFonts(headline="Inter", body="Roboto"),
            )
        
        assert "accent_colors" in str(exc_info.value).lower()


# ============================================================================
# Font Validation Properties
# ============================================================================

class TestFontValidation:
    """Property tests for font validation."""
    
    @settings(max_examples=100)
    @given(font=supported_font_strategy)
    def test_supported_fonts_pass_validation(self, font: str):
        """All supported fonts pass validation."""
        result = validate_font(font)
        assert result == font
    
    @settings(max_examples=100)
    @given(font=unsupported_font_strategy)
    def test_unsupported_fonts_fail_validation(self, font: str):
        """Unsupported fonts fail validation."""
        with pytest.raises(ValueError) as exc_info:
            validate_font(font)
        
        assert "Unsupported font" in str(exc_info.value)
    
    @settings(max_examples=50)
    @given(
        headline=supported_font_strategy,
        body=supported_font_strategy,
    )
    def test_brand_kit_fonts_accepts_supported(self, headline: str, body: str):
        """BrandKitFonts accepts supported fonts."""
        fonts = BrandKitFonts(headline=headline, body=body)
        assert fonts.headline == headline
        assert fonts.body == body
    
    @settings(max_examples=50)
    @given(unsupported=unsupported_font_strategy)
    def test_brand_kit_fonts_rejects_unsupported_headline(self, unsupported: str):
        """BrandKitFonts rejects unsupported headline font."""
        with pytest.raises(ValidationError):
            BrandKitFonts(headline=unsupported, body="Inter")
    
    @settings(max_examples=50)
    @given(unsupported=unsupported_font_strategy)
    def test_brand_kit_fonts_rejects_unsupported_body(self, unsupported: str):
        """BrandKitFonts rejects unsupported body font."""
        with pytest.raises(ValidationError):
            BrandKitFonts(headline="Inter", body=unsupported)
    
    def test_all_supported_fonts_valid(self):
        """Verify all fonts in SUPPORTED_FONTS list are valid."""
        for font in SUPPORTED_FONTS:
            result = validate_font(font)
            assert result == font
            
            # Also test in BrandKitFonts
            fonts = BrandKitFonts(headline=font, body=font)
            assert fonts.headline == font
            assert fonts.body == font


# ============================================================================
# Name Trimming Properties
# ============================================================================

class TestNameTrimming:
    """Property tests for name whitespace trimming."""
    
    @settings(max_examples=100)
    @given(
        name=st.text(min_size=1, max_size=90).filter(lambda s: s.strip() != ""),
        leading_spaces=st.integers(min_value=0, max_value=5),
        trailing_spaces=st.integers(min_value=0, max_value=5),
    )
    def test_name_whitespace_stripped(
        self, name: str, leading_spaces: int, trailing_spaces: int
    ):
        """Whitespace is stripped from brand kit names."""
        padded_name = " " * leading_spaces + name.strip() + " " * trailing_spaces
        
        brand_kit = BrandKitCreate(
            name=padded_name,
            primary_colors=["#FF5733"],
            fonts=BrandKitFonts(headline="Inter", body="Roboto"),
        )
        
        assert brand_kit.name == name.strip()
        assert not brand_kit.name.startswith(" ")
        assert not brand_kit.name.endswith(" ")
    
    def test_whitespace_only_name_rejected(self):
        """Whitespace-only names are rejected."""
        with pytest.raises(ValidationError):
            BrandKitCreate(
                name="   ",
                primary_colors=["#FF5733"],
                fonts=BrandKitFonts(headline="Inter", body="Roboto"),
            )
    
    def test_empty_name_rejected(self):
        """Empty names are rejected."""
        with pytest.raises(ValidationError):
            BrandKitCreate(
                name="",
                primary_colors=["#FF5733"],
                fonts=BrandKitFonts(headline="Inter", body="Roboto"),
            )
    
    @settings(max_examples=50)
    @given(name=st.text(min_size=101, max_size=200))
    def test_name_max_length_enforced(self, name: str):
        """Names exceeding max length are rejected."""
        with pytest.raises(ValidationError):
            BrandKitCreate(
                name=name,
                primary_colors=["#FF5733"],
                fonts=BrandKitFonts(headline="Inter", body="Roboto"),
            )


# ============================================================================
# Tone Validation Properties
# ============================================================================

class TestToneValidation:
    """Property tests for tone validation."""
    
    @settings(max_examples=100)
    @given(tone=valid_tone_strategy)
    def test_valid_tones_accepted(self, tone: str):
        """All valid tones are accepted."""
        brand_kit = BrandKitCreate(
            name="Test Brand",
            primary_colors=["#FF5733"],
            fonts=BrandKitFonts(headline="Inter", body="Roboto"),
            tone=tone,
        )
        
        assert brand_kit.tone == tone
    
    @settings(max_examples=50)
    @given(
        invalid_tone=st.text(min_size=1, max_size=50).filter(
            lambda t: t not in VALID_TONE_LIST
        )
    )
    def test_invalid_tones_rejected(self, invalid_tone: str):
        """Invalid tones are rejected."""
        with pytest.raises(ValidationError):
            BrandKitCreate(
                name="Test Brand",
                primary_colors=["#FF5733"],
                fonts=BrandKitFonts(headline="Inter", body="Roboto"),
                tone=invalid_tone,
            )
    
    def test_all_valid_tones(self):
        """Verify all tones in VALID_TONE_LIST work."""
        for tone in VALID_TONE_LIST:
            brand_kit = BrandKitCreate(
                name="Test Brand",
                primary_colors=["#FF5733"],
                fonts=BrandKitFonts(headline="Inter", body="Roboto"),
                tone=tone,
            )
            assert brand_kit.tone == tone
    
    def test_default_tone_is_professional(self):
        """Default tone is 'professional'."""
        brand_kit = BrandKitCreate(
            name="Test Brand",
            primary_colors=["#FF5733"],
            fonts=BrandKitFonts(headline="Inter", body="Roboto"),
        )
        
        assert brand_kit.tone == "professional"


# ============================================================================
# BrandKitUpdate Properties
# ============================================================================

class TestBrandKitUpdateProperties:
    """Property tests for BrandKitUpdate schema."""
    
    @settings(max_examples=50)
    @given(
        name=st.one_of(st.none(), valid_name_strategy),
        primary=st.one_of(st.none(), primary_colors_strategy),
        tone=st.one_of(st.none(), valid_tone_strategy),
    )
    def test_update_allows_partial_data(
        self, name, primary, tone
    ):
        """BrandKitUpdate allows partial updates with None values."""
        update = BrandKitUpdate(
            name=name,
            primary_colors=primary,
            tone=tone,
        )
        
        if name is not None:
            assert update.name == name.strip()
        else:
            assert update.name is None
        
        # Colors are normalized to uppercase
        if primary is not None:
            assert update.primary_colors == [c.upper() for c in primary]
        else:
            assert update.primary_colors is None
        assert update.tone == tone
    
    def test_update_all_fields_optional(self):
        """All fields in BrandKitUpdate are optional."""
        update = BrandKitUpdate()
        
        assert update.name is None
        assert update.primary_colors is None
        assert update.accent_colors is None
        assert update.fonts is None
        assert update.tone is None
        assert update.style_reference is None
        assert update.logo_url is None
    
    @settings(max_examples=50)
    @given(primary=st.lists(valid_hex_strategy, min_size=6, max_size=10))
    def test_update_rejects_too_many_primary_colors(self, primary: List[str]):
        """BrandKitUpdate rejects more than 5 primary colors."""
        with pytest.raises(ValidationError):
            BrandKitUpdate(primary_colors=primary)


# ============================================================================
# Additional Edge Case Tests
# ============================================================================

class TestBrandKitEdgeCases:
    """Additional edge case tests for brand kit schemas."""
    
    def test_brand_kit_with_minimum_data(self):
        """Brand kit can be created with minimum required data."""
        brand_kit = BrandKitCreate(
            name="A",
            primary_colors=["#000000"],
            fonts=BrandKitFonts(headline="Inter", body="Inter"),
        )
        
        assert brand_kit.name == "A"
        assert len(brand_kit.primary_colors) == 1
        assert brand_kit.accent_colors == []
        assert brand_kit.tone == "professional"
        assert brand_kit.style_reference == ""
        assert brand_kit.logo_url is None
    
    def test_brand_kit_with_maximum_data(self):
        """Brand kit can be created with maximum allowed data."""
        brand_kit = BrandKitCreate(
            name="A" * 100,
            primary_colors=["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF"],
            accent_colors=["#FFFFFF", "#000000", "#808080"],
            fonts=BrandKitFonts(headline="Montserrat", body="Inter"),
            tone="competitive",
            style_reference="X" * 500,
            logo_url="https://example.com/logo.png",
        )
        
        assert len(brand_kit.name) == 100
        assert len(brand_kit.primary_colors) == 5
        assert len(brand_kit.accent_colors) == 3
        assert len(brand_kit.style_reference) == 500
    
    def test_hex_color_case_insensitivity(self):
        """Hex colors are case-insensitive and normalized to uppercase."""
        brand_kit = BrandKitCreate(
            name="Test",
            primary_colors=["#aabbcc", "#AABBCC", "#AaBbCc"],
            fonts=BrandKitFonts(headline="Inter", body="Inter"),
        )
        
        # All should be normalized to uppercase
        for color in brand_kit.primary_colors:
            assert color == color.upper()
    
    @settings(max_examples=50)
    @given(style_ref=st.text(max_size=500))
    def test_style_reference_accepts_any_text(self, style_ref: str):
        """Style reference accepts any text up to 500 characters."""
        brand_kit = BrandKitCreate(
            name="Test",
            primary_colors=["#FF5733"],
            fonts=BrandKitFonts(headline="Inter", body="Inter"),
            style_reference=style_ref,
        )
        
        assert brand_kit.style_reference == style_ref
    
    def test_style_reference_max_length(self):
        """Style reference rejects text over 500 characters."""
        with pytest.raises(ValidationError):
            BrandKitCreate(
                name="Test",
                primary_colors=["#FF5733"],
                fonts=BrandKitFonts(headline="Inter", body="Inter"),
                style_reference="X" * 501,
            )
