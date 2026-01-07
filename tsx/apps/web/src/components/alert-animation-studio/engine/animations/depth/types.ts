/**
 * Depth Effect Types
 *
 * Configuration interfaces for all depth-based effects.
 */

import type { DepthEffectType, TriggerType, EasingName } from '../core/types';

// ============================================================================
// Base Depth Config
// ============================================================================

/**
 * Base configuration shared by all depth effects.
 */
export interface BaseDepthConfig {
  /** Effect type identifier */
  type: DepthEffectType;
  /** Effect intensity (0-1) */
  intensity?: number;
  /** What triggers the effect */
  trigger?: TriggerType;
}

// ============================================================================
// Individual Effect Configs
// ============================================================================

/**
 * Parallax - Depth layers move at different speeds.
 */
export interface ParallaxConfig extends BaseDepthConfig {
  type: 'parallax';
  /** Invert the parallax direction */
  invert?: boolean;
  /** Smoothing factor for mouse movement (0-1) */
  smoothFactor?: number;
  /** Depth scale multiplier */
  depthScale?: number;
}

/**
 * Tilt - 3D card rotation following mouse.
 */
export interface TiltConfig extends BaseDepthConfig {
  type: 'tilt';
  /** Maximum X rotation in degrees */
  maxAngleX?: number;
  /** Maximum Y rotation in degrees */
  maxAngleY?: number;
  /** CSS perspective value */
  perspective?: number;
  /** Scale factor when hovering */
  scaleOnHover?: number;
  /** Invert the tilt direction */
  invert?: boolean;
}

/**
 * Pop Out - Foreground elements pop toward viewer.
 */
export interface PopOutConfig extends BaseDepthConfig {
  type: 'pop_out';
  /** Pop distance as percentage */
  popDistance?: number;
  /** Pop animation duration in ms */
  popDurationMs?: number;
  /** Easing function for pop */
  popEasing?: EasingName | string;
}

/**
 * Float 3D - Gentle 3D floating motion.
 */
export interface Float3DConfig extends BaseDepthConfig {
  type: 'float_3d';
  /** Rotation intensity */
  rotationIntensity?: number;
  /** Z movement intensity */
  zIntensity?: number;
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * Union of all depth effect configs.
 */
export type DepthEffectConfig =
  | ParallaxConfig
  | TiltConfig
  | PopOutConfig
  | Float3DConfig;

// ============================================================================
// Depth Effect State
// ============================================================================

/**
 * State passed to depth effects for mouse/trigger tracking.
 */
export interface DepthEffectState {
  /** Mouse X position (-1 to 1) */
  mouseX: number;
  /** Mouse Y position (-1 to 1) */
  mouseY: number;
  /** Trigger progress (0-1) for pop_out */
  triggerProgress: number;
  /** Time in seconds for float_3d */
  time: number;
  /** Whether mouse is over the element */
  isHovering: boolean;
}

/**
 * Create default depth effect state.
 */
export function createDefaultDepthState(): DepthEffectState {
  return {
    mouseX: 0,
    mouseY: 0,
    triggerProgress: 0,
    time: 0,
    isHovering: false,
  };
}

// ============================================================================
// Default Configs
// ============================================================================

/**
 * Default configurations for each depth effect type.
 */
export const DEPTH_DEFAULTS: Record<DepthEffectType, Partial<DepthEffectConfig>> = {
  parallax: {
    intensity: 0.5,
    trigger: 'mouse',
    invert: false,
    smoothFactor: 0.1,
    depthScale: 30,
  },
  tilt: {
    intensity: 0.5,
    trigger: 'mouse',
    maxAngleX: 15,
    maxAngleY: 15,
    perspective: 1000,
    scaleOnHover: 1.05,
    invert: false,
  },
  pop_out: {
    intensity: 0.5,
    trigger: 'on_enter',
    popDistance: 40,
    popDurationMs: 500,
    popEasing: 'power2.out',
  },
  float_3d: {
    intensity: 0.5,
    trigger: 'always',
    rotationIntensity: 5,
    zIntensity: 0.02,
  },
};

/**
 * Get default config for a depth effect type.
 */
export function getDepthDefaults<T extends DepthEffectType>(
  type: T
): Partial<DepthEffectConfig> {
  return DEPTH_DEFAULTS[type];
}

/**
 * Merge user config with defaults.
 */
export function mergeDepthConfig<T extends DepthEffectConfig>(
  config: T
): T {
  const defaults = DEPTH_DEFAULTS[config.type] as Partial<T>;
  return { ...defaults, ...config } as T;
}
