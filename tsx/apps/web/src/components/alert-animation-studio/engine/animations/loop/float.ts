/**
 * Float Animation
 *
 * Gentle hover/bob motion with organic feel.
 * Uses layered sine waves for natural, non-mechanical movement.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { FloatConfig } from './types';
import { degToRad } from '../core/types';

/**
 * Apply float animation.
 * 
 * Creates a weightless, floating feel like a balloon or underwater object.
 * Uses multiple layered frequencies for organic motion.
 */
export function float(
  config: FloatConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  loopT: number
): AnimationTransform {
  const frequency = config.frequency ?? 0.4;
  const amplitudeY = (config.amplitudeY ?? 3) / 100;
  const amplitudeX = (config.amplitudeX ?? 1) / 100;
  const phaseOffset = degToRad(config.phaseOffset ?? 0);

  // Primary wave
  const phase = loopT * frequency * Math.PI * 2 + phaseOffset;
  
  // Layer multiple frequencies for organic feel (not just sin(t))
  // Primary: slow main bob
  const primaryY = Math.sin(phase) * 0.7;
  // Secondary: faster subtle variation
  const secondaryY = Math.sin(phase * 2.3 + 0.5) * 0.2;
  // Tertiary: very subtle micro-movement
  const tertiaryY = Math.sin(phase * 4.7 + 1.2) * 0.1;
  
  // X movement is figure-8 like, not just cosine
  const primaryX = Math.sin(phase * 0.5) * 0.6;
  const secondaryX = Math.cos(phase * 1.1) * 0.4;

  const oscY = primaryY + secondaryY + tertiaryY;
  const oscX = primaryX + secondaryX;

  return {
    ...transform,
    positionY: transform.positionY + oscY * amplitudeY,
    positionX: transform.positionX + oscX * amplitudeX,
  };
}
