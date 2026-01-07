/**
 * Secondary Motion Validation
 * Single responsibility: Validate SecondaryMotion configurations
 */

import type { SecondaryMotion, ValidationResult, ValidationError, ValidationWarning } from '../types';

function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export function validateSecondaryMotion(sm: SecondaryMotion, prefix = 'secondaryMotion'): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (sm.enabled) {
    if (!isInRange(sm.delay, 0, 1)) {
      errors.push({ field: `${prefix}.delay`, message: 'Must be between 0 and 1', code: 'RANGE_ERROR' });
    }

    if (!isInRange(sm.damping, 0, 1)) {
      errors.push({ field: `${prefix}.damping`, message: 'Must be between 0 and 1', code: 'RANGE_ERROR' });
    }

    if (!isInRange(sm.rotationInfluence, 0, 2)) {
      errors.push({ field: `${prefix}.rotationInfluence`, message: 'Must be between 0 and 2', code: 'RANGE_ERROR' });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
