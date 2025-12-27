"""
Property-based tests for brand kit enhancement schemas.

These tests validate the correctness properties for enhanced brand kit functionality:
- ExtendedColor validation (hex colors, name length)
- Gradient validation (stop positions, ordering)
- Typography validation (font weights, styles)
- BrandVoice validation (personality traits, tagline)
- Streamer asset validation (alert duration, badge months, emote tiers)
- BrandGuidelines validation (color ratios)

Uses Hypothesis for property-based testing with 100+ iterations.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from pydantic import ValidationError

from backend.api.schemas.brand_kit_enhanced import (
    # Constants
    HEX_PATTERN,
    VALID_FONT_WEIGHTS,
    # Helper functions
    is_valid_hex_color,
    normalize_hex_color,
    # Section 1: Extended Color System
    ExtendedColor,
    GradientStop,
    Gradient,
    ColorPalette,
    # Section 2: Typography System
    FontConfig,
    Typography,
    # Section 3: Brand Voice
    BrandVoice,
    # Section 4: Streamer Assets
    OverlayAsset,
    AlertAsset,
    PanelAsset,
    EmoteAsset,
    BadgeAsset,
    FacecamFrame,
    Stinger,
    StreamerAssets,
    BrandGuidelines,
    SocialProfile,
    SocialProfiles,
)


# ============================================================================
# Hypothesis Strategies
# ============================================================================

# Strategy for valid hex colors (#RRGGBB format)
hex_color_strategy = st.from_regex(r'^#[0-9A-Fa-f]{6}$', fullmatch=True)

# Strategy for valid font weights
font_weight_strategy = st.sampled_from([100, 200, 300, 400, 500, 600, 700, 800, 900])

# Strategy for invalid font weights
invalid_font_weight_strategy = st.integers().filter(
    lambda w: w not in VALID_FONT_WEIGHTS
)

# Strategy for valid font styles
font_style_strategy = st.sampled_from(['normal', 'italic'])

# Strategy for invalid font styles
invalid_font_style_strategy = st.text(min_size=1, max_size=20).filter(
    lambda s: s not in ['normal', 'italic']
)

# Strategy for valid extended tones
extended_tone_strategy = st.sampled_from([
    'competitive', 'casual', 'educational', 'comedic',
    'professional', 'inspirational', 'edgy', 'wholesome'
])

# Strategy for valid color names (max 50 chars)
color_name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z')),
    min_size=1,
    max_size=50
).filter(lambda s: s.strip() != "")

# Strategy for valid usage descriptions (max 200 chars)
usage_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z')),
    min_size=1,
    max_size=200
).filter(lambda s: s.strip() != "")

# Strategy for valid personality traits (max 30 chars each)
personality_trait_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z')),
    min_size=1,
    max_size=30
).filter(lambda s: s.strip() != "")

# Strategy for valid taglines (max 100 chars)
tagline_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z')),
    min_size=1,
    max_size=100
).filter(lambda s: s.strip() != "")

# Strategy for valid alert durations (500-30000ms)
alert_duration_strategy = st.integers(min_value=500, max_value=30000)

# Strategy for valid badge months (1-120)
badge_months_strategy = st.integers(min_value=1, max_value=120)

# Strategy for valid emote tiers (1, 2, 3)
emote_tier_strategy = st.sampled_from([1, 2, 3])

# Strategy for gradient positions (0-100)
gradient_position_strategy = st.integers(min_value=0, max_value=100)


# ============================================================================
# ExtendedColor Tests
# ============================================================================

class TestExtendedColorProperties:
    """Property tests for ExtendedColor schema."""

    @settings(max_examples=100)
    @given(hex_color=hex_color_strategy)
    def test_valid_hex_colors_accepted_and_normalized(self, hex_color: str):
        """Valid hex colors (#RRGGBB) are accepted and normalized to uppercase."""
        color = ExtendedColor(
            hex=hex_color,
            name="Test Color",
            usage="Test usage"
        )
        assert color.hex == hex_color.upper()
        assert color.hex.startswith("#")
        assert len(color.hex) == 7

    @settings(max_examples=100)
    @given(s=st.text(max_size=20))
    def test_invalid_hex_colors_rejected(self, s: str):
        """Invalid hex colors are rejected (wrong length, missing #, invalid chars)."""
        # Skip if it happens to be a valid hex color
        assume(not HEX_PATTERN.match(s))
        
        with pytest.raises(ValidationError):
            ExtendedColor(
                hex=s,
                name="Test Color",
                usage="Test usage"
            )

    @settings(max_examples=50)
    @given(name=color_name_strategy)
    def test_name_max_50_chars_accepted(self, name: str):
        """Names up to 50 characters are accepted."""
        assume(len(name) <= 50)
        color = ExtendedColor(
            hex="#FF5733",
            name=name,
            usage="Test usage"
        )
        assert color.name == name

    @settings(max_examples=50)
    @given(name=st.text(min_size=51, max_size=100))
    def test_name_over_50_chars_rejected(self, name: str):
        """Names over 50 characters are rejected."""
        with pytest.raises(ValidationError):
            ExtendedColor(
                hex="#FF5733",
                name=name,
                usage="Test usage"
            )

    def test_invalid_hex_edge_cases(self):
        """Test specific invalid hex color edge cases."""
        invalid_cases = [
            "",           # Empty
            "#",          # Just hash
            "#FFF",       # Too short (3 chars)
            "#FFFFFFF",   # Too long (7 chars)
            "FF5733",     # Missing #
            "#GGGGGG",    # Invalid hex chars
            "#ff573",     # 5 chars
            "rgb(255,0,0)",  # RGB format
            "#FF 5733",   # Space in middle
        ]
        
        for invalid_hex in invalid_cases:
            with pytest.raises(ValidationError):
                ExtendedColor(
                    hex=invalid_hex,
                    name="Test",
                    usage="Test"
                )


# ============================================================================
# Gradient Tests
# ============================================================================

class TestGradientProperties:
    """Property tests for Gradient and GradientStop schemas."""

    @settings(max_examples=100)
    @given(
        pos1=st.integers(min_value=0, max_value=49),
        pos2=st.integers(min_value=50, max_value=100)
    )
    def test_ascending_gradient_stops_accepted(self, pos1: int, pos2: int):
        """Valid gradient stops (ascending positions 0-100) are accepted."""
        assume(pos1 < pos2)
        
        gradient = Gradient(
            name="Test Gradient",
            type="linear",
            angle=45,
            stops=[
                GradientStop(color="#FF0000", position=pos1),
                GradientStop(color="#00FF00", position=pos2)
            ]
        )
        
        assert gradient.stops[0].position == pos1
        assert gradient.stops[1].position == pos2
        assert gradient.stops[0].position < gradient.stops[1].position

    @settings(max_examples=100)
    @given(
        pos1=st.integers(min_value=50, max_value=100),
        pos2=st.integers(min_value=0, max_value=49)
    )
    def test_descending_gradient_stops_rejected(self, pos1: int, pos2: int):
        """Descending gradient stops are rejected."""
        assume(pos1 > pos2)
        
        with pytest.raises(ValidationError) as exc_info:
            Gradient(
                name="Test Gradient",
                type="linear",
                angle=45,
                stops=[
                    GradientStop(color="#FF0000", position=pos1),
                    GradientStop(color="#00FF00", position=pos2)
                ]
            )
        
        assert "ascending order" in str(exc_info.value).lower()

    @settings(max_examples=50)
    @given(position=st.integers(min_value=101, max_value=1000))
    def test_position_over_100_rejected(self, position: int):
        """Gradient stop positions over 100 are rejected."""
        with pytest.raises(ValidationError):
            GradientStop(color="#FF0000", position=position)

    @settings(max_examples=50)
    @given(position=st.integers(min_value=-1000, max_value=-1))
    def test_negative_position_rejected(self, position: int):
        """Negative gradient stop positions are rejected."""
        with pytest.raises(ValidationError):
            GradientStop(color="#FF0000", position=position)

    @settings(max_examples=50)
    @given(
        positions=st.lists(
            st.integers(min_value=0, max_value=100),
            min_size=2,
            max_size=5,
            unique=True
        ).map(sorted)
    )
    def test_multiple_ascending_stops_accepted(self, positions):
        """Multiple gradient stops in ascending order are accepted."""
        stops = [
            GradientStop(color="#FF0000", position=pos)
            for pos in positions
        ]
        
        gradient = Gradient(
            name="Multi-stop Gradient",
            type="linear",
            angle=90,
            stops=stops
        )
        
        result_positions = [stop.position for stop in gradient.stops]
        assert result_positions == sorted(result_positions)

    def test_gradient_stop_color_normalized(self):
        """Gradient stop colors are normalized to uppercase."""
        stop = GradientStop(color="#aabbcc", position=50)
        assert stop.color == "#AABBCC"

    def test_gradient_types_accepted(self):
        """Both linear and radial gradient types are accepted."""
        for grad_type in ['linear', 'radial']:
            gradient = Gradient(
                name="Test",
                type=grad_type,
                angle=45,
                stops=[
                    GradientStop(color="#FF0000", position=0),
                    GradientStop(color="#00FF00", position=100)
                ]
            )
            assert gradient.type == grad_type


# ============================================================================
# Typography Tests
# ============================================================================

class TestTypographyProperties:
    """Property tests for FontConfig and Typography schemas."""

    @settings(max_examples=100)
    @given(weight=font_weight_strategy)
    def test_valid_font_weights_accepted(self, weight: int):
        """Valid font weights [100,200,300,400,500,600,700,800,900] are accepted."""
        font = FontConfig(
            family="Inter",
            weight=weight,
            style="normal"
        )
        assert font.weight == weight
        assert font.weight in VALID_FONT_WEIGHTS

    @settings(max_examples=100)
    @given(weight=invalid_font_weight_strategy)
    def test_invalid_font_weights_rejected(self, weight: int):
        """Invalid font weights are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            FontConfig(
                family="Inter",
                weight=weight,
                style="normal"
            )
        
        assert "font weight" in str(exc_info.value).lower()

    @settings(max_examples=50)
    @given(style=font_style_strategy)
    def test_valid_font_styles_accepted(self, style: str):
        """Valid font styles ["normal", "italic"] are accepted."""
        font = FontConfig(
            family="Inter",
            weight=400,
            style=style
        )
        assert font.style == style

    @settings(max_examples=50)
    @given(style=invalid_font_style_strategy)
    def test_invalid_font_styles_rejected(self, style: str):
        """Invalid font styles are rejected."""
        with pytest.raises(ValidationError):
            FontConfig(
                family="Inter",
                weight=400,
                style=style
            )

    @settings(max_examples=50)
    @given(
        weight=font_weight_strategy,
        style=font_style_strategy
    )
    def test_font_config_combinations(self, weight: int, style: str):
        """All valid weight and style combinations work."""
        font = FontConfig(
            family="Montserrat",
            weight=weight,
            style=style
        )
        assert font.weight == weight
        assert font.style == style

    def test_typography_all_fields_optional(self):
        """All Typography fields are optional."""
        typography = Typography()
        assert typography.display is None
        assert typography.headline is None
        assert typography.subheadline is None
        assert typography.body is None
        assert typography.caption is None
        assert typography.accent is None

    def test_typography_with_all_fonts(self):
        """Typography accepts all font configurations."""
        typography = Typography(
            display=FontConfig(family="Oswald", weight=700, style="normal"),
            headline=FontConfig(family="Montserrat", weight=600, style="normal"),
            subheadline=FontConfig(family="Montserrat", weight=500, style="normal"),
            body=FontConfig(family="Inter", weight=400, style="normal"),
            caption=FontConfig(family="Inter", weight=400, style="italic"),
            accent=FontConfig(family="Playfair Display", weight=700, style="italic")
        )
        
        assert typography.display.weight == 700
        assert typography.headline.weight == 600
        assert typography.body.style == "normal"
        assert typography.caption.style == "italic"

    def test_all_valid_font_weights(self):
        """Verify all weights in VALID_FONT_WEIGHTS work."""
        for weight in VALID_FONT_WEIGHTS:
            font = FontConfig(family="Inter", weight=weight, style="normal")
            assert font.weight == weight


# ============================================================================
# BrandVoice Tests
# ============================================================================

class TestBrandVoiceProperties:
    """Property tests for BrandVoice schema."""

    @settings(max_examples=100)
    @given(
        traits=st.lists(
            personality_trait_strategy,
            min_size=0,
            max_size=5
        )
    )
    def test_valid_personality_traits_accepted(self, traits):
        """0-5 personality traits accepted, each max 30 chars."""
        voice = BrandVoice(
            tone="competitive",
            personality_traits=traits
        )
        assert len(voice.personality_traits) == len(traits)
        for trait in voice.personality_traits:
            assert len(trait) <= 30

    @settings(max_examples=50)
    @given(
        trait=st.text(min_size=31, max_size=100)
    )
    def test_traits_over_30_chars_rejected(self, trait: str):
        """Personality traits over 30 chars are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            BrandVoice(
                tone="competitive",
                personality_traits=[trait]
            )
        
        assert "30 characters" in str(exc_info.value).lower()

    @settings(max_examples=50)
    @given(tagline=tagline_strategy)
    def test_tagline_max_100_chars_accepted(self, tagline: str):
        """Taglines up to 100 characters are accepted."""
        assume(len(tagline) <= 100)
        voice = BrandVoice(
            tone="competitive",
            tagline=tagline
        )
        assert voice.tagline == tagline

    @settings(max_examples=50)
    @given(tagline=st.text(min_size=101, max_size=200))
    def test_tagline_over_100_chars_rejected(self, tagline: str):
        """Taglines over 100 characters are rejected."""
        with pytest.raises(ValidationError):
            BrandVoice(
                tone="competitive",
                tagline=tagline
            )

    @settings(max_examples=50)
    @given(tone=extended_tone_strategy)
    def test_valid_tones_accepted(self, tone: str):
        """All valid extended tones are accepted."""
        voice = BrandVoice(tone=tone)
        assert voice.tone == tone

    @settings(max_examples=50)
    @given(
        tone=st.text(min_size=1, max_size=30).filter(
            lambda t: t not in [
                'competitive', 'casual', 'educational', 'comedic',
                'professional', 'inspirational', 'edgy', 'wholesome'
            ]
        )
    )
    def test_invalid_tones_rejected(self, tone: str):
        """Invalid tones are rejected."""
        with pytest.raises(ValidationError):
            BrandVoice(tone=tone)

    def test_brand_voice_defaults(self):
        """BrandVoice has correct defaults."""
        voice = BrandVoice(tone="competitive")
        assert voice.personality_traits == []
        assert voice.tagline is None
        assert voice.catchphrases == []
        assert voice.content_themes == []

    def test_brand_voice_max_traits(self):
        """BrandVoice accepts exactly 5 personality traits."""
        voice = BrandVoice(
            tone="competitive",
            personality_traits=["Bold", "Energetic", "Fun", "Authentic", "Creative"]
        )
        assert len(voice.personality_traits) == 5

    @settings(max_examples=50)
    @given(
        catchphrase=st.text(min_size=51, max_size=100)
    )
    def test_catchphrases_over_50_chars_rejected(self, catchphrase: str):
        """Catchphrases over 50 chars are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            BrandVoice(
                tone="competitive",
                catchphrases=[catchphrase]
            )
        
        assert "50 characters" in str(exc_info.value).lower()

    @settings(max_examples=50)
    @given(
        theme=st.text(min_size=31, max_size=100)
    )
    def test_content_themes_over_30_chars_rejected(self, theme: str):
        """Content themes over 30 chars are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            BrandVoice(
                tone="competitive",
                content_themes=[theme]
            )
        
        assert "30 characters" in str(exc_info.value).lower()


# ============================================================================
# Streamer Asset Tests
# ============================================================================

class TestStreamerAssetProperties:
    """Property tests for streamer asset schemas."""

    # -------------------------------------------------------------------------
    # AlertAsset Tests
    # -------------------------------------------------------------------------

    @settings(max_examples=100)
    @given(duration=alert_duration_strategy)
    def test_alert_duration_500_to_30000ms_accepted(self, duration: int):
        """Alert duration 500-30000ms is accepted."""
        alert = AlertAsset(
            id="alert-001",
            alert_type="follow",
            image_url="https://example.com/alert.gif",
            duration_ms=duration
        )
        assert alert.duration_ms == duration
        assert 500 <= alert.duration_ms <= 30000

    @settings(max_examples=50)
    @given(duration=st.integers(min_value=30001, max_value=100000))
    def test_alert_duration_over_30000ms_rejected(self, duration: int):
        """Alert duration over 30000ms is rejected."""
        with pytest.raises(ValidationError):
            AlertAsset(
                id="alert-001",
                alert_type="follow",
                image_url="https://example.com/alert.gif",
                duration_ms=duration
            )

    @settings(max_examples=50)
    @given(duration=st.integers(min_value=0, max_value=499))
    def test_alert_duration_under_500ms_rejected(self, duration: int):
        """Alert duration under 500ms is rejected."""
        with pytest.raises(ValidationError):
            AlertAsset(
                id="alert-001",
                alert_type="follow",
                image_url="https://example.com/alert.gif",
                duration_ms=duration
            )

    def test_alert_types_accepted(self):
        """All valid alert types are accepted."""
        alert_types = ['follow', 'subscribe', 'donation', 'raid', 'bits', 'gift_sub']
        for alert_type in alert_types:
            alert = AlertAsset(
                id="alert-001",
                alert_type=alert_type,
                image_url="https://example.com/alert.gif",
                duration_ms=3000
            )
            assert alert.alert_type == alert_type

    # -------------------------------------------------------------------------
    # BadgeAsset Tests
    # -------------------------------------------------------------------------

    @settings(max_examples=100)
    @given(months=badge_months_strategy)
    def test_badge_months_1_to_120_accepted(self, months: int):
        """Badge months 1-120 are accepted."""
        badge = BadgeAsset(
            id="badge-001",
            months=months,
            url="https://example.com/badge.png"
        )
        assert badge.months == months
        assert 1 <= badge.months <= 120

    @settings(max_examples=50)
    @given(months=st.integers(min_value=121, max_value=1000))
    def test_badge_months_over_120_rejected(self, months: int):
        """Badge months over 120 are rejected."""
        with pytest.raises(ValidationError):
            BadgeAsset(
                id="badge-001",
                months=months,
                url="https://example.com/badge.png"
            )

    @settings(max_examples=50)
    @given(months=st.integers(min_value=-100, max_value=0))
    def test_badge_months_zero_or_negative_rejected(self, months: int):
        """Badge months of 0 or negative are rejected."""
        with pytest.raises(ValidationError):
            BadgeAsset(
                id="badge-001",
                months=months,
                url="https://example.com/badge.png"
            )

    # -------------------------------------------------------------------------
    # EmoteAsset Tests
    # -------------------------------------------------------------------------

    @settings(max_examples=50)
    @given(tier=emote_tier_strategy)
    def test_emote_tiers_1_2_3_accepted(self, tier: int):
        """Emote tiers 1, 2, 3 are accepted."""
        emote = EmoteAsset(
            id="emote-001",
            name="myEmote",
            url="https://example.com/emote.png",
            tier=tier
        )
        assert emote.tier == tier
        assert emote.tier in [1, 2, 3]

    @settings(max_examples=50)
    @given(tier=st.integers().filter(lambda t: t not in [1, 2, 3]))
    def test_invalid_emote_tiers_rejected(self, tier: int):
        """Invalid emote tiers (not 1, 2, or 3) are rejected."""
        with pytest.raises(ValidationError):
            EmoteAsset(
                id="emote-001",
                name="myEmote",
                url="https://example.com/emote.png",
                tier=tier
            )

    def test_emote_name_max_30_chars(self):
        """Emote names up to 30 characters are accepted."""
        emote = EmoteAsset(
            id="emote-001",
            name="a" * 30,
            url="https://example.com/emote.png",
            tier=1
        )
        assert len(emote.name) == 30

    def test_emote_name_over_30_chars_rejected(self):
        """Emote names over 30 characters are rejected."""
        with pytest.raises(ValidationError):
            EmoteAsset(
                id="emote-001",
                name="a" * 31,
                url="https://example.com/emote.png",
                tier=1
            )

    # -------------------------------------------------------------------------
    # OverlayAsset Tests
    # -------------------------------------------------------------------------

    @settings(max_examples=50)
    @given(duration=st.integers(min_value=1, max_value=300))
    def test_overlay_duration_1_to_300_accepted(self, duration: int):
        """Overlay duration 1-300 seconds is accepted."""
        overlay = OverlayAsset(
            id="overlay-001",
            url="https://example.com/overlay.png",
            overlay_type="starting_soon",
            duration_seconds=duration
        )
        assert overlay.duration_seconds == duration

    @settings(max_examples=50)
    @given(duration=st.integers(min_value=301, max_value=1000))
    def test_overlay_duration_over_300_rejected(self, duration: int):
        """Overlay duration over 300 seconds is rejected."""
        with pytest.raises(ValidationError):
            OverlayAsset(
                id="overlay-001",
                url="https://example.com/overlay.png",
                overlay_type="starting_soon",
                duration_seconds=duration
            )

    def test_overlay_types_accepted(self):
        """All valid overlay types are accepted."""
        overlay_types = ['starting_soon', 'brb', 'ending', 'gameplay']
        for overlay_type in overlay_types:
            overlay = OverlayAsset(
                id="overlay-001",
                url="https://example.com/overlay.png",
                overlay_type=overlay_type,
                duration_seconds=30
            )
            assert overlay.overlay_type == overlay_type

    # -------------------------------------------------------------------------
    # Stinger Tests
    # -------------------------------------------------------------------------

    @settings(max_examples=50)
    @given(duration=st.integers(min_value=100, max_value=5000))
    def test_stinger_duration_100_to_5000_accepted(self, duration: int):
        """Stinger duration 100-5000ms is accepted."""
        stinger = Stinger(
            id="stinger-001",
            url="https://example.com/stinger.webm",
            duration_ms=duration
        )
        assert stinger.duration_ms == duration

    @settings(max_examples=50)
    @given(duration=st.integers(min_value=5001, max_value=10000))
    def test_stinger_duration_over_5000_rejected(self, duration: int):
        """Stinger duration over 5000ms is rejected."""
        with pytest.raises(ValidationError):
            Stinger(
                id="stinger-001",
                url="https://example.com/stinger.webm",
                duration_ms=duration
            )


# ============================================================================
# BrandGuidelines Tests
# ============================================================================

class TestBrandGuidelinesProperties:
    """Property tests for BrandGuidelines schema."""

    @settings(max_examples=100)
    @given(
        primary=st.floats(min_value=0, max_value=100, allow_nan=False, allow_infinity=False),
        secondary=st.floats(min_value=0, max_value=100, allow_nan=False, allow_infinity=False),
        accent=st.floats(min_value=0, max_value=100, allow_nan=False, allow_infinity=False)
    )
    def test_color_ratios_summing_to_100_or_less_accepted(
        self, primary: float, secondary: float, accent: float
    ):
        """Color ratios summing to <=100 are accepted."""
        assume(primary + secondary + accent <= 100)
        
        guidelines = BrandGuidelines(
            logo_min_size_px=48,
            logo_clear_space_ratio=0.25,
            primary_color_ratio=primary,
            secondary_color_ratio=secondary,
            accent_color_ratio=accent
        )
        
        total = guidelines.primary_color_ratio + guidelines.secondary_color_ratio + guidelines.accent_color_ratio
        assert total <= 100

    @settings(max_examples=100)
    @given(
        primary=st.floats(min_value=34, max_value=100, allow_nan=False, allow_infinity=False),
        secondary=st.floats(min_value=34, max_value=100, allow_nan=False, allow_infinity=False),
        accent=st.floats(min_value=34, max_value=100, allow_nan=False, allow_infinity=False)
    )
    def test_color_ratios_summing_over_100_rejected(
        self, primary: float, secondary: float, accent: float
    ):
        """Color ratios summing to >100 are rejected."""
        assume(primary + secondary + accent > 100)
        
        with pytest.raises(ValidationError) as exc_info:
            BrandGuidelines(
                logo_min_size_px=48,
                logo_clear_space_ratio=0.25,
                primary_color_ratio=primary,
                secondary_color_ratio=secondary,
                accent_color_ratio=accent
            )
        
        assert "100" in str(exc_info.value).lower() or "sum" in str(exc_info.value).lower()

    @settings(max_examples=50)
    @given(logo_size=st.integers(min_value=16, max_value=512))
    def test_logo_min_size_16_to_512_accepted(self, logo_size: int):
        """Logo min size 16-512px is accepted."""
        guidelines = BrandGuidelines(
            logo_min_size_px=logo_size,
            logo_clear_space_ratio=0.25
        )
        assert guidelines.logo_min_size_px == logo_size

    @settings(max_examples=50)
    @given(logo_size=st.integers(min_value=513, max_value=2000))
    def test_logo_min_size_over_512_rejected(self, logo_size: int):
        """Logo min size over 512px is rejected."""
        with pytest.raises(ValidationError):
            BrandGuidelines(
                logo_min_size_px=logo_size,
                logo_clear_space_ratio=0.25
            )

    @settings(max_examples=50)
    @given(logo_size=st.integers(min_value=0, max_value=15))
    def test_logo_min_size_under_16_rejected(self, logo_size: int):
        """Logo min size under 16px is rejected."""
        with pytest.raises(ValidationError):
            BrandGuidelines(
                logo_min_size_px=logo_size,
                logo_clear_space_ratio=0.25
            )

    @settings(max_examples=50)
    @given(ratio=st.floats(min_value=0.1, max_value=1.0, allow_nan=False, allow_infinity=False))
    def test_logo_clear_space_ratio_valid_range(self, ratio: float):
        """Logo clear space ratio 0.1-1.0 is accepted."""
        guidelines = BrandGuidelines(
            logo_min_size_px=48,
            logo_clear_space_ratio=ratio
        )
        assert 0.1 <= guidelines.logo_clear_space_ratio <= 1.0

    def test_brand_guidelines_defaults(self):
        """BrandGuidelines has correct defaults."""
        guidelines = BrandGuidelines(
            logo_min_size_px=48,
            logo_clear_space_ratio=0.25
        )
        assert guidelines.primary_color_ratio == 60.0
        assert guidelines.secondary_color_ratio == 30.0
        assert guidelines.accent_color_ratio == 10.0
        assert guidelines.prohibited_modifications == []
        assert guidelines.style_do is None
        assert guidelines.style_dont is None

    def test_brand_guidelines_exact_100_accepted(self):
        """Color ratios summing to exactly 100 are accepted."""
        guidelines = BrandGuidelines(
            logo_min_size_px=48,
            logo_clear_space_ratio=0.25,
            primary_color_ratio=60.0,
            secondary_color_ratio=30.0,
            accent_color_ratio=10.0
        )
        total = guidelines.primary_color_ratio + guidelines.secondary_color_ratio + guidelines.accent_color_ratio
        assert total == 100.0

    def test_brand_guidelines_zero_ratios_accepted(self):
        """Zero color ratios are accepted."""
        guidelines = BrandGuidelines(
            logo_min_size_px=48,
            logo_clear_space_ratio=0.25,
            primary_color_ratio=0,
            secondary_color_ratio=0,
            accent_color_ratio=0
        )
        assert guidelines.primary_color_ratio == 0
        assert guidelines.secondary_color_ratio == 0
        assert guidelines.accent_color_ratio == 0


# ============================================================================
# Additional Integration Tests
# ============================================================================

class TestColorPaletteProperties:
    """Property tests for ColorPalette schema."""

    @settings(max_examples=50)
    @given(
        num_primary=st.integers(min_value=0, max_value=5),
        num_secondary=st.integers(min_value=0, max_value=5),
        num_accent=st.integers(min_value=0, max_value=3)
    )
    def test_color_palette_accepts_valid_counts(
        self, num_primary: int, num_secondary: int, num_accent: int
    ):
        """ColorPalette accepts valid color counts."""
        primary = [
            ExtendedColor(hex="#FF0000", name=f"Primary {i}", usage="Primary use")
            for i in range(num_primary)
        ]
        secondary = [
            ExtendedColor(hex="#00FF00", name=f"Secondary {i}", usage="Secondary use")
            for i in range(num_secondary)
        ]
        accent = [
            ExtendedColor(hex="#0000FF", name=f"Accent {i}", usage="Accent use")
            for i in range(num_accent)
        ]
        
        palette = ColorPalette(
            primary=primary,
            secondary=secondary,
            accent=accent
        )
        
        assert len(palette.primary) == num_primary
        assert len(palette.secondary) == num_secondary
        assert len(palette.accent) == num_accent

    def test_color_palette_with_gradients(self):
        """ColorPalette accepts gradients."""
        gradient = Gradient(
            name="Test Gradient",
            type="linear",
            angle=45,
            stops=[
                GradientStop(color="#FF0000", position=0),
                GradientStop(color="#00FF00", position=100)
            ]
        )
        
        palette = ColorPalette(gradients=[gradient])
        assert len(palette.gradients) == 1
        assert palette.gradients[0].name == "Test Gradient"


class TestStreamerAssetsContainer:
    """Property tests for StreamerAssets container schema."""

    def test_streamer_assets_defaults(self):
        """StreamerAssets has correct defaults."""
        assets = StreamerAssets()
        assert assets.overlays == []
        assert assets.alerts == []
        assert assets.panels == []
        assert assets.emotes == []
        assert assets.badges == []
        assert assets.facecam_frame is None
        assert assets.stinger is None

    def test_streamer_assets_with_all_types(self):
        """StreamerAssets accepts all asset types."""
        assets = StreamerAssets(
            overlays=[
                OverlayAsset(
                    id="overlay-001",
                    url="https://example.com/overlay.png",
                    overlay_type="starting_soon",
                    duration_seconds=30
                )
            ],
            alerts=[
                AlertAsset(
                    id="alert-001",
                    alert_type="follow",
                    image_url="https://example.com/alert.gif",
                    duration_ms=3000
                )
            ],
            panels=[
                PanelAsset(
                    id="panel-001",
                    name="About Me",
                    image_url="https://example.com/panel.png"
                )
            ],
            emotes=[
                EmoteAsset(
                    id="emote-001",
                    name="myHype",
                    url="https://example.com/emote.png",
                    tier=1
                )
            ],
            badges=[
                BadgeAsset(
                    id="badge-001",
                    months=1,
                    url="https://example.com/badge.png"
                )
            ],
            facecam_frame=FacecamFrame(
                id="facecam-001",
                url="https://example.com/facecam.png",
                position="bottom-right"
            ),
            stinger=Stinger(
                id="stinger-001",
                url="https://example.com/stinger.webm",
                duration_ms=500
            )
        )
        
        assert len(assets.overlays) == 1
        assert len(assets.alerts) == 1
        assert len(assets.panels) == 1
        assert len(assets.emotes) == 1
        assert len(assets.badges) == 1
        assert assets.facecam_frame is not None
        assert assets.stinger is not None


class TestSocialProfileProperties:
    """Property tests for SocialProfile and SocialProfiles schemas."""

    @settings(max_examples=50)
    @given(
        platform=st.text(min_size=1, max_size=50).filter(lambda s: s.strip() != ""),
        username=st.text(min_size=1, max_size=100).filter(lambda s: s.strip() != "")
    )
    def test_social_profile_accepts_valid_data(self, platform: str, username: str):
        """SocialProfile accepts valid platform and username."""
        profile = SocialProfile(
            platform=platform,
            username=username,
            url=f"https://example.com/{username}"
        )
        assert profile.platform == platform
        assert profile.username == username

    def test_social_profiles_container(self):
        """SocialProfiles container works correctly."""
        profiles = SocialProfiles(
            profiles=[
                SocialProfile(
                    platform="twitch",
                    username="mystreamer",
                    url="https://twitch.tv/mystreamer"
                ),
                SocialProfile(
                    platform="twitter",
                    username="mystreamer",
                    url="https://twitter.com/mystreamer"
                )
            ]
        )
        assert len(profiles.profiles) == 2


class TestFacecamFrameProperties:
    """Property tests for FacecamFrame schema."""

    def test_facecam_positions_accepted(self):
        """All valid facecam positions are accepted."""
        positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        for position in positions:
            frame = FacecamFrame(
                id="facecam-001",
                url="https://example.com/facecam.png",
                position=position
            )
            assert frame.position == position

    @settings(max_examples=50)
    @given(
        position=st.text(min_size=1, max_size=20).filter(
            lambda p: p not in ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        )
    )
    def test_invalid_facecam_positions_rejected(self, position: str):
        """Invalid facecam positions are rejected."""
        with pytest.raises(ValidationError):
            FacecamFrame(
                id="facecam-001",
                url="https://example.com/facecam.png",
                position=position
            )
