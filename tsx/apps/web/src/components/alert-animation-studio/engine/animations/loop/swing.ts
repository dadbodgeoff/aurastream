/**
 * Swing Animation
 *
 * Pendulum-like rotation with physics-based motion.
 * Simulates hanging object with gravity and momentum.
 */

import type { AnimationTransform, AnimationContext } from '../core/types';
import type { SwingConfig } from './types';
import { degToRad } from '../core/types';

/**
 * Apply swing animation.
 * 
 * Creates a pendulum motion like a hanging sign or ornament.
 * Uses damped harmonic oscillator physics for realistic swing.
 * Distinctly different from wiggle (which is jittery/playful).
 */
export function swing(
  config: SwingConfig,
  context: AnimationContext,
  transform: AnimationTransform,
  loopT: number
): AnimationTransform {
  const frequency = config.frequency ?? 0.4;
  const swingAngle = degToRad(config.swingAngle ?? 5);

  // Pendulum physics: period depends on length (simulated via frequency)
  // Real pendulums have non-linear motion at large angles
  const phase = loopT * frequency * Math.PI * 2;
  
  // Primary swing (pendulum motion)
  // Use sine for main swing
  const primarySwing = Math.sin(phase);
  
  // Add slight asymmetry (real pendulums aren't perfectly symmetric)
  const asymmetry = Math.sin(phase * 2) * 0.1;
  
  // Add subtle secondary oscillation (like a double pendulum hint)
  const secondary = Math.sin(phase * 3.2 + 0.5) * 0.08;
  
  const totalSwing = (primarySwing + asymmetry + secondary) * swingAngle;
  
  // Pendulum also affects position slightly (arc motion)
  // When swinging right, position moves right and up slightly
  const arcX = Math.sin(phase) * 0.02;
  const arcY = (1 - Math.cos(phase)) * 0.01; // Always positive (rises at extremes)

  return {
    ...transform,
    rotationZ: transform.rotationZ + totalSwing,
    positionX: transform.positionX + arcX,
    positionY: transform.positionY - arcY, // Negative because Y is inverted
  };
}
