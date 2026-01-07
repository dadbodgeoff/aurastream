/**
 * Particle Physics
 *
 * Physics simulation for particles including gravity, wind, and turbulence.
 */

import type { Particle, ParticleEffectConfig } from './types';

// ============================================================================
// Physics Constants
// ============================================================================

/** Pixels per second squared for gravity */
const GRAVITY_SCALE = 500;

/** Pixels per second for wind */
const WIND_SCALE = 100;

/** Turbulence frequency */
const TURBULENCE_FREQ = 0.01;

// ============================================================================
// Physics Functions
// ============================================================================

/**
 * Apply gravity to a particle.
 *
 * @param particle Particle to update
 * @param gravity Gravity strength (0-2, 1 = normal)
 * @param deltaTime Time since last frame (seconds)
 * @returns Updated particle
 */
export function applyGravity(
  particle: Particle,
  gravity: number,
  deltaTime: number
): Particle {
  return {
    ...particle,
    vy: particle.vy + gravity * GRAVITY_SCALE * deltaTime,
  };
}

/**
 * Apply wind to a particle.
 *
 * @param particle Particle to update
 * @param windX Horizontal wind strength
 * @param windY Vertical wind strength
 * @param deltaTime Time since last frame (seconds)
 * @returns Updated particle
 */
export function applyWind(
  particle: Particle,
  windX: number,
  windY: number,
  deltaTime: number
): Particle {
  return {
    ...particle,
    vx: particle.vx + windX * WIND_SCALE * deltaTime,
    vy: particle.vy + windY * WIND_SCALE * deltaTime,
  };
}

/**
 * Apply turbulence to a particle.
 * Creates organic, swirling motion.
 *
 * @param particle Particle to update
 * @param turbulence Turbulence strength (0-1)
 * @param time Current time (seconds)
 * @param deltaTime Time since last frame (seconds)
 * @returns Updated particle
 */
export function applyTurbulence(
  particle: Particle,
  turbulence: number,
  time: number,
  deltaTime: number
): Particle {
  // Use particle position and time for pseudo-random turbulence
  const noiseX = Math.sin(particle.x * TURBULENCE_FREQ + time * 2) * turbulence * 100;
  const noiseY = Math.cos(particle.y * TURBULENCE_FREQ + time * 2.5) * turbulence * 100;

  return {
    ...particle,
    vx: particle.vx + noiseX * deltaTime,
    vy: particle.vy + noiseY * deltaTime,
  };
}

/**
 * Apply drag/friction to a particle.
 *
 * @param particle Particle to update
 * @param drag Drag coefficient (0-1, higher = more drag)
 * @param deltaTime Time since last frame (seconds)
 * @returns Updated particle
 */
export function applyDrag(
  particle: Particle,
  drag: number,
  deltaTime: number
): Particle {
  const dragFactor = Math.pow(1 - drag, deltaTime * 60);

  return {
    ...particle,
    vx: particle.vx * dragFactor,
    vy: particle.vy * dragFactor,
  };
}

/**
 * Update particle position based on velocity.
 *
 * @param particle Particle to update
 * @param deltaTime Time since last frame (seconds)
 * @returns Updated particle
 */
export function updatePosition(
  particle: Particle,
  deltaTime: number
): Particle {
  return {
    ...particle,
    x: particle.x + particle.vx * deltaTime,
    y: particle.y + particle.vy * deltaTime,
    rotation: particle.rotation + particle.rotationSpeed * deltaTime,
    lifetime: particle.lifetime + deltaTime * 1000,
  };
}

/**
 * Calculate particle opacity based on lifetime.
 *
 * @param particle Particle to check
 * @param fadeInDuration Fade in duration (0-1 of lifetime)
 * @param fadeOutDuration Fade out duration (0-1 of lifetime)
 * @returns Opacity value (0-1)
 */
export function calculateLifetimeOpacity(
  particle: Particle,
  fadeInDuration: number = 0.1,
  fadeOutDuration: number = 0.3
): number {
  const progress = particle.lifetime / particle.maxLifetime;

  // Fade in
  if (progress < fadeInDuration) {
    return progress / fadeInDuration;
  }

  // Fade out
  if (progress > 1 - fadeOutDuration) {
    return (1 - progress) / fadeOutDuration;
  }

  return 1;
}

/**
 * Check if particle is still alive.
 *
 * @param particle Particle to check
 * @returns True if particle should continue to exist
 */
export function isParticleAlive(particle: Particle): boolean {
  return particle.lifetime < particle.maxLifetime;
}

/**
 * Full physics update for a particle based on config.
 *
 * @param particle Particle to update
 * @param config Particle effect configuration
 * @param deltaTime Time since last frame (seconds)
 * @param time Current time (seconds)
 * @returns Updated particle
 */
export function updateParticlePhysics(
  particle: Particle,
  config: ParticleEffectConfig,
  deltaTime: number,
  time: number
): Particle {
  let updated = particle;

  // Apply type-specific physics
  switch (config.type) {
    case 'confetti':
      updated = applyGravity(updated, config.gravity ?? 0.5, deltaTime);
      updated = applyDrag(updated, 0.02, deltaTime);
      break;

    case 'fire':
      updated = applyGravity(updated, -0.3, deltaTime); // Negative = rises
      updated = applyTurbulence(updated, config.turbulence ?? 0.3, time, deltaTime);
      break;

    case 'snow':
      updated = applyGravity(updated, 0.1, deltaTime);
      updated = applyWind(updated, config.wind ?? 0.2, 0, deltaTime);
      updated = applyTurbulence(updated, 0.1, time, deltaTime);
      break;

    case 'hearts':
      updated = applyGravity(updated, -0.2, deltaTime); // Float up
      const sway = Math.sin(time * 3 + particle.id) * (config.swayAmount ?? 20) / 100;
      updated = applyWind(updated, sway, 0, deltaTime);
      break;

    case 'bubbles':
      updated = applyGravity(updated, -0.15, deltaTime); // Float up
      updated = applyTurbulence(updated, 0.05, time, deltaTime);
      break;

    case 'sparkles':
      updated = applyGravity(updated, -0.1, deltaTime); // Slight rise
      break;

    case 'pixels':
      updated = applyGravity(updated, 0.3, deltaTime);
      updated = applyDrag(updated, 0.01, deltaTime);
      break;

    case 'stars':
      // Stars don't move, just twinkle
      break;
  }

  // Update position
  updated = updatePosition(updated, deltaTime);

  // Update opacity based on lifetime
  updated = {
    ...updated,
    opacity: calculateLifetimeOpacity(updated),
  };

  return updated;
}
