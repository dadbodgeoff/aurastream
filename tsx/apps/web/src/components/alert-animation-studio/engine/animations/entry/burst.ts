/**
 * Burst Animation
 *
 * Explosive entry from large scale with rotation.
 * Dramatic and impactful entrance for hype moments.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { BurstConfig } from './types';
import { getEasing } from '../core/easing';
import { degToRad } from '../core/types';

/**
 * Apply burst animation.
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @returns Updated transform
 */
export function burst(
  config: BurstConfig,
  context: AnimationContext,
  transform: AnimationTransform
): AnimationTransform {
  const { t, durationMs } = context;

  // Calculate entry progress
  const entryDuration = config.durationMs / durationMs;
  const entryT = Math.min(t / entryDuration, 1);

  // Apply easing
  const easing = config.easing ?? 'back.out';
  const easedT = getEasing(easing)(entryT);

  // Calculate scale (starts large, shrinks to normal)
  const scaleFrom = config.scaleFrom ?? 2.5;
  const scale = scaleFrom + (1 - scaleFrom) * easedT;

  // Calculate rotation (starts rotated, settles to 0)
  const rotationFrom = config.rotationFrom ?? 15;
  const rotationZ = degToRad(rotationFrom) * (1 - easedT);

  // Calculate opacity (quick fade in)
  const opacityFrom = config.opacityFrom ?? 0;
  const opacityT = Math.min(entryT * 3, 1); // Fade in during first third
  const opacity = opacityFrom + (1 - opacityFrom) * opacityT;

  return {
    ...transform,
    scaleX: transform.scaleX * scale,
    scaleY: transform.scaleY * scale,
    scaleZ: transform.scaleZ * scale,
    rotationZ: transform.rotationZ + rotationZ,
    opacity: transform.opacity * opacity,
  };
}
