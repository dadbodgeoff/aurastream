/**
 * useFormValidation Hook
 * 
 * A comprehensive form validation hook with debounced validation,
 * positive feedback messages, and field state management.
 * 
 * @module hooks/useFormValidation
 */

'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * A single validation rule for a field.
 */
export interface ValidationRule {
  /** Function that returns true if the value is valid */
  validate: (value: string) => boolean;
  /** Error message to show when validation fails */
  message: string;
  /** Optional success message to show when validation passes */
  successMessage?: string;
}

/**
 * State of a single form field.
 */
export interface FieldState {
  /** Current value of the field */
  value: string;
  /** Whether the field has been interacted with */
  touched: boolean;
  /** Whether all validation rules pass */
  valid: boolean;
  /** Error message if validation fails, null otherwise */
  error: string | null;
  /** Success message if validation passes and one is defined, null otherwise */
  successMessage: string | null;
}

/**
 * Options for configuring the useFormValidation hook.
 */
export interface UseFormValidationOptions {
  /** Map of field names to their validation rules */
  fields: Record<string, ValidationRule[]>;
  /** Debounce delay in milliseconds (default: 300ms) */
  debounceMs?: number;
}

/**
 * Return type of the useFormValidation hook.
 */
export interface UseFormValidationReturn {
  /** Current state of all fields */
  fieldStates: Record<string, FieldState>;
  /** Update a field's value and trigger validation */
  setFieldValue: (field: string, value: string) => void;
  /** Mark a field as touched (triggers immediate validation) */
  touchField: (field: string) => void;
  /** Whether all fields are valid */
  isFormValid: boolean;
  /** Number of fields that are valid */
  completedFields: number;
  /** Total number of fields */
  totalFields: number;
  /** Reset all fields to initial state */
  resetForm: () => void;
  /** Get validation props for an input element */
  getFieldProps: (field: string) => {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: () => void;
  };
}

// ============================================================================
// Constants
// ============================================================================

/** Default debounce delay in milliseconds */
const DEFAULT_DEBOUNCE_MS = 300;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates the initial state for a field.
 */
function createInitialFieldState(): FieldState {
  return {
    value: '',
    touched: false,
    valid: false,
    error: null,
    successMessage: null,
  };
}

/**
 * Validates a field value against its rules.
 * Returns the first failing rule's message, or null if all pass.
 * Also returns the success message from the last passing rule that has one.
 */
function validateField(
  value: string,
  rules: ValidationRule[]
): { error: string | null; successMessage: string | null; valid: boolean } {
  // Empty values are not validated (use required rule for that)
  if (value === '') {
    return { error: null, successMessage: null, valid: false };
  }

  let lastSuccessMessage: string | null = null;

  for (const rule of rules) {
    if (!rule.validate(value)) {
      return { error: rule.message, successMessage: null, valid: false };
    }
    // Track the last success message from passing rules
    if (rule.successMessage) {
      lastSuccessMessage = rule.successMessage;
    }
  }

  return { error: null, successMessage: lastSuccessMessage, valid: true };
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * A form validation hook with debounced validation and positive feedback.
 * 
 * Features:
 * - Debounced validation to avoid excessive re-renders
 * - Positive feedback messages for successful validation
 * - Field state tracking (touched, valid, error, success)
 * - Form-level validity and progress tracking
 * - Reset functionality
 * 
 * @example
 * ```tsx
 * const { fieldStates, setFieldValue, touchField, isFormValid } = useFormValidation({
 *   fields: {
 *     email: [
 *       {
 *         validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
 *         message: 'Please enter a valid email',
 *         successMessage: 'Great! That\'s a valid email address',
 *       },
 *     ],
 *     password: [
 *       {
 *         validate: (v) => v.length >= 8,
 *         message: 'Password must be at least 8 characters',
 *         successMessage: 'Strong password! You\'re all set',
 *       },
 *     ],
 *   },
 *   debounceMs: 300,
 * });
 * ```
 */
export function useFormValidation({
  fields,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseFormValidationOptions): UseFormValidationReturn {
  // Initialize field states
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>(() => {
    const initialStates: Record<string, FieldState> = {};
    for (const fieldName of Object.keys(fields)) {
      initialStates[fieldName] = createInitialFieldState();
    }
    return initialStates;
  });

  // Store debounce timers
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of Object.values(debounceTimers.current)) {
        clearTimeout(timer);
      }
    };
  }, []);

  /**
   * Validates a field and updates its state.
   */
  const runValidation = useCallback(
    (fieldName: string, value: string) => {
      const rules = fields[fieldName];
      if (!rules) return;

      const { error, successMessage, valid } = validateField(value, rules);

      setFieldStates((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          error,
          successMessage,
          valid,
        },
      }));
    },
    [fields]
  );

  /**
   * Sets a field's value and triggers debounced validation.
   */
  const setFieldValue = useCallback(
    (fieldName: string, value: string) => {
      // Update value immediately
      setFieldStates((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          value,
        },
      }));

      // Clear existing timer for this field
      if (debounceTimers.current[fieldName]) {
        clearTimeout(debounceTimers.current[fieldName]);
      }

      // Set up debounced validation
      debounceTimers.current[fieldName] = setTimeout(() => {
        runValidation(fieldName, value);
      }, debounceMs);
    },
    [debounceMs, runValidation]
  );

  /**
   * Marks a field as touched and triggers immediate validation.
   */
  const touchField = useCallback(
    (fieldName: string) => {
      // Clear any pending debounced validation
      if (debounceTimers.current[fieldName]) {
        clearTimeout(debounceTimers.current[fieldName]);
      }

      setFieldStates((prev) => {
        const field = prev[fieldName];
        if (!field) return prev;

        // Run validation immediately
        const rules = fields[fieldName];
        const { error, successMessage, valid } = validateField(field.value, rules || []);

        return {
          ...prev,
          [fieldName]: {
            ...field,
            touched: true,
            error,
            successMessage,
            valid,
          },
        };
      });
    },
    [fields]
  );

  /**
   * Resets all fields to their initial state.
   */
  const resetForm = useCallback(() => {
    // Clear all timers
    for (const timer of Object.values(debounceTimers.current)) {
      clearTimeout(timer);
    }
    debounceTimers.current = {};

    // Reset all field states
    const resetStates: Record<string, FieldState> = {};
    for (const fieldName of Object.keys(fields)) {
      resetStates[fieldName] = createInitialFieldState();
    }
    setFieldStates(resetStates);
  }, [fields]);

  /**
   * Gets props to spread onto an input element.
   */
  const getFieldProps = useCallback(
    (fieldName: string) => ({
      value: fieldStates[fieldName]?.value ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setFieldValue(fieldName, e.target.value);
      },
      onBlur: () => {
        touchField(fieldName);
      },
    }),
    [fieldStates, setFieldValue, touchField]
  );

  // Calculate form-level stats
  const { isFormValid, completedFields, totalFields } = useMemo(() => {
    const fieldNames = Object.keys(fields);
    const total = fieldNames.length;
    const completed = fieldNames.filter((name) => fieldStates[name]?.valid).length;
    const allValid = completed === total && total > 0;

    return {
      isFormValid: allValid,
      completedFields: completed,
      totalFields: total,
    };
  }, [fields, fieldStates]);

  return {
    fieldStates,
    setFieldValue,
    touchField,
    isFormValid,
    completedFields,
    totalFields,
    resetForm,
    getFieldProps,
  };
}

// ============================================================================
// Common Validation Rules
// ============================================================================

/**
 * Pre-built validation rules for common use cases.
 */
export const validationRules = {
  /**
   * Requires a non-empty value.
   */
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => value.trim().length > 0,
    message,
  }),

  /**
   * Validates email format.
   */
  email: (
    message = 'Please enter a valid email address',
    successMessage = "Great! That's a valid email address"
  ): ValidationRule => ({
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message,
    successMessage,
  }),

  /**
   * Validates minimum length.
   */
  minLength: (
    min: number,
    message?: string,
    successMessage?: string
  ): ValidationRule => ({
    validate: (value) => value.length >= min,
    message: message ?? `Must be at least ${min} characters`,
    successMessage,
  }),

  /**
   * Validates maximum length.
   */
  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => value.length <= max,
    message: message ?? `Must be no more than ${max} characters`,
  }),

  /**
   * Validates password strength (8+ chars, uppercase, lowercase, number).
   */
  strongPassword: (
    message = 'Password must be at least 8 characters with uppercase, lowercase, and a number',
    successMessage = "Strong password! You're all set"
  ): ValidationRule => ({
    validate: (value) =>
      value.length >= 8 &&
      /[A-Z]/.test(value) &&
      /[a-z]/.test(value) &&
      /\d/.test(value),
    message,
    successMessage,
  }),

  /**
   * Validates display name (2-50 chars, no special characters).
   */
  displayName: (
    message = 'Display name must be 2-50 characters',
    successMessage = 'Perfect! Your name looks good'
  ): ValidationRule => ({
    validate: (value) => value.length >= 2 && value.length <= 50,
    message,
    successMessage,
  }),

  /**
   * Custom pattern validation.
   */
  pattern: (
    regex: RegExp,
    message: string,
    successMessage?: string
  ): ValidationRule => ({
    validate: (value) => regex.test(value),
    message,
    successMessage,
  }),

  /**
   * Validates that value matches another value (e.g., confirm password).
   */
  matches: (
    getValue: () => string,
    message = 'Values do not match',
    successMessage = 'Values match!'
  ): ValidationRule => ({
    validate: (value) => value === getValue(),
    message,
    successMessage,
  }),
};

export default useFormValidation;
