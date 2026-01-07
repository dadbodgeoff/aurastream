/**
 * Loop Animation Defaults
 * Single responsibility: Default configurations for loop animations (frequency layers, noise, jitter)
 */

import type { FrequencyLayer, NoiseConfig, MicroJitter, EnterpriseLoopConfig } from '../types';

// ============================================================================
// Frequency Layer Presets
// ============================================================================

export const FREQUENCY_LAYERS_NONE: FrequencyLayer[] = [];

export const FREQUENCY_LAYERS_SUBTLE: FrequencyLayer[] = [
  { frequency: 2, amplitude: 0.3, phase: Math.PI / 4 },
];

export const FREQUENCY_LAYERS_PROFESSIONAL: FrequencyLayer[] = [
  { frequency: 2, amplitude: 0.35, phase: Math.PI / 4 },
  { frequency: 3.5, amplitude: 0.15, phase: Math.PI / 2 },
];

export const FREQUENCY_LAYERS_ENTERPRISE: FrequencyLayer[] = [
  { frequency: 2, amplitude: 0.4, phase: Math.PI / 4 },
  { frequency: 3.5, amplitude: 0.2, phase: Math.PI / 2 },
  { frequency: 5.7, amplitude: 0.1, phase: Math.PI },
];

// ============================================================================
// Noise Config Defaults
// ============================================================================

export const NOISE_DISABLED: NoiseConfig = {
  enabled: false,
  type: 'fbm',
  frequency: 1,
  amplitude: 0,
  octaves: 2,
  persistence: 0.5,
  seed: 0,
};

export const NOISE_SUBTLE: NoiseConfig = {
  enabled: true,
  type: 'fbm',
  frequency: 0.8,
  amplitude: 0.15,
  octaves: 2,
  persistence: 0.5,
  seed: 42,
};

export const NOISE_PROFESSIONAL: NoiseConfig = {
  enabled: true,
  type: 'fbm',
  frequency: 1.2,
  amplitude: 0.25,
  octaves: 3,
  persistence: 0.5,
  seed: 42,
};

export const NOISE_ENTERPRISE: NoiseConfig = {
  enabled: true,
  type: 'fbm',
  frequency: 1.5,
  amplitude: 0.35,
  octaves: 4,
  persistence: 0.5,
  seed: 42,
};

// ============================================================================
// Micro Jitter Defaults
// ============================================================================

export const MICRO_JITTER_DISABLED: MicroJitter = {
  enabled: false,
  positionAmplitude: 0,
  rotationAmplitude: 0,
  scaleAmplitude: 0,
  frequency: 10,
};

export const MICRO_JITTER_SUBTLE: MicroJitter = {
  enabled: true,
  positionAmplitude: 0.3,
  rotationAmplitude: 0.2,
  scaleAmplitude: 0.002,
  frequency: 12,
};

export const MICRO_JITTER_PROFESSIONAL: MicroJitter = {
  enabled: true,
  positionAmplitude: 0.5,
  rotationAmplitude: 0.4,
  scaleAmplitude: 0.004,
  frequency: 15,
};

export const MICRO_JITTER_ENTERPRISE: MicroJitter = {
  enabled: true,
  positionAmplitude: 0.8,
  rotationAmplitude: 0.6,
  scaleAmplitude: 0.006,
  frequency: 18,
};

// ============================================================================
// Composite Loop Config Defaults
// ============================================================================

export const LOOP_CONFIG_STANDARD: EnterpriseLoopConfig = {
  frequencyLayers: FREQUENCY_LAYERS_NONE,
  noise: NOISE_DISABLED,
  microJitter: MICRO_JITTER_DISABLED,
  phaseRandomization: 0,
};

export const LOOP_CONFIG_PROFESSIONAL: EnterpriseLoopConfig = {
  frequencyLayers: FREQUENCY_LAYERS_PROFESSIONAL,
  noise: NOISE_PROFESSIONAL,
  microJitter: MICRO_JITTER_SUBTLE,
  phaseRandomization: Math.PI / 4,
};

export const LOOP_CONFIG_ENTERPRISE: EnterpriseLoopConfig = {
  frequencyLayers: FREQUENCY_LAYERS_ENTERPRISE,
  noise: NOISE_ENTERPRISE,
  microJitter: MICRO_JITTER_ENTERPRISE,
  phaseRandomization: Math.PI / 2,
};
