/**
 * Vibe-Based Animation Presets
 *
 * Pre-configured animation combinations based on mood/aesthetic.
 */

import type { AnimationPreset, AnimationVibe } from './types';

/**
 * Cute vibe preset - playful, bouncy, hearts.
 */
export const CUTE_PRESET: AnimationPreset = {
  id: 'vibe-cute',
  name: 'Cute & Kawaii',
  description: 'Bouncy, playful animations with heart particles',
  vibe: 'cute',
  entry: {
    type: 'bounce',
    durationMs: 600,
    bounces: 3,
    height: 40,
    scaleFrom: 0,
  },
  loop: {
    type: 'float',
    amplitudeY: 6,
    amplitudeX: 2,
    frequency: 0.4,
  },
  depthEffect: {
    type: 'tilt',
    maxAngleX: 8,
    maxAngleY: 8,
    perspective: 1000,
    intensity: 0.5,
  },
  particles: {
    type: 'hearts',
    count: 20,
    color: '#ff69b4',
    colors: ['#ff69b4', '#ff1493', '#ff6b6b'],
    floatSpeed: 0.5,
    swayAmount: 15,
    lifetimeMs: 3500,
  },
  durationMs: 3000,
  loopCount: 1,
  recommendedEvent: 'new_subscriber',
  icon: '💕',
};

/**
 * Aggressive vibe preset - explosive, fiery, intense.
 */
export const AGGRESSIVE_PRESET: AnimationPreset = {
  id: 'vibe-aggressive',
  name: 'Aggressive & Intense',
  description: 'Explosive entry with fire particles for maximum impact',
  vibe: 'aggressive',
  entry: {
    type: 'burst',
    durationMs: 500,
    scaleFrom: 2.5,
    rotationFrom: 15,
    opacityFrom: 0,
  },
  loop: {
    type: 'pulse',
    scaleMin: 0.95,
    scaleMax: 1.08,
    frequency: 1.2,
  },
  depthEffect: {
    type: 'pop_out',
    popDistance: 50,
    trigger: 'on_enter',
    popDurationMs: 700,
    intensity: 0.7,
  },
  particles: {
    type: 'fire',
    count: 45,
    colors: ['#ff4500', '#ff6600', '#ff8c00'],
    speed: 1.5,
    turbulence: 0.4,
    lifetimeMs: 1800,
  },
  durationMs: 3000,
  loopCount: 1,
  recommendedEvent: 'raid',
  icon: '🔥',
};

/**
 * Chill vibe preset - smooth, gentle, relaxed.
 */
export const CHILL_PRESET: AnimationPreset = {
  id: 'vibe-chill',
  name: 'Chill & Relaxed',
  description: 'Smooth, gentle animations that don\'t overwhelm',
  vibe: 'chill',
  entry: {
    type: 'fade_in',
    durationMs: 600,
    scaleFrom: 0.95,
    opacityFrom: 0,
  },
  loop: {
    type: 'float',
    amplitudeY: 4,
    amplitudeX: 1,
    frequency: 0.3,
  },
  depthEffect: {
    type: 'parallax',
    intensity: 0.3,
    trigger: 'mouse',
  },
  particles: {
    type: 'sparkles',
    count: 12,
    color: '#87ceeb',
    colorVariance: 0.3,
    sizeMin: 2,
    sizeMax: 5,
    lifetimeMs: 2500,
  },
  durationMs: 3000,
  loopCount: 1,
  recommendedEvent: 'new_follower',
  icon: '✨',
};

/**
 * Hype vibe preset - celebratory, confetti, glowing.
 */
export const HYPE_PRESET: AnimationPreset = {
  id: 'vibe-hype',
  name: 'Hype & Celebration',
  description: 'Maximum celebration with confetti and glowing effects',
  vibe: 'hype',
  entry: {
    type: 'pop_in',
    durationMs: 400,
    scaleFrom: 0,
    bounce: 0.4,
  },
  loop: {
    type: 'glow',
    color: '#ffd700',
    intensityMin: 0.3,
    intensityMax: 0.9,
    frequency: 0.8,
    blurRadius: 20,
  },
  depthEffect: {
    type: 'pop_out',
    popDistance: 40,
    trigger: 'on_enter',
    popDurationMs: 600,
    intensity: 0.6,
  },
  particles: {
    type: 'confetti',
    count: 60,
    colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'],
    gravity: 0.4,
    spread: 180,
    lifetimeMs: 3000,
  },
  durationMs: 3000,
  loopCount: 1,
  recommendedEvent: 'donation_large',
  icon: '🎉',
};

/**
 * Professional vibe preset - clean, subtle, credible.
 */
export const PROFESSIONAL_PRESET: AnimationPreset = {
  id: 'vibe-professional',
  name: 'Professional & Clean',
  description: 'Clean, subtle animations that maintain credibility',
  vibe: 'professional',
  entry: {
    type: 'slide_in',
    durationMs: 400,
    direction: 'left',
    distancePercent: 100,
  },
  loop: {
    type: 'pulse',
    scaleMin: 0.98,
    scaleMax: 1.02,
    frequency: 0.6,
  },
  depthEffect: {
    type: 'parallax',
    intensity: 0.25,
    trigger: 'mouse',
  },
  particles: null,
  durationMs: 3000,
  loopCount: 1,
  recommendedEvent: 'milestone',
  icon: '💼',
};

/**
 * Playful vibe preset - bouncy, wiggly, sparkly.
 */
export const PLAYFUL_PRESET: AnimationPreset = {
  id: 'vibe-playful',
  name: 'Playful & Fun',
  description: 'Bouncy, wiggly animations with sparkle effects',
  vibe: 'playful',
  entry: {
    type: 'pop_in',
    durationMs: 500,
    scaleFrom: 0.1,
    bounce: 0.35,
  },
  loop: {
    type: 'wiggle',
    angleMax: 4,
    frequency: 3,
  },
  depthEffect: {
    type: 'tilt',
    maxAngleX: 12,
    maxAngleY: 12,
    perspective: 800,
    intensity: 0.6,
  },
  particles: {
    type: 'sparkles',
    count: 20,
    color: '#ffd700',
    colorVariance: 0.4,
    sizeMin: 3,
    sizeMax: 7,
    lifetimeMs: 2000,
  },
  durationMs: 3000,
  loopCount: 1,
  recommendedEvent: 'bits',
  icon: '🎮',
};

/**
 * Dark vibe preset - moody, ominous, mysterious.
 */
export const DARK_PRESET: AnimationPreset = {
  id: 'vibe-dark',
  name: 'Dark & Mysterious',
  description: 'Moody glows and subtle, ominous particle effects',
  vibe: 'dark',
  entry: {
    type: 'fade_in',
    durationMs: 800,
    scaleFrom: 1.1,
    opacityFrom: 0,
  },
  loop: {
    type: 'glow',
    color: '#8b0000',
    intensityMin: 0.1,
    intensityMax: 0.5,
    frequency: 0.4,
    blurRadius: 25,
  },
  depthEffect: {
    type: 'parallax',
    intensity: 0.4,
    trigger: 'mouse',
    invert: true,
  },
  particles: {
    type: 'fire',
    count: 25,
    colors: ['#8b0000', '#4a0000', '#2d0000'],
    speed: 0.8,
    turbulence: 0.2,
    lifetimeMs: 2500,
  },
  durationMs: 3000,
  loopCount: 1,
  recommendedEvent: 'raid',
  icon: '🌙',
};

/**
 * Retro vibe preset - glitchy, RGB, pixel art.
 */
export const RETRO_PRESET: AnimationPreset = {
  id: 'vibe-retro',
  name: 'Retro & Pixel',
  description: 'Glitch effects and RGB color cycling for retro aesthetics',
  vibe: 'retro',
  entry: {
    type: 'glitch',
    durationMs: 400,
    glitchIntensity: 0.6,
    rgbSplit: true,
    scanlines: true,
  },
  loop: {
    type: 'rgb_glow',
    speed: 1.5,
    saturation: 0.8,
    intensityMin: 0.3,
    intensityMax: 0.7,
  },
  depthEffect: null,
  particles: {
    type: 'pixels',
    count: 30,
    colors: ['#00ff00', '#ff00ff', '#00ffff'],
    size: 4,
    lifetimeMs: 2000,
  },
  durationMs: 3000,
  loopCount: 1,
  recommendedEvent: 'bits',
  icon: '👾',
};

// ============================================================================
// Preset Map
// ============================================================================

/**
 * All vibe presets indexed by vibe type.
 */
export const VIBE_PRESETS: Record<AnimationVibe, AnimationPreset> = {
  cute: CUTE_PRESET,
  aggressive: AGGRESSIVE_PRESET,
  chill: CHILL_PRESET,
  hype: HYPE_PRESET,
  professional: PROFESSIONAL_PRESET,
  playful: PLAYFUL_PRESET,
  dark: DARK_PRESET,
  retro: RETRO_PRESET,
};

/**
 * Get preset by vibe.
 */
export function getVibePreset(vibe: AnimationVibe): AnimationPreset {
  return VIBE_PRESETS[vibe];
}

/**
 * Get all vibe presets as array.
 */
export function getAllVibePresets(): AnimationPreset[] {
  return Object.values(VIBE_PRESETS);
}
