/**
 * Pulse Animation
 *
 * Rhythmic heartbeat-like scale effect.
 * Uses double-beat pattern like an actual heartbeat.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { PulseConfig } from './types';

/**
 * Apply pulse animation.
 * 
 * Creates a heartbeat-like double pulse pattern.
 * More dynamic than simple sine wave scaling.
 */
export function pulse(
  config: PulseConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  loopT: number
): AnimationTransform {
  const frequency = config.frequency ?? 0.8;
  const scaleMin = config.scaleMin ?? 0.98;
  const scaleMax = config.scaleMax ?? 1.04;

  // Create heartbeat-like double pulse pattern
  // Each "beat" has two peaks close together, then a rest
  const cycleTime = loopT * frequency;
  const cyclePhase = cycleTime % 1; // 0 to 1 within each cycle
  
  let pulseValue: number;
  
  if (cyclePhase < 0.15) {
    // First beat (quick rise and fall)
    const t = cyclePhase / 0.15;
    pulseValue = Math.sin(t * Math.PI);
  } else if (cyclePhase < 0.2) {
    // Brief pause
    pulseValue = 0;
  } else if (cyclePhase < 0.35) {
    // Second beat (slightly smaller)
    const t = (cyclePhase - 0.2) / 0.15;
    pulseValue = Math.sin(t * Math.PI) * 0.7;
  } else {
    // Rest period (gradual return to baseline with slight undershoot)
    const t = (cyclePhase - 0.35) / 0.65;
    pulseValue = Math.sin(t * Math.PI * 0.5) * -0.1;
  }

  const pulseScale = scaleMin + (scaleMax - scaleMin) * (0.5 + pulseValue * 0.5);

  return {
    ...transform,
    scaleX: transform.scaleX * pulseScale,
    scaleY: transform.scaleY * pulseScale,
    scaleZ: transform.scaleZ * pulseScale,
  };
}
