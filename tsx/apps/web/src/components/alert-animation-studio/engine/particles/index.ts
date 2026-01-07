/**
 * Particles Module - Index
 * 
 * Exports both CSS fallback and WebGL particle renderers.
 */

export { WebGLParticleOverlay } from './WebGLParticleOverlay';

// Re-export from animations/particles for convenience
export {
  initParticleSystem,
  updateParticleSystem,
  spawnBurst,
  spawnParticles,
  getParticles,
  getParticleCount,
  hasParticles,
  resetParticleSystem,
} from '../animations/particles/system';

export type {
  Particle,
  ParticleSystemState,
  ParticleEffectConfig,
} from '../animations/particles/types';
