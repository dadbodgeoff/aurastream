/**
 * Animation Engine - Master Exports
 *
 * Enterprise-grade animation system for streamer alerts.
 *
 * Architecture:
 * - core/     : Foundation types, easing, noise functions
 * - entry/    : Entry animations (pop_in, slide_in, glitch, etc.)
 * - loop/     : Loop animations (float, pulse, glow, etc.)
 * - depth/    : Depth effects (parallax, tilt, pop_out, etc.)
 * - particles/: Particle system with physics
 * - presets/  : Streamer-focused animation presets
 */

// ============================================================================
// Core Module
// ============================================================================

export {
  // Types
  type AnimationTransform,
  type AnimationContext,
  type AnimationFunction,
  type StatefulAnimationFunction,
  type EasingFunction,
  type EasingName,
  type SlideDirection,
  type TriggerType,
  type SpawnArea,
  type EntryAnimationType,
  type LoopAnimationType,
  type DepthEffectType,
  type ParticleEffectType,
  // Constants
  DEFAULT_TRANSFORM,
  // Functions
  createDefaultTransform,
  createDefaultContext,
  clamp,
  lerp,
  degToRad,
  radToDeg,
  normalize,
} from './core';

// Noise functions
export {
  createSeededRandom,
  seededRandom,
  seededRandomRange,
  seededRandomInt,
  hash,
  hashCombine,
  createTimeSeed,
  valueNoise1D,
  valueNoise2D,
  fbm1D,
  fbm2D,
  glitchNoise,
  glitchBurst,
  steppedNoise,
  smoothSteppedNoise,
  type GlitchNoiseResult,
} from './core/noise';

// Easing functions
export { getEasing, getAvailableEasings } from './core/easing';

// ============================================================================
// Entry Animations Module
// ============================================================================

export {
  // Types
  type EntryAnimationConfig,
  type PopInConfig,
  type SlideInConfig,
  type FadeInConfig,
  type BurstConfig,
  type BounceConfig,
  type GlitchConfig,
  type SpinInConfig,
  type DropInConfig,
  // Defaults
  ENTRY_DEFAULTS,
  getEntryDefaults,
  mergeEntryConfig,
  // Individual animations
  popIn,
  slideIn,
  fadeIn,
  burst,
  bounceIn,
  glitch,
  glitchWithSlices,
  spinIn,
  dropIn,
  type GlitchSlice,
  // Dispatcher
  applyEntryAnimation,
  isEntryComplete,
  getEntryProgress,
} from './entry';

// ============================================================================
// Loop Animations Module
// ============================================================================

export {
  // Types
  type LoopAnimationConfig,
  type FloatConfig,
  type PulseConfig,
  type WiggleConfig,
  type GlowConfig,
  type RgbGlowConfig,
  type BreatheConfig,
  type ShakeConfig,
  type SwingConfig,
  // Defaults
  LOOP_DEFAULTS,
  getLoopDefaults,
  mergeLoopConfig,
  // Individual animations
  float,
  pulse,
  wiggle,
  glow,
  rgbGlow,
  breathe,
  shake,
  swing,
  // Dispatcher
  applyLoopAnimation,
  calculateLoopTime,
} from './loop';

// ============================================================================
// Depth Effects Module
// ============================================================================

export {
  // Types
  type DepthEffectConfig,
  type ParallaxConfig,
  type TiltConfig,
  type PopOutConfig,
  type Float3DConfig,
  type DepthEffectState,
  // Defaults
  DEPTH_DEFAULTS,
  getDepthDefaults,
  mergeDepthConfig,
  createDefaultDepthState,
  // Individual effects
  parallax,
  tilt,
  popOut,
  float3D,
  // Dispatcher
  applyDepthEffect,
  shouldApplyDepthEffect,
} from './depth';

// ============================================================================
// Particle System Module
// ============================================================================

export {
  // Types
  type Particle,
  type ParticleSystemState,
  type ParticleEffectConfig,
  type SparklesConfig,
  type ConfettiConfig,
  type HeartsConfig,
  type FireConfig,
  type SnowConfig,
  type BubblesConfig,
  type StarsConfig,
  type PixelsConfig,
  // Defaults
  PARTICLE_DEFAULTS,
  getParticleDefaults,
  mergeParticleConfig,
  // System
  createParticleSystem,
  initParticleSystem,
  resetParticleSystem,
  pauseParticleSystem,
  resumeParticleSystem,
  spawnParticles,
  spawnBurst,
  updateParticles,
  updateParticleSystem,
  getParticleCount,
  getParticles,
  hasParticles,
  // Physics
  applyGravity,
  applyWind,
  applyTurbulence,
  applyDrag,
  updatePosition,
  calculateLifetimeOpacity,
  isParticleAlive,
  updateParticlePhysics,
  // Spawners
  spawnParticle,
  // Renderer
  getParticleShape,
  getParticleStyles,
  getContainerStyles,
  getParticleContent,
  isParticleVisible,
  getVisibleParticles,
} from './particles';

// ============================================================================
// Presets Module
// ============================================================================

export {
  // Types
  type StreamEventType,
  type AnimationVibe,
  type AnimationPreset,
  type StreamEventPreset,
  type PresetCategory,
  type CategorizedPreset,
  // Vibe presets
  VIBE_PRESETS,
  CUTE_PRESET,
  AGGRESSIVE_PRESET,
  CHILL_PRESET,
  HYPE_PRESET,
  PROFESSIONAL_PRESET,
  PLAYFUL_PRESET,
  DARK_PRESET,
  RETRO_PRESET,
  getVibePreset,
  getAllVibePresets,
  // Event presets
  EVENT_PRESETS,
  NEW_SUBSCRIBER_PRESET,
  RAID_PRESET,
  DONATION_SMALL_PRESET,
  DONATION_MEDIUM_PRESET,
  DONATION_LARGE_PRESET,
  NEW_FOLLOWER_PRESET,
  MILESTONE_PRESET,
  BITS_PRESET,
  GIFT_SUB_PRESET,
  getEventPreset,
  getAllEventPresets,
} from './presets';
