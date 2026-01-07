/**
 * Pulse Animation
 *
 * Subtle breathing scale effect.
 * Creates a living, organic feel.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { PulseConfig } from './types';

/**
 * Apply pulse animation.
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @param loopT Loop time (seconds since loop started)
 * @returns Updated transform
 */
export function pulse(
  config: PulseConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  loopT: number
): AnimationTransform {
  const frequency = config.frequency ?? 0.8;
  const scaleMin = config.scaleMin ?? 0.97;
  const scaleMax = config.scaleMax ?? 1.03;

  // Calculate oscillation (0 to 1)
  const osc = Math.sin(loopT * frequency * Math.PI * 2);
  const normalizedOsc = (osc + 1) / 2; // Convert from [-1,1] to [0,1]

  // Interpolate between min and max scale
  const pulseScale = scaleMin + (scaleMax - scaleMin) * normalizedOsc;

  return {
    ...transform,
    scaleX: transform.scaleX * pulseScale,
    scaleY: transform.scaleY * pulseScale,
    scaleZ: transform.scaleZ * pulseScale,
  };
}
