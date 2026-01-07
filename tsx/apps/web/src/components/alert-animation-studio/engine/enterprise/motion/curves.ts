/**
 * Motion Curves
 * Single responsibility: Apply professional motion curves with anticipation, overshoot, and settle
 */

import type { MotionCurve } from '../types';

/**
 * Apply a professional motion curve to a normalized progress value.
 * Implements anticipation (wind-up), overshoot, and settle oscillations.
 * 
 * @param t - Normalized progress (0-1)
 * @param curve - Motion curve configuration
 * @returns Modified progress value (may exceed 0-1 during overshoot)
 */
export function applyMotionCurve(t: number, curve: MotionCurve): number {
  if (t <= 0) return 0;
  if (t >= 1 && curve.settleOscillations === 0) return 1;

  const { anticipation, anticipationDistance, overshoot, settleOscillations, settleDamping } = curve;

  // Phase 1: Anticipation (wind-up before main motion)
  if (anticipation > 0 && t < anticipation) {
    const anticipationT = t / anticipation;
    // Ease into anticipation, then pull back
    const eased = easeInQuad(anticipationT);
    return -anticipationDistance * Math.sin(eased * Math.PI);
  }

  // Adjust t to account for anticipation phase
  const mainT = anticipation > 0 ? (t - anticipation) / (1 - anticipation) : t;

  if (mainT >= 1) {
    // Phase 3: Settle oscillations (after main motion)
    if (settleOscillations > 0) {
      const settleT = mainT - 1;
      const oscillation = Math.sin(settleT * Math.PI * 2 * settleOscillations);
      const decay = Math.exp(-settleT * 10 * settleDamping);
      return 1 + oscillation * overshoot * decay * 0.3;
    }
    return 1;
  }

  // Phase 2: Main motion with overshoot
  if (overshoot > 0) {
    return applyOvershoot(mainT, overshoot);
  }

  // Simple ease out if no overshoot
  return easeOutCubic(mainT);
}

/**
 * Apply overshoot to a progress value.
 * Goes past 1.0 then settles back.
 */
function applyOvershoot(t: number, amount: number): number {
  // Custom overshoot curve: goes to 1 + amount, then settles to 1
  const c1 = 1.70158 * (1 + amount);
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Calculate velocity at a given point in the motion curve.
 * Useful for squash/stretch calculations.
 */
export function getMotionVelocity(t: number, curve: MotionCurve, deltaT: number = 0.01): number {
  const t1 = Math.max(0, t - deltaT);
  const t2 = Math.min(1, t + deltaT);
  const v1 = applyMotionCurve(t1, curve);
  const v2 = applyMotionCurve(t2, curve);
  return (v2 - v1) / (t2 - t1);
}

/**
 * Check if motion is in anticipation phase.
 */
export function isInAnticipation(t: number, curve: MotionCurve): boolean {
  return curve.anticipation > 0 && t < curve.anticipation;
}

/**
 * Check if motion is in settle phase.
 */
export function isInSettle(t: number, curve: MotionCurve): boolean {
  const mainT = curve.anticipation > 0 ? (t - curve.anticipation) / (1 - curve.anticipation) : t;
  return mainT > 1 && curve.settleOscillations > 0;
}

// ============================================================================
// Basic Easing Functions (internal use)
// ============================================================================

function easeInQuad(t: number): number {
  return t * t;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
