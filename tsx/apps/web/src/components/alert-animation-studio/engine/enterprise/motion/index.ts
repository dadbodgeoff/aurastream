/**
 * Enterprise Motion Utilities - Index
 * 
 * Professional motion design functions for enterprise-grade animations.
 */

export { applyMotionCurve, getMotionVelocity, isInAnticipation, isInSettle } from './curves';
export { calculateSquashStretch, applySquashStretch, calculateVelocityFromDelta } from './squashStretch';
export type { SquashStretchResult } from './squashStretch';
export {
  createSecondaryMotionState,
  updateSecondaryMotion,
  getSecondaryOffset,
  resetSecondaryMotion,
} from './secondaryMotion';
export type { SecondaryMotionState } from './secondaryMotion';
export {
  calculateLayeredOscillation,
  applyNoiseVariation,
  calculateMicroJitter,
  calculateOrganicMotion,
} from './organic';
export type { OrganicMotionResult } from './organic';
