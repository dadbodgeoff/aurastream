/**
 * Shake Animation
 *
 * Rapid, chaotic movement for excitement/urgency.
 * Uses pseudo-random noise pattern, not predictable sine waves.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { ShakeConfig } from './types';

/**
 * Simple seeded random for deterministic shake.
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Smooth noise function using interpolated random values.
 */
function smoothNoise(t: number, seed: number): number {
  const i = Math.floor(t);
  const f = t - i;
  
  // Smoothstep interpolation
  const u = f * f * (3 - 2 * f);
  
  const a = seededRandom(i + seed) * 2 - 1;
  const b = seededRandom(i + 1 + seed) * 2 - 1;
  
  return a + u * (b - a);
}

/**
 * Apply shake animation.
 * 
 * Creates an energetic, urgent shake like vibration or excitement.
 * Uses layered noise for chaotic but smooth movement.
 * Distinctly different from float (which is gentle and predictable).
 */
export function shake(
  config: ShakeConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  loopT: number
): AnimationTransform {
  const intensity = (config.shakeIntensity ?? 2) / 100;
  const frequency = config.frequency ?? 8;

  const t = loopT * frequency;
  
  // Layer multiple noise frequencies for chaotic shake
  // Primary shake
  const shakeX1 = smoothNoise(t, 0) * 0.5;
  const shakeY1 = smoothNoise(t, 100) * 0.5;
  
  // Secondary (faster)
  const shakeX2 = smoothNoise(t * 2.3, 200) * 0.3;
  const shakeY2 = smoothNoise(t * 2.3, 300) * 0.3;
  
  // Tertiary (even faster, micro-shake)
  const shakeX3 = smoothNoise(t * 5.7, 400) * 0.2;
  const shakeY3 = smoothNoise(t * 5.7, 500) * 0.2;
  
  const totalShakeX = (shakeX1 + shakeX2 + shakeX3) * intensity;
  const totalShakeY = (shakeY1 + shakeY2 + shakeY3) * intensity;
  
  // Also add slight rotation shake for more energy
  const rotationShake = smoothNoise(t * 3.1, 600) * intensity * 0.05;

  return {
    ...transform,
    positionX: transform.positionX + totalShakeX,
    positionY: transform.positionY + totalShakeY,
    rotationZ: transform.rotationZ + rotationShake,
  };
}
