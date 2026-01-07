/**
 * Entry Animation Types
 *
 * Configuration interfaces for all entry animations.
 */

import type { EntryAnimationType, SlideDirection, EasingName } from '../core/types';

// ============================================================================
// Base Entry Config
// ============================================================================

/**
 * Base configuration shared by all entry animations.
 */
export interface BaseEntryConfig {
  /** Animation type identifier */
  type: EntryAnimationType;
  /** Duration in milliseconds */
  durationMs: number;
  /** Easing function name */
  easing?: EasingName | string;
}

// ============================================================================
// Individual Animation Configs
// ============================================================================

/**
 * Pop In - Scale from small/zero with elastic bounce.
 */
export interface PopInConfig extends BaseEntryConfig {
  type: 'pop_in';
  /** Starting scale (0 = invisible, 1 = full size) */
  scaleFrom?: number;
  /** Bounce amount for elastic easing (0-1) */
  bounce?: number;
}

/**
 * Slide In - Enter from any direction.
 */
export interface SlideInConfig extends BaseEntryConfig {
  type: 'slide_in';
  /** Direction to slide from */
  direction?: SlideDirection;
  /** Distance as percentage of canvas (100 = full width/height) */
  distancePercent?: number;
}

/**
 * Fade In - Smooth opacity transition with optional scale.
 */
export interface FadeInConfig extends BaseEntryConfig {
  type: 'fade_in';
  /** Starting opacity (0-1) */
  opacityFrom?: number;
  /** Starting scale (optional subtle scale effect) */
  scaleFrom?: number;
}

/**
 * Burst - Explosive entry from large scale with rotation.
 */
export interface BurstConfig extends BaseEntryConfig {
  type: 'burst';
  /** Starting scale (typically > 1 for burst effect) */
  scaleFrom?: number;
  /** Starting rotation in degrees */
  rotationFrom?: number;
  /** Starting opacity */
  opacityFrom?: number;
}

/**
 * Bounce - Multiple bounces while entering.
 */
export interface BounceConfig extends BaseEntryConfig {
  type: 'bounce';
  /** Number of bounces */
  bounces?: number;
  /** Bounce height as percentage (0-200) */
  height?: number;
  /** Starting scale */
  scaleFrom?: number;
}

/**
 * Glitch - Digital glitch effect on entry.
 * Uses deterministic noise for consistent results.
 */
export interface GlitchConfig extends BaseEntryConfig {
  type: 'glitch';
  /** Glitch intensity (0-1) */
  glitchIntensity?: number;
  /** Random seed for reproducible glitch pattern */
  seed?: number;
  /** Enable RGB split effect */
  rgbSplit?: boolean;
  /** Enable scanline effect */
  scanlines?: boolean;
}

/**
 * Spin In - Rotate while scaling in.
 */
export interface SpinInConfig extends BaseEntryConfig {
  type: 'spin_in';
  /** Number of full rotations */
  rotations?: number;
  /** Starting scale */
  scaleFrom?: number;
  /** Rotation direction (1 = clockwise, -1 = counter-clockwise) */
  direction?: 1 | -1;
}

/**
 * Drop In - Fall from above with bounce landing.
 */
export interface DropInConfig extends BaseEntryConfig {
  type: 'drop_in';
  /** Drop height as percentage of canvas */
  dropHeight?: number;
  /** Starting opacity */
  opacityFrom?: number;
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * Union of all entry animation configs.
 */
export type EntryAnimationConfig =
  | PopInConfig
  | SlideInConfig
  | FadeInConfig
  | BurstConfig
  | BounceConfig
  | GlitchConfig
  | SpinInConfig
  | DropInConfig;

// ============================================================================
// Default Configs
// ============================================================================

/**
 * Default configurations for each entry animation type.
 */
export const ENTRY_DEFAULTS: Record<EntryAnimationType, Partial<EntryAnimationConfig>> = {
  pop_in: {
    durationMs: 500,
    easing: 'elastic.out',
    scaleFrom: 0,
    bounce: 0.4,
  },
  slide_in: {
    durationMs: 400,
    easing: 'power2.out',
    direction: 'left',
    distancePercent: 120,
  },
  fade_in: {
    durationMs: 500,
    easing: 'power1.inOut',
    opacityFrom: 0,
    scaleFrom: 0.9,
  },
  burst: {
    durationMs: 600,
    easing: 'back.out',
    scaleFrom: 2.5,
    rotationFrom: 15,
    opacityFrom: 0,
  },
  bounce: {
    durationMs: 700,
    easing: 'elastic.out',
    bounces: 3,
    height: 50,
    scaleFrom: 0,
  },
  glitch: {
    durationMs: 400,
    easing: 'linear',
    glitchIntensity: 0.8,
    seed: 0,
    rgbSplit: true,
    scanlines: true,
  },
  spin_in: {
    durationMs: 600,
    easing: 'power2.out',
    rotations: 1,
    scaleFrom: 0,
    direction: 1,
  },
  drop_in: {
    durationMs: 500,
    easing: 'bounce.out',
    dropHeight: 100,
    opacityFrom: 0,
  },
};

/**
 * Get default config for an entry animation type.
 */
export function getEntryDefaults<T extends EntryAnimationType>(
  type: T
): Partial<EntryAnimationConfig> {
  return ENTRY_DEFAULTS[type];
}

/**
 * Merge user config with defaults.
 */
export function mergeEntryConfig<T extends EntryAnimationConfig>(
  config: T
): T {
  const defaults = ENTRY_DEFAULTS[config.type] as Partial<T>;
  return { ...defaults, ...config } as T;
}
