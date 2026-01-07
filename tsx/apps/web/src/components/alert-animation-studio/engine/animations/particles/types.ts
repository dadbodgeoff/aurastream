/**
 * Particle System Types
 *
 * Configuration interfaces for the particle system.
 */

import type { ParticleEffectType, SpawnArea } from '../core/types';

// Re-export types needed by other modules
export type { ParticleEffectType, SpawnArea } from '../core/types';

// ============================================================================
// Particle Instance
// ============================================================================

/**
 * Single particle instance.
 */
export interface Particle {
  /** Unique identifier */
  id: number;
  /** X position (pixels) */
  x: number;
  /** Y position (pixels) */
  y: number;
  /** X velocity (pixels per second) */
  vx: number;
  /** Y velocity (pixels per second) */
  vy: number;
  /** Particle size (pixels) */
  size: number;
  /** Particle color (CSS color string) */
  color: string;
  /** Current opacity (0-1) */
  opacity: number;
  /** Current rotation (radians) */
  rotation: number;
  /** Rotation speed (radians per second) */
  rotationSpeed: number;
  /** Time alive (milliseconds) */
  lifetime: number;
  /** Maximum lifetime (milliseconds) */
  maxLifetime: number;
  /** Particle type for rendering */
  type: ParticleEffectType;
  /** Custom data for specific particle types */
  data?: Record<string, unknown>;
}

// ============================================================================
// Particle System State
// ============================================================================

/**
 * Particle system state.
 */
export interface ParticleSystemState {
  /** Active particles */
  particles: Particle[];
  /** Time of last spawn (milliseconds) */
  lastSpawnTime: number;
  /** Next particle ID */
  nextId: number;
  /** Whether system is active */
  isActive: boolean;
}

/**
 * Create initial particle system state.
 */
export function createParticleSystem(): ParticleSystemState {
  return {
    particles: [],
    lastSpawnTime: 0,
    nextId: 0,
    isActive: true,
  };
}

// ============================================================================
// Particle Effect Config
// ============================================================================

/**
 * Base particle effect configuration.
 */
export interface BaseParticleConfig {
  /** Effect type */
  type: ParticleEffectType;
  /** Number of particles */
  count?: number;
  /** Base color (hex) */
  color?: string;
  /** Multiple colors to choose from */
  colors?: string[];
  /** Color variance (0-1) */
  colorVariance?: number;
  /** Minimum size (pixels) */
  sizeMin?: number;
  /** Maximum size (pixels) */
  sizeMax?: number;
  /** Fixed size (overrides min/max) */
  size?: number;
  /** Speed multiplier */
  speed?: number;
  /** Lifetime in milliseconds */
  lifetimeMs?: number;
  /** Spawn area */
  spawnArea?: SpawnArea;
}

/**
 * Sparkles configuration.
 */
export interface SparklesConfig extends BaseParticleConfig {
  type: 'sparkles';
  /** Twinkle frequency */
  twinkleSpeed?: number;
}

/**
 * Confetti configuration.
 */
export interface ConfettiConfig extends BaseParticleConfig {
  type: 'confetti';
  /** Gravity strength */
  gravity?: number;
  /** Spread angle in degrees */
  spread?: number;
}

/**
 * Hearts configuration.
 */
export interface HeartsConfig extends BaseParticleConfig {
  type: 'hearts';
  /** Float speed */
  floatSpeed?: number;
  /** Sway amount (0-100) */
  swayAmount?: number;
}

/**
 * Fire configuration.
 */
export interface FireConfig extends BaseParticleConfig {
  type: 'fire';
  /** Turbulence amount (0-1) */
  turbulence?: number;
}

/**
 * Snow configuration.
 */
export interface SnowConfig extends BaseParticleConfig {
  type: 'snow';
  /** Wind strength */
  wind?: number;
}

/**
 * Bubbles configuration.
 */
export interface BubblesConfig extends BaseParticleConfig {
  type: 'bubbles';
  /** Pop probability per frame */
  popChance?: number;
}

/**
 * Stars configuration.
 */
export interface StarsConfig extends BaseParticleConfig {
  type: 'stars';
  /** Twinkle speed */
  twinkleSpeed?: number;
}

/**
 * Pixels configuration.
 */
export interface PixelsConfig extends BaseParticleConfig {
  type: 'pixels';
  /** Explosion force */
  explosionForce?: number;
}

/**
 * Union of all particle configs.
 */
export type ParticleEffectConfig =
  | SparklesConfig
  | ConfettiConfig
  | HeartsConfig
  | FireConfig
  | SnowConfig
  | BubblesConfig
  | StarsConfig
  | PixelsConfig;

// ============================================================================
// Default Configs
// ============================================================================

/**
 * Default configurations for each particle type.
 */
export const PARTICLE_DEFAULTS: Record<ParticleEffectType, Partial<ParticleEffectConfig>> = {
  sparkles: {
    count: 20,
    color: '#ffd700',
    sizeMin: 2,
    sizeMax: 6,
    speed: 1,
    lifetimeMs: 2000,
    spawnArea: 'around',
    twinkleSpeed: 3,
  },
  confetti: {
    count: 50,
    colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
    sizeMin: 6,
    sizeMax: 10,
    speed: 1,
    lifetimeMs: 3000,
    spawnArea: 'center',
    gravity: 0.5,
    spread: 180,
  },
  hearts: {
    count: 15,
    color: '#ff69b4',
    colors: ['#ff69b4', '#ff1493', '#ff6b6b'],
    sizeMin: 8,
    sizeMax: 16,
    speed: 0.6,
    lifetimeMs: 4000,
    spawnArea: 'below',
    floatSpeed: 0.6,
    swayAmount: 20,
  },
  fire: {
    count: 30,
    colors: ['#ff4500', '#ff6600', '#ff8c00', '#ffd700'],
    sizeMin: 4,
    sizeMax: 12,
    speed: 1.5,
    lifetimeMs: 1500,
    spawnArea: 'below',
    turbulence: 0.3,
  },
  snow: {
    count: 40,
    color: '#ffffff',
    sizeMin: 2,
    sizeMax: 6,
    speed: 1,
    lifetimeMs: 5000,
    spawnArea: 'above',
    wind: 0.2,
  },
  bubbles: {
    count: 20,
    color: '#87ceeb',
    sizeMin: 4,
    sizeMax: 16,
    speed: 1,
    lifetimeMs: 4000,
    spawnArea: 'below',
    popChance: 0.001,
  },
  stars: {
    count: 25,
    color: '#ffd700',
    colors: ['#ffd700', '#ffffff', '#87ceeb'],
    sizeMin: 2,
    sizeMax: 8,
    speed: 0,
    lifetimeMs: 2000,
    spawnArea: 'around',
    twinkleSpeed: 2,
  },
  pixels: {
    count: 40,
    colors: ['#00ff00', '#ff00ff', '#00ffff', '#ffff00'],
    sizeMin: 2,
    sizeMax: 6,
    speed: 1,
    lifetimeMs: 2000,
    spawnArea: 'center',
    explosionForce: 3,
  },
};

/**
 * Get default config for a particle type.
 */
export function getParticleDefaults<T extends ParticleEffectType>(
  type: T
): Partial<ParticleEffectConfig> {
  return PARTICLE_DEFAULTS[type];
}

/**
 * Merge user config with defaults.
 */
export function mergeParticleConfig<T extends ParticleEffectConfig>(
  config: T
): T {
  const defaults = PARTICLE_DEFAULTS[config.type] as Partial<T>;
  return { ...defaults, ...config } as T;
}
