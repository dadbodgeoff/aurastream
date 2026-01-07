/**
 * Pop In Animation
 *
 * Scale from small/zero with elastic bounce effect.
 * Classic "pop" entrance that's playful and attention-grabbing.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { PopInConfig } from './types';
import { getEasing } from '../core/easing';

/**
 * Apply pop in animation.
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @returns Updated transform
 */
export function popIn(
  config: PopInConfig,
  context: AnimationContext,
  transform: AnimationTransform
): AnimationTransform {
  const { t, durationMs } = context;

  // Calculate entry progress (0-1 within entry duration)
  const entryDuration = config.durationMs / durationMs;
  const entryT = Math.min(t / entryDuration, 1);

  // Apply easing
  const easing = config.easing ?? 'elastic.out';
  const easedT = getEasing(easing)(entryT);

  // Calculate scale
  const scaleFrom = config.scaleFrom ?? 0;
  const scale = scaleFrom + (1 - scaleFrom) * easedT;

  return {
    ...transform,
    scaleX: transform.scaleX * scale,
    scaleY: transform.scaleY * scale,
    scaleZ: transform.scaleZ * scale,
    // Fade in quickly at the start
    opacity: transform.opacity * Math.min(entryT * 3, 1),
  };
}
