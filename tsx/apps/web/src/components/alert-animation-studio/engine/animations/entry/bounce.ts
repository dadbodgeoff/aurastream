/**
 * Bounce Animation
 *
 * Multiple bounces while entering.
 * Playful and energetic entrance.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { BounceConfig } from './types';
import { getEasing } from '../core/easing';

/**
 * Apply bounce animation.
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @returns Updated transform
 */
export function bounceIn(
  config: BounceConfig,
  context: AnimationContext,
  transform: AnimationTransform
): AnimationTransform {
  const { t, durationMs } = context;

  // Calculate entry progress
  const entryDuration = config.durationMs / durationMs;
  const entryT = Math.min(t / entryDuration, 1);

  // Apply easing for scale
  const easing = config.easing ?? 'elastic.out';
  const easedT = getEasing(easing)(entryT);

  // Calculate bounce offset
  const bounces = config.bounces ?? 3;
  const height = (config.height ?? 50) / 100;

  // Bounce formula: sin wave that decays over time
  // The decay ensures bounces get smaller as animation progresses
  const bounceT = Math.sin(entryT * Math.PI * bounces) * Math.pow(1 - entryT, 2);

  // Calculate scale
  const scaleFrom = config.scaleFrom ?? 0;
  const scale = scaleFrom + (1 - scaleFrom) * easedT;

  return {
    ...transform,
    scaleX: transform.scaleX * scale,
    scaleY: transform.scaleY * scale,
    scaleZ: transform.scaleZ * scale,
    positionY: transform.positionY + bounceT * height,
    // Fade in quickly
    opacity: transform.opacity * Math.min(entryT * 2, 1),
  };
}
