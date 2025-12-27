/**
 * FormProgress Component
 * 
 * Displays a progress bar showing form completion status
 * with animated fill and completion text.
 * 
 * @module forms/FormProgress
 */

'use client';

import React from 'react';

import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the FormProgress component.
 */
export interface FormProgressProps {
  /** Number of completed/valid fields */
  completedFields: number;
  /** Total number of fields in the form */
  totalFields: number;
  /** Whether to show the text label (default: true) */
  showLabel?: boolean;
  /** Custom label format function */
  formatLabel?: (completed: number, total: number) => string;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * FormProgress - Shows form completion progress.
 * 
 * Features:
 * - Progress bar with animated fill
 * - "X of Y fields complete" text
 * - Green color when all fields are complete
 * - Respects reduced motion preference
 * - Accessible with proper ARIA attributes
 * 
 * @example
 * ```tsx
 * const { completedFields, totalFields } = useFormValidation({
 *   fields: { email: [...], password: [...] },
 * });
 * 
 * <FormProgress
 *   completedFields={completedFields}
 *   totalFields={totalFields}
 * />
 * ```
 */
export function FormProgress({
  completedFields,
  totalFields,
  showLabel = true,
  formatLabel,
  className,
  testId = 'form-progress',
}: FormProgressProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  // Calculate progress percentage
  const progressPercent = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;
  const isComplete = completedFields === totalFields && totalFields > 0;

  // Default label format
  const defaultFormatLabel = (completed: number, total: number): string => {
    if (completed === total && total > 0) {
      return 'All fields complete!';
    }
    return `${completed} of ${total} fields complete`;
  };

  const labelText = formatLabel
    ? formatLabel(completedFields, totalFields)
    : defaultFormatLabel(completedFields, totalFields);

  // Animation classes for the progress fill
  const fillAnimationClasses = prefersReducedMotion
    ? ''
    : 'transition-all duration-300 ease-out';

  return (
    <div
      className={cn('w-full', className)}
      data-testid={testId}
      role="progressbar"
      aria-valuenow={completedFields}
      aria-valuemin={0}
      aria-valuemax={totalFields}
      aria-label={labelText}
    >
      {/* Progress bar container */}
      <div className="relative h-2 bg-background-elevated rounded-full overflow-hidden">
        {/* Progress fill */}
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            fillAnimationClasses,
            // Color based on completion
            isComplete
              ? 'bg-success-main'
              : progressPercent > 0
              ? 'bg-interactive-600'
              : 'bg-transparent'
          )}
          style={{ width: `${progressPercent}%` }}
          data-testid={`${testId}-fill`}
        />
      </div>

      {/* Label */}
      {showLabel && (
        <p
          className={cn(
            'mt-2 text-sm',
            isComplete ? 'text-success-light font-medium' : 'text-text-secondary'
          )}
          data-testid={`${testId}-label`}
        >
          {labelText}
        </p>
      )}
    </div>
  );
}

FormProgress.displayName = 'FormProgress';

export default FormProgress;
