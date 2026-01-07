/**
 * Enterprise Animation System
 * 
 * Professional-grade animation layer that sits on top of the base animation system.
 * Provides enterprise defaults with motion design principles, organic motion, and enhanced particles.
 * 
 * Architecture:
 * - types.ts: All type definitions (single source of truth)
 * - validation/: Modular validators for each config type
 * - defaults/: Tier-based default configurations
 * - motion/: Motion design utilities (curves, squash/stretch, organic)
 * - orchestrator.ts: Main coordinator for applying enterprise features
 */

// Types
export type {
  AnimationTier,
  EnterpriseAnimationConfig,
  MotionCurve,
  SquashStretch,
  SecondaryMotion,
  FrequencyLayer,
  NoiseConfig,
  MicroJitter,
  ParticleTrailConfig,
  ColorEvolution,
  SizeEvolution,
  EmissionCurve,
  EnterpriseEntryConfig,
  EnterpriseLoopConfig,
  EnterpriseParticleConfig,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './types';

// Validation
export {
  validateMotionCurve,
  validateSquashStretch,
  validateSecondaryMotion,
  validateNoiseConfig,
  validateMicroJitter,
  validateParticleTrails,
  validateColorEvolution,
  validateSizeEvolution,
  validateEmissionCurve,
  validateEnterpriseEntryConfig,
  validateEnterpriseLoopConfig,
  validateEnterpriseParticleConfig,
  validateEnterpriseAnimationConfig,
} from './validation';

// Defaults
export {
  // Motion defaults
  MOTION_CURVE_STANDARD,
  MOTION_CURVE_PROFESSIONAL,
  MOTION_CURVE_ENTERPRISE,
  SQUASH_STRETCH_DISABLED,
  SQUASH_STRETCH_ENTERPRISE,
  SECONDARY_MOTION_DISABLED,
  SECONDARY_MOTION_ENTERPRISE,
  // Loop defaults
  FREQUENCY_LAYERS_ENTERPRISE,
  NOISE_ENTERPRISE,
  MICRO_JITTER_ENTERPRISE,
  LOOP_CONFIG_ENTERPRISE,
  // Particle defaults
  PARTICLE_TRAILS_ENTERPRISE,
  COLOR_EVOLUTION_FIRE,
  COLOR_EVOLUTION_SPARKLE,
  SIZE_EVOLUTION_BURST,
  PARTICLE_CONFIG_ENTERPRISE,
  // Global defaults
  ANIMATION_CONFIG_ENTERPRISE,
  ENTRY_CONFIG_ENTERPRISE,
  // Tier getters
  getAnimationConfigForTier,
  getEntryConfigForTier,
  getLoopConfigForTier,
  getParticleConfigForTier,
} from './defaults';

// Motion utilities
export {
  applyMotionCurve,
  getMotionVelocity,
  isInAnticipation,
  isInSettle,
  calculateSquashStretch,
  applySquashStretch,
  calculateVelocityFromDelta,
  createSecondaryMotionState,
  updateSecondaryMotion,
  getSecondaryOffset,
  resetSecondaryMotion,
  calculateLayeredOscillation,
  applyNoiseVariation,
  calculateMicroJitter,
  calculateOrganicMotion,
} from './motion';

export type { SquashStretchResult, SecondaryMotionState, OrganicMotionResult } from './motion';

// Orchestrator
export {
  createEnterpriseState,
  updateTier,
  applyEnterpriseEntry,
  applyEnterpriseLoop,
  calculateStaggerDelay,
  isOrchestratorReady,
  getValidationErrors,
  resetElementStates,
} from './orchestrator';

export type { EnterpriseAnimationState } from './orchestrator';

// Presets
export type { StreamEventType, AnimationVibe, EnterprisePreset, EnterpriseEventPreset } from './presets';
export {
  ENTERPRISE_VIBE_PRESETS,
  ENTERPRISE_EVENT_PRESETS,
  getEnterpriseVibePreset,
  getAllEnterpriseVibePresets,
  getEnterpriseEventPreset,
  getAllEnterpriseEventPresets,
} from './presets';
