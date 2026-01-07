/**
 * Motion Curve Validation
 * Single responsibility: Validate MotionCurve configurations
 */

import type { MotionCurve, ValidationResult, ValidationError, ValidationWarning } from '../types';

function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export function validateMotionCurve(curve: MotionCurve, prefix = 'motionCurve'): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!isInRange(curve.anticipation, 0, 1)) {
    errors.push({ field: `${prefix}.anticipation`, message: 'Must be between 0 and 1', code: 'RANGE_ERROR' });
  }

  if (!isInRange(curve.anticipationDistance, 0, 1)) {
    errors.push({ field: `${prefix}.anticipationDistance`, message: 'Must be between 0 and 1', code: 'RANGE_ERROR' });
  }

  if (!isInRange(curve.overshoot, 0, 1)) {
    errors.push({ field: `${prefix}.overshoot`, message: 'Must be between 0 and 1', code: 'RANGE_ERROR' });
  }

  if (!isInRange(curve.settleOscillations, 0, 10)) {
    errors.push({ field: `${prefix}.settleOscillations`, message: 'Must be between 0 and 10', code: 'RANGE_ERROR' });
  }

  if (!isInRange(curve.settleDamping, 0, 1)) {
    errors.push({ field: `${prefix}.settleDamping`, message: 'Must be between 0 and 1', code: 'RANGE_ERROR' });
  }

  if (curve.settleOscillations > 5) {
    warnings.push({ field: `${prefix}.settleOscillations`, message: 'High count may impact performance', suggestion: 'Consider 3-5' });
  }

  return { valid: errors.length === 0, errors, warnings };
}
