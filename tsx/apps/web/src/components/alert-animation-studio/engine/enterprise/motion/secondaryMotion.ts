/**
 * Secondary Motion
 * Single responsibility: Calculate follow-through and overlapping action
 */

import type { SecondaryMotion } from '../types';

export interface SecondaryMotionState {
  positionX: number;
  positionY: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
}

/**
 * Create initial secondary motion state.
 */
export function createSecondaryMotionState(): SecondaryMotionState {
  return {
    positionX: 0,
    positionY: 0,
    rotation: 0,
    velocityX: 0,
    velocityY: 0,
  };
}

/**
 * Update secondary motion state based on primary motion.
 * Implements follow-through where secondary elements lag behind primary motion.
 * 
 * @param state - Current secondary motion state
 * @param primaryX - Primary element X position
 * @param primaryY - Primary element Y position
 * @param config - Secondary motion configuration
 * @param deltaTime - Time since last update (seconds)
 * @returns Updated secondary motion state
 */
export function updateSecondaryMotion(
  state: SecondaryMotionState,
  primaryX: number,
  primaryY: number,
  config: SecondaryMotion,
  deltaTime: number
): SecondaryMotionState {
  if (!config.enabled || deltaTime <= 0) {
    return { ...state, positionX: primaryX, positionY: primaryY, rotation: 0 };
  }

  const { delay, damping, rotationInfluence } = config;

  // Calculate target position (where secondary should eventually be)
  const targetX = primaryX;
  const targetY = primaryY;

  // Calculate spring force towards target
  const springStrength = (1 - delay) * 20; // Higher = faster catch-up
  const dampingForce = damping * 10;

  // Spring physics for X
  const forceX = (targetX - state.positionX) * springStrength;
  const newVelocityX = (state.velocityX + forceX * deltaTime) * (1 - dampingForce * deltaTime);
  const newPositionX = state.positionX + newVelocityX * deltaTime;

  // Spring physics for Y
  const forceY = (targetY - state.positionY) * springStrength;
  const newVelocityY = (state.velocityY + forceY * deltaTime) * (1 - dampingForce * deltaTime);
  const newPositionY = state.positionY + newVelocityY * deltaTime;

  // Calculate rotation based on velocity (drag effect)
  const velocityMagnitude = Math.sqrt(newVelocityX * newVelocityX + newVelocityY * newVelocityY);
  const velocityAngle = Math.atan2(newVelocityY, newVelocityX);
  const rotation = velocityAngle * rotationInfluence * Math.min(velocityMagnitude * 0.01, 1);

  return {
    positionX: newPositionX,
    positionY: newPositionY,
    rotation,
    velocityX: newVelocityX,
    velocityY: newVelocityY,
  };
}

/**
 * Calculate the offset between primary and secondary positions.
 * Useful for applying the lag effect to transforms.
 */
export function getSecondaryOffset(
  state: SecondaryMotionState,
  primaryX: number,
  primaryY: number
): { offsetX: number; offsetY: number; rotation: number } {
  return {
    offsetX: state.positionX - primaryX,
    offsetY: state.positionY - primaryY,
    rotation: state.rotation,
  };
}

/**
 * Reset secondary motion state to match primary position.
 */
export function resetSecondaryMotion(
  primaryX: number,
  primaryY: number
): SecondaryMotionState {
  return {
    positionX: primaryX,
    positionY: primaryY,
    rotation: 0,
    velocityX: 0,
    velocityY: 0,
  };
}
