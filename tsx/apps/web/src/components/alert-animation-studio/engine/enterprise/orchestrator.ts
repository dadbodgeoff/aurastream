/**
 * Enterprise Animation Orchestrator
 * 
 * Single responsibility: Coordinate all enterprise animation features.
 * This is the main entry point for applying enterprise-grade animations.
 */

import type { AnimationTransform, AnimationContext } from '../animations/core/types';
import type {
  AnimationTier,
  EnterpriseAnimationConfig,
  EnterpriseEntryConfig,
  EnterpriseLoopConfig,
  EnterpriseParticleConfig,
  ValidationResult,
} from './types';

import {
  getAnimationConfigForTier,
  getEntryConfigForTier,
  getLoopConfigForTier,
  getParticleConfigForTier,
} from './defaults';

import {
  validateEnterpriseAnimationConfig,
  validateEnterpriseEntryConfig,
  validateEnterpriseLoopConfig,
  validateEnterpriseParticleConfig,
} from './validation';

import {
  applyMotionCurve,
  getMotionVelocity,
  calculateSquashStretch,
  createSecondaryMotionState,
  updateSecondaryMotion,
  getSecondaryOffset,
  calculateOrganicMotion,
  type SecondaryMotionState,
} from './motion';

// ============================================================================
// Orchestrator State
// ============================================================================

export interface EnterpriseAnimationState {
  /** Current animation tier */
  tier: AnimationTier;
  /** Global configuration */
  config: EnterpriseAnimationConfig;
  /** Entry animation configuration */
  entryConfig: EnterpriseEntryConfig;
  /** Loop animation configuration */
  loopConfig: EnterpriseLoopConfig;
  /** Particle configuration */
  particleConfig: EnterpriseParticleConfig;
  /** Secondary motion state per element */
  secondaryMotionStates: Map<string, SecondaryMotionState>;
  /** Previous positions for velocity calculation */
  previousPositions: Map<string, { x: number; y: number; time: number }>;
  /** Validation errors if any */
  validationErrors: ValidationResult | null;
  /** Whether the orchestrator is initialized */
  initialized: boolean;
}

/**
 * Create initial orchestrator state for a given tier.
 */
export function createEnterpriseState(tier: AnimationTier = 'enterprise'): EnterpriseAnimationState {
  const config = getAnimationConfigForTier(tier);
  const entryConfig = getEntryConfigForTier(tier);
  const loopConfig = getLoopConfigForTier(tier);
  const particleConfig = getParticleConfigForTier(tier);

  // Validate all configurations
  const validationResults = [
    validateEnterpriseAnimationConfig(config),
    validateEnterpriseEntryConfig(entryConfig),
    validateEnterpriseLoopConfig(loopConfig),
    validateEnterpriseParticleConfig(particleConfig),
  ];

  const hasErrors = validationResults.some(r => !r.valid);
  const combinedValidation: ValidationResult = {
    valid: !hasErrors,
    errors: validationResults.flatMap(r => r.errors),
    warnings: validationResults.flatMap(r => r.warnings),
  };

  if (!combinedValidation.valid) {
    console.error('[EnterpriseOrchestrator] Configuration validation failed:', combinedValidation.errors);
  }

  if (combinedValidation.warnings.length > 0) {
    console.warn('[EnterpriseOrchestrator] Configuration warnings:', combinedValidation.warnings);
  }

  return {
    tier,
    config,
    entryConfig,
    loopConfig,
    particleConfig,
    secondaryMotionStates: new Map(),
    previousPositions: new Map(),
    validationErrors: hasErrors ? combinedValidation : null,
    initialized: true,
  };
}

/**
 * Update orchestrator state to a new tier.
 */
export function updateTier(state: EnterpriseAnimationState, tier: AnimationTier): EnterpriseAnimationState {
  if (state.tier === tier) return state;
  return createEnterpriseState(tier);
}

// ============================================================================
// Entry Animation Enhancement
// ============================================================================

/**
 * Apply enterprise entry animation enhancements to a transform.
 * Adds anticipation, overshoot, squash/stretch, and secondary motion.
 */
export function applyEnterpriseEntry(
  state: EnterpriseAnimationState,
  elementId: string,
  baseTransform: AnimationTransform,
  context: AnimationContext,
  entryProgress: number
): AnimationTransform {
  if (!state.initialized || state.validationErrors) {
    return baseTransform;
  }

  const { entryConfig } = state;
  const { motionCurve, squashStretch, secondaryMotion } = entryConfig;

  // Apply motion curve (anticipation, overshoot, settle)
  const curvedProgress = applyMotionCurve(entryProgress, motionCurve);

  // Calculate velocity for squash/stretch
  const velocity = getMotionVelocity(entryProgress, motionCurve);

  // Apply squash/stretch based on velocity
  const ss = calculateSquashStretch(velocity, squashStretch, 'y');

  // Update secondary motion state
  let secondaryOffset = { offsetX: 0, offsetY: 0, rotation: 0 };
  if (secondaryMotion.enabled) {
    let smState = state.secondaryMotionStates.get(elementId);
    if (!smState) {
      smState = createSecondaryMotionState();
      state.secondaryMotionStates.set(elementId, smState);
    }

    const updatedState = updateSecondaryMotion(
      smState,
      baseTransform.positionX,
      baseTransform.positionY,
      secondaryMotion,
      context.deltaTime
    );
    state.secondaryMotionStates.set(elementId, updatedState);

    secondaryOffset = getSecondaryOffset(updatedState, baseTransform.positionX, baseTransform.positionY);
  }

  // Apply all enhancements
  return {
    ...baseTransform,
    scaleX: baseTransform.scaleX * curvedProgress * ss.scaleX,
    scaleY: baseTransform.scaleY * curvedProgress * ss.scaleY,
    scaleZ: baseTransform.scaleZ * curvedProgress,
    positionX: baseTransform.positionX + secondaryOffset.offsetX,
    positionY: baseTransform.positionY + secondaryOffset.offsetY,
    rotationZ: baseTransform.rotationZ + secondaryOffset.rotation,
    opacity: baseTransform.opacity * Math.min(curvedProgress * 2, 1),
  };
}

// ============================================================================
// Loop Animation Enhancement
// ============================================================================

/**
 * Apply enterprise loop animation enhancements to a transform.
 * Adds layered frequencies, noise variation, and micro-jitter.
 */
export function applyEnterpriseLoop(
  state: EnterpriseAnimationState,
  elementId: string,
  baseTransform: AnimationTransform,
  context: AnimationContext,
  baseAmplitudeX: number,
  baseAmplitudeY: number,
  baseFrequency: number
): AnimationTransform {
  if (!state.initialized || state.validationErrors) {
    return baseTransform;
  }

  const { loopConfig } = state;
  const { frequencyLayers, noise, microJitter, phaseRandomization } = loopConfig;

  // Generate element-specific phase offset for variation
  const elementHash = hashString(elementId);
  const phaseOffset = (elementHash / 0xFFFFFFFF) * phaseRandomization;

  // Calculate organic motion
  const organic = calculateOrganicMotion(
    context.timeMs / 1000,
    baseAmplitudeX,
    baseAmplitudeY,
    baseFrequency,
    frequencyLayers,
    noise,
    microJitter,
    elementHash,
    phaseOffset
  );

  return {
    ...baseTransform,
    positionX: baseTransform.positionX + organic.offsetX,
    positionY: baseTransform.positionY + organic.offsetY,
    rotationZ: baseTransform.rotationZ + organic.rotation,
    scaleX: baseTransform.scaleX * organic.scale,
    scaleY: baseTransform.scaleY * organic.scale,
    scaleZ: baseTransform.scaleZ * organic.scale,
  };
}

// ============================================================================
// Stagger Calculation
// ============================================================================

/**
 * Calculate stagger delay for multi-element animations.
 */
export function calculateStaggerDelay(
  state: EnterpriseAnimationState,
  elementIndex: number,
  totalElements: number
): number {
  if (!state.initialized || totalElements <= 1) return 0;

  const { staggerDelay, staggerDirection } = state.entryConfig;

  switch (staggerDirection) {
    case 'forward':
      return elementIndex * staggerDelay;
    case 'reverse':
      return (totalElements - 1 - elementIndex) * staggerDelay;
    case 'center': {
      const center = (totalElements - 1) / 2;
      const distanceFromCenter = Math.abs(elementIndex - center);
      return distanceFromCenter * staggerDelay;
    }
    case 'random':
      return hashString(`${elementIndex}`) % (staggerDelay * totalElements);
    default:
      return elementIndex * staggerDelay;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Simple string hash for deterministic element variation.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if orchestrator is ready to use.
 */
export function isOrchestratorReady(state: EnterpriseAnimationState): boolean {
  return state.initialized && !state.validationErrors;
}

/**
 * Get validation errors if any.
 */
export function getValidationErrors(state: EnterpriseAnimationState): ValidationResult | null {
  return state.validationErrors;
}

/**
 * Reset all per-element state (useful when animation restarts).
 */
export function resetElementStates(state: EnterpriseAnimationState): void {
  state.secondaryMotionStates.clear();
  state.previousPositions.clear();
}
