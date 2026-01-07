/**
 * Glow Animation
 *
 * Pulsing outer glow effect (shader-based).
 * Creates a magical, ethereal feel with organic pulsing.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { GlowConfig } from './types';

/**
 * Apply glow animation.
 *
 * Creates an ethereal glow with organic pulsing pattern.
 * Uses layered frequencies for magical, non-mechanical feel.
 */
export function glow(
  config: GlowConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  loopT: number
): AnimationTransform {
  const frequency = config.frequency ?? 0.5;
  const intensityMin = config.intensityMin ?? 0.3;
  const intensityMax = config.intensityMax ?? 0.7;

  // Create organic glow pulsing with multiple layers
  const t = loopT * frequency;
  
  // Primary pulse (slow, dominant)
  const primary = Math.sin(t * Math.PI * 2) * 0.5;
  // Secondary (creates "breathing" feel)
  const secondary = Math.sin(t * Math.PI * 2 * 1.7 + 0.3) * 0.3;
  // Tertiary (subtle shimmer)
  const tertiary = Math.sin(t * Math.PI * 2 * 4.3 + 0.7) * 0.15;
  // Sparkle (quick flickers)
  const sparkle = Math.pow(Math.sin(t * Math.PI * 2 * 7.1), 8) * 0.05;
  
  const combinedOsc = primary + secondary + tertiary + sparkle;
  const normalizedOsc = (combinedOsc + 1) / 2;
  const glowIntensity = intensityMin + (intensityMax - intensityMin) * normalizedOsc;

  // Update shader uniforms if available
  if (context.material?.uniforms) {
    const uniforms = context.material.uniforms;

    if (uniforms.uGlowIntensity) {
      uniforms.uGlowIntensity.value = glowIntensity;
    }

    if (config.color && uniforms.uGlowColor) {
      const color = parseHexColor(config.color);
      uniforms.uGlowColor.value.setRGB(color.r, color.g, color.b);
    }

    if (config.blurRadius && uniforms.uGlowBlur) {
      // Blur also pulses slightly for depth
      const blurPulse = 1 + combinedOsc * 0.1;
      uniforms.uGlowBlur.value = config.blurRadius * blurPulse;
    }
  }

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
