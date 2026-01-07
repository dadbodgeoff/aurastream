/**
 * Enterprise Event Presets
 * Single responsibility: Event-specific animation presets with enterprise enhancements
 */

import type { EnterpriseEventPreset, StreamEventType } from './types';
import {
  ENTRY_CONFIG_ENTERPRISE,
  LOOP_CONFIG_ENTERPRISE,
  PARTICLE_CONFIG_ENTERPRISE,
  MOTION_CURVE_ENTERPRISE,
  COLOR_EVOLUTION_FIRE,
  COLOR_EVOLUTION_SPARKLE,
  PARTICLE_TRAILS_ENTERPRISE,
  SIZE_EVOLUTION_BURST,
} from '../defaults';

// ============================================================================
// New Subscriber - Welcoming, celebratory
// ============================================================================

export const ENTERPRISE_NEW_SUBSCRIBER_PRESET: EnterpriseEventPreset = {
  id: 'enterprise-event-new-subscriber',
  name: 'New Subscriber',
  description: 'Welcoming celebration for new subscribers',
  vibe: 'hype',
  icon: '⭐',
  eventType: 'new_subscriber',
  recommendedDurationMs: 4000,
  isSystem: true,
  
  entry: {
    type: 'pop_in',
    durationMs: 600,
    scaleFrom: 0,
    bounce: 0.4,
    easing: 'elastic.out',
  },
  
  loop: {
    type: 'glow',
    color: '#9146ff',
    intensityMin: 0.4,
    intensityMax: 0.9,
    frequency: 0.7,
    blurRadius: 25,
  },
  
  depthEffect: {
    type: 'tilt',
    maxAngleX: 12,
    maxAngleY: 12,
    intensity: 0.6,
  },
  
  particles: {
    type: 'confetti',
    count: 60,
    colors: ['#9146ff', '#00d4ff', '#ffd700', '#ff69b4'],
    gravity: 0.4,
    spread: 160,
    lifetimeMs: 3500,
    sizeMin: 8,
    sizeMax: 12,
  },
  
  enterpriseEntry: {
    ...ENTRY_CONFIG_ENTERPRISE,
    motionCurve: {
      ...MOTION_CURVE_ENTERPRISE,
      overshoot: 0.2,
      settleOscillations: 3,
    },
    staggerDelay: 50,
    staggerDirection: 'center',
  },
  
  enterpriseLoop: LOOP_CONFIG_ENTERPRISE,
  
  enterpriseParticles: {
    ...PARTICLE_CONFIG_ENTERPRISE,
    colorEvolution: COLOR_EVOLUTION_SPARKLE,
    trails: { ...PARTICLE_TRAILS_ENTERPRISE, length: 5 },
    emissionCurve: { type: 'burst', burstCount: 30, burstInterval: 400 },
  },
  
  durationMs: 4000,
  loopCount: 1,
  tags: ['subscriber', 'welcome', 'celebration', 'twitch'],
};

// ============================================================================
// Raid - Dramatic, impactful
// ============================================================================

export const ENTERPRISE_RAID_PRESET: EnterpriseEventPreset = {
  id: 'enterprise-event-raid',
  name: 'Raid Alert',
  description: 'Dramatic animation for incoming raids',
  vibe: 'aggressive',
  icon: '⚔️',
  eventType: 'raid',
  recommendedDurationMs: 5000,
  isSystem: true,
  
  entry: {
    type: 'burst',
    durationMs: 700,
    scaleFrom: 4,
    rotationFrom: 30,
    opacityFrom: 0,
    easing: 'power4.out',
  },
  
  loop: {
    type: 'shake',
    shakeIntensity: 15,
    frequency: 20,
  },
  
  depthEffect: {
    type: 'pop_out',
    popDistance: 100,
    trigger: 'on_enter',
    intensity: 1,
  },
  
  particles: {
    type: 'fire',
    count: 100,
    colors: ['#ff4500', '#ff6600', '#ffd700', '#ffffff'],
    speed: 3,
    turbulence: 0.7,
    lifetimeMs: 2500,
    sizeMin: 8,
    sizeMax: 20,
  },
  
  enterpriseEntry: {
    motionCurve: {
      anticipation: 0.08,
      anticipationDistance: 0.12,
      overshoot: 0.18,
      settleOscillations: 2,
      settleDamping: 0.75,
    },
    squashStretch: {
      enabled: true,
      squashRatio: 0.7,
      stretchRatio: 1.3,
      axis: 'velocity',
    },
    secondaryMotion: {
      enabled: true,
      delay: 0.25,
      damping: 0.55,
      rotationInfluence: 0.8,
    },
    staggerDelay: 25,
    staggerDirection: 'center',
  },
  
  enterpriseLoop: LOOP_CONFIG_ENTERPRISE,
  
  enterpriseParticles: {
    ...PARTICLE_CONFIG_ENTERPRISE,
    colorEvolution: COLOR_EVOLUTION_FIRE,
    sizeEvolution: SIZE_EVOLUTION_BURST,
    trails: { ...PARTICLE_TRAILS_ENTERPRISE, length: 10 },
    drag: 0.015,
  },
  
  durationMs: 5000,
  loopCount: 1,
  tags: ['raid', 'dramatic', 'fire', 'intense', 'twitch'],
};

// ============================================================================
// Large Donation - Epic celebration
// ============================================================================

export const ENTERPRISE_DONATION_LARGE_PRESET: EnterpriseEventPreset = {
  id: 'enterprise-event-donation-large',
  name: 'Large Donation',
  description: 'Epic celebration for generous donations',
  vibe: 'hype',
  icon: '💎',
  eventType: 'donation_large',
  recommendedDurationMs: 5000,
  isSystem: true,
  
  entry: {
    type: 'burst',
    durationMs: 600,
    scaleFrom: 2.5,
    rotationFrom: 15,
    easing: 'back.out',
  },
  
  loop: {
    type: 'rgb_glow',
    speed: 2.5,
    saturation: 1,
    intensityMin: 0.6,
    intensityMax: 1,
  },
  
  depthEffect: {
    type: 'pop_out',
    popDistance: 70,
    trigger: 'on_enter',
    intensity: 0.85,
  },
  
  particles: {
    type: 'confetti',
    count: 150,
    colors: ['#ffd700', '#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff'],
    gravity: 0.3,
    spread: 200,
    lifetimeMs: 4500,
    sizeMin: 10,
    sizeMax: 16,
  },
  
  enterpriseEntry: {
    ...ENTRY_CONFIG_ENTERPRISE,
    motionCurve: {
      anticipation: 0.1,
      anticipationDistance: 0.08,
      overshoot: 0.25,
      settleOscillations: 4,
      settleDamping: 0.6,
    },
    staggerDelay: 40,
    staggerDirection: 'center',
  },
  
  enterpriseLoop: LOOP_CONFIG_ENTERPRISE,
  
  enterpriseParticles: {
    ...PARTICLE_CONFIG_ENTERPRISE,
    trails: { ...PARTICLE_TRAILS_ENTERPRISE, length: 8 },
    emissionCurve: { type: 'burst', burstCount: 50, burstInterval: 250 },
  },
  
  durationMs: 5000,
  loopCount: 1,
  tags: ['donation', 'money', 'celebration', 'epic', 'generous'],
};

// ============================================================================
// New Follower - Friendly welcome
// ============================================================================

export const ENTERPRISE_NEW_FOLLOWER_PRESET: EnterpriseEventPreset = {
  id: 'enterprise-event-new-follower',
  name: 'New Follower',
  description: 'Friendly welcome for new followers',
  vibe: 'chill',
  icon: '👋',
  eventType: 'new_follower',
  recommendedDurationMs: 2500,
  isSystem: true,
  
  entry: {
    type: 'fade_in',
    durationMs: 500,
    scaleFrom: 0.9,
    opacityFrom: 0,
    easing: 'power2.out',
  },
  
  loop: {
    type: 'float',
    amplitudeY: 5,
    amplitudeX: 2,
    frequency: 0.4,
  },
  
  depthEffect: {
    type: 'parallax',
    intensity: 0.25,
  },
  
  particles: {
    type: 'sparkles',
    count: 15,
    color: '#87ceeb',
    colorVariance: 0.3,
    lifetimeMs: 2000,
    sizeMin: 2,
    sizeMax: 5,
  },
  
  enterpriseEntry: {
    motionCurve: {
      anticipation: 0,
      anticipationDistance: 0,
      overshoot: 0.08,
      settleOscillations: 1,
      settleDamping: 0.85,
    },
    squashStretch: { enabled: false, squashRatio: 1, stretchRatio: 1, axis: 'y' },
    secondaryMotion: { enabled: true, delay: 0.1, damping: 0.75, rotationInfluence: 0.25 },
    staggerDelay: 80,
    staggerDirection: 'forward',
  },
  
  enterpriseLoop: {
    ...LOOP_CONFIG_ENTERPRISE,
    microJitter: { enabled: true, positionAmplitude: 0.3, rotationAmplitude: 0.15, scaleAmplitude: 0.002, frequency: 10 },
  },
  
  enterpriseParticles: PARTICLE_CONFIG_ENTERPRISE,
  
  durationMs: 2500,
  loopCount: 1,
  tags: ['follower', 'welcome', 'friendly', 'subtle'],
};

// ============================================================================
// Bits Cheer - Fun, gaming-themed
// ============================================================================

export const ENTERPRISE_BITS_PRESET: EnterpriseEventPreset = {
  id: 'enterprise-event-bits',
  name: 'Bits Cheer',
  description: 'Fun animation for bits cheers',
  vibe: 'playful',
  icon: '💜',
  eventType: 'bits',
  recommendedDurationMs: 3000,
  isSystem: true,
  
  entry: {
    type: 'spin_in',
    durationMs: 500,
    rotations: 1.5,
    scaleFrom: 0.2,
    direction: 1,
    easing: 'power3.out',
  },
  
  loop: {
    type: 'wiggle',
    angleMax: 8,
    frequency: 5,
  },
  
  depthEffect: {
    type: 'tilt',
    maxAngleX: 15,
    maxAngleY: 15,
    intensity: 0.65,
  },
  
  particles: {
    type: 'pixels',
    count: 50,
    colors: ['#9146ff', '#00d4ff', '#ff69b4', '#ffd700'],
    lifetimeMs: 2500,
    sizeMin: 3,
    sizeMax: 8,
    explosionForce: 4,
  },
  
  enterpriseEntry: {
    ...ENTRY_CONFIG_ENTERPRISE,
    motionCurve: {
      anticipation: 0.06,
      anticipationDistance: 0.04,
      overshoot: 0.15,
      settleOscillations: 2,
      settleDamping: 0.7,
    },
  },
  
  enterpriseLoop: LOOP_CONFIG_ENTERPRISE,
  
  enterpriseParticles: {
    ...PARTICLE_CONFIG_ENTERPRISE,
    trails: { ...PARTICLE_TRAILS_ENTERPRISE, length: 6 },
  },
  
  durationMs: 3000,
  loopCount: 1,
  tags: ['bits', 'cheer', 'gaming', 'fun', 'twitch'],
};

// ============================================================================
// Preset Map
// ============================================================================

export const ENTERPRISE_EVENT_PRESETS: Record<StreamEventType, EnterpriseEventPreset> = {
  new_subscriber: ENTERPRISE_NEW_SUBSCRIBER_PRESET,
  raid: ENTERPRISE_RAID_PRESET,
  donation_small: { ...ENTERPRISE_NEW_FOLLOWER_PRESET, eventType: 'donation_small', id: 'enterprise-event-donation-small' },
  donation_medium: { ...ENTERPRISE_NEW_SUBSCRIBER_PRESET, eventType: 'donation_medium', id: 'enterprise-event-donation-medium' },
  donation_large: ENTERPRISE_DONATION_LARGE_PRESET,
  new_follower: ENTERPRISE_NEW_FOLLOWER_PRESET,
  milestone: { ...ENTERPRISE_NEW_SUBSCRIBER_PRESET, eventType: 'milestone', id: 'enterprise-event-milestone', icon: '🏆' },
  bits: ENTERPRISE_BITS_PRESET,
  gift_sub: { ...ENTERPRISE_NEW_SUBSCRIBER_PRESET, eventType: 'gift_sub', id: 'enterprise-event-gift-sub', icon: '🎁' },
};

export function getEnterpriseEventPreset(eventType: StreamEventType): EnterpriseEventPreset {
  return ENTERPRISE_EVENT_PRESETS[eventType];
}

export function getAllEnterpriseEventPresets(): EnterpriseEventPreset[] {
  return Object.values(ENTERPRISE_EVENT_PRESETS);
}
