/**
 * RGB Glow Animation
 *
 * Rainbow cycling glow effect with gaming aesthetic.
 * Smooth color transitions with intensity waves.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { RgbGlowConfig } from './types';

/**
 * Apply RGB glow animation.
 *
 * Creates a vibrant, gaming-style RGB effect.
 * Smooth rainbow cycling with pulsing intensity.
 */
export function rgbGlow(
  config: RgbGlowConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  loopT: number
): AnimationTransform {
  const speed = config.speed ?? 0.3;
  const saturation = config.saturation ?? 0.9;
  const intensityMin = config.intensityMin ?? 0.4;
  const intensityMax = config.intensityMax ?? 0.7;

  // Smooth hue cycling with slight acceleration/deceleration
  // Creates more interesting color transitions
  const rawHue = loopT * speed;
  const hueWobble = Math.sin(rawHue * Math.PI * 2 * 0.3) * 0.05;
  const hue = (rawHue + hueWobble) % 1;

  // Saturation pulses slightly for depth
  const satPulse = saturation * (0.9 + Math.sin(loopT * 3) * 0.1);

  // Convert HSL to RGB
  const rgb = hslToRgb(hue, satPulse, 0.5);

  // Multi-layered intensity pulsing
  const t = loopT * 2;
  const primary = Math.sin(t * Math.PI * 2) * 0.4;
  const secondary = Math.sin(t * Math.PI * 2 * 2.3 + 0.5) * 0.3;
  const tertiary = Math.sin(t * Math.PI * 2 * 5.7 + 1.2) * 0.2;
  // Beat-like accent
  const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 0.5)), 4) * 0.1;
  
  const combinedOsc = primary + secondary + tertiary + beat;
  const normalizedOsc = (combinedOsc + 1) / 2;
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

  return transform;
}

/**
 * Convert HSL to RGB.
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
