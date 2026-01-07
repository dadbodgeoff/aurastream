/**
 * Particle System Module
 *
 * Complete particle system with physics, spawning, and rendering.
 */

// Types
export * from './types';

// Physics
export {
  applyGravity,
  applyWind,
  applyTurbulence,
  applyDrag,
  updatePosition,
  calculateLifetimeOpacity,
  isParticleAlive,
  updateParticlePhysics,
} from './physics';

// Spawners
export {
  spawnParticle,
  spawnSparkle,
  spawnConfetti,
  spawnHeart,
  spawnFire,
  spawnSnow,
  spawnBubble,
  spawnStar,
  spawnPixel,
} from './spawners';

// System
export {
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
} from './system';

// Renderer
export {
  getParticleShape,
  getParticleClass,
  getParticleStyles,
  getContainerStyles,
  getParticleSVG,
  getParticleContent,
  isParticleVisible,
  getVisibleParticles,
  HEART_PATH,
  STAR_PATH,
  SPARKLE_PATH,
} from './renderer';
