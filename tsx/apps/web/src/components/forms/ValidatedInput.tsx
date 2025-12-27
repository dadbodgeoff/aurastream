/**
 * ValidatedInput Component
 * 
 * A form input component with built-in validation state display,
 * error/success icons, and validation messages.
 * 
 * @module forms/ValidatedInput
 */

'use client';

import React, { forwardRef, useId, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ValidationFeedback, type ValidationFeedbackType } from './ValidationFeedback';
import type { ValidationRule, FieldState } from '@/hooks/useFormValidation';

// ============================================================================
// Types
// ============================================================================

/**
 * Supported input types for ValidatedInput.
 */
export type ValidatedInputType = 'text' | 'email' | 'password' | 'tel' | 'url';

/**
 * Props for the ValidatedInput component.
 */
export interface ValidatedInputProps {
  /** Field name (used for form submission and accessibility) */
  name: string;
  /** Label text for the input */
  label: string;
  /** Input type */
  type?: ValidatedInputType;
  /** Placeholder text */
  placeholder?: string;
  /** Current value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Blur handler (typically triggers validation) */
  onBlur?: () => void;
  /** Field state from useFormValidation */
  fieldState?: FieldState;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Additional CSS classes for the container */
  className?: string;
  /** Additional CSS classes for the input */
  inputClassName?: string;
  /** Auto-complete attribute */
  autoComplete?: string;
  /** Input mode for mobile keyboards */
  inputMode?: 'text' | 'email' | 'tel' | 'url' | 'none';
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Icons
// ============================================================================

/**
 * Check icon for valid state.
 */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * X icon for invalid state.
 */
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * Eye icon for showing password.
 */
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

/**
 * Eye off icon for hiding password.
 */
function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  );
}

// ============================================================================
// Component
// ============================================================================

/**
 * ValidatedInput - A form input with validation state display.
 * 
 * Features:
 * - Shows error/success icons based on validation state
 * - Displays validation messages below input
 * - Password visibility toggle for password inputs
 * - Accessible with proper ARIA attributes
 * - Follows existing input styling patterns
 * - Supports dark mode
 * 
 * @example
 * ```tsx
 * const { fieldStates, setFieldValue, touchField } = useFormValidation({
 *   fields: {
 *     email: [validationRules.email()],
 *   },
 * });
 * 
 * <ValidatedInput
 *   name="email"
 *   label="Email address"
 *   type="email"
 *   placeholder="you@example.com"
 *   value={fieldStates.email.value}
 *   onChange={(value) => setFieldValue('email', value)}
 *   onBlur={() => touchField('email')}
 *   fieldState={fieldStates.email}
 * />
 * ```
 */
export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  function ValidatedInput(
    {
      name,
      label,
      type = 'text',
      placeholder,
      value,
      onChange,
      onBlur,
      fieldState,
      disabled = false,
      required = false,
      className,
      inputClassName,
      autoComplete,
      inputMode,
      testId,
    },
    ref
  ) {
    // Generate unique IDs for accessibility
    const generatedId = useId();
    const inputId = `${name}-${generatedId}`;
    const errorId = `${name}-error-${generatedId}`;
    const successId = `${name}-success-${generatedId}`;

    // Password visibility state
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordType = type === 'password';
    const actualType = isPasswordType && showPassword ? 'text' : type;

    // Determine validation state
    const hasError = fieldState?.touched && fieldState?.error;
    const hasSuccess = fieldState?.touched && fieldState?.valid && fieldState?.successMessage;
    const showValidationIcon = fieldState?.touched && value.length > 0;

    // Determine feedback type
    const feedbackType: ValidationFeedbackType = hasError
      ? 'error'
      : hasSuccess
      ? 'success'
      : 'none';

    // Handle change
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
      },
      [onChange]
    );

    // Handle blur
    const handleBlur = useCallback(() => {
      onBlur?.();
    }, [onBlur]);

    // Toggle password visibility
    const togglePasswordVisibility = useCallback(() => {
      setShowPassword((prev) => !prev);
    }, []);

    // Build input classes
    const inputClasses = cn(
      // Base styles
      'w-full px-4 py-3 min-h-[44px]',
      'bg-background-elevated border rounded-lg',
      'text-text-primary placeholder-text-muted',
      'focus:outline-none focus:ring-2 focus:ring-interactive-600 focus:border-transparent',
      'transition-all duration-200',
      // Padding for icons
      showValidationIcon && !isPasswordType && 'pr-10',
      isPasswordType && 'pr-14',
      showValidationIcon && isPasswordType && 'pr-20',
      // Border color based on state
      hasError && 'border-error-main',
      hasSuccess && 'border-success-main',
      !hasError && !hasSuccess && 'border-border-default',
      // Disabled state
      disabled && 'opacity-50 cursor-not-allowed',
      inputClassName
    );

    return (
      <div className={cn('w-full', className)} data-testid={testId}>
        {/* Label */}
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          {label}
          {required && (
            <span className="text-error-main ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>

        {/* Input container */}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={actualType}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoComplete={autoComplete}
            inputMode={inputMode}
            className={inputClasses}
            aria-invalid={hasError ? 'true' : undefined}
            aria-describedby={
              hasError ? errorId : hasSuccess ? successId : undefined
            }
          />

          {/* Icons container */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Validation icon */}
            {showValidationIcon && (
              <span
                className={cn(
                  'flex items-center justify-center w-5 h-5',
                  hasError && 'text-error-main',
                  hasSuccess && 'text-success-main'
                )}
                aria-hidden="true"
              >
                {hasError && <XIcon className="w-5 h-5" />}
                {hasSuccess && <CheckIcon className="w-5 h-5" />}
              </span>
            )}

            {/* Password toggle button */}
            {isPasswordType && (
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className={cn(
                  'p-2 min-w-[44px] min-h-[44px] -mr-2',
                  'flex items-center justify-center',
                  'text-text-tertiary hover:text-text-secondary active:text-text-primary',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-interactive-600 rounded'
                )}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOffIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Validation feedback */}
        <ValidationFeedback
          type={feedbackType}
          message={hasError ? fieldState.error : hasSuccess ? fieldState.successMessage : null}
          testId={hasError ? errorId : successId}
        />
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';

export default ValidatedInput;
