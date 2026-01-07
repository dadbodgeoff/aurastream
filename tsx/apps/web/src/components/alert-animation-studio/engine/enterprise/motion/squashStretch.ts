/**
 * Squash and Stretch
 * Single responsibility: Calculate squash/stretch deformation based on velocity
 */

import type { SquashStretch } from '../types';

export interface SquashStretchResult {
  scaleX: number;
  scaleY: number;
}

/**
 * Calculate squash/stretch scale factors based on velocity.
 * Implements the classic animation principle where objects compress
 * when decelerating and stretch when accelerating.
 * 
 * @param velocity - Current velocity (normalized, typically -1 to 1)
 * @param config - Squash/stretch configuration
 * @param direction - Movement direction for axis calculation ('x' | 'y')
 * @returns Scale factors for X and Y axes
 */
export function calculateSquashStretch(
  velocity: number,
  config: SquashStretch,
  direction: 'x' | 'y' = 'y'
): SquashStretchResult {
  if (!config.enabled) {
    return { scaleX: 1, scaleY: 1 };
  }

  const { squashRatio, stretchRatio, axis } = config;

  // Clamp velocity to reasonable range
  const clampedVelocity = Math.max(-1, Math.min(1, velocity));
  const absVelocity = Math.abs(clampedVelocity);

  // Calculate deformation amount
  // Positive velocity = stretching (accelerating)
  // Negative velocity = squashing (decelerating)
  let primaryScale: number;
  let secondaryScale: number;

  if (clampedVelocity > 0) {
    // Stretching: primary axis extends, secondary compresses
    primaryScale = 1 + (stretchRatio - 1) * absVelocity;
    // Preserve volume: if we stretch by X, compress by 1/X
    secondaryScale = 1 / primaryScale;
  } else {
    // Squashing: primary axis compresses, secondary extends
    primaryScale = 1 - (1 - squashRatio) * absVelocity;
    secondaryScale = 1 / primaryScale;
  }

  // Apply to correct axes based on configuration
  const effectiveAxis = axis === 'velocity' ? direction : axis;

  if (effectiveAxis === 'y') {
    return { scaleX: secondaryScale, scaleY: primaryScale };
  } else {
    return { scaleX: primaryScale, scaleY: secondaryScale };
  }
}

/**
 * Apply squash/stretch to existing scale values.
 */
export function applySquashStretch(
  currentScaleX: number,
  currentScaleY: number,
  velocity: number,
  config: SquashStretch,
  direction: 'x' | 'y' = 'y'
): SquashStretchResult {
  const ss = calculateSquashStretch(velocity, config, direction);
  return {
    scaleX: currentScaleX * ss.scaleX,
    scaleY: currentScaleY * ss.scaleY,
  };
}

/**
 * Calculate velocity from position delta for squash/stretch.
 * Normalizes the velocity to a -1 to 1 range.
 */
export function calculateVelocityFromDelta(
  currentPos: number,
  previousPos: number,
  deltaTime: number,
  maxVelocity: number = 500
): number {
  if (deltaTime <= 0) return 0;
  const velocity = (currentPos - previousPos) / deltaTime;
  return Math.max(-1, Math.min(1, velocity / maxVelocity));
}
