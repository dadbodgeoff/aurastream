/**
 * Loop Animation Types
 *
 * Configuration interfaces for all loop animations.
 * Defaults are tuned for streaming alerts (3-5 second display time).
 */

import type { LoopAnimationType, EasingName } from '../core/types';

// ============================================================================
// Base Loop Config
// ============================================================================

/**
 * Base configuration shared by all loop animations.
 */
export interface BaseLoopConfig {
  /** Animation type identifier */
  type: LoopAnimationType;
  /** Oscillation frequency (cycles per second) */
  frequency?: number;
  /** Easing function name */
  easing?: EasingName | string;
}

// ============================================================================
// Individual Animation Configs
// ============================================================================

/**
 * Float - Gentle hover/bob motion.
 * 
 * USE CASE: Subscriber alerts, donation alerts, any "friendly" notification.
 * Creates a weightless, floating feel like a balloon or cloud.
 * Should feel calming and pleasant, not distracting.
 */
export interface FloatConfig extends BaseLoopConfig {
  type: 'float';
  /** Vertical amplitude as percentage (0-100). Default: 3 (subtle bob) */
  amplitudeY?: number;
  /** Horizontal amplitude as percentage (0-100). Default: 1 (very subtle sway) */
  amplitudeX?: number;
  /** Phase offset in degrees (0-360) */
  phaseOffset?: number;
}

/**
 * Pulse - Rhythmic heartbeat-like scale effect.
 * 
 * USE CASE: Donation alerts, hype moments, "alive" feeling elements.
 * Creates a heartbeat pattern that draws attention without being annoying.
 * Good for alerts that need to feel "alive" and important.
 */
export interface PulseConfig extends BaseLoopConfig {
  type: 'pulse';
  /** Minimum scale (0.5-1.0). Default: 0.98 */
  scaleMin?: number;
  /** Maximum scale (1.0-2.0). Default: 1.04 */
  scaleMax?: number;
}

/**
 * Wiggle - Playful rotation shake.
 * 
 * USE CASE: Fun/cute alerts, celebration moments, playful streamers.
 * Creates an energetic, happy wiggle like an excited character.
 * Should feel fun and playful, not seizure-inducing.
 */
export interface WiggleConfig extends BaseLoopConfig {
  type: 'wiggle';
  /** Maximum rotation angle in degrees (0-45). Default: 2 (subtle) */
  angleMax?: number;
  /** Decay factor (0 = no decay, 1 = full decay). Default: 0 */
  decay?: number;
}

/**
 * Glow - Pulsing outer glow effect (shader-based).
 * 
 * USE CASE: Magical/fantasy themes, premium alerts, ethereal feel.
 * Creates a soft, magical glow that pulses organically.
 * Good for high-tier subs, big donations, special events.
 */
export interface GlowConfig extends BaseLoopConfig {
  type: 'glow';
  /** Glow color (hex). Default: #ffffff */
  color?: string;
  /** Minimum intensity (0-1). Default: 0.3 */
  intensityMin?: number;
  /** Maximum intensity (0-1). Default: 0.7 */
  intensityMax?: number;
  /** Blur radius in pixels. Default: 15 */
  blurRadius?: number;
}

/**
 * RGB Glow - Rainbow cycling glow effect.
 * 
 * USE CASE: Gaming aesthetic, RGB setups, hype/celebration moments.
 * Smooth rainbow color cycling with pulsing intensity.
 * Popular with gaming streamers, should cycle smoothly not frantically.
 */
export interface RgbGlowConfig extends BaseLoopConfig {
  type: 'rgb_glow';
  /** Color cycling speed (cycles per second). Default: 0.3 (one full cycle every ~3 seconds) */
  speed?: number;
  /** Color saturation (0-1). Default: 0.9 */
  saturation?: number;
  /** Minimum intensity (0-1). Default: 0.4 */
  intensityMin?: number;
  /** Maximum intensity (0-1). Default: 0.7 */
  intensityMax?: number;
}

/**
 * Breathe - Slow, organic scale breathing.
 * 
 * USE CASE: Chill/relaxed streams, ASMR, meditation, cozy vibes.
 * Creates a calm, living feel with natural breathing rhythm.
 * Should feel peaceful and organic, like a sleeping creature.
 */
export interface BreatheConfig extends BaseLoopConfig {
  type: 'breathe';
  /** Minimum scale. Default: 0.97 */
  scaleMin?: number;
  /** Maximum scale. Default: 1.03 */
  scaleMax?: number;
}

/**
 * Shake - Rapid small movements for excitement/urgency.
 * 
 * USE CASE: Raid alerts, hype trains, urgent notifications, excitement.
 * Creates energetic vibration that demands attention.
 * Should feel exciting but not give viewers a headache.
 */
export interface ShakeConfig extends BaseLoopConfig {
  type: 'shake';
  /** Shake intensity as percentage (0-100). Default: 2 (noticeable but not crazy) */
  shakeIntensity?: number;
}

/**
 * Swing - Pendulum-like rotation.
 * 
 * USE CASE: Hanging signs, ornaments, playful/whimsical themes.
 * Creates a pendulum motion like a hanging sign or wind chime.
 * Should feel natural and gravity-based, not mechanical.
 */
export interface SwingConfig extends BaseLoopConfig {
  type: 'swing';
  /** Maximum swing angle in degrees. Default: 5 (gentle swing) */
  swingAngle?: number;
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * Union of all loop animation configs.
 */
export type LoopAnimationConfig =
  | FloatConfig
  | PulseConfig
  | WiggleConfig
  | GlowConfig
  | RgbGlowConfig
  | BreatheConfig
  | ShakeConfig
  | SwingConfig;

// ============================================================================
// Default Configs - Tuned for Streaming
// ============================================================================

/**
 * Default configurations for each loop animation type.
 * 
 * DESIGN PHILOSOPHY:
 * - Alerts display for 3-5 seconds typically
 * - Animation should complete 2-4 cycles during display (feels complete, not cut off)
 * - Amplitude/intensity should be noticeable but not distracting
 * - Viewers are watching gameplay, not staring at alerts
 * - "Professional but fun" - not amateur jittery mess
 */
export const LOOP_DEFAULTS: Record<LoopAnimationType, Partial<LoopAnimationConfig>> = {
  /**
   * FLOAT: Gentle, calming hover
   * - 0.4 Hz = one full bob every 2.5 seconds
   * - 3% vertical movement = noticeable but subtle
   * - 1% horizontal = very subtle sway, adds organic feel
   */
  float: {
    frequency: 0.4,
    amplitudeY: 3,
    amplitudeX: 1,
    phaseOffset: 0,
  },

  /**
   * PULSE: Heartbeat-like rhythm
   * - 0.8 Hz = ~1 heartbeat per second (natural resting heart rate feel)
   * - 2-4% scale change = visible but not jarring
   */
  pulse: {
    frequency: 0.8,
    scaleMin: 0.98,
    scaleMax: 1.04,
  },

  /**
   * WIGGLE: Playful jitter
   * - 1.5 Hz = energetic but not frantic
   * - 2° max angle = fun wiggle, not seizure-inducing
   * - No decay by default (continuous energy)
   */
  wiggle: {
    frequency: 1.5,
    angleMax: 2,
    decay: 0,
  },

  /**
   * GLOW: Magical pulse
   * - 0.5 Hz = slow, ethereal pulse
   * - 30-70% intensity range = visible glow variation
   * - 15px blur = soft, not harsh
   */
  glow: {
    frequency: 0.5,
    color: '#ffffff',
    intensityMin: 0.3,
    intensityMax: 0.7,
    blurRadius: 15,
  },

  /**
   * RGB GLOW: Gaming rainbow
   * - 0.3 speed = full color cycle every ~3 seconds (matches typical alert duration)
   * - 90% saturation = vibrant but not eye-burning
   * - 40-70% intensity = visible but not overwhelming
   */
  rgb_glow: {
    speed: 0.3,
    saturation: 0.9,
    intensityMin: 0.4,
    intensityMax: 0.7,
  },

  /**
   * BREATHE: Calm, organic
   * - 0.25 Hz = one breath every 4 seconds (relaxed breathing rate)
   * - 3% scale change = subtle, calming
   */
  breathe: {
    frequency: 0.25,
    scaleMin: 0.97,
    scaleMax: 1.03,
  },

  /**
   * SHAKE: Excited vibration
   * - 8 Hz = fast enough to feel energetic, slow enough to see
   * - 2% intensity = noticeable shake, not blur
   */
  shake: {
    frequency: 8,
    shakeIntensity: 2,
  },

  /**
   * SWING: Pendulum motion
   * - 0.4 Hz = natural pendulum feel (like a wall clock)
   * - 5° angle = gentle swing, not wild
   */
  swing: {
    frequency: 0.4,
    swingAngle: 5,
  },
};

/**
 * Get default config for a loop animation type.
 */
export function getLoopDefaults<T extends LoopAnimationType>(
  type: T
): Partial<LoopAnimationConfig> {
  return LOOP_DEFAULTS[type];
}

/**
 * Merge user config with defaults.
 */
export function mergeLoopConfig<T extends LoopAnimationConfig>(
  config: T
): T {
  const defaults = LOOP_DEFAULTS[config.type] as Partial<T>;
  return { ...defaults, ...config } as T;
}
