/**
 * Particle System
 *
 * Core particle system management - spawning, updating, and culling particles.
 */

import type {
  Particle,
  ParticleEffectConfig,
  ParticleSystemState,
} from './types';
import { createParticleSystem, mergeParticleConfig } from './types';
import { spawnParticle } from './spawners';
import { updateParticlePhysics, isParticleAlive } from './physics';

// ============================================================================
// System Management
// ============================================================================

/**
 * Initialize a new particle system.
 */
export function initParticleSystem(): ParticleSystemState {
  return createParticleSystem();
}

/**
 * Reset particle system to initial state.
 */
export function resetParticleSystem(state: ParticleSystemState): ParticleSystemState {
  return {
    ...state,
    particles: [],
    lastSpawnTime: 0,
    isActive: true,
  };
}

/**
 * Pause particle system (stops spawning, keeps existing particles).
 */
export function pauseParticleSystem(state: ParticleSystemState): ParticleSystemState {
  return {
    ...state,
    isActive: false,
  };
}

/**
 * Resume particle system.
 */
export function resumeParticleSystem(state: ParticleSystemState): ParticleSystemState {
  return {
    ...state,
    isActive: true,
  };
}

// ============================================================================
// Spawning
// ============================================================================

/**
 * Calculate spawn rate based on config.
 *
 * @param config Particle effect configuration
 * @returns Spawn interval in milliseconds
 */
function calculateSpawnInterval(config: ParticleEffectConfig): number {
  const count = config.count ?? 20;
  const lifetime = config.lifetimeMs ?? 2000;

  // Spawn rate to maintain target count
  // If we want 20 particles with 2000ms lifetime, spawn every 100ms
  return lifetime / count;
}

/**
 * Spawn particles based on elapsed time.
 *
 * @param state Current system state
 * @param config Particle effect configuration
 * @param currentTime Current time in milliseconds
 * @param canvasWidth Canvas width
 * @param canvasHeight Canvas height
 * @returns Updated system state
 */
export function spawnParticles(
  state: ParticleSystemState,
  config: ParticleEffectConfig,
  currentTime: number,
  canvasWidth: number,
  canvasHeight: number
): ParticleSystemState {
  if (!state.isActive) return state;

  const mergedConfig = mergeParticleConfig(config);
  const spawnInterval = calculateSpawnInterval(mergedConfig);
  const timeSinceLastSpawn = currentTime - state.lastSpawnTime;

  // Calculate how many particles to spawn
  const particlesToSpawn = Math.floor(timeSinceLastSpawn / spawnInterval);

  if (particlesToSpawn <= 0) return state;

  // Spawn particles
  const newParticles: Particle[] = [];
  let nextId = state.nextId;

  for (let i = 0; i < particlesToSpawn; i++) {
    const particle = spawnParticle(
      mergedConfig,
      { ...state, nextId },
      canvasWidth,
      canvasHeight
    );
    newParticles.push(particle);
    nextId++;
  }

  return {
    ...state,
    particles: [...state.particles, ...newParticles],
    lastSpawnTime: currentTime,
    nextId,
  };
}

/**
 * Spawn a burst of particles immediately.
 *
 * @param state Current system state
 * @param config Particle effect configuration
 * @param count Number of particles to spawn
 * @param canvasWidth Canvas width
 * @param canvasHeight Canvas height
 * @returns Updated system state
 */
export function spawnBurst(
  state: ParticleSystemState,
  config: ParticleEffectConfig,
  count: number,
  canvasWidth: number,
  canvasHeight: number
): ParticleSystemState {
  const mergedConfig = mergeParticleConfig(config);
  const newParticles: Particle[] = [];
  let nextId = state.nextId;

  for (let i = 0; i < count; i++) {
    const particle = spawnParticle(
      mergedConfig,
      { ...state, nextId },
      canvasWidth,
      canvasHeight
    );
    newParticles.push(particle);
    nextId++;
  }

  return {
    ...state,
    particles: [...state.particles, ...newParticles],
    nextId,
  };
}

// ============================================================================
// Updating
// ============================================================================

/**
 * Update all particles in the system.
 *
 * @param state Current system state
 * @param config Particle effect configuration
 * @param deltaTime Time since last frame (seconds)
 * @param time Current time (seconds)
 * @returns Updated system state
 */
export function updateParticles(
  state: ParticleSystemState,
  config: ParticleEffectConfig,
  deltaTime: number,
  time: number
): ParticleSystemState {
  const mergedConfig = mergeParticleConfig(config);

  // Update each particle
  const updatedParticles = state.particles
    .map(particle => updateParticlePhysics(particle, mergedConfig, deltaTime, time))
    .filter(isParticleAlive);

  return {
    ...state,
    particles: updatedParticles,
  };
}

/**
 * Full system update - spawn and update particles.
 *
 * @param state Current system state
 * @param config Particle effect configuration
 * @param currentTimeMs Current time in milliseconds
 * @param deltaTime Time since last frame (seconds)
 * @param canvasWidth Canvas width
 * @param canvasHeight Canvas height
 * @returns Updated system state
 */
export function updateParticleSystem(
  state: ParticleSystemState,
  config: ParticleEffectConfig,
  currentTimeMs: number,
  deltaTime: number,
  canvasWidth: number,
  canvasHeight: number
): ParticleSystemState {
  // Spawn new particles
  let updated = spawnParticles(
    state,
    config,
    currentTimeMs,
    canvasWidth,
    canvasHeight
  );

  // Update existing particles
  updated = updateParticles(
    updated,
    config,
    deltaTime,
    currentTimeMs / 1000
  );

  return updated;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get current particle count.
 */
export function getParticleCount(state: ParticleSystemState): number {
  return state.particles.length;
}

/**
 * Get all active particles.
 */
export function getParticles(state: ParticleSystemState): readonly Particle[] {
  return state.particles;
}

/**
 * Check if system has any active particles.
 */
export function hasParticles(state: ParticleSystemState): boolean {
  return state.particles.length > 0;
}
