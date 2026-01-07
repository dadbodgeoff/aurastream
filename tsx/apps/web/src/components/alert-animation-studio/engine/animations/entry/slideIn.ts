/**
 * Slide In Animation
 *
 * Enter from any direction with smooth easing.
 * Professional and clean entrance effect.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { SlideInConfig } from './types';
import { getEasing } from '../core/easing';

/**
 * Apply slide in animation.
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @returns Updated transform
 */
export function slideIn(
  config: SlideInConfig,
  context: AnimationContext,
  transform: AnimationTransform
): AnimationTransform {
  const { t, durationMs } = context;

  // Calculate entry progress
  const entryDuration = config.durationMs / durationMs;
  const entryT = Math.min(t / entryDuration, 1);

  // Apply easing
  const easing = config.easing ?? 'power2.out';
  const easedT = getEasing(easing)(entryT);

  // Calculate offset based on direction
  const distance = (config.distancePercent ?? 120) / 100;
  const direction = config.direction ?? 'left';
  const offset = distance * (1 - easedT);

  let positionX = transform.positionX;
  let positionY = transform.positionY;

  switch (direction) {
    case 'left':
      positionX = transform.positionX - offset;
      break;
    case 'right':
      positionX = transform.positionX + offset;
      break;
    case 'top':
      positionY = transform.positionY + offset;
      break;
    case 'bottom':
      positionY = transform.positionY - offset;
      break;
  }

  return {
    ...transform,
    positionX,
    positionY,
    // Fade in during first 30% of animation
    opacity: transform.opacity * Math.min(entryT / 0.3, 1),
  };
}
