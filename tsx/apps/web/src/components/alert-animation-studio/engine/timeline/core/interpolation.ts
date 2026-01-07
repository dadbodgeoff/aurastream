/**
 * Keyframe Interpolation Engine
 *
 * Provides bezier curve interpolation matching After Effects behavior.
 * Supports both standard easing functions and custom bezier handles.
 */

import type { AnimationTransform } from '../../animations/core/types';
import { getEasing } from '../../animations/core/easing';
import type { Keyframe, Track, BezierHandle, AnimatableProperty } from '../types';
import { PROPERTY_METADATA } from '../types';

// ============================================================================
// Bezier Curve Math
// ============================================================================

/**
 * Evaluate a cubic bezier curve at parameter t.
 * Used for custom easing curves between keyframes.
 *
 * @param p0 - Start point
 * @param p1 - First control point
 * @param p2 - Second control point
 * @param p3 - End point
 * @param t - Parameter (0-1)
 * @returns Value at t
 */
export function cubicBezier(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;

  return mt3 * p0 + 3 * mt2 * t * p1 + 3 * mt * t2 * p2 + t3 * p3;
}

/**
 * Solve cubic bezier for x to find t, then evaluate y.
 * This is how CSS cubic-bezier() works.
 * Uses Newton-Raphson iteration for fast convergence.
 *
 * @param x1 - First control point x
 * @param y1 - First control point y
 * @param x2 - Second control point x
 * @param y2 - Second control point y
 * @param x - Target x value (0-1)
 * @param epsilon - Convergence threshold (default: 0.0001)
 * @returns Y value at the given x
 */
export function solveCubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
  epsilon: number = 0.0001
): number {
  // Handle edge cases
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Newton-Raphson iteration to find t for given x
  let t = x; // Initial guess

  for (let i = 0; i < 8; i++) {
    // Calculate current x value at t
    const currentX = cubicBezier(0, x1, x2, 1, t);
    const error = currentX - x;

    if (Math.abs(error) < epsilon) break;

    // Derivative of bezier x component
    // d/dt [B(t)] = 3(1-t)²(P1-P0) + 6(1-t)t(P2-P1) + 3t²(P3-P2)
    const dx =
      3 * (1 - t) * (1 - t) * x1 +
      6 * (1 - t) * t * (x2 - x1) +
      3 * t * t * (1 - x2);

    if (Math.abs(dx) < epsilon) break;

    t -= error / dx;
    t = Math.max(0, Math.min(1, t));
  }

  // Evaluate y at found t
  return cubicBezier(0, y1, y2, 1, t);
}

/**
 * Linear interpolation between two values.
 *
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ============================================================================
// Keyframe Interpolation
// ============================================================================

/**
 * Interpolate between two keyframes.
 * Supports both bezier handles and standard easing functions.
 *
 * @param prevKey - Previous keyframe
 * @param nextKey - Next keyframe
 * @param currentTime - Current time in milliseconds
 * @returns Interpolated value
 */
export function interpolateKeyframes(
  prevKey: Keyframe,
  nextKey: Keyframe,
  currentTime: number
): number {
  // Normalize time to 0-1 between keyframes
  const duration = nextKey.time - prevKey.time;
  if (duration <= 0) return nextKey.value;

  const t = (currentTime - prevKey.time) / duration;
  const clampedT = Math.max(0, Math.min(1, t));

  // If both keyframes have bezier handles, use cubic bezier
  if (prevKey.handleOut && nextKey.handleIn) {
    const easedT = solveCubicBezier(
      prevKey.handleOut.x,
      prevKey.handleOut.y,
      1 - nextKey.handleIn.x,
      1 - nextKey.handleIn.y,
      clampedT
    );

    return lerp(prevKey.value, nextKey.value, easedT);
  }

  // Otherwise use standard easing function
  const easingFn = getEasing(nextKey.easing);
  const easedT = easingFn(clampedT);

  return lerp(prevKey.value, nextKey.value, easedT);
}

/**
 * Find the keyframe before the given time.
 *
 * @param keyframes - Array of keyframes (should be sorted by time)
 * @param time - Time in milliseconds
 * @returns The previous keyframe or null if none exists
 */
export function findPreviousKeyframe(
  keyframes: Keyframe[],
  time: number
): Keyframe | null {
  let result: Keyframe | null = null;

  for (const kf of keyframes) {
    if (kf.time <= time) {
      if (!result || kf.time > result.time) {
        result = kf;
      }
    }
  }

  return result;
}

/**
 * Find the keyframe after the given time.
 *
 * @param keyframes - Array of keyframes (should be sorted by time)
 * @param time - Time in milliseconds
 * @returns The next keyframe or null if none exists
 */
export function findNextKeyframe(
  keyframes: Keyframe[],
  time: number
): Keyframe | null {
  let result: Keyframe | null = null;

  for (const kf of keyframes) {
    if (kf.time > time) {
      if (!result || kf.time < result.time) {
        result = kf;
      }
    }
  }

  return result;
}

/**
 * Find the keyframe at exactly the given time.
 *
 * @param keyframes - Array of keyframes
 * @param time - Time in milliseconds
 * @param tolerance - Time tolerance in milliseconds (default: 0)
 * @returns The keyframe at the time or null if none exists
 */
export function findKeyframeAtTime(
  keyframes: Keyframe[],
  time: number,
  tolerance: number = 0
): Keyframe | null {
  for (const kf of keyframes) {
    if (Math.abs(kf.time - time) <= tolerance) {
      return kf;
    }
  }
  return null;
}

/**
 * Find surrounding keyframes for a given time.
 *
 * @param keyframes - Array of keyframes
 * @param time - Time in milliseconds
 * @returns Object with prev and next keyframes (either can be null)
 */
export function findSurroundingKeyframes(
  keyframes: Keyframe[],
  time: number
): { prev: Keyframe | null; next: Keyframe | null } {
  return {
    prev: findPreviousKeyframe(keyframes, time),
    next: findNextKeyframe(keyframes, time),
  };
}

// ============================================================================
// Track Evaluation
// ============================================================================

/**
 * Evaluate a track at a given time.
 *
 * @param track - The track to evaluate
 * @param time - Time in milliseconds
 * @returns The interpolated value at the given time
 */
export function evaluateTrack(track: Track, time: number): number {
  const { keyframes } = track;

  // No keyframes - return default
  if (keyframes.length === 0) {
    return PROPERTY_METADATA[track.property]?.defaultValue ?? 0;
  }

  // Single keyframe - return its value
  if (keyframes.length === 1) {
    return keyframes[0].value;
  }

  // Sort keyframes by time (should already be sorted, but ensure)
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // Before first keyframe
  if (time <= sorted[0].time) {
    return sorted[0].value;
  }

  // After last keyframe
  if (time >= sorted[sorted.length - 1].time) {
    return sorted[sorted.length - 1].value;
  }

  // Find surrounding keyframes
  const prevKey = findPreviousKeyframe(sorted, time);
  const nextKey = findNextKeyframe(sorted, time);

  if (!prevKey || !nextKey) {
    return sorted[0].value;
  }

  return interpolateKeyframes(prevKey, nextKey, time);
}

// ============================================================================
// Timeline Evaluation
// ============================================================================

/**
 * Evaluate all tracks at a given time.
 * Returns a record of property values.
 *
 * @param tracks - Array of tracks to evaluate
 * @param time - Time in milliseconds
 * @returns Record of property names to values
 */
export function evaluateTimeline(
  tracks: Track[],
  time: number
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const track of tracks) {
    // Skip muted or invisible tracks
    if (track.muted || !track.visible) continue;

    result[track.property] = evaluateTrack(track, time);
  }

  return result;
}

/**
 * Evaluate all tracks considering solo mode.
 * If any track is soloed, only soloed tracks are evaluated.
 *
 * @param tracks - Array of tracks to evaluate
 * @param time - Time in milliseconds
 * @returns Record of property names to values
 */
export function evaluateTimelineWithSolo(
  tracks: Track[],
  time: number
): Record<string, number> {
  const result: Record<string, number> = {};

  // Check if any track is soloed
  const hasSolo = tracks.some((t) => t.solo);

  for (const track of tracks) {
    // Skip muted tracks
    if (track.muted) continue;

    // If solo mode is active, skip non-soloed tracks
    if (hasSolo && !track.solo) continue;

    // Skip invisible tracks (unless soloed)
    if (!track.visible && !track.solo) continue;

    result[track.property] = evaluateTrack(track, time);
  }

  return result;
}

/**
 * Convert timeline values to AnimationTransform.
 * Handles special cases like rotation (degrees to radians).
 *
 * @param values - Record of property values from evaluateTimeline
 * @returns Partial AnimationTransform object
 */
export function timelineToTransform(
  values: Record<string, number>
): Partial<AnimationTransform> {
  const transform: Partial<AnimationTransform> = {};

  for (const [key, value] of Object.entries(values)) {
    switch (key) {
      // Rotation: convert degrees to radians
      case 'rotationX':
      case 'rotationY':
      case 'rotationZ':
        (transform as Record<string, number>)[key] = value * (Math.PI / 180);
        break;

      // Uniform scale: apply to all axes
      case 'scaleUniform':
        transform.scaleX = value;
        transform.scaleY = value;
        transform.scaleZ = value;
        break;

      // Direct mapping for transform properties
      case 'scaleX':
      case 'scaleY':
      case 'scaleZ':
      case 'positionX':
      case 'positionY':
      case 'positionZ':
      case 'opacity':
        (transform as Record<string, number>)[key] = value;
        break;

      // Non-transform properties are not included in AnimationTransform
      default:
        break;
    }
  }

  return transform;
}

/**
 * Get all property values at a time, including defaults for missing tracks.
 *
 * @param tracks - Array of tracks
 * @param time - Time in milliseconds
 * @param properties - Properties to include (defaults to all)
 * @returns Complete record of all property values
 */
export function getCompleteValues(
  tracks: Track[],
  time: number,
  properties?: AnimatableProperty[]
): Record<AnimatableProperty, number> {
  const result: Record<string, number> = {};
  const propsToInclude = properties ?? (Object.keys(PROPERTY_METADATA) as AnimatableProperty[]);

  // Start with defaults
  for (const prop of propsToInclude) {
    result[prop] = PROPERTY_METADATA[prop]?.defaultValue ?? 0;
  }

  // Override with track values
  const trackValues = evaluateTimelineWithSolo(tracks, time);
  for (const [key, value] of Object.entries(trackValues)) {
    result[key] = value;
  }

  return result as Record<AnimatableProperty, number>;
}

// ============================================================================
// Curve Sampling
// ============================================================================

/**
 * Sample a track's curve at regular intervals.
 * Useful for drawing curve visualizations.
 *
 * @param track - The track to sample
 * @param startTime - Start time in milliseconds
 * @param endTime - End time in milliseconds
 * @param samples - Number of samples to take
 * @returns Array of { time, value } points
 */
export function sampleTrackCurve(
  track: Track,
  startTime: number,
  endTime: number,
  samples: number
): Array<{ time: number; value: number }> {
  const points: Array<{ time: number; value: number }> = [];
  const step = (endTime - startTime) / (samples - 1);

  for (let i = 0; i < samples; i++) {
    const time = startTime + step * i;
    const value = evaluateTrack(track, time);
    points.push({ time, value });
  }

  return points;
}

/**
 * Sample a bezier curve segment between two keyframes.
 *
 * @param prevKey - Previous keyframe
 * @param nextKey - Next keyframe
 * @param samples - Number of samples
 * @returns Array of { t, value } points where t is 0-1
 */
export function sampleBezierSegment(
  prevKey: Keyframe,
  nextKey: Keyframe,
  samples: number
): Array<{ t: number; value: number }> {
  const points: Array<{ t: number; value: number }> = [];

  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const time = lerp(prevKey.time, nextKey.time, t);
    const value = interpolateKeyframes(prevKey, nextKey, time);
    points.push({ t, value });
  }

  return points;
}
