/**
 * Loop Animation Types
 *
 * Configuration interfaces for all loop animations.
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
 */
export interface FloatConfig extends BaseLoopConfig {
  type: 'float';
  /** Vertical amplitude as percentage (0-100) */
  amplitudeY?: number;
  /** Horizontal amplitude as percentage (0-100) */
  amplitudeX?: number;
  /** Phase offset in degrees (0-360) */
  phaseOffset?: number;
}

/**
 * Pulse - Subtle breathing scale effect.
 */
export interface PulseConfig extends BaseLoopConfig {
  type: 'pulse';
  /** Minimum scale (0.5-1.0) */
  scaleMin?: number;
  /** Maximum scale (1.0-2.0) */
  scaleMax?: number;
}

/**
 * Wiggle - Playful rotation shake.
 */
export interface WiggleConfig extends BaseLoopConfig {
  type: 'wiggle';
  /** Maximum rotation angle in degrees (0-45) */
  angleMax?: number;
  /** Decay factor (0 = no decay, 1 = full decay) */
  decay?: number;
}

/**
 * Glow - Pulsing outer glow effect (shader-based).
 */
export interface GlowConfig extends BaseLoopConfig {
  type: 'glow';
  /** Glow color (hex) */
  color?: string;
  /** Minimum intensity (0-1) */
  intensityMin?: number;
  /** Maximum intensity (0-1) */
  intensityMax?: number;
  /** Blur radius in pixels */
  blurRadius?: number;
}

/**
 * RGB Glow - Rainbow cycling glow effect.
 */
export interface RgbGlowConfig extends BaseLoopConfig {
  type: 'rgb_glow';
  /** Color cycling speed */
  speed?: number;
  /** Color saturation (0-1) */
  saturation?: number;
  /** Minimum intensity (0-1) */
  intensityMin?: number;
  /** Maximum intensity (0-1) */
  intensityMax?: number;
}

/**
 * Breathe - Slow, organic scale breathing.
 */
export interface BreatheConfig extends BaseLoopConfig {
  type: 'breathe';
  /** Minimum scale */
  scaleMin?: number;
  /** Maximum scale */
  scaleMax?: number;
}

/**
 * Shake - Rapid small movements (excitement/alert).
 */
export interface ShakeConfig extends BaseLoopConfig {
  type: 'shake';
  /** Shake intensity as percentage (0-100) */
  shakeIntensity?: number;
}

/**
 * Swing - Pendulum-like rotation.
 */
export interface SwingConfig extends BaseLoopConfig {
  type: 'swing';
  /** Maximum swing angle in degrees */
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
// Default Configs
// ============================================================================

/**
 * Default configurations for each loop animation type.
 */
export const LOOP_DEFAULTS: Record<LoopAnimationType, Partial<LoopAnimationConfig>> = {
  float: {
    frequency: 0.5,
    amplitudeY: 8,
    amplitudeX: 2,
    phaseOffset: 0,
  },
  pulse: {
    frequency: 0.8,
    scaleMin: 0.97,
    scaleMax: 1.03,
  },
  wiggle: {
    frequency: 3,
    angleMax: 3,
    decay: 0,
  },
  glow: {
    frequency: 0.6,
    color: '#ffffff',
    intensityMin: 0.2,
    intensityMax: 0.8,
    blurRadius: 20,
  },
  rgb_glow: {
    speed: 2,
    saturation: 1,
    intensityMin: 0.4,
    intensityMax: 0.8,
  },
  breathe: {
    frequency: 0.3,
    scaleMin: 0.95,
    scaleMax: 1.05,
  },
  shake: {
    frequency: 15,
    shakeIntensity: 5,
  },
  swing: {
    frequency: 0.5,
    swingAngle: 10,
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
