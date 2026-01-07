"""
Unit tests for Depth Map Service and Animation Engine.

Tests the enterprise-grade depth processing and animation systems.
"""

import pytest
import math

# Import directly to avoid environment variable requirements
import importlib.util

# Load animation engine module
spec = importlib.util.spec_from_file_location(
    'animation_engine',
    'backend/services/alert_animation/animation_engine.py'
)
animation_engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(animation_engine)

# Extract classes
EasingType = animation_engine.EasingType
EasingFunctions = animation_engine.EasingFunctions
SpringConfig = animation_engine.SpringConfig
BezierCurve = animation_engine.BezierCurve
AnimationKeyframe = animation_engine.AnimationKeyframe
AnimationTrack = animation_engine.AnimationTrack
AnimationTimeline = animation_engine.AnimationTimeline
DepthParallaxEngine = animation_engine.DepthParallaxEngine
create_designer_animation = animation_engine.create_designer_animation


class TestEasingFunctions:
    """Test professional easing functions."""

    def test_linear(self):
        """Linear easing should return input unchanged."""
        assert EasingFunctions.linear(0) == 0
        assert EasingFunctions.linear(0.5) == 0.5
        assert EasingFunctions.linear(1) == 1

    def test_ease_in_quad(self):
        """Quadratic ease-in should start slow."""
        assert EasingFunctions.ease_in_quad(0) == 0
        assert EasingFunctions.ease_in_quad(0.5) == 0.25
        assert EasingFunctions.ease_in_quad(1) == 1

    def test_ease_out_quad(self):
        """Quadratic ease-out should end slow."""
        assert EasingFunctions.ease_out_quad(0) == 0
        assert EasingFunctions.ease_out_quad(0.5) == 0.75
        assert EasingFunctions.ease_out_quad(1) == 1

    def test_ease_out_elastic(self):
        """Elastic ease-out should overshoot."""
        result = EasingFunctions.ease_out_elastic(0.5)
        # Elastic can overshoot past 1.0
        assert 0.9 < result < 1.1

    def test_ease_out_bounce(self):
        """Bounce ease-out should stay in bounds."""
        for t in [0, 0.25, 0.5, 0.75, 1.0]:
            result = EasingFunctions.ease_out_bounce(t)
            assert 0 <= result <= 1

    def test_smooth_step(self):
        """Smooth step should have zero derivative at endpoints."""
        assert EasingFunctions.smooth_step(0) == 0
        assert EasingFunctions.smooth_step(0.5) == 0.5
        assert EasingFunctions.smooth_step(1) == 1

    def test_smoother_step(self):
        """Smoother step (Perlin) should be even smoother."""
        assert EasingFunctions.smoother_step(0) == 0
        assert EasingFunctions.smoother_step(0.5) == 0.5
        assert EasingFunctions.smoother_step(1) == 1


class TestSpringPhysics:
    """Test spring physics simulation."""

    def test_spring_config_defaults(self):
        """Default spring config should be valid."""
        spring = SpringConfig()
        assert spring.stiffness == 100.0
        assert spring.damping == 10.0
        assert spring.mass == 1.0

    def test_damping_ratio_calculation(self):
        """Damping ratio should be calculated correctly."""
        # Critically damped: zeta = 1
        spring = SpringConfig(stiffness=100, damping=20, mass=1)
        assert abs(spring.damping_ratio - 1.0) < 0.01

    def test_natural_frequency_calculation(self):
        """Natural frequency should be sqrt(k/m)."""
        spring = SpringConfig(stiffness=100, damping=10, mass=1)
        expected = math.sqrt(100 / 1)
        assert abs(spring.natural_frequency - expected) < 0.01

    def test_underdamped_spring(self):
        """Underdamped spring should have zeta < 1."""
        spring = SpringConfig(stiffness=180, damping=12, mass=1)
        assert spring.damping_ratio < 1

    def test_spring_easing_function(self):
        """Spring easing should converge to 1."""
        result = EasingFunctions.spring(1.0)
        assert abs(result - 1.0) < 0.1


class TestBezierCurve:
    """Test bezier curve interpolation."""

    def test_bezier_endpoints(self):
        """Bezier curve should pass through endpoints."""
        bezier = BezierCurve()
        assert bezier.evaluate(0) == 0
        assert bezier.evaluate(1) == 1

    def test_ease_out_cubic_preset(self):
        """Ease-out cubic preset should work."""
        bezier = BezierCurve.ease_out_cubic()
        # Should be faster at start, slower at end
        mid = bezier.evaluate(0.5)
        assert mid > 0.5  # Already past halfway

    def test_designer_bounce_preset(self):
        """Designer bounce preset should overshoot."""
        bezier = BezierCurve.designer_bounce()
        # Control point p1 has y > 1, causing overshoot
        assert bezier.p1[1] > 1

    def test_bezier_clamping(self):
        """Bezier should clamp input to [0, 1]."""
        bezier = BezierCurve()
        assert bezier.evaluate(-0.5) == bezier.evaluate(0)
        assert bezier.evaluate(1.5) == bezier.evaluate(1)


class TestAnimationTrack:
    """Test animation track keyframe interpolation."""

    def test_single_keyframe(self):
        """Single keyframe should return constant value."""
        track = AnimationTrack(property_name="scale")
        track.add_keyframe(0, 1.0, EasingType.LINEAR)
        
        assert track.evaluate(0) == 1.0
        assert track.evaluate(500) == 1.0
        assert track.evaluate(1000) == 1.0

    def test_two_keyframes_linear(self):
        """Two keyframes with linear easing."""
        track = AnimationTrack(property_name="opacity")
        track.add_keyframe(0, 0, EasingType.LINEAR)
        track.add_keyframe(1000, 1, EasingType.LINEAR)
        
        assert track.evaluate(0) == 0
        assert track.evaluate(500) == 0.5
        assert track.evaluate(1000) == 1

    def test_keyframe_sorting(self):
        """Keyframes should be sorted by time."""
        track = AnimationTrack(property_name="x")
        track.add_keyframe(1000, 100, EasingType.LINEAR)
        track.add_keyframe(0, 0, EasingType.LINEAR)
        track.add_keyframe(500, 50, EasingType.LINEAR)
        
        # Should interpolate correctly despite insertion order
        assert track.evaluate(250) == 25

    def test_before_first_keyframe(self):
        """Time before first keyframe should return first value."""
        track = AnimationTrack(property_name="y")
        track.add_keyframe(100, 10, EasingType.LINEAR)
        track.add_keyframe(200, 20, EasingType.LINEAR)
        
        assert track.evaluate(0) == 10
        assert track.evaluate(50) == 10

    def test_after_last_keyframe(self):
        """Time after last keyframe should return last value."""
        track = AnimationTrack(property_name="z")
        track.add_keyframe(0, 0, EasingType.LINEAR)
        track.add_keyframe(100, 10, EasingType.LINEAR)
        
        assert track.evaluate(200) == 10
        assert track.evaluate(1000) == 10


class TestAnimationTimeline:
    """Test animation timeline coordination."""

    def test_timeline_creation(self):
        """Timeline should be created with correct duration."""
        timeline = AnimationTimeline(duration_ms=3000, loop_count=1)
        assert timeline.duration_ms == 3000
        assert timeline.loop_count == 1

    def test_add_track(self):
        """Should be able to add tracks."""
        timeline = AnimationTimeline(duration_ms=1000, loop_count=1)
        track = timeline.add_track("scale")
        
        assert "scale" in timeline.tracks
        assert track.property_name == "scale"

    def test_evaluate_multiple_tracks(self):
        """Should evaluate all tracks at once."""
        timeline = AnimationTimeline(duration_ms=1000, loop_count=1)
        
        scale = timeline.add_track("scale")
        scale.add_keyframe(0, 0, EasingType.LINEAR)
        scale.add_keyframe(1000, 1, EasingType.LINEAR)
        
        opacity = timeline.add_track("opacity")
        opacity.add_keyframe(0, 1, EasingType.LINEAR)
        opacity.add_keyframe(1000, 0, EasingType.LINEAR)
        
        state = timeline.evaluate(500)
        
        assert "scale" in state
        assert "opacity" in state
        assert state["scale"] == 0.5
        assert state["opacity"] == 0.5

    def test_timeline_looping(self):
        """Timeline should loop correctly."""
        timeline = AnimationTimeline(duration_ms=1000, loop_count=0)  # Infinite
        
        track = timeline.add_track("x")
        track.add_keyframe(0, 0, EasingType.LINEAR)
        track.add_keyframe(1000, 100, EasingType.LINEAR)
        
        # At 1500ms with 1000ms duration, should be at 500ms in loop
        state = timeline.evaluate(1500)
        assert state["x"] == 50

    def test_timeline_markers(self):
        """Should be able to add named markers."""
        timeline = AnimationTimeline(duration_ms=3000, loop_count=1)
        timeline.add_marker("entry_end", 500)
        timeline.add_marker("loop_start", 600)
        
        assert timeline.markers["entry_end"] == 500
        assert timeline.markers["loop_start"] == 600


class TestDepthParallaxEngine:
    """Test depth-aware parallax calculations."""

    def test_engine_creation(self):
        """Engine should be created with defaults."""
        engine = DepthParallaxEngine()
        assert engine.layer_count == 5
        assert engine.max_offset == 50.0

    def test_layer_offset_calculation(self):
        """Should calculate layer offsets based on parallax factor."""
        engine = DepthParallaxEngine(layer_count=3, max_offset=100)
        
        layers = [
            {"parallax_factor": 0.2},  # Background
            {"parallax_factor": 0.5},  # Midground
            {"parallax_factor": 1.0},  # Foreground
        ]
        
        offsets = engine.calculate_layer_offsets(1.0, 0, layers)
        
        # Foreground should move more than background
        assert abs(offsets[2][0]) > abs(offsets[0][0])

    def test_3d_tilt_transform(self):
        """Should calculate 3D tilt transform."""
        engine = DepthParallaxEngine()
        
        transform = engine.calculate_3d_transform(
            input_x=0.5,
            input_y=0.5,
            depth_value=0.8,
            config={
                "type": "tilt",
                "max_angle_x": 15,
                "max_angle_y": 15,
                "perspective": 1000,
                "scale_on_hover": 1.05,
                "intensity": 0.5,
            }
        )
        
        assert "rotateX" in transform
        assert "rotateY" in transform
        assert "scale" in transform

    def test_pop_out_transform(self):
        """Should calculate pop-out z-offset."""
        engine = DepthParallaxEngine()
        
        transform = engine.calculate_3d_transform(
            input_x=0,
            input_y=0,
            depth_value=1.0,  # Foreground
            config={
                "type": "pop_out",
                "depth_scale": 40,
                "intensity": 0.5,
            }
        )
        
        assert transform["translateZ"] > 0


class TestDesignerAnimations:
    """Test pre-built designer animation presets."""

    def test_elegant_entrance(self):
        """Elegant entrance should have scale and opacity tracks."""
        timeline = create_designer_animation("elegant_entrance", duration_ms=3000)
        
        assert timeline.duration_ms == 3000
        assert "scale" in timeline.tracks
        assert "opacity" in timeline.tracks

    def test_playful_bounce(self):
        """Playful bounce should have spring-based scale."""
        timeline = create_designer_animation("playful_bounce", duration_ms=2000)
        
        assert timeline.duration_ms == 2000
        assert "scale" in timeline.tracks

    def test_dramatic_reveal(self):
        """Dramatic reveal should have scale, opacity, and rotation."""
        timeline = create_designer_animation("dramatic_reveal", duration_ms=4000)
        
        assert timeline.duration_ms == 4000
        assert "scale" in timeline.tracks
        assert "opacity" in timeline.tracks
        assert "rotation" in timeline.tracks


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
