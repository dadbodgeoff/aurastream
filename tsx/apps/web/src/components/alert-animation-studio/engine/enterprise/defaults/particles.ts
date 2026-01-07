/**
 * Particle Defaults
 * Single responsibility: Default configurations for particle effects
 */

import type {
  ParticleTrailConfig,
  ColorEvolution,
  SizeEvolution,
  EmissionCurve,
  EnterpriseParticleConfig,
} from '../types';
import { NOISE_DISABLED, NOISE_SUBTLE, NOISE_PROFESSIONAL } from './loop';

// ============================================================================
// Particle Trail Defaults
// ============================================================================

export const PARTICLE_TRAILS_DISABLED: ParticleTrailConfig = {
  enabled: false,
  length: 0,
  opacityDecay: 0.8,
  sizeDecay: 0.9,
  updateFrequency: 2,
};

export const PARTICLE_TRAILS_SUBTLE: ParticleTrailConfig = {
  enabled: true,
  length: 3,
  opacityDecay: 0.7,
  sizeDecay: 0.85,
  updateFrequency: 2,
};

export const PARTICLE_TRAILS_PROFESSIONAL: ParticleTrailConfig = {
  enabled: true,
  length: 5,
  opacityDecay: 0.65,
  sizeDecay: 0.8,
  updateFrequency: 2,
};

export const PARTICLE_TRAILS_ENTERPRISE: ParticleTrailConfig = {
  enabled: true,
  length: 8,
  opacityDecay: 0.6,
  sizeDecay: 0.75,
  updateFrequency: 1,
};

// ============================================================================
// Color Evolution Presets
// ============================================================================

export const COLOR_EVOLUTION_DISABLED: ColorEvolution = {
  enabled: false,
  stops: [],
  interpolation: 'linear',
};

export const COLOR_EVOLUTION_FIRE: ColorEvolution = {
  enabled: true,
  stops: [
    { position: 0, color: '#ffffff' },
    { position: 0.2, color: '#ffff00' },
    { position: 0.5, color: '#ff8c00' },
    { position: 0.8, color: '#ff4500' },
    { position: 1, color: '#8b0000' },
  ],
  interpolation: 'smooth',
};

export const COLOR_EVOLUTION_SPARKLE: ColorEvolution = {
  enabled: true,
  stops: [
    { position: 0, color: '#ffffff' },
    { position: 0.3, color: '#ffd700' },
    { position: 0.7, color: '#ffd700' },
    { position: 1, color: '#ffffff' },
  ],
  interpolation: 'smooth',
};

export const COLOR_EVOLUTION_RAINBOW: ColorEvolution = {
  enabled: true,
  stops: [
    { position: 0, color: '#ff0000' },
    { position: 0.17, color: '#ff8c00' },
    { position: 0.33, color: '#ffff00' },
    { position: 0.5, color: '#00ff00' },
    { position: 0.67, color: '#0000ff' },
    { position: 0.83, color: '#8b00ff' },
    { position: 1, color: '#ff0000' },
  ],
  interpolation: 'smooth',
};

// ============================================================================
// Size Evolution Presets
// ============================================================================

export const SIZE_EVOLUTION_DISABLED: SizeEvolution = {
  enabled: false,
  curve: [],
  interpolation: 'linear',
};

export const SIZE_EVOLUTION_GROW_SHRINK: SizeEvolution = {
  enabled: true,
  curve: [
    { position: 0, scale: 0.2 },
    { position: 0.3, scale: 1.2 },
    { position: 0.7, scale: 1 },
    { position: 1, scale: 0 },
  ],
  interpolation: 'smooth',
};

export const SIZE_EVOLUTION_BURST: SizeEvolution = {
  enabled: true,
  curve: [
    { position: 0, scale: 0.5 },
    { position: 0.1, scale: 1.5 },
    { position: 0.3, scale: 1 },
    { position: 1, scale: 0.3 },
  ],
  interpolation: 'smooth',
};

// ============================================================================
// Emission Curve Presets
// ============================================================================

export const EMISSION_CONSTANT: EmissionCurve = { type: 'constant' };

export const EMISSION_BURST: EmissionCurve = {
  type: 'burst',
  burstCount: 20,
  burstInterval: 500,
};

export const EMISSION_WAVE: EmissionCurve = {
  type: 'wave',
  waveFrequency: 2,
};

// ============================================================================
// Composite Particle Config Defaults
// ============================================================================

export const PARTICLE_CONFIG_STANDARD: EnterpriseParticleConfig = {
  trails: PARTICLE_TRAILS_DISABLED,
  colorEvolution: COLOR_EVOLUTION_DISABLED,
  sizeEvolution: SIZE_EVOLUTION_DISABLED,
  emissionCurve: EMISSION_CONSTANT,
  turbulenceNoise: NOISE_DISABLED,
  drag: 0.02,
  airResistance: 0.01,
};

export const PARTICLE_CONFIG_PROFESSIONAL: EnterpriseParticleConfig = {
  trails: PARTICLE_TRAILS_SUBTLE,
  colorEvolution: COLOR_EVOLUTION_SPARKLE,
  sizeEvolution: SIZE_EVOLUTION_GROW_SHRINK,
  emissionCurve: EMISSION_BURST,
  turbulenceNoise: NOISE_SUBTLE,
  drag: 0.03,
  airResistance: 0.02,
};

export const PARTICLE_CONFIG_ENTERPRISE: EnterpriseParticleConfig = {
  trails: PARTICLE_TRAILS_ENTERPRISE,
  colorEvolution: COLOR_EVOLUTION_FIRE,
  sizeEvolution: SIZE_EVOLUTION_BURST,
  emissionCurve: EMISSION_BURST,
  turbulenceNoise: NOISE_PROFESSIONAL,
  drag: 0.04,
  airResistance: 0.025,
};
