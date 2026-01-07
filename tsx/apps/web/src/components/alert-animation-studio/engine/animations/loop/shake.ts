/**
 * Shake Animation
 *
 * Rapid small movements for excitement/alert.
 * Creates an energetic, urgent feel.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { ShakeConfig } from './types';

/**
 * Apply shake animation.
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @param loopT Loop time (seconds since loop started)
 * @returns Updated transform
 */
export function shake(
  config: ShakeConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  loopT: number
): AnimationTransform {
  const intensity = (config.shakeIntensity ?? 5) / 100;
  const frequency = config.frequency ?? 15;

  // High frequency noise-like shake using different frequencies for X and Y
  // This creates a more natural, less predictable shake
  const shakeX = Math.sin(loopT * frequency * Math.PI * 2) * intensity;
  const shakeY = Math.cos(loopT * frequency * Math.PI * 2 * 1.3) * intensity * 0.5;

  return {
    ...transform,
    positionX: transform.positionX + shakeX,
    positionY: transform.positionY + shakeY,
  };
}
