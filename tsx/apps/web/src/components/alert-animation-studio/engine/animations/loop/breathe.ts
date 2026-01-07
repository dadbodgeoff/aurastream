/**
 * Breathe Animation
 *
 * Slow, organic scale breathing.
 * Creates a calm, living feel.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { BreatheConfig } from './types';

/**
 * Apply breathe animation.
 *
 * Similar to pulse but slower and more organic.
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @param loopT Loop time (seconds since loop started)
 * @returns Updated transform
 */
export function breathe(
  config: BreatheConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  loopT: number
): AnimationTransform {
  const frequency = config.frequency ?? 0.3;
  const scaleMin = config.scaleMin ?? 0.95;
  const scaleMax = config.scaleMax ?? 1.05;

  // Use sine with phase shift for smooth breathing
  // The -PI/2 shift makes it start at minimum (inhale)
  const breatheT = (Math.sin(loopT * frequency * Math.PI * 2 - Math.PI / 2) + 1) / 2;
  const scale = scaleMin + (scaleMax - scaleMin) * breatheT;

  return {
    ...transform,
    scaleX: transform.scaleX * scale,
    scaleY: transform.scaleY * scale,
  };
}
