/**
 * Wiggle Animation
 *
 * Playful rotation shake.
 * Creates an energetic, fun feel.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { WiggleConfig } from './types';
import { degToRad } from '../core/types';

/**
 * Apply wiggle animation.
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @param loopT Loop time (seconds since loop started)
 * @returns Updated transform
 */
export function wiggle(
  config: WiggleConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  loopT: number
): AnimationTransform {
  const frequency = config.frequency ?? 3;
  const angleMax = degToRad(config.angleMax ?? 3);

  // Calculate oscillation
  const osc = Math.sin(loopT * frequency * Math.PI * 2);

  return {
    ...transform,
    rotationZ: transform.rotationZ + osc * angleMax,
  };
}
