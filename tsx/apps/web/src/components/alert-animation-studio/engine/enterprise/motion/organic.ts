/**
 * Organic Motion
 * Single responsibility: Add organic, natural-feeling motion through noise and layered frequencies
 */

import type { FrequencyLayer, NoiseConfig, MicroJitter } from '../types';
import { fbm1D, fbm2D, valueNoise1D } from '../../animations/core/noise';

export interface OrganicMotionResult {
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
}

/**
 * Calculate organic motion offset using layered frequencies.
 * Creates complex, natural-looking oscillation by combining multiple sine waves.
 * 
 * @param time - Current time in seconds
 * @param baseFrequency - Base oscillation frequency
 * @param baseAmplitude - Base oscillation amplitude
 * @param layers - Additional frequency layers to combine
 * @param phaseOffset - Phase offset for variation between elements
 * @returns Combined oscillation value
 */
export function calculateLayeredOscillation(
  time: number,
  baseFrequency: number,
  baseAmplitude: number,
  layers: FrequencyLayer[],
  phaseOffset: number = 0
): number {
  // Base oscillation
  let result = Math.sin(time * baseFrequency * Math.PI * 2 + phaseOffset) * baseAmplitude;

  // Add frequency layers
  for (const layer of layers) {
    const layerPhase = phaseOffset + layer.phase;
    const layerValue = Math.sin(time * baseFrequency * layer.frequency * Math.PI * 2 + layerPhase);
    result += layerValue * baseAmplitude * layer.amplitude;
  }

  return result;
}

/**
 * Apply noise-based variation to a value.
 * Uses fractal Brownian motion for natural-looking randomness.
 * 
 * @param value - Base value to modify
 * @param time - Current time in seconds
 * @param config - Noise configuration
 * @param elementId - Unique ID for per-element variation
 * @returns Modified value with noise applied
 */
export function applyNoiseVariation(
  value: number,
  time: number,
  config: NoiseConfig,
  elementId: number = 0
): number {
  if (!config.enabled || config.amplitude === 0) {
    return value;
  }

  const { type, frequency, amplitude, octaves, persistence, seed } = config;

  let noiseValue: number;

  switch (type) {
    case 'fbm':
      noiseValue = fbm1D(time * frequency + elementId * 100, octaves, persistence, seed);
      break;
    case 'value':
      noiseValue = valueNoise1D(time * frequency + elementId * 100, seed);
      break;
    case 'perlin':
    case 'simplex':
      // Use fbm2D for more complex noise
      noiseValue = fbm2D(time * frequency, elementId * 0.1, octaves, persistence, seed);
      break;
    default:
      noiseValue = 0;
  }

  return value + noiseValue * amplitude;
}

/**
 * Calculate micro-jitter for "always alive" feel.
 * Adds subtle, high-frequency movement that makes elements feel organic.
 * 
 * @param time - Current time in seconds
 * @param config - Micro-jitter configuration
 * @param elementId - Unique ID for per-element variation
 * @returns Jitter offsets for position, rotation, and scale
 */
export function calculateMicroJitter(
  time: number,
  config: MicroJitter,
  elementId: number = 0
): OrganicMotionResult {
  if (!config.enabled) {
    return { offsetX: 0, offsetY: 0, rotation: 0, scale: 1 };
  }

  const { positionAmplitude, rotationAmplitude, scaleAmplitude, frequency } = config;

  // Use different phase offsets for each axis to avoid synchronized movement
  const phaseX = elementId * 1.7;
  const phaseY = elementId * 2.3;
  const phaseR = elementId * 3.1;
  const phaseS = elementId * 4.7;

  // High-frequency noise for jitter effect
  const jitterX = valueNoise1D(time * frequency + phaseX, elementId) * positionAmplitude;
  const jitterY = valueNoise1D(time * frequency + phaseY, elementId + 1000) * positionAmplitude;
  const jitterR = valueNoise1D(time * frequency * 0.7 + phaseR, elementId + 2000) * rotationAmplitude * (Math.PI / 180);
  const jitterS = 1 + valueNoise1D(time * frequency * 0.5 + phaseS, elementId + 3000) * scaleAmplitude;

  return {
    offsetX: jitterX,
    offsetY: jitterY,
    rotation: jitterR,
    scale: jitterS,
  };
}

/**
 * Combine all organic motion effects into a single result.
 * 
 * @param time - Current time in seconds
 * @param baseAmplitudeX - Base X amplitude
 * @param baseAmplitudeY - Base Y amplitude
 * @param baseFrequency - Base frequency
 * @param layers - Frequency layers
 * @param noise - Noise configuration
 * @param jitter - Micro-jitter configuration
 * @param elementId - Unique element ID
 * @param phaseOffset - Phase offset
 * @returns Combined organic motion result
 */
export function calculateOrganicMotion(
  time: number,
  baseAmplitudeX: number,
  baseAmplitudeY: number,
  baseFrequency: number,
  layers: FrequencyLayer[],
  noise: NoiseConfig,
  jitter: MicroJitter,
  elementId: number = 0,
  phaseOffset: number = 0
): OrganicMotionResult {
  // Calculate layered oscillation
  let offsetX = calculateLayeredOscillation(time, baseFrequency, baseAmplitudeX, layers, phaseOffset);
  let offsetY = calculateLayeredOscillation(time, baseFrequency, baseAmplitudeY, layers, phaseOffset + Math.PI / 2);

  // Apply noise variation
  offsetX = applyNoiseVariation(offsetX, time, noise, elementId);
  offsetY = applyNoiseVariation(offsetY, time, noise, elementId + 500);

  // Add micro-jitter
  const jitterResult = calculateMicroJitter(time, jitter, elementId);

  return {
    offsetX: offsetX + jitterResult.offsetX,
    offsetY: offsetY + jitterResult.offsetY,
    rotation: jitterResult.rotation,
    scale: jitterResult.scale,
  };
}
