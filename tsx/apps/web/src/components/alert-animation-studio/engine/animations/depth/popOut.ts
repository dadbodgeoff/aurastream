/**
 * Pop Out Effect
 *
 * Foreground elements pop toward viewer on trigger.
 * Creates a dramatic reveal effect.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { PopOutConfig, DepthEffectState } from './types';
import { getEasing } from '../core/easing';

/**
 * Apply pop out effect.
 *
 * @param config Effect configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @param state Depth effect state (trigger progress, etc.)
 * @returns Updated transform
 */
export function popOut(
  config: PopOutConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  state: DepthEffectState
): AnimationTransform {
  const popDistance = (config.popDistance ?? 40) / 100;
  const easing = config.popEasing ?? 'power2.out';
  const intensity = config.intensity ?? 0.5;

  // Apply easing to trigger progress
  const easedProgress = getEasing(easing)(state.triggerProgress);
  const zOffset = easedProgress * popDistance * intensity;

  // Update shader for depth-based pop
  if (context.material?.uniforms?.uDepthScale) {
    context.material.uniforms.uDepthScale.value = zOffset;
  }

  return {
    ...transform,
    positionZ: transform.positionZ + zOffset,
    // Slight scale increase for emphasis
    scaleX: transform.scaleX * (1 + easedProgress * 0.05 * intensity),
    scaleY: transform.scaleY * (1 + easedProgress * 0.05 * intensity),
  };
}
