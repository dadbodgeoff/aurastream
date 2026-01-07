/**
 * Breathe Animation
 *
 * Slow, organic breathing with natural rhythm.
 * Mimics actual breathing pattern (inhale slower than exhale).
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { BreatheConfig } from './types';

/**
 * Apply breathe animation.
 * 
 * Creates a calm, living feel with asymmetric breathing.
 * Inhale is slower and deeper, exhale is quicker and relaxed.
 * Distinctly different from pulse (which is rhythmic/heartbeat).
 */
export function breathe(
  config: BreatheConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  loopT: number
): AnimationTransform {
  const frequency = config.frequency ?? 0.25;
  const scaleMin = config.scaleMin ?? 0.97;
  const scaleMax = config.scaleMax ?? 1.03;

  // Create asymmetric breathing pattern
  // Real breathing: ~40% inhale, ~60% exhale
  const cycleTime = loopT * frequency;
  const cyclePhase = cycleTime % 1;
  
  let breatheValue: number;
  
  if (cyclePhase < 0.4) {
    // Inhale phase (slower, eased)
    const t = cyclePhase / 0.4;
    // Ease-out for natural inhale (starts fast, slows at top)
    breatheValue = 1 - Math.pow(1 - t, 2.5);
  } else if (cyclePhase < 0.45) {
    // Brief hold at top
    breatheValue = 1;
  } else {
    // Exhale phase (quicker, relaxed)
    const t = (cyclePhase - 0.45) / 0.55;
    // Ease-in-out for natural exhale
    breatheValue = 1 - (t < 0.5 
      ? 2 * t * t 
      : 1 - Math.pow(-2 * t + 2, 2) / 2);
  }

  const scale = scaleMin + (scaleMax - scaleMin) * breatheValue;

  // Breathing also affects Y position slightly (chest rises)
  const riseAmount = breatheValue * 0.01;

  return {
    ...transform,
    scaleX: transform.scaleX * scale,
    scaleY: transform.scaleY * scale,
    positionY: transform.positionY - riseAmount,
  };
}
