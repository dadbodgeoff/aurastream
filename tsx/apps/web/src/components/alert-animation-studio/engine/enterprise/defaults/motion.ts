/**
 * Motion Defaults
 * Single responsibility: Default configurations for motion curves and squash/stretch
 */

import type { MotionCurve, SquashStretch, SecondaryMotion } from '../types';

// ============================================================================
// Motion Curve Defaults
// ============================================================================

export const MOTION_CURVE_STANDARD: MotionCurve = {
  anticipation: 0,
  anticipationDistance: 0,
  overshoot: 0,
  settleOscillations: 0,
  settleDamping: 0.5,
};

export const MOTION_CURVE_PROFESSIONAL: MotionCurve = {
  anticipation: 0.08,
  anticipationDistance: 0.05,
  overshoot: 0.12,
  settleOscillations: 2,
  settleDamping: 0.6,
};

export const MOTION_CURVE_ENTERPRISE: MotionCurve = {
  anticipation: 0.12,
  anticipationDistance: 0.08,
  overshoot: 0.18,
  settleOscillations: 3,
  settleDamping: 0.7,
};

// ============================================================================
// Squash/Stretch Defaults
// ============================================================================

export const SQUASH_STRETCH_DISABLED: SquashStretch = {
  enabled: false,
  squashRatio: 1,
  stretchRatio: 1,
  axis: 'velocity',
};

export const SQUASH_STRETCH_SUBTLE: SquashStretch = {
  enabled: true,
  squashRatio: 0.92,
  stretchRatio: 1.08,
  axis: 'velocity',
};

export const SQUASH_STRETCH_PROFESSIONAL: SquashStretch = {
  enabled: true,
  squashRatio: 0.88,
  stretchRatio: 1.12,
  axis: 'velocity',
};

export const SQUASH_STRETCH_ENTERPRISE: SquashStretch = {
  enabled: true,
  squashRatio: 0.85,
  stretchRatio: 1.15,
  axis: 'velocity',
};

// ============================================================================
// Secondary Motion Defaults
// ============================================================================

export const SECONDARY_MOTION_DISABLED: SecondaryMotion = {
  enabled: false,
  delay: 0,
  damping: 0.5,
  rotationInfluence: 0,
};

export const SECONDARY_MOTION_SUBTLE: SecondaryMotion = {
  enabled: true,
  delay: 0.1,
  damping: 0.7,
  rotationInfluence: 0.3,
};

export const SECONDARY_MOTION_PROFESSIONAL: SecondaryMotion = {
  enabled: true,
  delay: 0.15,
  damping: 0.65,
  rotationInfluence: 0.5,
};

export const SECONDARY_MOTION_ENTERPRISE: SecondaryMotion = {
  enabled: true,
  delay: 0.2,
  damping: 0.6,
  rotationInfluence: 0.7,
};
