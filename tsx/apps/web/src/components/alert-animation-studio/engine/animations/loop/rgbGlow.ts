/**
 * RGB Glow Animation
 *
 * Rainbow cycling glow effect.
 * Creates a vibrant, gaming aesthetic.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { RgbGlowConfig } from './types';

/**
 * Apply RGB glow animation.
 *
 * This animation primarily updates shader uniforms rather than transform.
 *
 * @param config Animation configuration
 * @param context Runtime context
 * @param transform Current transform state
 * @param loopT Loop time (seconds since loop started)
 * @returns Updated transform (unchanged, effects are in shader)
 */
export function rgbGlow(
  config: RgbGlowConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  loopT: number
): AnimationTransform {
  const speed = config.speed ?? 2;
  const saturation = config.saturation ?? 1;
  const intensityMin = config.intensityMin ?? 0.4;
  const intensityMax = config.intensityMax ?? 0.8;

  // Calculate hue (cycles through 0-1)
  const hue = (loopT * speed) % 1;

  // Convert HSL to RGB
  const rgb = hslToRgb(hue, saturation, 0.5);

  // Pulse the intensity
  const osc = Math.sin(loopT * 2 * Math.PI * 2);
  const normalizedOsc = (osc + 1) / 2;
  const intensity = intensityMin + (intensityMax - intensityMin) * normalizedOsc;

  // Update shader uniforms if available
  if (context.material?.uniforms) {
    const uniforms = context.material.uniforms;

    if (uniforms.uGlowColor) {
      uniforms.uGlowColor.value.setRGB(rgb.r, rgb.g, rgb.b);
    }

    if (uniforms.uGlowIntensity) {
      uniforms.uGlowIntensity.value = intensity;
    }
  }

  // Transform unchanged - glow is purely shader-based
  return transform;
}

/**
 * Convert HSL to RGB.
 *
 * @param h Hue (0-1)
 * @param s Saturation (0-1)
 * @param l Lightness (0-1)
 * @returns RGB values (0-1 range)
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r, g, b };
}
