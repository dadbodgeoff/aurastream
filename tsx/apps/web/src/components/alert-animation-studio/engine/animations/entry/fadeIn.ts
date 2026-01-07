/**
 * Fade In Animation
 *
 * Smooth opacity transition with optional subtle scale.
 * Elegant and understated entrance.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { FadeInConfig } from './types';
import { getEasing } from '../core/easing';

/**
 * Apply fade in animation.
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @returns Updated transform
 */
export function fadeIn(
  config: FadeInConfig,
  context: AnimationContext,
  transform: AnimationTransform
): AnimationTransform {
  const { t, durationMs } = context;

  // Calculate entry progress
  const entryDuration = config.durationMs / durationMs;
  const entryT = Math.min(t / entryDuration, 1);

  // Apply easing
  const easing = config.easing ?? 'power1.inOut';
  const easedT = getEasing(easing)(entryT);

  // Calculate opacity
  const opacityFrom = config.opacityFrom ?? 0;
  const opacity = opacityFrom + (1 - opacityFrom) * easedT;

  // Calculate scale (subtle effect)
  const scaleFrom = config.scaleFrom ?? 0.9;
  const scale = scaleFrom + (1 - scaleFrom) * easedT;

  return {
    ...transform,
    scaleX: transform.scaleX * scale,
    scaleY: transform.scaleY * scale,
    scaleZ: transform.scaleZ * scale,
    opacity: transform.opacity * opacity,
  };
}
