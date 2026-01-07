/**
 * Stream Event Animation Presets
 *
 * Pre-configured animations optimized for specific stream events.
 */

import type { StreamEventPreset, StreamEventType } from './types';

/**
 * New Subscriber preset - welcoming, celebratory.
 */
export const NEW_SUBSCRIBER_PRESET: StreamEventPreset = {
  id: 'event-new-subscriber',
  name: 'New Subscriber',
  description: 'Welcoming animation for new subscribers',
  vibe: 'hype',
  eventType: 'new_subscriber',
  recommendedDurationMs: 3000,
  isSystem: true,
  entry: {
    type: 'pop_in',
    durationMs: 500,
    scaleFrom: 0,
    bounce: 0.3,
  },
  loop: {
    type: 'pulse',
    scaleMin: 0.98,
    scaleMax: 1.04,
    frequency: 0.8,
  },
  depthEffect: {
    type: 'tilt',
    maxAngleX: 10,
    maxAngleY: 10,
    intensity: 0.5,
  },
  particles: {
    type: 'confetti',
    count: 40,
    colors: ['#9146ff', '#00d4ff', '#ffd700'],
    gravity: 0.4,
    spread: 150,
    lifetimeMs: 2500,
  },
  durationMs: 3000,
  loopCount: 1,
  icon: '⭐',
};

/**
 * Raid preset - dramatic, impactful.
 */
export const RAID_PRESET: StreamEventPreset = {
  id: 'event-raid',
  name: 'Raid Alert',
  description: 'Dramatic animation for incoming raids',
  vibe: 'aggressive',
  eventType: 'raid',
  recommendedDurationMs: 4000,
  isSystem: true,
  entry: {
    type: 'burst',
    durationMs: 600,
    scaleFrom: 3,
    rotationFrom: 20,
    opacityFrom: 0,
  },
  loop: {
    type: 'shake',
    shakeIntensity: 8,
    frequency: 12,
  },
  depthEffect: {
    type: 'pop_out',
    popDistance: 60,
    trigger: 'on_enter',
    intensity: 0.8,
  },
  particles: {
    type: 'fire',
    count: 60,
    colors: ['#ff4500', '#ff6600', '#ffd700'],
    speed: 2,
    turbulence: 0.5,
    lifetimeMs: 2000,
  },
  durationMs: 4000,
  loopCount: 1,
  icon: '⚔️',
};

/**
 * Small donation preset - appreciative, subtle.
 */
export const DONATION_SMALL_PRESET: StreamEventPreset = {
  id: 'event-donation-small',
  name: 'Small Donation',
  description: 'Appreciative animation for small donations',
  vibe: 'playful',
  eventType: 'donation_small',
  recommendedDurationMs: 2500,
  isSystem: true,
  entry: {
    type: 'slide_in',
    durationMs: 400,
    direction: 'bottom',
    distancePercent: 80,
  },
  loop: {
    type: 'float',
    amplitudeY: 5,
    amplitudeX: 2,
    frequency: 0.5,
  },
  depthEffect: {
    type: 'parallax',
    intensity: 0.3,
  },
  particles: {
    type: 'sparkles',
    count: 15,
    color: '#00ff00',
    colorVariance: 0.2,
    lifetimeMs: 2000,
  },
  durationMs: 2500,
  loopCount: 1,
  icon: '💚',
};

/**
 * Medium donation preset - grateful, noticeable.
 */
export const DONATION_MEDIUM_PRESET: StreamEventPreset = {
  id: 'event-donation-medium',
  name: 'Medium Donation',
  description: 'Grateful animation for medium donations',
  vibe: 'hype',
  eventType: 'donation_medium',
  recommendedDurationMs: 3000,
  isSystem: true,
  entry: {
    type: 'pop_in',
    durationMs: 450,
    scaleFrom: 0.2,
    bounce: 0.25,
  },
  loop: {
    type: 'glow',
    color: '#ffd700',
    intensityMin: 0.3,
    intensityMax: 0.7,
    frequency: 0.7,
  },
  depthEffect: {
    type: 'tilt',
    maxAngleX: 8,
    maxAngleY: 8,
    intensity: 0.4,
  },
  particles: {
    type: 'sparkles',
    count: 25,
    colors: ['#ffd700', '#ffff00', '#ffffff'],
    lifetimeMs: 2500,
  },
  durationMs: 3000,
  loopCount: 1,
  icon: '💛',
};

/**
 * Large donation preset - epic, celebratory.
 */
export const DONATION_LARGE_PRESET: StreamEventPreset = {
  id: 'event-donation-large',
  name: 'Large Donation',
  description: 'Epic celebration for large donations',
  vibe: 'hype',
  eventType: 'donation_large',
  recommendedDurationMs: 4000,
  isSystem: true,
  entry: {
    type: 'burst',
    durationMs: 500,
    scaleFrom: 2,
    rotationFrom: 10,
  },
  loop: {
    type: 'rgb_glow',
    speed: 2,
    saturation: 1,
    intensityMin: 0.5,
    intensityMax: 1,
  },
  depthEffect: {
    type: 'pop_out',
    popDistance: 50,
    trigger: 'on_enter',
    intensity: 0.7,
  },
  particles: {
    type: 'confetti',
    count: 80,
    colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
    gravity: 0.3,
    spread: 180,
    lifetimeMs: 3500,
  },
  durationMs: 4000,
  loopCount: 1,
  icon: '💎',
};

/**
 * New follower preset - welcoming, friendly.
 */
export const NEW_FOLLOWER_PRESET: StreamEventPreset = {
  id: 'event-new-follower',
  name: 'New Follower',
  description: 'Friendly welcome for new followers',
  vibe: 'chill',
  eventType: 'new_follower',
  recommendedDurationMs: 2000,
  isSystem: true,
  entry: {
    type: 'fade_in',
    durationMs: 400,
    scaleFrom: 0.9,
    opacityFrom: 0,
  },
  loop: {
    type: 'float',
    amplitudeY: 4,
    amplitudeX: 1,
    frequency: 0.4,
  },
  depthEffect: {
    type: 'parallax',
    intensity: 0.2,
  },
  particles: {
    type: 'sparkles',
    count: 10,
    color: '#87ceeb',
    lifetimeMs: 1800,
  },
  durationMs: 2000,
  loopCount: 1,
  icon: '👋',
};

/**
 * Milestone preset - achievement, pride.
 */
export const MILESTONE_PRESET: StreamEventPreset = {
  id: 'event-milestone',
  name: 'Milestone',
  description: 'Achievement animation for milestones',
  vibe: 'professional',
  eventType: 'milestone',
  recommendedDurationMs: 3500,
  isSystem: true,
  entry: {
    type: 'slide_in',
    durationMs: 500,
    direction: 'left',
    distancePercent: 120,
  },
  loop: {
    type: 'glow',
    color: '#ffd700',
    intensityMin: 0.4,
    intensityMax: 0.8,
    frequency: 0.5,
  },
  depthEffect: {
    type: 'tilt',
    maxAngleX: 5,
    maxAngleY: 5,
    intensity: 0.3,
  },
  particles: {
    type: 'stars',
    count: 20,
    colors: ['#ffd700', '#ffffff'],
    lifetimeMs: 2500,
  },
  durationMs: 3500,
  loopCount: 1,
  icon: '🏆',
};

/**
 * Bits preset - fun, gaming-themed.
 */
export const BITS_PRESET: StreamEventPreset = {
  id: 'event-bits',
  name: 'Bits Cheer',
  description: 'Fun animation for bits cheers',
  vibe: 'playful',
  eventType: 'bits',
  recommendedDurationMs: 2500,
  isSystem: true,
  entry: {
    type: 'spin_in',
    durationMs: 400,
    rotations: 1,
    scaleFrom: 0.3,
  },
  loop: {
    type: 'wiggle',
    angleMax: 5,
    frequency: 4,
  },
  depthEffect: {
    type: 'tilt',
    maxAngleX: 10,
    maxAngleY: 10,
    intensity: 0.5,
  },
  particles: {
    type: 'pixels',
    count: 35,
    colors: ['#9146ff', '#00d4ff', '#ff69b4'],
    lifetimeMs: 2000,
  },
  durationMs: 2500,
  loopCount: 1,
  icon: '💜',
};

/**
 * Gift sub preset - generous, heartfelt.
 */
export const GIFT_SUB_PRESET: StreamEventPreset = {
  id: 'event-gift-sub',
  name: 'Gift Sub',
  description: 'Heartfelt animation for gift subscriptions',
  vibe: 'cute',
  eventType: 'gift_sub',
  recommendedDurationMs: 3000,
  isSystem: true,
  entry: {
    type: 'drop_in',
    durationMs: 500,
    dropHeight: 80,
    opacityFrom: 0,
  },
  loop: {
    type: 'float',
    amplitudeY: 6,
    amplitudeX: 3,
    frequency: 0.4,
  },
  depthEffect: {
    type: 'tilt',
    maxAngleX: 8,
    maxAngleY: 8,
    intensity: 0.4,
  },
  particles: {
    type: 'hearts',
    count: 25,
    colors: ['#ff69b4', '#ff1493', '#9146ff'],
    floatSpeed: 0.6,
    swayAmount: 20,
    lifetimeMs: 3000,
  },
  durationMs: 3000,
  loopCount: 1,
  icon: '🎁',
};

// ============================================================================
// Preset Map
// ============================================================================

/**
 * All event presets indexed by event type.
 */
export const EVENT_PRESETS: Record<StreamEventType, StreamEventPreset> = {
  new_subscriber: NEW_SUBSCRIBER_PRESET,
  raid: RAID_PRESET,
  donation_small: DONATION_SMALL_PRESET,
  donation_medium: DONATION_MEDIUM_PRESET,
  donation_large: DONATION_LARGE_PRESET,
  new_follower: NEW_FOLLOWER_PRESET,
  milestone: MILESTONE_PRESET,
  bits: BITS_PRESET,
  gift_sub: GIFT_SUB_PRESET,
};

/**
 * Get preset by event type.
 */
export function getEventPreset(eventType: StreamEventType): StreamEventPreset {
  return EVENT_PRESETS[eventType];
}

/**
 * Get all event presets as array.
 */
export function getAllEventPresets(): StreamEventPreset[] {
  return Object.values(EVENT_PRESETS);
}
