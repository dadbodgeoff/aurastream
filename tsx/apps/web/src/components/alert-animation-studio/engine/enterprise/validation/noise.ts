/**
 * Noise Configuration Validation
 * Single responsibility: Validate NoiseConfig and MicroJitter configurations
 */

import type { NoiseConfig, MicroJitter, ValidationResult, ValidationError, ValidationWarning } from '../types';

function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function isPositive(value: number): boolean {
  return value > 0;
}

function isNonNegative(value: number): boolean {
  return value >= 0;
}

export function validateNoiseConfig(noise: NoiseConfig, prefix = 'noise'): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (noise.enabled) {
    if (!['perlin', 'simplex', 'fbm', 'value'].includes(noise.type)) {
      errors.push({ field: `${prefix}.type`, message: 'Invalid noise type', code: 'INVALID_VALUE' });
    }

    if (!isPositive(noise.frequency)) {
      errors.push({ field: `${prefix}.frequency`, message: 'Must be positive', code: 'RANGE_ERROR' });
    }

    if (!isNonNegative(noise.amplitude)) {
      errors.push({ field: `${prefix}.amplitude`, message: 'Must be non-negative', code: 'RANGE_ERROR' });
    }

    if (noise.type === 'fbm') {
      if (!isInRange(noise.octaves, 1, 8)) {
        errors.push({ field: `${prefix}.octaves`, message: 'Must be between 1 and 8', code: 'RANGE_ERROR' });
      }

      if (!isInRange(noise.persistence, 0, 1)) {
        errors.push({ field: `${prefix}.persistence`, message: 'Must be between 0 and 1', code: 'RANGE_ERROR' });
      }

      if (noise.octaves > 4) {
        warnings.push({ field: `${prefix}.octaves`, message: 'High octave count impacts performance', suggestion: 'Consider 2-4' });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateMicroJitter(jitter: MicroJitter, prefix = 'microJitter'): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (jitter.enabled) {
    if (!isNonNegative(jitter.positionAmplitude)) {
      errors.push({ field: `${prefix}.positionAmplitude`, message: 'Must be non-negative', code: 'RANGE_ERROR' });
    }

    if (!isNonNegative(jitter.rotationAmplitude)) {
      errors.push({ field: `${prefix}.rotationAmplitude`, message: 'Must be non-negative', code: 'RANGE_ERROR' });
    }

    if (!isNonNegative(jitter.scaleAmplitude)) {
      errors.push({ field: `${prefix}.scaleAmplitude`, message: 'Must be non-negative', code: 'RANGE_ERROR' });
    }

    if (!isPositive(jitter.frequency)) {
      errors.push({ field: `${prefix}.frequency`, message: 'Must be positive', code: 'RANGE_ERROR' });
    }

    if (jitter.positionAmplitude > 5) {
      warnings.push({ field: `${prefix}.positionAmplitude`, message: 'High jitter may be distracting', suggestion: 'Consider 0.5-2 pixels' });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
