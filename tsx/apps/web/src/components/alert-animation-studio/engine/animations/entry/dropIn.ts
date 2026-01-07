/**
 * Drop In Animation
 *
 * Fall from above with bounce landing.
 * Natural gravity-based entrance.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { DropInConfig } from './types';
import { getEasing } from '../core/easing';

/**
 * Apply drop in animation.
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @returns Updated transform
 */
export function dropIn(
  config: DropInConfig,
  context: AnimationContext,
  transform: AnimationTransform
): AnimationTransform {
  const { t, durationMs } = context;

  // Calculate entry progress
  const entryDuration = config.durationMs / durationMs;
  const entryT = Math.min(t / entryDuration, 1);

  // Apply easing (bounce.out gives natural landing feel)
  const easing = config.easing ?? 'bounce.out';
  const easedT = getEasing(easing)(entryT);

  // Calculate drop position
  const dropHeight = (config.dropHeight ?? 100) / 100;
  const positionY = (1 - easedT) * dropHeight;

  // Calculate opacity
  const opacityFrom = config.opacityFrom ?? 0;
  const opacityT = Math.min(entryT * 2, 1); // Fade in during first half
  const opacity = opacityFrom + (1 - opacityFrom) * opacityT;

  return {
    ...transform,
    positionY: transform.positionY + positionY,
    opacity: transform.opacity * opacity,
  };
}
