/**
 * Glow Animation
 *
 * Pulsing outer glow effect (shader-based).
 * Creates a magical, ethereal feel.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { GlowConfig } from './types';

/**
 * Apply glow animation.
 *
 * This animation primarily updates shader uniforms rather than transform.
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @param loopT Loop time (seconds since loop started)
 * @returns Updated transform (unchanged, effects are in shader)
 */
export function glow(
  config: GlowConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  loopT: number
): AnimationTransform {
  const frequency = config.frequency ?? 0.6;
  const intensityMin = config.intensityMin ?? 0.2;
  const intensityMax = config.intensityMax ?? 0.8;

  // Calculate oscillation
  const osc = Math.sin(loopT * frequency * Math.PI * 2);
  const normalizedOsc = (osc + 1) / 2;
  const glowIntensity = intensityMin + (intensityMax - intensityMin) * normalizedOsc;

  // Update shader uniforms if available
  if (context.material?.uniforms) {
    const uniforms = context.material.uniforms;

    if (uniforms.uGlowIntensity) {
      uniforms.uGlowIntensity.value = glowIntensity;
    }

    if (config.color && uniforms.uGlowColor) {
      // Parse hex color to RGB
      const color = parseHexColor(config.color);
      uniforms.uGlowColor.value.setRGB(color.r, color.g, color.b);
    }

    if (config.blurRadius && uniforms.uGlowBlur) {
      uniforms.uGlowBlur.value = config.blurRadius;
    }
  }

  // Transform unchanged - glow is purely shader-based
  return transform;
}

/**
 * Parse hex color to RGB values (0-1 range).
 */
function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return { r, g, b };
}
