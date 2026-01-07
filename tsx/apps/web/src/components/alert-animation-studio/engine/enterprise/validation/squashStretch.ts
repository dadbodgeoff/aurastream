/**
 * Squash/Stretch Validation
 * Single responsibility: Validate SquashStretch configurations
 */

import type { SquashStretch, ValidationResult, ValidationError, ValidationWarning } from '../types';

function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export function validateSquashStretch(ss: SquashStretch, prefix = 'squashStretch'): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (ss.enabled) {
    if (!isInRange(ss.squashRatio, 0.5, 1)) {
      errors.push({ field: `${prefix}.squashRatio`, message: 'Must be between 0.5 and 1', code: 'RANGE_ERROR' });
    }

    if (!isInRange(ss.stretchRatio, 1, 2)) {
      errors.push({ field: `${prefix}.stretchRatio`, message: 'Must be between 1 and 2', code: 'RANGE_ERROR' });
    }

    if (!['x', 'y', 'velocity'].includes(ss.axis)) {
      errors.push({ field: `${prefix}.axis`, message: 'Must be "x", "y", or "velocity"', code: 'INVALID_VALUE' });
    }

    if (ss.squashRatio < 0.7 || ss.stretchRatio > 1.5) {
      warnings.push({ field: prefix, message: 'Extreme values may look unnatural', suggestion: 'Consider 0.85-1.15 range' });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
