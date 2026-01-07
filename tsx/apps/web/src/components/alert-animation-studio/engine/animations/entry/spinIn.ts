/**
 * Spin In Animation
 *
 * Rotate while scaling in.
 * Dynamic and eye-catching entrance.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { SpinInConfig } from './types';
import { getEasing } from '../core/easing';

/**
 * Apply spin in animation.
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @returns Updated transform
 */
export function spinIn(
  config: SpinInConfig,
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

  // Calculate scale
  const scaleFrom = config.scaleFrom ?? 0;
  const scale = scaleFrom + (1 - scaleFrom) * easedT;

  // Calculate rotation
  const rotations = config.rotations ?? 1;
  const direction = config.direction ?? 1;
  const rotationZ = (1 - easedT) * rotations * Math.PI * 2 * direction;

  return {
    ...transform,
    scaleX: transform.scaleX * scale,
    scaleY: transform.scaleY * scale,
    scaleZ: transform.scaleZ * scale,
    rotationZ: transform.rotationZ + rotationZ,
    opacity: transform.opacity * easedT,
  };
}
