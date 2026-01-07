/**
 * Particle Configuration Validation
 * Single responsibility: Validate particle-related configurations
 */

import type {
  ParticleTrailConfig,
  ColorEvolution,
  SizeEvolution,
  EmissionCurve,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types';

function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function isPositive(value: number): boolean {
  return value > 0;
}

function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color);
}

export function validateParticleTrails(trails: ParticleTrailConfig, prefix = 'trails'): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (trails.enabled) {
    if (!isInRange(trails.length, 1, 20)) {
      errors.push({ field: `${prefix}.length`, message: 'Must be between 1 and 20', code: 'RANGE_ERROR' });
    }

    if (!isInRange(trails.opacityDecay, 0, 1)) {
      errors.push({ field: `${prefix}.opacityDecay`, message: 'Must be between 0 and 1', code: 'RANGE_ERROR' });
    }

    if (!isInRange(trails.sizeDecay, 0, 1)) {
      errors.push({ field: `${prefix}.sizeDecay`, message: 'Must be between 0 and 1', code: 'RANGE_ERROR' });
    }

    if (!isInRange(trails.updateFrequency, 1, 10)) {
      errors.push({ field: `${prefix}.updateFrequency`, message: 'Must be between 1 and 10', code: 'RANGE_ERROR' });
    }

    if (trails.length > 10) {
      warnings.push({ field: `${prefix}.length`, message: 'Long trails impact performance', suggestion: 'Consider 5-8 segments' });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateColorEvolution(ce: ColorEvolution, prefix = 'colorEvolution'): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (ce.enabled) {
    if (ce.stops.length < 2) {
      errors.push({ field: `${prefix}.stops`, message: 'Requires at least 2 stops', code: 'MIN_LENGTH' });
    }

    ce.stops.forEach((stop, i) => {
      if (!isInRange(stop.position, 0, 1)) {
        errors.push({ field: `${prefix}.stops[${i}].position`, message: 'Must be between 0 and 1', code: 'RANGE_ERROR' });
      }

      if (!isValidHexColor(stop.color)) {
        errors.push({ field: `${prefix}.stops[${i}].color`, message: 'Invalid hex color', code: 'INVALID_FORMAT' });
      }
    });

    if (!['linear', 'smooth', 'step'].includes(ce.interpolation)) {
      errors.push({ field: `${prefix}.interpolation`, message: 'Invalid interpolation mode', code: 'INVALID_VALUE' });
    }

    // Check stops are sorted
    const positions = ce.stops.map(s => s.position);
    const sorted = [...positions].sort((a, b) => a - b);
    if (JSON.stringify(positions) !== JSON.stringify(sorted)) {
      warnings.push({ field: `${prefix}.stops`, message: 'Stops should be sorted by position', suggestion: 'Sort ascending' });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateSizeEvolution(se: SizeEvolution, prefix = 'sizeEvolution'): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (se.enabled) {
    if (se.curve.length < 2) {
      errors.push({ field: `${prefix}.curve`, message: 'Requires at least 2 keyframes', code: 'MIN_LENGTH' });
    }

    se.curve.forEach((kf, i) => {
      if (!isInRange(kf.position, 0, 1)) {
        errors.push({ field: `${prefix}.curve[${i}].position`, message: 'Must be between 0 and 1', code: 'RANGE_ERROR' });
      }

      if (!isInRange(kf.scale, 0, 5)) {
        errors.push({ field: `${prefix}.curve[${i}].scale`, message: 'Must be between 0 and 5', code: 'RANGE_ERROR' });
      }
    });

    if (!['linear', 'smooth', 'step'].includes(se.interpolation)) {
      errors.push({ field: `${prefix}.interpolation`, message: 'Invalid interpolation mode', code: 'INVALID_VALUE' });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateEmissionCurve(ec: EmissionCurve, prefix = 'emissionCurve'): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!['constant', 'burst', 'wave', 'decay', 'custom'].includes(ec.type)) {
    errors.push({ field: `${prefix}.type`, message: 'Invalid emission type', code: 'INVALID_VALUE' });
  }

  if (ec.type === 'burst') {
    if (ec.burstCount === undefined || !isPositive(ec.burstCount)) {
      errors.push({ field: `${prefix}.burstCount`, message: 'Must be positive', code: 'RANGE_ERROR' });
    }
    if (ec.burstInterval === undefined || !isPositive(ec.burstInterval)) {
      errors.push({ field: `${prefix}.burstInterval`, message: 'Must be positive', code: 'RANGE_ERROR' });
    }
  }

  if (ec.type === 'wave' && (ec.waveFrequency === undefined || !isPositive(ec.waveFrequency))) {
    errors.push({ field: `${prefix}.waveFrequency`, message: 'Must be positive', code: 'RANGE_ERROR' });
  }

  if (ec.type === 'decay' && (ec.decayRate === undefined || !isPositive(ec.decayRate))) {
    errors.push({ field: `${prefix}.decayRate`, message: 'Must be positive', code: 'RANGE_ERROR' });
  }

  if (ec.type === 'custom' && (!ec.customCurve || ec.customCurve.length < 2)) {
    errors.push({ field: `${prefix}.customCurve`, message: 'Requires at least 2 keyframes', code: 'MIN_LENGTH' });
  }

  return { valid: errors.length === 0, errors, warnings };
}
