/**
 * ValidationFeedback Component
 * 
 * Displays validation feedback messages with error/success styling
 * and animated appearance.
 * 
 * @module forms/ValidationFeedback
 */

'use client';

import React from 'react';

import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';

// ============================================================================
// Types
// ============================================================================

/**
 * Type of validation feedback to display.
 */
export type ValidationFeedbackType = 'error' | 'success' | 'none';

/**
 * Props for the ValidationFeedback component.
 */
export interface ValidationFeedbackProps {
  /** The type of feedback (error, success, or none) */
  type: ValidationFeedbackType;
  /** The message to display */
  message: string | null;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Icons
// ============================================================================

/**
 * Check circle icon for success state.
 */
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

/**
 * X circle icon for error state.
 */
function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// ============================================================================
// Component
// ============================================================================

/**
 * ValidationFeedback - Displays validation messages with appropriate styling.
 * 
 * Features:
 * - Error state with red styling and X icon
 * - Success state with green styling and check icon
 * - Animated appearance (respects reduced motion)
 * - Accessible with role="alert" for errors
 * 
 * @example
 * ```tsx
 * // Error feedback
 * <ValidationFeedback
 *   type="error"
 *   message="Please enter a valid email address"
 * />
 * 
 * // Success feedback
 * <ValidationFeedback
 *   type="success"
 *   message="Great! That's a valid email address"
 * />
 * 
 * // No feedback (renders nothing)
 * <ValidationFeedback
 *   type="none"
 *   message={null}
 * />
 * ```
 */
export function ValidationFeedback({
  type,
  message,
  className,
  testId = 'validation-feedback',
}: ValidationFeedbackProps): JSX.Element | null {
  const prefersReducedMotion = useReducedMotion();

  // Don't render if no message or type is none
  if (!message || type === 'none') {
    return null;
  }

  const isError = type === 'error';
  const isSuccess = type === 'success';

  // Animation classes
  const animationClasses = prefersReducedMotion
    ? ''
    : 'animate-fade-in motion-reduce:animate-none';

  return (
    <div
      data-testid={testId}
      role={isError ? 'alert' : undefined}
      aria-live={isError ? 'polite' : undefined}
      className={cn(
        // Base styles
        'flex items-center gap-1.5 mt-1.5 text-sm',
        // Animation
        animationClasses,
        // Color based on type
        isError && 'text-error-light',
        isSuccess && 'text-success-light',
        className
      )}
    >
      {/* Icon */}
      {isError && <XCircleIcon className="w-4 h-4 flex-shrink-0" />}
      {isSuccess && <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />}
      
      {/* Message */}
      <span>{message}</span>
    </div>
  );
}

ValidationFeedback.displayName = 'ValidationFeedback';

export default ValidationFeedback;
