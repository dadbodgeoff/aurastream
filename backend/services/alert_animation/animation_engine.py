"""
Enterprise Animation Engine

Professional-grade animation system with:
- Spring physics for natural motion
- Bezier curve interpolation
- Depth-aware parallax calculations
- Smooth easing functions
- Frame-perfect timing

This module provides the mathematical foundation for designer-quality animations.
"""

import math
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Tuple
from enum import Enum


class EasingType(str, Enum):
    """Professional easing function types."""
    LINEAR = "linear"
    EASE_IN = "ease_in"
    EASE_OUT = "ease_out"
    EASE_IN_OUT = "ease_in_out"
    ELASTIC_OUT = "elastic_out"
    ELASTIC_IN_OUT = "elastic_in_out"
    BOUNCE_OUT = "bounce_out"
    BACK_OUT = "back_out"
    BACK_IN_OUT = "back_in_out"
    SPRING = "spring"
    SMOOTH_STEP = "smooth_step"
    SMOOTHER_STEP = "smoother_step"


@dataclass
class SpringConfig:
    """Spring physics configuration for natural motion."""
    stiffness: float = 100.0  # Spring stiffness (higher = snappier)
    damping: float = 10.0     # Damping ratio (higher = less bounce)
    mass: float = 1.0         # Mass of the object
    velocity: float = 0.0     # Initial velocity
    
    @property
    def damping_ratio(self) -> float:
        """Calculate damping ratio (zeta)."""
        return self.damping / (2 * math.sqrt(self.stiffness * self.mass))
    
    @property
    def natural_frequency(self) -> float:
        """Calculate natural frequency (omega_n)."""
        return math.sqrt(self.stiffness / self.mass)


@dataclass
class BezierCurve:
    """Cubic bezier curve for smooth interpolation."""
    p0: Tuple[float, float] = (0.0, 0.0)
    p1: Tuple[float, float] = (0.25, 0.1)
    p2: Tuple[float, float] = (0.25, 1.0)
    p3: Tuple[float, float] = (1.0, 1.0)
    
    def evaluate(self, t: float) -> float:
        """Evaluate bezier curve at parameter t."""
        t = max(0.0, min(1.0, t))
        
        # Cubic bezier formula
        mt = 1 - t
        mt2 = mt * mt
        mt3 = mt2 * mt
        t2 = t * t
        t3 = t2 * t
        
        # Y coordinate (the eased value)
        y = (mt3 * self.p0[1] + 
             3 * mt2 * t * self.p1[1] + 
             3 * mt * t2 * self.p2[1] + 
             t3 * self.p3[1])
        
        return y
    
    @classmethod
    def ease_out_cubic(cls) -> "BezierCurve":
        """Standard ease-out cubic curve."""
        return cls(p1=(0.215, 0.61), p2=(0.355, 1.0))
    
    @classmethod
    def ease_in_out_cubic(cls) -> "BezierCurve":
        """Standard ease-in-out cubic curve."""
        return cls(p1=(0.645, 0.045), p2=(0.355, 1.0))
    
    @classmethod
    def designer_bounce(cls) -> "BezierCurve":
        """Designer-quality bounce curve."""
        return cls(p1=(0.34, 1.56), p2=(0.64, 1.0))
    
    @classmethod
    def smooth_overshoot(cls) -> "BezierCurve":
        """Smooth overshoot for playful animations."""
        return cls(p1=(0.175, 0.885), p2=(0.32, 1.275))


class EasingFunctions:
    """
    Professional easing function library.
    
    All functions take t in [0, 1] and return eased value in [0, 1].
    """
    
    @staticmethod
    def linear(t: float) -> float:
        """Linear interpolation (no easing)."""
        return t
    
    @staticmethod
    def ease_in_quad(t: float) -> float:
        """Quadratic ease-in."""
        return t * t
    
    @staticmethod
    def ease_out_quad(t: float) -> float:
        """Quadratic ease-out."""
        return 1 - (1 - t) * (1 - t)
    
    @staticmethod
    def ease_in_out_quad(t: float) -> float:
        """Quadratic ease-in-out."""
        if t < 0.5:
            return 2 * t * t
        return 1 - pow(-2 * t + 2, 2) / 2
    
    @staticmethod
    def ease_in_cubic(t: float) -> float:
        """Cubic ease-in."""
        return t * t * t
    
    @staticmethod
    def ease_out_cubic(t: float) -> float:
        """Cubic ease-out."""
        return 1 - pow(1 - t, 3)
    
    @staticmethod
    def ease_in_out_cubic(t: float) -> float:
        """Cubic ease-in-out."""
        if t < 0.5:
            return 4 * t * t * t
        return 1 - pow(-2 * t + 2, 3) / 2

    @staticmethod
    def ease_out_elastic(t: float, amplitude: float = 1.0, period: float = 0.3) -> float:
        """
        Elastic ease-out - bouncy overshoot effect.
        
        Args:
            t: Progress (0-1)
            amplitude: Overshoot amplitude (1.0 = 100%)
            period: Oscillation period (lower = more bounces)
        """
        if t == 0 or t == 1:
            return t
        
        s = period / (2 * math.pi) * math.asin(1 / amplitude) if amplitude >= 1 else period / 4
        return amplitude * pow(2, -10 * t) * math.sin((t - s) * (2 * math.pi) / period) + 1
    
    @staticmethod
    def ease_in_elastic(t: float, amplitude: float = 1.0, period: float = 0.3) -> float:
        """Elastic ease-in."""
        if t == 0 or t == 1:
            return t
        
        s = period / (2 * math.pi) * math.asin(1 / amplitude) if amplitude >= 1 else period / 4
        t -= 1
        return -(amplitude * pow(2, 10 * t) * math.sin((t - s) * (2 * math.pi) / period))
    
    @staticmethod
    def ease_out_bounce(t: float) -> float:
        """Bounce ease-out - ball bouncing effect."""
        n1 = 7.5625
        d1 = 2.75
        
        if t < 1 / d1:
            return n1 * t * t
        elif t < 2 / d1:
            t -= 1.5 / d1
            return n1 * t * t + 0.75
        elif t < 2.5 / d1:
            t -= 2.25 / d1
            return n1 * t * t + 0.9375
        else:
            t -= 2.625 / d1
            return n1 * t * t + 0.984375
    
    @staticmethod
    def ease_in_bounce(t: float) -> float:
        """Bounce ease-in."""
        return 1 - EasingFunctions.ease_out_bounce(1 - t)
    
    @staticmethod
    def ease_out_back(t: float, overshoot: float = 1.70158) -> float:
        """
        Back ease-out - slight overshoot then settle.
        
        Args:
            t: Progress (0-1)
            overshoot: Overshoot amount (1.70158 is standard)
        """
        c1 = overshoot
        c3 = c1 + 1
        return 1 + c3 * pow(t - 1, 3) + c1 * pow(t - 1, 2)
    
    @staticmethod
    def ease_in_back(t: float, overshoot: float = 1.70158) -> float:
        """Back ease-in - anticipation before motion."""
        c1 = overshoot
        c3 = c1 + 1
        return c3 * t * t * t - c1 * t * t
    
    @staticmethod
    def ease_in_out_back(t: float, overshoot: float = 1.70158) -> float:
        """Back ease-in-out."""
        c1 = overshoot
        c2 = c1 * 1.525
        
        if t < 0.5:
            return (pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
        return (pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2
    
    @staticmethod
    def smooth_step(t: float) -> float:
        """Hermite smooth step - smooth start and end."""
        return t * t * (3 - 2 * t)
    
    @staticmethod
    def smoother_step(t: float) -> float:
        """Ken Perlin's smoother step - even smoother."""
        return t * t * t * (t * (t * 6 - 15) + 10)
    
    @staticmethod
    def spring(t: float, config: Optional[SpringConfig] = None) -> float:
        """
        Spring physics simulation.
        
        Simulates a critically damped or underdamped spring.
        """
        if config is None:
            config = SpringConfig()
        
        zeta = config.damping_ratio
        omega_n = config.natural_frequency
        
        if zeta < 1:
            # Underdamped (bouncy)
            omega_d = omega_n * math.sqrt(1 - zeta * zeta)
            return 1 - math.exp(-zeta * omega_n * t) * (
                math.cos(omega_d * t) + 
                (zeta * omega_n / omega_d) * math.sin(omega_d * t)
            )
        elif zeta == 1:
            # Critically damped (smooth, no bounce)
            return 1 - (1 + omega_n * t) * math.exp(-omega_n * t)
        else:
            # Overdamped (slow)
            s1 = -omega_n * (zeta + math.sqrt(zeta * zeta - 1))
            s2 = -omega_n * (zeta - math.sqrt(zeta * zeta - 1))
            return 1 - (s2 * math.exp(s1 * t) - s1 * math.exp(s2 * t)) / (s2 - s1)


@dataclass
class AnimationKeyframe:
    """Single keyframe in an animation timeline."""
    time_ms: float
    value: float
    easing: EasingType = EasingType.EASE_OUT
    
    # Optional bezier control points for custom curves
    bezier: Optional[BezierCurve] = None


@dataclass
class AnimationTrack:
    """
    Animation track for a single property.
    
    Supports multiple keyframes with different easings.
    """
    property_name: str
    keyframes: List[AnimationKeyframe] = field(default_factory=list)
    
    def add_keyframe(
        self,
        time_ms: float,
        value: float,
        easing: EasingType = EasingType.EASE_OUT,
    ) -> None:
        """Add a keyframe to the track."""
        keyframe = AnimationKeyframe(time_ms=time_ms, value=value, easing=easing)
        self.keyframes.append(keyframe)
        self.keyframes.sort(key=lambda k: k.time_ms)
    
    def evaluate(self, time_ms: float) -> float:
        """Evaluate the track at a given time."""
        if not self.keyframes:
            return 0.0
        
        # Before first keyframe
        if time_ms <= self.keyframes[0].time_ms:
            return self.keyframes[0].value
        
        # After last keyframe
        if time_ms >= self.keyframes[-1].time_ms:
            return self.keyframes[-1].value
        
        # Find surrounding keyframes
        for i in range(len(self.keyframes) - 1):
            k1 = self.keyframes[i]
            k2 = self.keyframes[i + 1]
            
            if k1.time_ms <= time_ms < k2.time_ms:
                # Calculate local progress
                duration = k2.time_ms - k1.time_ms
                local_t = (time_ms - k1.time_ms) / duration
                
                # Apply easing
                eased_t = self._apply_easing(local_t, k2.easing, k2.bezier)
                
                # Interpolate value
                return k1.value + (k2.value - k1.value) * eased_t
        
        return self.keyframes[-1].value
    
    def _apply_easing(
        self,
        t: float,
        easing: EasingType,
        bezier: Optional[BezierCurve],
    ) -> float:
        """Apply easing function to progress value."""
        if bezier:
            return bezier.evaluate(t)
        
        easing_map = {
            EasingType.LINEAR: EasingFunctions.linear,
            EasingType.EASE_IN: EasingFunctions.ease_in_cubic,
            EasingType.EASE_OUT: EasingFunctions.ease_out_cubic,
            EasingType.EASE_IN_OUT: EasingFunctions.ease_in_out_cubic,
            EasingType.ELASTIC_OUT: EasingFunctions.ease_out_elastic,
            EasingType.ELASTIC_IN_OUT: lambda x: (
                EasingFunctions.ease_in_elastic(x * 2) / 2 if x < 0.5
                else (EasingFunctions.ease_out_elastic(x * 2 - 1) + 1) / 2
            ),
            EasingType.BOUNCE_OUT: EasingFunctions.ease_out_bounce,
            EasingType.BACK_OUT: EasingFunctions.ease_out_back,
            EasingType.BACK_IN_OUT: EasingFunctions.ease_in_out_back,
            EasingType.SPRING: EasingFunctions.spring,
            EasingType.SMOOTH_STEP: EasingFunctions.smooth_step,
            EasingType.SMOOTHER_STEP: EasingFunctions.smoother_step,
        }
        
        func = easing_map.get(easing, EasingFunctions.ease_out_cubic)
        return func(t)


class DepthParallaxEngine:
    """
    Depth-aware parallax calculation engine.
    
    Calculates layer offsets based on:
    - Depth map values
    - Mouse/gyroscope input
    - Animation timeline
    """
    
    def __init__(
        self,
        layer_count: int = 5,
        max_offset: float = 50.0,
        smooth_factor: float = 0.1,
    ):
        self.layer_count = layer_count
        self.max_offset = max_offset
        self.smooth_factor = smooth_factor
        
        # Current state
        self._current_offset_x = 0.0
        self._current_offset_y = 0.0
        self._target_offset_x = 0.0
        self._target_offset_y = 0.0
    
    def calculate_layer_offsets(
        self,
        input_x: float,  # -1 to 1 (mouse X or gyro)
        input_y: float,  # -1 to 1 (mouse Y or gyro)
        depth_layers: List[Dict[str, Any]],
    ) -> List[Tuple[float, float]]:
        """
        Calculate parallax offsets for each depth layer.
        
        Args:
            input_x: Horizontal input (-1 to 1)
            input_y: Vertical input (-1 to 1)
            depth_layers: Layer data from depth service
        
        Returns:
            List of (offset_x, offset_y) tuples for each layer
        """
        # Update target
        self._target_offset_x = input_x * self.max_offset
        self._target_offset_y = input_y * self.max_offset
        
        # Smooth interpolation (lerp)
        self._current_offset_x += (self._target_offset_x - self._current_offset_x) * self.smooth_factor
        self._current_offset_y += (self._target_offset_y - self._current_offset_y) * self.smooth_factor
        
        # Calculate per-layer offsets
        offsets = []
        for layer in depth_layers:
            parallax_factor = layer.get("parallax_factor", 0.5)
            
            offset_x = self._current_offset_x * parallax_factor
            offset_y = self._current_offset_y * parallax_factor
            
            offsets.append((offset_x, offset_y))
        
        return offsets
    
    def calculate_3d_transform(
        self,
        input_x: float,
        input_y: float,
        depth_value: float,
        config: Dict[str, Any],
    ) -> Dict[str, float]:
        """
        Calculate 3D transform for tilt/pop-out effects.
        
        Args:
            input_x: Horizontal input (-1 to 1)
            input_y: Vertical input (-1 to 1)
            depth_value: Depth at this point (0-1, 0=far, 1=near)
            config: Depth effect configuration
        
        Returns:
            Dict with rotateX, rotateY, translateZ, scale
        """
        effect_type = config.get("type", "parallax")
        intensity = config.get("intensity", 0.5)
        
        if effect_type == "tilt":
            max_angle_x = config.get("max_angle_x", 15)
            max_angle_y = config.get("max_angle_y", 15)
            perspective = config.get("perspective", 1000)
            scale_on_hover = config.get("scale_on_hover", 1.05)
            
            # Calculate rotation based on input
            rotate_x = -input_y * max_angle_x * intensity
            rotate_y = input_x * max_angle_y * intensity
            
            # Scale based on hover intensity
            hover_intensity = math.sqrt(input_x**2 + input_y**2)
            scale = 1 + (scale_on_hover - 1) * hover_intensity * intensity
            
            return {
                "rotateX": rotate_x,
                "rotateY": rotate_y,
                "translateZ": 0,
                "scale": scale,
                "perspective": perspective,
            }
        
        elif effect_type == "pop_out":
            depth_scale = config.get("depth_scale", 40)
            
            # Foreground pops out more
            translate_z = depth_value * depth_scale * intensity
            
            return {
                "rotateX": 0,
                "rotateY": 0,
                "translateZ": translate_z,
                "scale": 1 + depth_value * 0.1 * intensity,
                "perspective": 1000,
            }
        
        else:  # parallax
            invert = config.get("invert", False)
            direction = -1 if invert else 1
            
            offset_x = input_x * self.max_offset * depth_value * intensity * direction
            offset_y = input_y * self.max_offset * depth_value * intensity * direction
            
            return {
                "translateX": offset_x,
                "translateY": offset_y,
                "translateZ": 0,
                "scale": 1,
            }


class AnimationTimeline:
    """
    Master animation timeline.
    
    Coordinates multiple animation tracks with:
    - Entry animations
    - Loop animations
    - Particle triggers
    - Depth effects
    """
    
    def __init__(self, duration_ms: float, loop_count: int = 1):
        self.duration_ms = duration_ms
        self.loop_count = loop_count  # 0 = infinite
        
        self.tracks: Dict[str, AnimationTrack] = {}
        self.markers: Dict[str, float] = {}  # Named time markers
        
        self._current_time_ms = 0.0
        self._is_playing = False
        self._loop_iteration = 0
    
    def add_track(self, name: str) -> AnimationTrack:
        """Add a new animation track."""
        track = AnimationTrack(property_name=name)
        self.tracks[name] = track
        return track
    
    def add_marker(self, name: str, time_ms: float) -> None:
        """Add a named time marker."""
        self.markers[name] = time_ms
    
    def evaluate(self, time_ms: float) -> Dict[str, float]:
        """
        Evaluate all tracks at a given time.
        
        Returns dict of property_name -> value
        """
        # Handle looping
        if self.loop_count == 0:  # Infinite loop
            time_ms = time_ms % self.duration_ms
        elif self.loop_count > 1:
            total_duration = self.duration_ms * self.loop_count
            if time_ms >= total_duration:
                time_ms = total_duration - 0.001
            else:
                time_ms = time_ms % self.duration_ms
        else:
            time_ms = min(time_ms, self.duration_ms)
        
        return {
            name: track.evaluate(time_ms)
            for name, track in self.tracks.items()
        }
    
    def seek(self, time_ms: float) -> None:
        """Seek to a specific time."""
        self._current_time_ms = max(0, min(time_ms, self.duration_ms))
    
    def get_progress(self) -> float:
        """Get current progress (0-1)."""
        return self._current_time_ms / self.duration_ms
    
    @classmethod
    def from_config(cls, config: Dict[str, Any]) -> "AnimationTimeline":
        """
        Create timeline from animation config.
        
        Parses entry, loop, depth, and particle configurations.
        """
        duration_ms = config.get("duration_ms", 3000)
        loop_count = config.get("loop_count", 1)
        
        timeline = cls(duration_ms=duration_ms, loop_count=loop_count)
        
        # Parse entry animation
        entry = config.get("entry")
        if entry:
            timeline._add_entry_tracks(entry)
        
        # Parse loop animation
        loop = config.get("loop")
        if loop:
            entry_duration = entry.get("duration_ms", 500) if entry else 0
            timeline._add_loop_tracks(loop, entry_duration)
        
        return timeline
    
    def _add_entry_tracks(self, entry: Dict[str, Any]) -> None:
        """Add entry animation tracks."""
        entry_type = entry.get("type", "pop_in")
        duration = entry.get("duration_ms", 500)
        
        # Map entry type to easing
        easing_map = {
            "pop_in": EasingType.ELASTIC_OUT,
            "slide_in": EasingType.EASE_OUT,
            "fade_in": EasingType.EASE_IN_OUT,
            "burst": EasingType.BACK_OUT,
            "bounce": EasingType.BOUNCE_OUT,
            "glitch": EasingType.LINEAR,
        }
        easing = easing_map.get(entry_type, EasingType.EASE_OUT)
        
        if entry_type == "pop_in":
            scale_from = entry.get("scale_from", 0)
            
            scale_track = self.add_track("scale")
            scale_track.add_keyframe(0, scale_from, EasingType.LINEAR)
            scale_track.add_keyframe(duration, 1.0, easing)
        
        elif entry_type == "slide_in":
            direction = entry.get("direction", "left")
            distance = entry.get("distance_percent", 120) / 100
            
            if direction in ("left", "right"):
                track = self.add_track("translateX")
                start = -distance if direction == "left" else distance
            else:
                track = self.add_track("translateY")
                start = -distance if direction == "top" else distance
            
            track.add_keyframe(0, start, EasingType.LINEAR)
            track.add_keyframe(duration, 0, easing)
        
        elif entry_type == "fade_in":
            opacity_track = self.add_track("opacity")
            opacity_track.add_keyframe(0, entry.get("opacity_from", 0), EasingType.LINEAR)
            opacity_track.add_keyframe(duration, 1.0, easing)
            
            if entry.get("scale_from"):
                scale_track = self.add_track("scale")
                scale_track.add_keyframe(0, entry["scale_from"], EasingType.LINEAR)
                scale_track.add_keyframe(duration, 1.0, easing)
        
        elif entry_type == "burst":
            scale_from = entry.get("scale_from", 2.5)
            rotation_from = entry.get("rotation_from", 15)
            
            scale_track = self.add_track("scale")
            scale_track.add_keyframe(0, scale_from, EasingType.LINEAR)
            scale_track.add_keyframe(duration, 1.0, easing)
            
            opacity_track = self.add_track("opacity")
            opacity_track.add_keyframe(0, 0, EasingType.LINEAR)
            opacity_track.add_keyframe(duration * 0.3, 1.0, EasingType.EASE_IN)
            
            rotation_track = self.add_track("rotation")
            rotation_track.add_keyframe(0, rotation_from, EasingType.LINEAR)
            rotation_track.add_keyframe(duration, 0, easing)
        
        # Add entry marker
        self.add_marker("entry_end", duration)
    
    def _add_loop_tracks(self, loop: Dict[str, Any], start_time: float) -> None:
        """Add loop animation tracks."""
        loop_type = loop.get("type", "float")
        frequency = loop.get("frequency", 1.0)
        
        # Calculate loop duration based on frequency
        loop_duration = 1000 / frequency  # One cycle in ms
        
        # Number of cycles that fit in remaining time
        remaining_time = self.duration_ms - start_time
        num_cycles = max(1, int(remaining_time / loop_duration))
        
        if loop_type == "float":
            amp_y = loop.get("amplitude_y", 8) / 100  # Normalize
            amp_x = loop.get("amplitude_x", 2) / 100
            
            y_track = self.add_track("floatY")
            x_track = self.add_track("floatX")
            
            for i in range(num_cycles + 1):
                t = start_time + i * loop_duration
                phase = (i % 2) * 2 - 1  # Alternates between -1 and 1
                
                y_track.add_keyframe(t, amp_y * phase, EasingType.SMOOTH_STEP)
                x_track.add_keyframe(t, amp_x * phase * 0.5, EasingType.SMOOTH_STEP)
        
        elif loop_type == "pulse":
            scale_min = loop.get("scale_min", 0.97)
            scale_max = loop.get("scale_max", 1.03)
            
            pulse_track = self.add_track("pulseScale")
            
            for i in range(num_cycles + 1):
                t = start_time + i * loop_duration
                value = scale_max if i % 2 == 0 else scale_min
                pulse_track.add_keyframe(t, value, EasingType.SMOOTH_STEP)
        
        elif loop_type == "wiggle":
            angle_max = loop.get("angle_max", 3)
            
            wiggle_track = self.add_track("wiggleRotation")
            
            for i in range(num_cycles * 2 + 1):
                t = start_time + i * (loop_duration / 2)
                phase = (i % 2) * 2 - 1
                wiggle_track.add_keyframe(t, angle_max * phase, EasingType.SMOOTH_STEP)
        
        elif loop_type == "glow":
            intensity_min = loop.get("intensity_min", 0.2)
            intensity_max = loop.get("intensity_max", 0.8)
            
            glow_track = self.add_track("glowIntensity")
            
            for i in range(num_cycles + 1):
                t = start_time + i * loop_duration
                value = intensity_max if i % 2 == 0 else intensity_min
                glow_track.add_keyframe(t, value, EasingType.SMOOTH_STEP)


def create_designer_animation(
    animation_type: str,
    duration_ms: float = 3000,
    **kwargs,
) -> AnimationTimeline:
    """
    Factory function for creating designer-quality animations.
    
    Provides pre-configured professional animation presets.
    """
    timeline = AnimationTimeline(duration_ms=duration_ms)
    
    if animation_type == "elegant_entrance":
        # Smooth scale + fade with slight overshoot
        scale = timeline.add_track("scale")
        scale.add_keyframe(0, 0.8, EasingType.LINEAR)
        scale.add_keyframe(400, 1.02, EasingType.EASE_OUT)
        scale.add_keyframe(600, 1.0, EasingType.EASE_IN_OUT)
        
        opacity = timeline.add_track("opacity")
        opacity.add_keyframe(0, 0, EasingType.LINEAR)
        opacity.add_keyframe(300, 1.0, EasingType.EASE_OUT)
    
    elif animation_type == "playful_bounce":
        # Bouncy entrance with spring physics
        scale = timeline.add_track("scale")
        scale.add_keyframe(0, 0, EasingType.LINEAR)
        scale.add_keyframe(500, 1.0, EasingType.SPRING)
        
        rotation = timeline.add_track("rotation")
        rotation.add_keyframe(0, -10, EasingType.LINEAR)
        rotation.add_keyframe(500, 0, EasingType.ELASTIC_OUT)
    
    elif animation_type == "dramatic_reveal":
        # Burst from large with rotation
        scale = timeline.add_track("scale")
        scale.add_keyframe(0, 2.5, EasingType.LINEAR)
        scale.add_keyframe(600, 1.0, EasingType.BACK_OUT)
        
        opacity = timeline.add_track("opacity")
        opacity.add_keyframe(0, 0, EasingType.LINEAR)
        opacity.add_keyframe(200, 1.0, EasingType.EASE_IN)
        
        rotation = timeline.add_track("rotation")
        rotation.add_keyframe(0, 15, EasingType.LINEAR)
        rotation.add_keyframe(600, 0, EasingType.BACK_OUT)
    
    return timeline
