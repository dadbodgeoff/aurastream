/**
 * Global Animation Config Defaults
 * Single responsibility: Top-level animation configuration defaults and tier getters
 */

import type { AnimationTier, EnterpriseAnimationConfig, EnterpriseEntryConfig } from '../types';
import {
  MOTION_CURVE_STANDARD,
  MOTION_CURVE_PROFESSIONAL,
  MOTION_CURVE_ENTERPRISE,
  SQUASH_STRETCH_DISABLED,
  SQUASH_STRETCH_SUBTLE,
  SQUASH_STRETCH_ENTERPRISE,
  SECONDARY_MOTION_DISABLED,
  SECONDARY_MOTION_SUBTLE,
  SECONDARY_MOTION_ENTERPRISE,
} from './motion';
import { LOOP_CONFIG_STANDARD, LOOP_CONFIG_PROFESSIONAL, LOOP_CONFIG_ENTERPRISE } from './loop';
import { PARTICLE_CONFIG_STANDARD, PARTICLE_CONFIG_PROFESSIONAL, PARTICLE_CONFIG_ENTERPRISE } from './particles';

// ============================================================================
// Global Animation Config Defaults
// ============================================================================

export const ANIMATION_CONFIG_STANDARD: EnterpriseAnimationConfig = {
  tier: 'standard',
  useGPU: false,
  maxParticles: 500,
  motionBlur: false,
  particleTrails: false,
  qualityMultiplier: 1,
};

export const ANIMATION_CONFIG_PROFESSIONAL: EnterpriseAnimationConfig = {
  tier: 'professional',
  useGPU: true,
  maxParticles: 2000,
  motionBlur: false,
  particleTrails: true,
  qualityMultiplier: 1.5,
};

export const ANIMATION_CONFIG_ENTERPRISE: EnterpriseAnimationConfig = {
  tier: 'enterprise',
  useGPU: true,
  maxParticles: 5000,
  motionBlur: true,
  particleTrails: true,
  qualityMultiplier: 2,
};

// ============================================================================
// Composite Entry Config Defaults
// ============================================================================

export const ENTRY_CONFIG_STANDARD: EnterpriseEntryConfig = {
  motionCurve: MOTION_CURVE_STANDARD,
  squashStretch: SQUASH_STRETCH_DISABLED,
  secondaryMotion: SECONDARY_MOTION_DISABLED,
  staggerDelay: 0,
  staggerDirection: 'forward',
};

export const ENTRY_CONFIG_PROFESSIONAL: EnterpriseEntryConfig = {
  motionCurve: MOTION_CURVE_PROFESSIONAL,
  squashStretch: SQUASH_STRETCH_SUBTLE,
  secondaryMotion: SECONDARY_MOTION_SUBTLE,
  staggerDelay: 50,
  staggerDirection: 'forward',
};

export const ENTRY_CONFIG_ENTERPRISE: EnterpriseEntryConfig = {
  motionCurve: MOTION_CURVE_ENTERPRISE,
  squashStretch: SQUASH_STRETCH_ENTERPRISE,
  secondaryMotion: SECONDARY_MOTION_ENTERPRISE,
  staggerDelay: 80,
  staggerDirection: 'center',
};

// ============================================================================
// Tier-Based Getters
// ============================================================================

export function getAnimationConfigForTier(tier: AnimationTier): EnterpriseAnimationConfig {
  switch (tier) {
    case 'enterprise': return { ...ANIMATION_CONFIG_ENTERPRISE };
    case 'professional': return { ...ANIMATION_CONFIG_PROFESSIONAL };
    default: return { ...ANIMATION_CONFIG_STANDARD };
  }
}

export function getEntryConfigForTier(tier: AnimationTier): EnterpriseEntryConfig {
  switch (tier) {
    case 'enterprise': return { ...ENTRY_CONFIG_ENTERPRISE };
    case 'professional': return { ...ENTRY_CONFIG_PROFESSIONAL };
    default: return { ...ENTRY_CONFIG_STANDARD };
  }
}

export function getLoopConfigForTier(tier: AnimationTier) {
  switch (tier) {
    case 'enterprise': return { ...LOOP_CONFIG_ENTERPRISE };
    case 'professional': return { ...LOOP_CONFIG_PROFESSIONAL };
    default: return { ...LOOP_CONFIG_STANDARD };
  }
}

export function getParticleConfigForTier(tier: AnimationTier) {
  switch (tier) {
    case 'enterprise': return { ...PARTICLE_CONFIG_ENTERPRISE };
    case 'professional': return { ...PARTICLE_CONFIG_PROFESSIONAL };
    default: return { ...PARTICLE_CONFIG_STANDARD };
  }
}
