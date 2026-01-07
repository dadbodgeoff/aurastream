/**
 * Entry Animation Types
 *
 * Configuration interfaces for all entry animations.
 * Defaults are tuned for streaming alerts (quick, impactful, professional).
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
 * 
 * USE CASE: Most versatile entry. Good for any alert type.
 * Creates a satisfying "pop" that draws attention without being aggressive.
 * The slight bounce at the end adds polish and professionalism.
 */
export interface PopInConfig extends BaseEntryConfig {
  type: 'pop_in';
  /** Starting scale (0 = invisible, 1 = full size). Default: 0.3 */
  scaleFrom?: number;
  /** Bounce amount for elastic easing (0-1). Default: 0.3 */
  bounce?: number;
}

/**
 * Slide In - Enter from any direction.
 * 
 * USE CASE: Clean, professional alerts. Good for text-heavy notifications.
 * Creates smooth directional entry that feels intentional and polished.
 * Works well for alerts that need to feel "official" or "important".
 */
export interface SlideInConfig extends BaseEntryConfig {
  type: 'slide_in';
  /** Direction to slide from. Default: 'bottom' */
  direction?: SlideDirection;
  /** Distance as percentage of canvas (100 = full width/height). Default: 100 */
  distancePercent?: number;
}

/**
 * Fade In - Smooth opacity transition with optional scale.
 * 
 * USE CASE: Subtle, elegant alerts. Good for chill/relaxed streams.
 * Creates a gentle appearance that doesn't startle viewers.
 * Best for streamers who want minimal distraction.
 */
export interface FadeInConfig extends BaseEntryConfig {
  type: 'fade_in';
  /** Starting opacity (0-1). Default: 0 */
  opacityFrom?: number;
  /** Starting scale (optional subtle scale effect). Default: 0.95 */
  scaleFrom?: number;
}

/**
 * Burst - Explosive entry from large scale with rotation.
 * 
 * USE CASE: Hype moments, big donations, raid alerts.
 * Creates an explosive, attention-grabbing entrance.
 * Use sparingly - too much burst = viewer fatigue.
 */
export interface BurstConfig extends BaseEntryConfig {
  type: 'burst';
  /** Starting scale (typically > 1 for burst effect). Default: 1.8 */
  scaleFrom?: number;
  /** Starting rotation in degrees. Default: 10 */
  rotationFrom?: number;
  /** Starting opacity. Default: 0 */
  opacityFrom?: number;
}

/**
 * Bounce - Multiple bounces while entering.
 * 
 * USE CASE: Fun/playful alerts, celebration moments.
 * Creates a bouncy, energetic entrance with character.
 * Good for streamers with playful/cute branding.
 */
export interface BounceConfig extends BaseEntryConfig {
  type: 'bounce';
  /** Number of bounces. Default: 2 */
  bounces?: number;
  /** Bounce height as percentage (0-200). Default: 30 */
  height?: number;
  /** Starting scale. Default: 0.5 */
  scaleFrom?: number;
}

/**
 * Glitch - Digital glitch effect on entry.
 * 
 * USE CASE: Tech/gaming aesthetic, cyberpunk themes, edgy branding.
 * Creates a digital distortion effect that feels "hacker" or "glitchy".
 * Popular with gaming streamers, especially FPS/tech content.
 */
export interface GlitchConfig extends BaseEntryConfig {
  type: 'glitch';
  /** Glitch intensity (0-1). Default: 0.5 */
  glitchIntensity?: number;
  /** Random seed for reproducible glitch pattern */
  seed?: number;
  /** Enable RGB split effect. Default: true */
  rgbSplit?: boolean;
  /** Enable scanline effect. Default: false */
  scanlines?: boolean;
}

/**
 * Spin In - Rotate while scaling in.
 * 
 * USE CASE: Playful alerts, wheel-spin reveals, fun moments.
 * Creates a spinning entrance that adds energy and movement.
 * Best used sparingly - can feel gimmicky if overused.
 */
export interface SpinInConfig extends BaseEntryConfig {
  type: 'spin_in';
  /** Number of full rotations. Default: 0.5 (half rotation) */
  rotations?: number;
  /** Starting scale. Default: 0.3 */
  scaleFrom?: number;
  /** Rotation direction (1 = clockwise, -1 = counter-clockwise). Default: 1 */
  direction?: 1 | -1;
}

/**
 * Drop In - Fall from above with bounce landing.
 * 
 * USE CASE: Gravity-based alerts, "dropping in" notifications.
 * Creates a natural falling motion with satisfying landing.
 * Good for alerts that should feel "weighty" or "impactful".
 */
export interface DropInConfig extends BaseEntryConfig {
  type: 'drop_in';
  /** Drop height as percentage of canvas. Default: 50 */
  dropHeight?: number;
  /** Starting opacity. Default: 1 (visible during fall) */
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
// Default Configs - Tuned for Streaming
// ============================================================================

/**
 * Default configurations for each entry animation type.
 * 
 * DESIGN PHILOSOPHY:
 * - Entry should be quick (300-600ms) - viewers shouldn't wait
 * - Entry should be impactful but not jarring
 * - Animation should feel "complete" not "cut off"
 * - Professional polish > flashy gimmicks
 */
export const ENTRY_DEFAULTS: Record<EntryAnimationType, Partial<EntryAnimationConfig>> = {
  /**
   * POP IN: The workhorse entry animation
   * - 400ms = quick but not instant
   * - Start at 30% scale (not 0) = less jarring
   * - Moderate bounce = satisfying without being cartoonish
   */
  pop_in: {
    durationMs: 400,
    easing: 'back.out',
    scaleFrom: 0.3,
    bounce: 0.3,
  },

  /**
   * SLIDE IN: Clean, professional
   * - 350ms = snappy entrance
   * - From bottom = natural "notification" feel
   * - 100% distance = enters from just off-screen
   */
  slide_in: {
    durationMs: 350,
    easing: 'power2.out',
    direction: 'bottom',
    distancePercent: 100,
  },

  /**
   * FADE IN: Subtle, elegant
   * - 500ms = gentle appearance
   * - Slight scale (95%) = adds depth without being obvious
   */
  fade_in: {
    durationMs: 500,
    easing: 'power1.inOut',
    opacityFrom: 0,
    scaleFrom: 0.95,
  },

  /**
   * BURST: Explosive, attention-grabbing
   * - 450ms = quick impact
   * - 1.8x scale = noticeable but not overwhelming
   * - 10° rotation = adds energy without being chaotic
   */
  burst: {
    durationMs: 450,
    easing: 'back.out',
    scaleFrom: 1.8,
    rotationFrom: 10,
    opacityFrom: 0,
  },

  /**
   * BOUNCE: Playful, energetic
   * - 500ms = time for bounces to feel natural
   * - 2 bounces = fun without being excessive
   * - 30% height = noticeable bounce, not crazy
   */
  bounce: {
    durationMs: 500,
    easing: 'bounce.out',
    bounces: 2,
    height: 30,
    scaleFrom: 0.5,
  },

  /**
   * GLITCH: Digital, edgy
   * - 350ms = quick glitch effect
   * - 50% intensity = visible but not headache-inducing
   * - RGB split on, scanlines off = modern glitch look
   */
  glitch: {
    durationMs: 350,
    easing: 'linear',
    glitchIntensity: 0.5,
    seed: 0,
    rgbSplit: true,
    scanlines: false,
  },

  /**
   * SPIN IN: Playful rotation
   * - 450ms = time for rotation to feel smooth
   * - 0.5 rotations = half turn, not dizzying
   * - Start at 30% scale = grows while spinning
   */
  spin_in: {
    durationMs: 450,
    easing: 'power2.out',
    rotations: 0.5,
    scaleFrom: 0.3,
    direction: 1,
  },

  /**
   * DROP IN: Gravity-based
   * - 400ms = natural fall speed
   * - 50% height = drops from reasonable distance
   * - Full opacity = visible during fall
   */
  drop_in: {
    durationMs: 400,
    easing: 'bounce.out',
    dropHeight: 50,
    opacityFrom: 1,
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
