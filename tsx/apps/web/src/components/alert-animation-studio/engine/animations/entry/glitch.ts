/**
 * Glitch Animation
 *
 * Digital glitch effect on entry using DETERMINISTIC noise.
 * This is the FIXED version that produces consistent, reproducible results.
 *
 * Key principle: Same time + same seed = same glitch pattern.
 * This allows for:
 * - Consistent preview and export
 * - Reproducible animations
 * - No random flickering
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { GlitchConfig } from './types';
import { glitchBurst, createTimeSeed, seededRandom, hash } from '../core/noise';

/**
 * Apply glitch animation.
 *
 * Uses deterministic noise functions to create consistent glitch effects
 * that decay as the animation progresses.
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @returns Updated transform
 */
export function glitch(
  config: GlitchConfig,
  context: AnimationContext,
  transform: AnimationTransform
): AnimationTransform {
  const { t, durationMs, timeMs } = context;

  // Calculate entry progress
  const entryDuration = config.durationMs / durationMs;
  const entryT = Math.min(t / entryDuration, 1);

  // Animation complete - return clean transform
  if (entryT >= 1) {
    return transform;
  }

  // Get configuration
  const intensity = config.glitchIntensity ?? 0.8;
  const seed = config.seed ?? 0;

  // Generate deterministic glitch values
  // The glitch intensity decays as the animation progresses
  const glitchData = glitchBurst(entryT, intensity, seed);

  // Apply position offsets
  const positionX = transform.positionX + glitchData.offsetX;
  const positionY = transform.positionY + glitchData.offsetY;

  // Apply scale glitch
  const scaleGlitch = 1 + glitchData.scaleGlitch;
  const scaleX = transform.scaleX * scaleGlitch;
  const scaleY = transform.scaleY * scaleGlitch;

  // Apply visibility (flicker effect)
  const opacity = glitchData.visible ? transform.opacity : transform.opacity * 0.5;

  // Update shader uniforms for RGB split and scanlines if available
  if (context.material?.uniforms) {
    const uniforms = context.material.uniforms;

    // RGB split effect
    if (config.rgbSplit !== false && uniforms.uRgbSplit) {
      uniforms.uRgbSplit.value = glitchData.rgbSplit * (1 - entryT);
    }

    // Scanline effect
    if (config.scanlines !== false && uniforms.uScanlines) {
      uniforms.uScanlines.value = glitchData.scanlines * (1 - entryT);
    }

    // Glitch progress for shader effects
    if (uniforms.uGlitchProgress) {
      uniforms.uGlitchProgress.value = 1 - entryT;
    }
  }

  return {
    ...transform,
    positionX,
    positionY,
    scaleX,
    scaleY,
    opacity,
  };
}

/**
 * Extended glitch with horizontal slice displacement.
 * Creates the classic "broken TV" effect.
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @returns Updated transform with slice data
 */
export function glitchWithSlices(
  config: GlitchConfig,
  context: AnimationContext,
  transform: AnimationTransform
): AnimationTransform & { slices?: GlitchSlice[] } {
  // Get base glitch transform
  const baseTransform = glitch(config, context, transform);

  const { t, durationMs } = context;
  const entryDuration = config.durationMs / durationMs;
  const entryT = Math.min(t / entryDuration, 1);

  // Animation complete - no slices
  if (entryT >= 1) {
    return baseTransform;
  }

  // Generate slice data for shader
  const intensity = config.glitchIntensity ?? 0.8;
  const seed = config.seed ?? 0;
  const slices = generateGlitchSlices(entryT, intensity, seed);

  return {
    ...baseTransform,
    slices,
  };
}

/**
 * Glitch slice data for horizontal displacement effect.
 */
export interface GlitchSlice {
  /** Y position (0-1) */
  y: number;
  /** Height (0-1) */
  height: number;
  /** X offset (-1 to 1) */
  offsetX: number;
  /** RGB split amount */
  rgbSplit: number;
}

/**
 * Generate deterministic glitch slices.
 */
function generateGlitchSlices(
  progress: number,
  intensity: number,
  seed: number
): GlitchSlice[] {
  const slices: GlitchSlice[] = [];

  // Number of slices decreases as animation progresses
  const maxSlices = Math.floor(5 * intensity * (1 - progress));
  const sliceSeed = createTimeSeed(progress * 1000, 80, seed);

  for (let i = 0; i < maxSlices; i++) {
    const sliceRng = hash(sliceSeed + i);

    // Only create slice with some probability
    if (seededRandom(sliceRng) > 0.6) {
      continue;
    }

    slices.push({
      y: seededRandom(hash(sliceRng + 1)),
      height: seededRandom(hash(sliceRng + 2)) * 0.1 + 0.02,
      offsetX: (seededRandom(hash(sliceRng + 3)) - 0.5) * 0.2 * intensity,
      rgbSplit: seededRandom(hash(sliceRng + 4)) * 0.05 * intensity,
    });
  }

  return slices;
}
