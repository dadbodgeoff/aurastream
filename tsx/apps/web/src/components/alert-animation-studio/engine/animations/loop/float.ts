/**
 * Float Animation
 *
 * Gentle hover/bob motion using sine waves.
 * Creates a floating, weightless feel.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { FloatConfig } from './types';
import { degToRad } from '../core/types';

/**
 * Apply float animation.
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @param loopT Loop time (seconds since loop started)
 * @returns Updated transform
 */
export function float(
  config: FloatConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  loopT: number
): AnimationTransform {
  const frequency = config.frequency ?? 0.5;
  const amplitudeY = (config.amplitudeY ?? 8) / 100;
  const amplitudeX = (config.amplitudeX ?? 2) / 100;
  const phaseOffset = degToRad(config.phaseOffset ?? 0);

  // Calculate oscillation using sine/cosine for smooth motion
  const phase = loopT * frequency * Math.PI * 2 + phaseOffset;
  const oscY = Math.sin(phase);
  const oscX = Math.cos(phase);

  return {
    ...transform,
    positionY: transform.positionY + oscY * amplitudeY,
    positionX: transform.positionX + oscX * amplitudeX,
  };
}
