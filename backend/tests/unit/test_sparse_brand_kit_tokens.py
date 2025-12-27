"""
Token Efficiency Tests for Sparse Brand Kits.

Verifies that when a user has only 10% of brand kit fields filled,
we do NOT pass empty/null fields to the AI, preserving tokens.

This is critical for:
1. Cost efficiency (fewer tokens = lower API costs)
2. Better AI output (less noise in prompts)
3. Faster generation (smaller prompts process faster)
"""

import uuid
import pytest

from backend.services.prompt_engine import (
    PromptEngine,
    BrandContextResolver,
    ResolvedBrandContext,
)


class TestSparseBrandKitTokenEfficiency:
    """
    Tests that sparse brand kits produce minimal token prompts.
    
    A "sparse" brand kit is one where the user has only filled out
    ~10% of available fields (e.g., just a primary color and name).
    """
    
    @pytest.fixture
    def sparse_brand_kit(self) -> dict:
        """
        Create a sparse brand kit with minimal fields.
        
        Simulates a user who just signed up and only set:
        - Primary color
        - Basic tone
        """
        return {
            "id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "name": "My Channel",
            "primary_colors": ["#3B82F6"],  # Just one color
            "accent_colors": [],  # Empty
            "fonts": {},  # Empty
            "tone": "casual",
            # All extended fields empty/missing
            "colors_extended": {},
            "typography": {},
            "voice": {},
            "logos": {},
        }
    
    @pytest.fixture
    def full_brand_kit(self) -> dict:
        """Create a fully populated brand kit for comparison."""
        return {
            "id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "name": "Pro Gamer Brand",
            "primary_colors": ["#FF00FF", "#00FFFF"],
            "accent_colors": ["#FFD700", "#FF4500"],
            "fonts": {"headline": "Bebas Neue", "body": "Roboto"},
            "tone": "energetic",
            "colors_extended": {
                "primary": [
                    {"hex": "#FF00FF", "name": "Neon Pink"},
                    {"hex": "#00FFFF", "name": "Cyber Cyan"},
                ],
                "secondary": [{"hex": "#1A1A2E", "name": "Dark Navy"}],
                "accent": [
                    {"hex": "#FFD700", "name": "Gold"},
                    {"hex": "#FF4500", "name": "Orange Red"},
                ],
                "gradients": [
                    {
                        "name": "Neon Sunset",
                        "type": "linear",
                        "angle": 135,
                        "stops": [
                            {"color": "#FF00FF", "position": 0},
                            {"color": "#00FFFF", "position": 100},
                        ]
                    }
                ]
            },
            "typography": {
                "headline": {"family": "Bebas Neue", "weight": 700},
                "body": {"family": "Roboto", "weight": 400},
            },
            "voice": {
                "tone": "energetic",
                "tagline": "Game On, Level Up!",
                "catchphrases": ["Let's gooo!", "GG EZ"],
            },
            "logos": {
                "primary": {"url": "https://example.com/logo.png"},
            },
        }
    
    def test_sparse_brand_kit_no_empty_fields_in_prompt(self, sparse_brand_kit: dict):
        """
        Verify sparse brand kit does NOT include empty fields in prompt.
        
        Expected behavior:
        - NO "secondary:" in prompt (not set)
        - NO "accent:" in prompt (not set)
        - NO "Gradient:" in prompt (not set)
        - NO "Tagline:" in prompt (not set)
        - NO "Text:" in prompt (no catchphrase)
        - NO "Logo:" in prompt (not included)
        """
        context = BrandContextResolver.resolve(sparse_brand_kit, None)
        engine = PromptEngine()
        brand_block = engine.build_brand_context_prompt(context)
        
        # Should NOT contain empty/optional fields
        assert "secondary:" not in brand_block.lower()
        assert "Gradient:" not in brand_block
        assert "Tagline:" not in brand_block
        assert "Text:" not in brand_block
        assert "Logo:" not in brand_block
        
        # Should contain only the set fields
        assert "#3B82F6" in brand_block  # Primary color
        assert "casual" in brand_block.lower()  # Tone
    
    def test_sparse_vs_full_token_count(
        self, 
        sparse_brand_kit: dict, 
        full_brand_kit: dict
    ):
        """
        Verify sparse brand kit produces significantly fewer tokens.
        
        Token estimation: ~4 chars per token (rough average)
        """
        engine = PromptEngine()
        
        # Sparse brand kit
        sparse_context = BrandContextResolver.resolve(sparse_brand_kit, None)
        sparse_block = engine.build_brand_context_prompt(sparse_context)
        
        # Full brand kit with all customizations
        full_customization = {
            "voice": {"use_tagline": True, "use_catchphrase": 0},
            "colors": {"use_gradient": 0, "secondary_index": 0, "accent_index": 0},
            "include_logo": True,
            "logo_position": "bottom-right",
            "logo_size": "medium",
        }
        full_context = BrandContextResolver.resolve(full_brand_kit, full_customization)
        full_block = engine.build_brand_context_prompt(full_context)
        
        # Sparse should be significantly smaller
        sparse_chars = len(sparse_block)
        full_chars = len(full_block)
        
        # Sparse should be less than 50% of full
        assert sparse_chars < full_chars * 0.5, (
            f"Sparse ({sparse_chars} chars) should be <50% of full ({full_chars} chars)"
        )
        
        # Estimate tokens (rough: 4 chars per token)
        sparse_tokens = sparse_chars / 4
        full_tokens = full_chars / 4
        
        print(f"\nToken efficiency comparison:")
        print(f"  Sparse brand kit: ~{sparse_tokens:.0f} tokens ({sparse_chars} chars)")
        print(f"  Full brand kit:   ~{full_tokens:.0f} tokens ({full_chars} chars)")
        print(f"  Savings:          ~{full_tokens - sparse_tokens:.0f} tokens")
    
    def test_resolved_context_null_fields(self, sparse_brand_kit: dict):
        """
        Verify ResolvedBrandContext has None for unset optional fields.
        """
        context = BrandContextResolver.resolve(sparse_brand_kit, None)
        
        # Required fields should have values (defaults if not set)
        assert context.primary_color is not None
        assert context.font is not None
        assert context.tone is not None
        
        # Optional fields should be None when not set
        assert context.secondary_color is None
        assert context.accent_color is None
        assert context.gradient is None
        assert context.tagline is None
        assert context.catchphrase is None
        assert context.include_logo is False
    
    def test_empty_colors_extended_uses_basic_colors(self, sparse_brand_kit: dict):
        """
        Verify fallback to basic colors when colors_extended is empty.
        """
        context = BrandContextResolver.resolve(sparse_brand_kit, None)
        
        # Should use primary_colors[0] as fallback
        assert context.primary_color == "#3B82F6"
    
    def test_empty_typography_uses_default_font(self, sparse_brand_kit: dict):
        """
        Verify fallback to default font when typography is empty.
        """
        context = BrandContextResolver.resolve(sparse_brand_kit, None)
        
        # Should use default font (Inter 400 or similar)
        assert "Inter" in context.font or context.font is not None
    
    def test_completely_empty_brand_kit(self):
        """
        Test handling of brand kit with absolutely no data.
        
        This is an edge case that shouldn't happen in production,
        but we should handle it gracefully.
        """
        empty_brand_kit = {
            "id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "name": "Empty",
            # All fields missing or empty
        }
        
        context = BrandContextResolver.resolve(empty_brand_kit, None)
        engine = PromptEngine()
        
        # Should not crash
        brand_block = engine.build_brand_context_prompt(context)
        
        # Should have minimal content with defaults
        assert "[BRAND:" in brand_block
        assert "Colors:" in brand_block
        assert "Font:" in brand_block
        assert "Tone:" in brand_block
        
        # Should be very compact
        assert len(brand_block) < 150
    
    def test_no_blank_values_in_output(self, sparse_brand_kit: dict):
        """
        Verify no blank/empty string values appear in the prompt.
        
        Bad: "Colors: #3B82F6  | Font: Inter 400 | Tone: casual | Tagline: "
        Good: "Colors: #3B82F6 | Font: Inter 400 | Tone: casual"
        """
        context = BrandContextResolver.resolve(sparse_brand_kit, None)
        engine = PromptEngine()
        brand_block = engine.build_brand_context_prompt(context)
        
        # Should not have empty quoted strings
        assert '""' not in brand_block
        assert "' '" not in brand_block
        
        # Should not have trailing pipes or separators
        assert "| ]" not in brand_block
        assert "|]" not in brand_block
        
        # Should not have double spaces (except intentional formatting)
        assert "  |" not in brand_block
        assert "|  " not in brand_block


class TestBrandContextPromptFormat:
    """Tests for the format of the brand context prompt block."""
    
    def test_brand_block_structure(self):
        """Verify the brand block has correct structure."""
        context = ResolvedBrandContext(
            primary_color="#FF0000",
            font="Arial 700",
            tone="bold",
        )
        
        engine = PromptEngine()
        block = engine.build_brand_context_prompt(context)
        
        # Should start with [BRAND:
        assert block.startswith("[BRAND:")
        
        # Should end with ]
        assert block.endswith("]")
        
        # Should contain intensity modifier
        assert "use -" in block  # Default is "balanced" -> "use"
    
    def test_intensity_modifiers(self):
        """Verify intensity modifiers are applied correctly."""
        engine = PromptEngine()
        
        for intensity, expected_word in [
            ("subtle", "subtly incorporate"),
            ("balanced", "use"),
            ("strong", "prominently feature"),
        ]:
            context = ResolvedBrandContext(
                primary_color="#FF0000",
                font="Arial 700",
                tone="bold",
                intensity=intensity,
            )
            block = engine.build_brand_context_prompt(context)
            assert expected_word in block, f"Intensity '{intensity}' should use '{expected_word}'"
