/**
 * Wiggle Animation
 *
 * Playful, jittery rotation with character.
 * Uses noise-like pattern for energetic, fun feel.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { WiggleConfig } from './types';
import { degToRad } from '../core/types';

/**
 * Apply wiggle animation.
 * 
 * Creates an energetic, playful wiggle like a happy character.
 * Uses multiple frequencies with decay for natural jitter.
 */
export function wiggle(
  config: WiggleConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  loopT: number
): AnimationTransform {
  const frequency = config.frequency ?? 1.5;
  const angleMax = degToRad(config.angleMax ?? 2);
  const decay = config.decay ?? 0;

  // Create jittery wiggle using multiple non-harmonic frequencies
  // This creates a more playful, less mechanical feel
  const t = loopT * frequency;
  
  // Primary wiggle
  const primary = Math.sin(t * Math.PI * 2) * 0.5;
  // Secondary (faster, smaller)
  const secondary = Math.sin(t * Math.PI * 2 * 2.7 + 0.3) * 0.3;
  // Tertiary (even faster, creates jitter)
  const tertiary = Math.sin(t * Math.PI * 2 * 5.3 + 0.7) * 0.15;
  // Quaternary (micro-jitter)
  const quaternary = Math.sin(t * Math.PI * 2 * 11.1 + 1.1) * 0.05;
  
  let wiggleAmount = primary + secondary + tertiary + quaternary;
  
  // Apply decay if configured (wiggle settles over time)
  if (decay > 0) {
    const decayFactor = Math.exp(-loopT * decay);
    wiggleAmount *= decayFactor;
  }

  return {
    ...transform,
    rotationZ: transform.rotationZ + wiggleAmount * angleMax,
  };
}
