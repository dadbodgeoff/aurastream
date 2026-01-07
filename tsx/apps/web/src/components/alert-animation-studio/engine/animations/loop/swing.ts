/**
 * Swing Animation
 *
 * Pendulum-like rotation.
 * Creates a playful, hanging feel.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { SwingConfig } from './types';
import { degToRad } from '../core/types';

/**
 * Apply swing animation.
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @param loopT Loop time (seconds since loop started)
 * @returns Updated transform
 */
export function swing(
  config: SwingConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  loopT: number
): AnimationTransform {
  const frequency = config.frequency ?? 0.5;
  const swingAngle = degToRad(config.swingAngle ?? 10);

  // Simple pendulum motion
  const osc = Math.sin(loopT * frequency * Math.PI * 2);

  return {
    ...transform,
    rotationZ: transform.rotationZ + osc * swingAngle,
  };
}
