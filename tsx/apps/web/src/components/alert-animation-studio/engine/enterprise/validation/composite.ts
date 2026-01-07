/**
 * Composite Configuration Validation
 * Single responsibility: Validate composite configs by orchestrating individual validators
 */

import type {
  EnterpriseAnimationConfig,
  EnterpriseEntryConfig,
  EnterpriseLoopConfig,
  EnterpriseParticleConfig,
  FrequencyLayer,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types';

import { validateMotionCurve } from './motionCurve';
import { validateSquashStretch } from './squashStretch';
import { validateSecondaryMotion } from './secondaryMotion';
import { validateNoiseConfig, validateMicroJitter } from './noise';
import { validateParticleTrails, validateColorEvolution, validateSizeEvolution, validateEmissionCurve } from './particles';

function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function isNonNegative(value: number): boolean {
  return value >= 0;
}

function isPositive(value: number): boolean {
  return value > 0;
}

function mergeResults(...results: ValidationResult[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  results.forEach(r => {
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  });
  
  return { valid: errors.length === 0, errors, warnings };
}

function validateFrequencyLayers(layers: FrequencyLayer[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  layers.forEach((layer, i) => {
    if (!isPositive(layer.frequency)) {
      errors.push({ field: `frequencyLayers[${i}].frequency`, message: 'Must be positive', code: 'RANGE_ERROR' });
    }
    if (!isNonNegative(layer.amplitude)) {
      errors.push({ field: `frequencyLayers[${i}].amplitude`, message: 'Must be non-negative', code: 'RANGE_ERROR' });
    }
  });

  if (layers.length > 5) {
    warnings.push({ field: 'frequencyLayers', message: 'Many layers impact performance', suggestion: 'Consider 2-3 layers' });
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateEnterpriseEntryConfig(config: EnterpriseEntryConfig): ValidationResult {
  const results = [
    validateMotionCurve(config.motionCurve),
    validateSquashStretch(config.squashStretch),
    validateSecondaryMotion(config.secondaryMotion),
  ];

  const merged = mergeResults(...results);

  if (!isNonNegative(config.staggerDelay)) {
    merged.errors.push({ field: 'staggerDelay', message: 'Must be non-negative', code: 'RANGE_ERROR' });
  }

  if (!['forward', 'reverse', 'center', 'random'].includes(config.staggerDirection)) {
    merged.errors.push({ field: 'staggerDirection', message: 'Invalid direction', code: 'INVALID_VALUE' });
  }

  merged.valid = merged.errors.length === 0;
  return merged;
}

export function validateEnterpriseLoopConfig(config: EnterpriseLoopConfig): ValidationResult {
  const results = [
    validateFrequencyLayers(config.frequencyLayers),
    validateNoiseConfig(config.noise, 'noise'),
    validateMicroJitter(config.microJitter, 'microJitter'),
  ];

  const merged = mergeResults(...results);

  if (!isInRange(config.phaseRandomization, 0, Math.PI * 2)) {
    merged.errors.push({ field: 'phaseRandomization', message: 'Must be between 0 and 2π', code: 'RANGE_ERROR' });
  }

  merged.valid = merged.errors.length === 0;
  return merged;
}

export function validateEnterpriseParticleConfig(config: EnterpriseParticleConfig): ValidationResult {
  const results = [
    validateParticleTrails(config.trails, 'trails'),
    validateColorEvolution(config.colorEvolution, 'colorEvolution'),
    validateSizeEvolution(config.sizeEvolution, 'sizeEvolution'),
    validateEmissionCurve(config.emissionCurve, 'emissionCurve'),
    validateNoiseConfig(config.turbulenceNoise, 'turbulenceNoise'),
  ];

  const merged = mergeResults(...results);

  if (!isInRange(config.drag, 0, 1)) {
    merged.errors.push({ field: 'drag', message: 'Must be between 0 and 1', code: 'RANGE_ERROR' });
  }

  if (!isInRange(config.airResistance, 0, 1)) {
    merged.errors.push({ field: 'airResistance', message: 'Must be between 0 and 1', code: 'RANGE_ERROR' });
  }

  merged.valid = merged.errors.length === 0;
  return merged;
}

export function validateEnterpriseAnimationConfig(config: EnterpriseAnimationConfig): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!['standard', 'professional', 'enterprise'].includes(config.tier)) {
    errors.push({ field: 'tier', message: 'Invalid tier', code: 'INVALID_VALUE' });
  }

  if (!isInRange(config.maxParticles, 10, 50000)) {
    errors.push({ field: 'maxParticles', message: 'Must be between 10 and 50000', code: 'RANGE_ERROR' });
  }

  if (!isInRange(config.qualityMultiplier, 0.25, 4)) {
    errors.push({ field: 'qualityMultiplier', message: 'Must be between 0.25 and 4', code: 'RANGE_ERROR' });
  }

  if (config.tier === 'standard' && config.maxParticles > 1000) {
    warnings.push({ field: 'maxParticles', message: 'High count for standard tier', suggestion: 'Consider professional tier' });
  }

  if (config.motionBlur && config.tier === 'standard') {
    warnings.push({ field: 'motionBlur', message: 'Not recommended for standard tier', suggestion: 'May impact performance' });
  }

  return { valid: errors.length === 0, errors, warnings };
}
