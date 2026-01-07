/**
 * Enterprise Vibe Presets
 * Single responsibility: Vibe-based animation presets with enterprise enhancements
 */

import type { EnterprisePreset, AnimationVibe } from './types';
import {
  ENTRY_CONFIG_ENTERPRISE,
  LOOP_CONFIG_ENTERPRISE,
  PARTICLE_CONFIG_ENTERPRISE,
  MOTION_CURVE_ENTERPRISE,
  SQUASH_STRETCH_ENTERPRISE,
  SECONDARY_MOTION_ENTERPRISE,
  COLOR_EVOLUTION_FIRE,
  COLOR_EVOLUTION_SPARKLE,
  PARTICLE_TRAILS_ENTERPRISE,
  SIZE_EVOLUTION_BURST,
} from '../defaults';

// ============================================================================
// Cute Vibe - Bouncy, playful, hearts
// ============================================================================

export const ENTERPRISE_CUTE_PRESET: EnterprisePreset = {
  id: 'enterprise-vibe-cute',
  name: 'Cute & Kawaii',
  description: 'Bouncy, playful animations with heart particles and soft motion',
  vibe: 'cute',
  icon: '💕',
  
  entry: {
    type: 'bounce',
    durationMs: 700,
    bounces: 4,
    height: 60,
    scaleFrom: 0,
    easing: 'elastic.out',
  },
  
  loop: {
    type: 'float',
    amplitudeY: 10,
    amplitudeX: 4,
    frequency: 0.35,
  },
  
  depthEffect: {
    type: 'tilt',
    maxAngleX: 12,
    maxAngleY: 12,
    perspective: 800,
    intensity: 0.6,
  },
  
  particles: {
    type: 'hearts',
    count: 35,
    colors: ['#ff69b4', '#ff1493', '#ff6b6b', '#ffb6c1'],
    floatSpeed: 0.7,
    swayAmount: 25,
    lifetimeMs: 4000,
    sizeMin: 10,
    sizeMax: 20,
  },
  
  enterpriseEntry: {
    ...ENTRY_CONFIG_ENTERPRISE,
    motionCurve: {
      ...MOTION_CURVE_ENTERPRISE,
      overshoot: 0.25,
      settleOscillations: 4,
    },
    squashStretch: {
      ...SQUASH_STRETCH_ENTERPRISE,
      squashRatio: 0.8,
      stretchRatio: 1.2,
    },
  },
  
  enterpriseLoop: {
    ...LOOP_CONFIG_ENTERPRISE,
    phaseRandomization: Math.PI / 3,
  },
  
  enterpriseParticles: {
    ...PARTICLE_CONFIG_ENTERPRISE,
    colorEvolution: COLOR_EVOLUTION_SPARKLE,
    trails: { ...PARTICLE_TRAILS_ENTERPRISE, length: 4 },
  },
  
  durationMs: 4000,
  loopCount: 1,
  recommendedEvent: 'gift_sub',
  tags: ['cute', 'kawaii', 'hearts', 'bouncy', 'playful'],
};

// ============================================================================
// Aggressive Vibe - Explosive, fiery, intense
// ============================================================================

export const ENTERPRISE_AGGRESSIVE_PRESET: EnterprisePreset = {
  id: 'enterprise-vibe-aggressive',
  name: 'Aggressive & Intense',
  description: 'Explosive entry with fire particles for maximum impact',
  vibe: 'aggressive',
  icon: '🔥',
  
  entry: {
    type: 'burst',
    durationMs: 600,
    scaleFrom: 3.5,
    rotationFrom: 25,
    opacityFrom: 0,
    easing: 'power4.out',
  },
  
  loop: {
    type: 'shake',
    shakeIntensity: 12,
    frequency: 18,
  },
  
  depthEffect: {
    type: 'pop_out',
    popDistance: 80,
    trigger: 'on_enter',
    popDurationMs: 800,
    intensity: 0.9,
  },
  
  particles: {
    type: 'fire',
    count: 80,
    colors: ['#ff4500', '#ff6600', '#ff8c00', '#ffd700', '#ffffff'],
    speed: 2.5,
    turbulence: 0.6,
    lifetimeMs: 2000,
    sizeMin: 6,
    sizeMax: 18,
  },
  
  enterpriseEntry: {
    ...ENTRY_CONFIG_ENTERPRISE,
    motionCurve: {
      anticipation: 0.05,
      anticipationDistance: 0.1,
      overshoot: 0.15,
      settleOscillations: 2,
      settleDamping: 0.8,
    },
    squashStretch: {
      enabled: true,
      squashRatio: 0.75,
      stretchRatio: 1.25,
      axis: 'velocity',
    },
    staggerDelay: 30,
  },
  
  enterpriseLoop: LOOP_CONFIG_ENTERPRISE,
  
  enterpriseParticles: {
    ...PARTICLE_CONFIG_ENTERPRISE,
    colorEvolution: COLOR_EVOLUTION_FIRE,
    sizeEvolution: SIZE_EVOLUTION_BURST,
    drag: 0.02,
    airResistance: 0.015,
  },
  
  durationMs: 4500,
  loopCount: 1,
  recommendedEvent: 'raid',
  tags: ['aggressive', 'intense', 'fire', 'explosive', 'dramatic'],
};

// ============================================================================
// Hype Vibe - Celebratory, confetti, glowing
// ============================================================================

export const ENTERPRISE_HYPE_PRESET: EnterprisePreset = {
  id: 'enterprise-vibe-hype',
  name: 'Hype & Celebration',
  description: 'Maximum celebration with confetti explosion and rainbow glow',
  vibe: 'hype',
  icon: '🎉',
  
  entry: {
    type: 'pop_in',
    durationMs: 500,
    scaleFrom: 0,
    bounce: 0.5,
    easing: 'elastic.out',
  },
  
  loop: {
    type: 'rgb_glow',
    speed: 3,
    saturation: 1,
    intensityMin: 0.5,
    intensityMax: 1,
  },
  
  depthEffect: {
    type: 'pop_out',
    popDistance: 60,
    trigger: 'on_enter',
    popDurationMs: 700,
    intensity: 0.75,
  },
  
  particles: {
    type: 'confetti',
    count: 120,
    colors: ['#ff0000', '#ff8c00', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'],
    gravity: 0.35,
    spread: 200,
    lifetimeMs: 4000,
    sizeMin: 8,
    sizeMax: 14,
  },
  
  enterpriseEntry: {
    ...ENTRY_CONFIG_ENTERPRISE,
    motionCurve: {
      anticipation: 0.1,
      anticipationDistance: 0.06,
      overshoot: 0.22,
      settleOscillations: 3,
      settleDamping: 0.65,
    },
    staggerDelay: 60,
    staggerDirection: 'center',
  },
  
  enterpriseLoop: LOOP_CONFIG_ENTERPRISE,
  
  enterpriseParticles: {
    ...PARTICLE_CONFIG_ENTERPRISE,
    trails: { ...PARTICLE_TRAILS_ENTERPRISE, length: 6 },
    emissionCurve: { type: 'burst', burstCount: 40, burstInterval: 300 },
  },
  
  durationMs: 5000,
  loopCount: 1,
  recommendedEvent: 'donation_large',
  tags: ['hype', 'celebration', 'confetti', 'party', 'rainbow'],
};

// ============================================================================
// Chill Vibe - Smooth, gentle, relaxed
// ============================================================================

export const ENTERPRISE_CHILL_PRESET: EnterprisePreset = {
  id: 'enterprise-vibe-chill',
  name: 'Chill & Relaxed',
  description: 'Smooth, gentle animations that don\'t overwhelm',
  vibe: 'chill',
  icon: '✨',
  
  entry: {
    type: 'fade_in',
    durationMs: 800,
    scaleFrom: 0.92,
    opacityFrom: 0,
    easing: 'sine.inOut',
  },
  
  loop: {
    type: 'breathe',
    scaleMin: 0.96,
    scaleMax: 1.04,
    frequency: 0.25,
  },
  
  depthEffect: {
    type: 'parallax',
    intensity: 0.35,
    trigger: 'mouse',
  },
  
  particles: {
    type: 'sparkles',
    count: 20,
    color: '#87ceeb',
    colorVariance: 0.4,
    sizeMin: 2,
    sizeMax: 6,
    lifetimeMs: 3000,
    speed: 0.5,
  },
  
  enterpriseEntry: {
    motionCurve: {
      anticipation: 0,
      anticipationDistance: 0,
      overshoot: 0.05,
      settleOscillations: 1,
      settleDamping: 0.9,
    },
    squashStretch: { enabled: false, squashRatio: 1, stretchRatio: 1, axis: 'y' },
    secondaryMotion: { enabled: true, delay: 0.08, damping: 0.8, rotationInfluence: 0.2 },
    staggerDelay: 100,
    staggerDirection: 'forward',
  },
  
  enterpriseLoop: {
    ...LOOP_CONFIG_ENTERPRISE,
    microJitter: { enabled: true, positionAmplitude: 0.2, rotationAmplitude: 0.1, scaleAmplitude: 0.001, frequency: 8 },
  },
  
  enterpriseParticles: {
    ...PARTICLE_CONFIG_ENTERPRISE,
    trails: { enabled: false, length: 0, opacityDecay: 0.8, sizeDecay: 0.9, updateFrequency: 2 },
  },
  
  durationMs: 3500,
  loopCount: 1,
  recommendedEvent: 'new_follower',
  tags: ['chill', 'relaxed', 'calm', 'gentle', 'smooth'],
};

// ============================================================================
// Professional Vibe - Clean, subtle, credible
// ============================================================================

export const ENTERPRISE_PROFESSIONAL_PRESET: EnterprisePreset = {
  id: 'enterprise-vibe-professional',
  name: 'Professional & Clean',
  description: 'Clean, subtle animations that maintain credibility',
  vibe: 'professional',
  icon: '💼',
  
  entry: {
    type: 'slide_in',
    durationMs: 500,
    direction: 'left',
    distancePercent: 110,
    easing: 'power2.out',
  },
  
  loop: {
    type: 'pulse',
    scaleMin: 0.98,
    scaleMax: 1.02,
    frequency: 0.5,
  },
  
  depthEffect: {
    type: 'parallax',
    intensity: 0.2,
    trigger: 'mouse',
  },
  
  particles: null,
  
  enterpriseEntry: {
    motionCurve: {
      anticipation: 0.05,
      anticipationDistance: 0.02,
      overshoot: 0.08,
      settleOscillations: 1,
      settleDamping: 0.85,
    },
    squashStretch: { enabled: false, squashRatio: 1, stretchRatio: 1, axis: 'y' },
    secondaryMotion: SECONDARY_MOTION_ENTERPRISE,
    staggerDelay: 40,
    staggerDirection: 'forward',
  },
  
  enterpriseLoop: {
    ...LOOP_CONFIG_ENTERPRISE,
    noise: { enabled: false, type: 'fbm', frequency: 1, amplitude: 0, octaves: 2, persistence: 0.5, seed: 0 },
    microJitter: { enabled: false, positionAmplitude: 0, rotationAmplitude: 0, scaleAmplitude: 0, frequency: 10 },
  },
  
  enterpriseParticles: PARTICLE_CONFIG_ENTERPRISE,
  
  durationMs: 3000,
  loopCount: 1,
  recommendedEvent: 'milestone',
  tags: ['professional', 'clean', 'subtle', 'business', 'minimal'],
};

// ============================================================================
// Preset Map
// ============================================================================

export const ENTERPRISE_VIBE_PRESETS: Record<AnimationVibe, EnterprisePreset> = {
  cute: ENTERPRISE_CUTE_PRESET,
  aggressive: ENTERPRISE_AGGRESSIVE_PRESET,
  hype: ENTERPRISE_HYPE_PRESET,
  chill: ENTERPRISE_CHILL_PRESET,
  professional: ENTERPRISE_PROFESSIONAL_PRESET,
  playful: ENTERPRISE_CUTE_PRESET, // Alias for now
  dark: ENTERPRISE_AGGRESSIVE_PRESET, // Alias for now
  retro: ENTERPRISE_HYPE_PRESET, // Alias for now
};

export function getEnterpriseVibePreset(vibe: AnimationVibe): EnterprisePreset {
  return ENTERPRISE_VIBE_PRESETS[vibe];
}

export function getAllEnterpriseVibePresets(): EnterprisePreset[] {
  return Object.values(ENTERPRISE_VIBE_PRESETS);
}
