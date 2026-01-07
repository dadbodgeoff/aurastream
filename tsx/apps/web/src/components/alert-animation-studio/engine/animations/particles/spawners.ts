/**
 * Particle Spawners
 *
 * Functions to create new particles for each effect type.
 */

import type { Particle, ParticleEffectConfig, ParticleSystemState } from './types';
import type { SpawnArea } from '../core/types';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Random number in range.
 */
function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Pick a random color from config.
 */
function pickColor(config: ParticleEffectConfig): string {
  if (config.colors && config.colors.length > 0) {
    return config.colors[Math.floor(Math.random() * config.colors.length)];
  }

  const baseColor = config.color ?? '#ffffff';
  const variance = config.colorVariance ?? 0;

  if (variance === 0) return baseColor;

  // Parse hex and add variance
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);

  const vr = Math.max(0, Math.min(255, r + (Math.random() - 0.5) * variance * 255));
  const vg = Math.max(0, Math.min(255, g + (Math.random() - 0.5) * variance * 255));
  const vb = Math.max(0, Math.min(255, b + (Math.random() - 0.5) * variance * 255));

  return `rgb(${Math.round(vr)}, ${Math.round(vg)}, ${Math.round(vb)})`;
}

/**
 * Get spawn position based on spawn area.
 */
function getSpawnPosition(
  area: SpawnArea,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  switch (area) {
    case 'above':
      return { x: Math.random() * canvasWidth, y: -20 };

    case 'below':
      return { x: Math.random() * canvasWidth, y: canvasHeight + 20 };

    case 'center':
      return {
        x: canvasWidth / 2 + (Math.random() - 0.5) * 100,
        y: canvasHeight / 2 + (Math.random() - 0.5) * 100,
      };

    case 'edges': {
      const side = Math.floor(Math.random() * 4);
      switch (side) {
        case 0: return { x: Math.random() * canvasWidth, y: -20 };
        case 1: return { x: canvasWidth + 20, y: Math.random() * canvasHeight };
        case 2: return { x: Math.random() * canvasWidth, y: canvasHeight + 20 };
        default: return { x: -20, y: Math.random() * canvasHeight };
      }
    }

    case 'around':
    default: {
      const side = Math.floor(Math.random() * 4);
      switch (side) {
        case 0: return { x: Math.random() * canvasWidth, y: -20 };
        case 1: return { x: canvasWidth + 20, y: Math.random() * canvasHeight };
        case 2: return { x: Math.random() * canvasWidth, y: canvasHeight + 20 };
        default: return { x: -20, y: Math.random() * canvasHeight };
      }
    }
  }
}

/**
 * Get particle size from config.
 */
function getSize(config: ParticleEffectConfig): number {
  if (config.size !== undefined) return config.size;
  return randomInRange(config.sizeMin ?? 2, config.sizeMax ?? 6);
}

// ============================================================================
// Type-Specific Spawners
// ============================================================================

/**
 * Spawn a sparkle particle.
 */
export function spawnSparkle(
  config: ParticleEffectConfig,
  state: ParticleSystemState,
  canvasWidth: number,
  canvasHeight: number
): Particle {
  const pos = getSpawnPosition(config.spawnArea ?? 'around', canvasWidth, canvasHeight);
  const speed = config.speed ?? 1;

  return {
    id: state.nextId++,
    x: pos.x,
    y: pos.y,
    vx: (Math.random() - 0.5) * 50 * speed,
    vy: -randomInRange(30, 80) * speed,
    size: getSize(config),
    color: pickColor(config),
    opacity: 1,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 2,
    lifetime: 0,
    maxLifetime: config.lifetimeMs ?? 2000,
    type: 'sparkles',
  };
}

/**
 * Spawn a confetti particle.
 */
export function spawnConfetti(
  config: ParticleEffectConfig,
  state: ParticleSystemState,
  canvasWidth: number,
  canvasHeight: number
): Particle {
  const spread = ((config as any).spread ?? 180) * (Math.PI / 180);
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
  const speed = randomInRange(200, 400) * (config.speed ?? 1);

  return {
    id: state.nextId++,
    x: canvasWidth / 2 + (Math.random() - 0.5) * 100,
    y: canvasHeight / 2,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: getSize(config),
    color: pickColor(config),
    opacity: 1,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 10,
    lifetime: 0,
    maxLifetime: config.lifetimeMs ?? 3000,
    type: 'confetti',
  };
}

/**
 * Spawn a heart particle.
 */
export function spawnHeart(
  config: ParticleEffectConfig,
  state: ParticleSystemState,
  canvasWidth: number,
  canvasHeight: number
): Particle {
  const floatSpeed = (config as any).floatSpeed ?? 0.6;

  return {
    id: state.nextId++,
    x: Math.random() * canvasWidth,
    y: canvasHeight + 20,
    vx: (Math.random() - 0.5) * 30,
    vy: -randomInRange(30, 60) * floatSpeed,
    size: getSize(config),
    color: pickColor(config),
    opacity: 1,
    rotation: 0,
    rotationSpeed: 0,
    lifetime: 0,
    maxLifetime: config.lifetimeMs ?? 4000,
    type: 'hearts',
  };
}

/**
 * Spawn a fire particle.
 */
export function spawnFire(
  config: ParticleEffectConfig,
  state: ParticleSystemState,
  canvasWidth: number,
  canvasHeight: number
): Particle {
  const turbulence = (config as any).turbulence ?? 0.3;
  const speed = config.speed ?? 1.5;

  return {
    id: state.nextId++,
    x: canvasWidth / 2 + (Math.random() - 0.5) * 60,
    y: canvasHeight - 20,
    vx: (Math.random() - 0.5) * turbulence * 100,
    vy: -randomInRange(100, 200) * speed,
    size: getSize(config),
    color: pickColor(config),
    opacity: 1,
    rotation: 0,
    rotationSpeed: 0,
    lifetime: 0,
    maxLifetime: config.lifetimeMs ?? 1500,
    type: 'fire',
  };
}

/**
 * Spawn a snow particle.
 */
export function spawnSnow(
  config: ParticleEffectConfig,
  state: ParticleSystemState,
  canvasWidth: number,
  canvasHeight: number
): Particle {
  const speed = config.speed ?? 1;

  return {
    id: state.nextId++,
    x: Math.random() * canvasWidth,
    y: -20,
    vx: (Math.random() - 0.5) * 20,
    vy: randomInRange(30, 60) * speed,
    size: getSize(config),
    color: config.color ?? '#ffffff',
    opacity: randomInRange(0.5, 1),
    rotation: 0,
    rotationSpeed: (Math.random() - 0.5) * 0.5,
    lifetime: 0,
    maxLifetime: config.lifetimeMs ?? 5000,
    type: 'snow',
  };
}

/**
 * Spawn a bubble particle.
 */
export function spawnBubble(
  config: ParticleEffectConfig,
  state: ParticleSystemState,
  canvasWidth: number,
  canvasHeight: number
): Particle {
  const speed = config.speed ?? 1;

  return {
    id: state.nextId++,
    x: Math.random() * canvasWidth,
    y: canvasHeight + 20,
    vx: (Math.random() - 0.5) * 15,
    vy: -randomInRange(30, 60) * speed,
    size: getSize(config),
    color: config.color ?? 'rgba(135, 206, 250, 0.6)',
    opacity: randomInRange(0.3, 0.7),
    rotation: 0,
    rotationSpeed: 0,
    lifetime: 0,
    maxLifetime: config.lifetimeMs ?? 4000,
    type: 'bubbles',
  };
}

/**
 * Spawn a star particle.
 */
export function spawnStar(
  config: ParticleEffectConfig,
  state: ParticleSystemState,
  canvasWidth: number,
  canvasHeight: number
): Particle {
  return {
    id: state.nextId++,
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    vx: 0,
    vy: 0,
    size: getSize(config),
    color: pickColor(config),
    opacity: 0, // Stars start invisible and twinkle in
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.5,
    lifetime: 0,
    maxLifetime: config.lifetimeMs ?? 2000,
    type: 'stars',
  };
}

/**
 * Spawn a pixel particle.
 */
export function spawnPixel(
  config: ParticleEffectConfig,
  state: ParticleSystemState,
  canvasWidth: number,
  canvasHeight: number
): Particle {
  const angle = Math.random() * Math.PI * 2;
  const force = (config as any).explosionForce ?? 3;
  const speed = randomInRange(50, 150) * force * (config.speed ?? 1);

  return {
    id: state.nextId++,
    x: canvasWidth / 2,
    y: canvasHeight / 2,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: getSize(config),
    color: pickColor(config),
    opacity: 1,
    rotation: 0,
    rotationSpeed: 0,
    lifetime: 0,
    maxLifetime: config.lifetimeMs ?? 2000,
    type: 'pixels',
  };
}

// ============================================================================
// Spawn Dispatcher
// ============================================================================

/**
 * Spawn a particle based on config type.
 */
export function spawnParticle(
  config: ParticleEffectConfig,
  state: ParticleSystemState,
  canvasWidth: number,
  canvasHeight: number
): Particle {
  switch (config.type) {
    case 'sparkles':
      return spawnSparkle(config, state, canvasWidth, canvasHeight);
    case 'confetti':
      return spawnConfetti(config, state, canvasWidth, canvasHeight);
    case 'hearts':
      return spawnHeart(config, state, canvasWidth, canvasHeight);
    case 'fire':
      return spawnFire(config, state, canvasWidth, canvasHeight);
    case 'snow':
      return spawnSnow(config, state, canvasWidth, canvasHeight);
    case 'bubbles':
      return spawnBubble(config, state, canvasWidth, canvasHeight);
    case 'stars':
      return spawnStar(config, state, canvasWidth, canvasHeight);
    case 'pixels':
      return spawnPixel(config, state, canvasWidth, canvasHeight);
    default:
      return spawnSparkle(config, state, canvasWidth, canvasHeight);
  }
}
