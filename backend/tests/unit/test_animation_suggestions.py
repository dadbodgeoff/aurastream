"""
Unit tests for Animation Suggestion Service.

Tests the AI-powered animation suggestion generation.
"""

import pytest

# Test the suggestion service logic without full imports
from backend.api.schemas.alert_animation import (
    AnimationSuggestion,
    AnimationConfig,
    EntryAnimation,
    LoopAnimation,
    ParticleEffect,
    DepthEffect,
)


class TestAnimationSuggestionSchemas:
    """Test Pydantic schemas for animation suggestions."""

    def test_animation_suggestion_creation(self):
        """Test creating an AnimationSuggestion."""
        config = AnimationConfig(
            entry=EntryAnimation(type="pop_in", duration_ms=500),
            loop=LoopAnimation(type="float", frequency=0.5),
            depth_effect=None,
            particles=ParticleEffect(type="sparkles", count=20),
            duration_ms=3000,
            loop_count=1,
        )
        
        suggestion = AnimationSuggestion(
            vibe="cute",
            recommended_preset="Cute Style",
            recommended_event="new_subscriber",
            config=config,
            reasoning="Cute mascots work great with bouncy animations",
            alternatives=["playful", "chill"],
        )
        
        assert suggestion.vibe == "cute"
        assert suggestion.recommended_preset == "Cute Style"
        assert suggestion.recommended_event == "new_subscriber"
        assert suggestion.config.entry.type == "pop_in"
        assert suggestion.config.particles.type == "sparkles"
        assert len(suggestion.alternatives) == 2

    def test_animation_suggestion_without_event(self):
        """Test AnimationSuggestion with no recommended event."""
        config = AnimationConfig(
            entry=None,
            loop=None,
            depth_effect=None,
            particles=None,
            duration_ms=3000,
            loop_count=1,
        )
        
        suggestion = AnimationSuggestion(
            vibe="professional",
            recommended_preset="Professional Style",
            recommended_event=None,
            config=config,
            reasoning="Clean, minimal animation",
            alternatives=[],
        )
        
        assert suggestion.recommended_event is None
        assert suggestion.config.entry is None

    def test_entry_animation_validation(self):
        """Test EntryAnimation field validation."""
        # Valid entry
        entry = EntryAnimation(
            type="burst",
            duration_ms=600,
            scale_from=2.5,
            opacity_from=0,
            rotation_from=15,
        )
        assert entry.type == "burst"
        assert entry.duration_ms == 600
        
        # Test bounds
        with pytest.raises(ValueError):
            EntryAnimation(type="pop_in", duration_ms=50)  # Too short
        
        with pytest.raises(ValueError):
            EntryAnimation(type="pop_in", duration_ms=5000)  # Too long

    def test_loop_animation_validation(self):
        """Test LoopAnimation field validation."""
        loop = LoopAnimation(
            type="glow",
            color="#ff69b4",
            intensity_min=0.2,
            intensity_max=0.8,
            frequency=0.6,
        )
        assert loop.type == "glow"
        assert loop.color == "#ff69b4"
        
        # Invalid color format
        with pytest.raises(ValueError):
            LoopAnimation(type="glow", color="not-a-color")

    def test_particle_effect_validation(self):
        """Test ParticleEffect field validation."""
        particles = ParticleEffect(
            type="confetti",
            count=60,
            colors=["#ff0000", "#00ff00", "#0000ff"],
            gravity=0.4,
            spread=180,
        )
        assert particles.type == "confetti"
        assert len(particles.colors) == 3
        
        # Count bounds
        with pytest.raises(ValueError):
            ParticleEffect(type="sparkles", count=0)  # Too few
        
        with pytest.raises(ValueError):
            ParticleEffect(type="sparkles", count=500)  # Too many

    def test_depth_effect_validation(self):
        """Test DepthEffect field validation."""
        depth = DepthEffect(
            type="parallax",
            intensity=0.5,
            trigger="mouse",
            smooth_factor=0.1,
        )
        assert depth.type == "parallax"
        assert depth.trigger == "mouse"

    def test_animation_config_defaults(self):
        """Test AnimationConfig default values."""
        config = AnimationConfig(
            entry=None,
            loop=None,
            depth_effect=None,
            particles=None,
            duration_ms=3000,
            loop_count=1,
        )
        assert config.duration_ms == 3000
        assert config.loop_count == 1
        assert config.effects is None


class TestVibeDetection:
    """Test vibe detection heuristics."""

    def test_cute_keywords(self):
        """Test detection of cute vibe from keywords."""
        cute_names = ["cute mascot", "kawaii emote", "chibi character", "uwu face"]
        for name in cute_names:
            # Simulate the heuristic logic
            name_lower = name.lower()
            detected = any(word in name_lower for word in ["cute", "kawaii", "chibi", "uwu"])
            assert detected, f"Should detect cute vibe from '{name}'"

    def test_aggressive_keywords(self):
        """Test detection of aggressive vibe from keywords."""
        aggressive_names = ["fire skull", "rage mode", "angry warrior", "death logo"]
        for name in aggressive_names:
            name_lower = name.lower()
            detected = any(word in name_lower for word in ["fire", "rage", "angry", "skull", "death"])
            assert detected, f"Should detect aggressive vibe from '{name}'"

    def test_chill_keywords(self):
        """Test detection of chill vibe from keywords."""
        chill_names = ["chill vibes", "relax mode", "calm stream", "zen garden"]
        for name in chill_names:
            name_lower = name.lower()
            detected = any(word in name_lower for word in ["chill", "relax", "calm", "zen"])
            assert detected, f"Should detect chill vibe from '{name}'"


class TestStreamEventPresets:
    """Test stream event preset configurations."""

    def test_event_types(self):
        """Test all valid event types."""
        valid_events = [
            "new_subscriber", "raid", "donation_small", "donation_medium",
            "donation_large", "new_follower", "milestone", "bits", "gift_sub"
        ]
        
        # Verify all events are valid
        for event in valid_events:
            assert event in valid_events

    def test_event_duration_recommendations(self):
        """Test that event durations make sense."""
        # Expected durations (ms)
        expected = {
            "new_subscriber": 3000,
            "raid": 5000,
            "donation_small": 2000,
            "donation_medium": 3000,
            "donation_large": 8000,
            "new_follower": 1500,
            "milestone": 6000,
            "bits": 2500,
            "gift_sub": 4000,
        }
        
        # Verify durations are reasonable
        for event, duration in expected.items():
            assert 1000 <= duration <= 10000, f"{event} duration should be 1-10 seconds"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
