"""
Brand Customization Data Flow Integration Tests

Tests the complete data flow from frontend format through to prompt injection:
1. Frontend sends brand_customization with color/voice/logo selections
2. API route extracts and validates the data
3. Generation service passes to BrandContextResolver
4. Resolver picks specific values from brand kit based on indices
5. Prompt engine injects resolved values into the prompt

These tests verify that user selections properly flow through the entire system.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone
import uuid

from backend.api.schemas.generation import (
    GenerateRequest,
    BrandCustomization,
    ColorSelection,
    VoiceSelection,
)
from backend.services.prompt_engine import BrandContextResolver, ResolvedBrandContext


# =============================================================================
# Test Data
# =============================================================================

SAMPLE_BRAND_KIT = {
    "id": str(uuid.uuid4()),
    "user_id": str(uuid.uuid4()),
    "name": "Test Brand Kit",
    # Basic colors (fallback)
    "primary_colors": ["#1E3A5F", "#2563EB", "#3B82F6"],
    "accent_colors": ["#D97706", "#F59E0B"],
    # Extended colors
    "colors_extended": {
        "primary": [
            {"hex": "#1E3A5F", "name": "Navy Blue"},
            {"hex": "#2563EB", "name": "Interactive Blue"},
            {"hex": "#3B82F6", "name": "Sky Blue"},
        ],
        "secondary": [
            {"hex": "#10B981", "name": "Emerald"},
            {"hex": "#059669", "name": "Green"},
        ],
        "accent": [
            {"hex": "#D97706", "name": "Amber"},
            {"hex": "#F59E0B", "name": "Yellow"},
            {"hex": "#EF4444", "name": "Red"},
        ],
        "gradients": [
            {
                "name": "Ocean",
                "type": "linear",
                "angle": 135,
                "stops": [
                    {"color": "#1E3A5F", "position": 0},
                    {"color": "#3B82F6", "position": 100},
                ],
            },
            {
                "name": "Sunset",
                "type": "linear",
                "angle": 90,
                "stops": [
                    {"color": "#D97706", "position": 0},
                    {"color": "#EF4444", "position": 100},
                ],
            },
        ],
    },
    # Typography
    "typography": {
        "headline": {"family": "Montserrat", "weight": 700},
        "body": {"family": "Inter", "weight": 400},
        "accent": {"family": "Poppins", "weight": 600},
    },
    "fonts": {"headline": "Montserrat", "body": "Inter"},
    # Voice
    "voice": {
        "tone": "competitive",
        "tagline": "Level Up Your Stream",
        "catchphrases": [
            "Let's gooo!",
            "GG EZ",
            "Subscribe for more!",
        ],
    },
    "tone": "competitive",
}


# =============================================================================
# Test: Schema Validation
# =============================================================================

class TestBrandCustomizationSchema:
    """Tests for BrandCustomization schema validation."""
    
    def test_full_customization_schema(self):
        """Test that full customization schema parses correctly."""
        data = {
            "colors": {
                "primary_index": 1,
                "secondary_index": 0,
                "accent_index": 2,
                "use_gradient": 0,
            },
            "voice": {
                "use_tagline": True,
                "use_catchphrase": 1,
            },
            "include_logo": True,
            "logo_type": "primary",
            "logo_position": "bottom-right",
            "logo_size": "medium",
            "brand_intensity": "strong",
        }
        
        bc = BrandCustomization(**data)
        
        assert bc.colors.primary_index == 1
        assert bc.colors.secondary_index == 0
        assert bc.colors.accent_index == 2
        assert bc.colors.use_gradient == 0
        assert bc.voice.use_tagline is True
        assert bc.voice.use_catchphrase == 1
        assert bc.include_logo is True
        assert bc.logo_type == "primary"
        assert bc.logo_position == "bottom-right"
        assert bc.logo_size == "medium"
        assert bc.brand_intensity == "strong"
    
    def test_minimal_customization_schema(self):
        """Test that minimal customization (just logo options) works."""
        data = {
            "include_logo": False,
            "logo_type": "primary",
            "logo_position": "bottom-right",
            "logo_size": "medium",
            "brand_intensity": "balanced",
        }
        
        bc = BrandCustomization(**data)
        
        assert bc.colors is None
        assert bc.voice is None
        assert bc.include_logo is False
        assert bc.brand_intensity == "balanced"
    
    def test_color_selection_only(self):
        """Test customization with only color selection."""
        data = {
            "colors": {
                "primary_index": 2,
            },
            "include_logo": False,
            "logo_type": "primary",
            "logo_position": "bottom-right",
            "logo_size": "medium",
            "brand_intensity": "subtle",
        }
        
        bc = BrandCustomization(**data)
        
        assert bc.colors.primary_index == 2
        assert bc.colors.secondary_index is None
        assert bc.colors.accent_index is None
        assert bc.colors.use_gradient is None
    
    def test_generate_request_with_customization(self):
        """Test GenerateRequest with full brand customization."""
        data = {
            "asset_type": "thumbnail",
            "brand_kit_id": str(uuid.uuid4()),
            "custom_prompt": "Epic gaming moment",
            "brand_customization": {
                "colors": {"primary_index": 1, "accent_index": 0},
                "voice": {"use_tagline": True},
                "include_logo": True,
                "logo_type": "icon",
                "logo_position": "top-right",
                "logo_size": "small",
                "brand_intensity": "strong",
            },
        }
        
        request = GenerateRequest(**data)
        
        assert request.brand_customization is not None
        assert request.brand_customization.colors.primary_index == 1
        assert request.brand_customization.voice.use_tagline is True
        assert request.brand_customization.logo_type == "icon"


# =============================================================================
# Test: BrandContextResolver
# =============================================================================

class TestBrandContextResolver:
    """Tests for BrandContextResolver color/voice resolution."""
    
    def test_resolve_primary_color_by_index(self):
        """Test that primary color is selected by index."""
        customization = {
            "colors": {"primary_index": 1},  # Should select "Interactive Blue"
            "brand_intensity": "balanced",
        }
        
        result = BrandContextResolver.resolve(SAMPLE_BRAND_KIT, customization)
        
        assert result.primary_color == "#2563EB"  # Interactive Blue
    
    def test_resolve_secondary_color_by_index(self):
        """Test that secondary color is selected by index."""
        customization = {
            "colors": {"primary_index": 0, "secondary_index": 1},  # Green
            "brand_intensity": "balanced",
        }
        
        result = BrandContextResolver.resolve(SAMPLE_BRAND_KIT, customization)
        
        assert result.secondary_color == "#059669"  # Green
    
    def test_resolve_accent_color_by_index(self):
        """Test that accent color is selected by index."""
        customization = {
            "colors": {"primary_index": 0, "accent_index": 2},  # Red
            "brand_intensity": "balanced",
        }
        
        result = BrandContextResolver.resolve(SAMPLE_BRAND_KIT, customization)
        
        assert result.accent_color == "#EF4444"  # Red
    
    def test_resolve_gradient_by_index(self):
        """Test that gradient is selected by index."""
        customization = {
            "colors": {"primary_index": 0, "use_gradient": 1},  # Sunset gradient
            "brand_intensity": "balanced",
        }
        
        result = BrandContextResolver.resolve(SAMPLE_BRAND_KIT, customization)
        
        assert result.gradient is not None
        assert "Sunset" not in result.gradient  # Name not in output
        assert "#D97706" in result.gradient  # Start color
        assert "#EF4444" in result.gradient  # End color
    
    def test_resolve_tagline_when_enabled(self):
        """Test that tagline is included when use_tagline is True."""
        customization = {
            "voice": {"use_tagline": True},
            "brand_intensity": "balanced",
        }
        
        result = BrandContextResolver.resolve(SAMPLE_BRAND_KIT, customization)
        
        assert result.tagline == "Level Up Your Stream"
    
    def test_resolve_tagline_not_included_when_disabled(self):
        """Test that tagline is not included when use_tagline is False."""
        customization = {
            "voice": {"use_tagline": False},
            "brand_intensity": "balanced",
        }
        
        result = BrandContextResolver.resolve(SAMPLE_BRAND_KIT, customization)
        
        assert result.tagline is None
    
    def test_resolve_catchphrase_by_index(self):
        """Test that catchphrase is selected by index."""
        customization = {
            "voice": {"use_catchphrase": 1},  # "GG EZ"
            "brand_intensity": "balanced",
        }
        
        result = BrandContextResolver.resolve(SAMPLE_BRAND_KIT, customization)
        
        assert result.catchphrase == "GG EZ"
    
    def test_resolve_brand_intensity(self):
        """Test that brand intensity is passed through."""
        for intensity in ["subtle", "balanced", "strong"]:
            customization = {"brand_intensity": intensity}
            result = BrandContextResolver.resolve(SAMPLE_BRAND_KIT, customization)
            assert result.intensity == intensity
    
    def test_resolve_logo_options(self):
        """Test that logo options are passed through."""
        customization = {
            "include_logo": True,
            "logo_position": "top-left",
            "logo_size": "large",
            "brand_intensity": "balanced",
        }
        
        result = BrandContextResolver.resolve(SAMPLE_BRAND_KIT, customization)
        
        assert result.include_logo is True
        assert result.logo_position == "top-left"
        assert result.logo_size == "large"
    
    def test_resolve_defaults_when_no_customization(self):
        """Test that defaults are used when no customization provided."""
        result = BrandContextResolver.resolve(SAMPLE_BRAND_KIT, None)
        
        # Should use first primary color
        assert result.primary_color == "#1E3A5F"
        # No secondary/accent selected
        assert result.secondary_color is None
        assert result.accent_color is None
        # No gradient
        assert result.gradient is None
        # No tagline/catchphrase
        assert result.tagline is None
        assert result.catchphrase is None
        # Default intensity
        assert result.intensity == "balanced"
    
    def test_resolve_falls_back_to_basic_colors(self):
        """Test fallback to basic colors when extended not set."""
        brand_kit_basic = {
            "primary_colors": ["#FF0000", "#00FF00"],
            "accent_colors": ["#0000FF"],
            "fonts": {"headline": "Arial"},
            "tone": "casual",
        }
        
        customization = {
            "colors": {"primary_index": 1},
            "brand_intensity": "balanced",
        }
        
        result = BrandContextResolver.resolve(brand_kit_basic, customization)
        
        assert result.primary_color == "#00FF00"
    
    def test_resolve_index_out_of_bounds_uses_last(self):
        """Test that out-of-bounds index uses last available color."""
        customization = {
            "colors": {"primary_index": 999},  # Way out of bounds
            "brand_intensity": "balanced",
        }
        
        result = BrandContextResolver.resolve(SAMPLE_BRAND_KIT, customization)
        
        # Should use last color (Sky Blue)
        assert result.primary_color == "#3B82F6"


# =============================================================================
# Test: Full Data Flow (API Route → Service → Resolver)
# =============================================================================

class TestFullDataFlow:
    """Tests for the complete data flow from API to prompt injection."""
    
    def test_api_route_extracts_customization_to_parameters(self):
        """Test that API route correctly extracts customization to parameters dict."""
        # Simulate what the API route does
        bc = BrandCustomization(
            colors=ColorSelection(primary_index=2, accent_index=1),
            voice=VoiceSelection(use_tagline=True, use_catchphrase=0),
            include_logo=True,
            logo_type="watermark",
            logo_position="center",
            logo_size="large",
            brand_intensity="strong",
        )
        
        # This is what the route does
        parameters = {}
        parameters["include_logo"] = bc.include_logo
        parameters["logo_type"] = bc.logo_type
        parameters["logo_position"] = bc.logo_position
        parameters["logo_size"] = bc.logo_size
        parameters["brand_intensity"] = bc.brand_intensity
        
        if bc.colors:
            parameters["colors"] = {
                "primary_index": bc.colors.primary_index,
                "secondary_index": bc.colors.secondary_index,
                "accent_index": bc.colors.accent_index,
                "use_gradient": bc.colors.use_gradient,
            }
        
        if bc.voice:
            parameters["voice"] = {
                "use_tagline": bc.voice.use_tagline,
                "use_catchphrase": bc.voice.use_catchphrase,
            }
        
        # Verify extraction
        assert parameters["include_logo"] is True
        assert parameters["logo_type"] == "watermark"
        assert parameters["logo_position"] == "center"
        assert parameters["logo_size"] == "large"
        assert parameters["brand_intensity"] == "strong"
        assert parameters["colors"]["primary_index"] == 2
        assert parameters["colors"]["accent_index"] == 1
        assert parameters["voice"]["use_tagline"] is True
        assert parameters["voice"]["use_catchphrase"] == 0
    
    def test_parameters_to_resolver_format(self):
        """Test that parameters dict works with BrandContextResolver."""
        # Parameters as extracted by API route
        parameters = {
            "include_logo": True,
            "logo_type": "primary",
            "logo_position": "bottom-right",
            "logo_size": "medium",
            "brand_intensity": "strong",
            "colors": {
                "primary_index": 1,
                "secondary_index": 0,
                "accent_index": 2,
                "use_gradient": None,
            },
            "voice": {
                "use_tagline": True,
                "use_catchphrase": 2,
            },
        }
        
        # Resolver expects this format
        result = BrandContextResolver.resolve(SAMPLE_BRAND_KIT, parameters)
        
        # Verify resolved values
        assert result.primary_color == "#2563EB"  # Index 1
        assert result.secondary_color == "#10B981"  # Index 0
        assert result.accent_color == "#EF4444"  # Index 2
        assert result.tagline == "Level Up Your Stream"
        assert result.catchphrase == "Subscribe for more!"  # Index 2
        assert result.intensity == "strong"
        assert result.include_logo is True
        assert result.logo_position == "bottom-right"
        assert result.logo_size == "medium"
    
    def test_frontend_to_backend_format_transformation(self):
        """Test the complete transformation from frontend camelCase to backend snake_case."""
        # Frontend sends (camelCase, transformed by API client)
        frontend_payload = {
            "assetType": "thumbnail",
            "brandKitId": str(uuid.uuid4()),
            "customPrompt": "Epic gaming moment",
            "brandCustomization": {
                "colors": {
                    "primaryIndex": 1,
                    "secondaryIndex": 0,
                    "accentIndex": 2,
                    "useGradient": 0,
                },
                "voice": {
                    "useTagline": True,
                    "useCatchphrase": 1,
                },
                "includeLogo": True,
                "logoType": "icon",
                "logoPosition": "top-right",
                "logoSize": "small",
                "brandIntensity": "strong",
            },
        }
        
        # API client transforms to snake_case
        backend_payload = {
            "asset_type": frontend_payload["assetType"],
            "brand_kit_id": frontend_payload["brandKitId"],
            "custom_prompt": frontend_payload["customPrompt"],
            "brand_customization": {
                "colors": {
                    "primary_index": frontend_payload["brandCustomization"]["colors"]["primaryIndex"],
                    "secondary_index": frontend_payload["brandCustomization"]["colors"]["secondaryIndex"],
                    "accent_index": frontend_payload["brandCustomization"]["colors"]["accentIndex"],
                    "use_gradient": frontend_payload["brandCustomization"]["colors"]["useGradient"],
                },
                "voice": {
                    "use_tagline": frontend_payload["brandCustomization"]["voice"]["useTagline"],
                    "use_catchphrase": frontend_payload["brandCustomization"]["voice"]["useCatchphrase"],
                },
                "include_logo": frontend_payload["brandCustomization"]["includeLogo"],
                "logo_type": frontend_payload["brandCustomization"]["logoType"],
                "logo_position": frontend_payload["brandCustomization"]["logoPosition"],
                "logo_size": frontend_payload["brandCustomization"]["logoSize"],
                "brand_intensity": frontend_payload["brandCustomization"]["brandIntensity"],
            },
        }
        
        # Parse with Pydantic
        request = GenerateRequest(**backend_payload)
        
        # Verify all values came through
        assert request.brand_customization.colors.primary_index == 1
        assert request.brand_customization.colors.secondary_index == 0
        assert request.brand_customization.colors.accent_index == 2
        assert request.brand_customization.colors.use_gradient == 0
        assert request.brand_customization.voice.use_tagline is True
        assert request.brand_customization.voice.use_catchphrase == 1
        assert request.brand_customization.include_logo is True
        assert request.brand_customization.logo_type == "icon"
        assert request.brand_customization.logo_position == "top-right"
        assert request.brand_customization.logo_size == "small"
        assert request.brand_customization.brand_intensity == "strong"


# =============================================================================
# Test: Edge Cases
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases and error handling."""
    
    def test_empty_brand_kit_colors(self):
        """Test handling of brand kit with no colors."""
        empty_brand_kit = {
            "primary_colors": [],
            "accent_colors": [],
            "fonts": {"headline": "Arial"},
            "tone": "casual",
        }
        
        result = BrandContextResolver.resolve(empty_brand_kit, None)
        
        # Should use fallback
        assert result.primary_color == "#000000"
    
    def test_missing_voice_data(self):
        """Test handling of brand kit with no voice data."""
        no_voice_kit = {
            "primary_colors": ["#FF0000"],
            "fonts": {"headline": "Arial"},
            "tone": "casual",
        }
        
        customization = {
            "voice": {"use_tagline": True, "use_catchphrase": 0},
        }
        
        result = BrandContextResolver.resolve(no_voice_kit, customization)
        
        # Should be None since no voice data
        assert result.tagline is None
        assert result.catchphrase is None
    
    def test_partial_color_selection(self):
        """Test that partial color selection works."""
        customization = {
            "colors": {
                "primary_index": 0,
                # secondary_index and accent_index not set
            },
        }
        
        result = BrandContextResolver.resolve(SAMPLE_BRAND_KIT, customization)
        
        assert result.primary_color == "#1E3A5F"
        assert result.secondary_color is None
        assert result.accent_color is None


# =============================================================================
# Run Tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
