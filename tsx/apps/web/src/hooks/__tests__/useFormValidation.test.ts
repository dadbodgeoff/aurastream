/**
 * useFormValidation Hook Tests
 * 
 * Comprehensive tests for the form validation hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFormValidation, validationRules } from '../useFormValidation';
import type { ValidationRule } from '../useFormValidation';

// ============================================================================
// Test Setup
// ============================================================================

// Mock timers for debounce testing
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ============================================================================
// Test Data
// ============================================================================

const emailRules: ValidationRule[] = [
  {
    validate: (v) => v.length > 0,
    message: 'Email is required',
  },
  {
    validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    message: 'Please enter a valid email',
    successMessage: "Great! That's a valid email address",
  },
];

const passwordRules: ValidationRule[] = [
  {
    validate: (v) => v.length >= 8,
    message: 'Password must be at least 8 characters',
    successMessage: "Strong password! You're all set",
  },
];

const displayNameRules: ValidationRule[] = [
  {
    validate: (v) => v.length >= 2,
    message: 'Display name must be at least 2 characters',
  },
  {
    validate: (v) => v.length <= 50,
    message: 'Display name must be less than 50 characters',
    successMessage: 'Perfect! Your name looks good',
  },
];

// ============================================================================
// Tests
// ============================================================================

describe('useFormValidation', () => {
  // ==========================================================================
  // Initialization
  // ==========================================================================

  describe('initialization', () => {
    it('should initialize with empty field states', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: {
            email: emailRules,
            password: passwordRules,
          },
        })
      );

      expect(result.current.fieldStates.email).toEqual({
        value: '',
        touched: false,
        valid: false,
        error: null,
        successMessage: null,
      });

      expect(result.current.fieldStates.password).toEqual({
        value: '',
        touched: false,
        valid: false,
        error: null,
        successMessage: null,
      });
    });

    it('should initialize form validity as false', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: {
            email: emailRules,
          },
        })
      );

      expect(result.current.isFormValid).toBe(false);
    });

    it('should initialize with correct field counts', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: {
            email: emailRules,
            password: passwordRules,
            displayName: displayNameRules,
          },
        })
      );

      expect(result.current.totalFields).toBe(3);
      expect(result.current.completedFields).toBe(0);
    });
  });

  // ==========================================================================
  // setFieldValue
  // ==========================================================================

  describe('setFieldValue', () => {
    it('should update field value immediately', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: { email: emailRules },
        })
      );

      act(() => {
        result.current.setFieldValue('email', 'test@example.com');
      });

      expect(result.current.fieldStates.email.value).toBe('test@example.com');
    });

    it('should trigger debounced validation', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: { email: emailRules },
          debounceMs: 300,
        })
      );

      act(() => {
        result.current.setFieldValue('email', 'test@example.com');
      });

      // Validation should not have run yet
      expect(result.current.fieldStates.email.valid).toBe(false);

      // Fast-forward past debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Now validation should have run
      expect(result.current.fieldStates.email.valid).toBe(true);
      expect(result.current.fieldStates.email.successMessage).toBe(
        "Great! That's a valid email address"
      );
    });

    it('should cancel previous debounce timer on rapid updates', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: { email: emailRules },
          debounceMs: 300,
        })
      );

      // Type rapidly
      act(() => {
        result.current.setFieldValue('email', 't');
      });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      act(() => {
        result.current.setFieldValue('email', 'te');
      });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      act(() => {
        result.current.setFieldValue('email', 'test@example.com');
      });

      // Fast-forward past debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should validate the final value
      expect(result.current.fieldStates.email.value).toBe('test@example.com');
      expect(result.current.fieldStates.email.valid).toBe(true);
    });
  });

  // ==========================================================================
  // touchField
  // ==========================================================================

  describe('touchField', () => {
    it('should mark field as touched', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: { email: emailRules },
        })
      );

      act(() => {
        result.current.touchField('email');
      });

      expect(result.current.fieldStates.email.touched).toBe(true);
    });

    it('should trigger immediate validation', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: { email: emailRules },
          debounceMs: 300,
        })
      );

      act(() => {
        result.current.setFieldValue('email', 'invalid');
      });

      // Touch immediately (no waiting for debounce)
      act(() => {
        result.current.touchField('email');
      });

      // Validation should have run immediately
      expect(result.current.fieldStates.email.touched).toBe(true);
      expect(result.current.fieldStates.email.error).toBe('Please enter a valid email');
    });

    it('should clear pending debounced validation', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: { email: emailRules },
          debounceMs: 300,
        })
      );

      act(() => {
        result.current.setFieldValue('email', 'test@example.com');
      });

      // Touch before debounce completes
      act(() => {
        result.current.touchField('email');
      });

      // Should be valid immediately
      expect(result.current.fieldStates.email.valid).toBe(true);
    });
  });

  // ==========================================================================
  // Validation Logic
  // ==========================================================================

  describe('validation logic', () => {
    it('should show error for invalid value', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: { email: emailRules },
        })
      );

      act(() => {
        result.current.setFieldValue('email', 'invalid-email');
        result.current.touchField('email');
      });

      expect(result.current.fieldStates.email.valid).toBe(false);
      expect(result.current.fieldStates.email.error).toBe('Please enter a valid email');
      expect(result.current.fieldStates.email.successMessage).toBeNull();
    });

    it('should show success message for valid value', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: { email: emailRules },
        })
      );

      act(() => {
        result.current.setFieldValue('email', 'test@example.com');
        result.current.touchField('email');
      });

      expect(result.current.fieldStates.email.valid).toBe(true);
      expect(result.current.fieldStates.email.error).toBeNull();
      expect(result.current.fieldStates.email.successMessage).toBe(
        "Great! That's a valid email address"
      );
    });

    it('should validate against multiple rules in order', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: { email: emailRules },
        })
      );

      // Empty value - first rule fails
      act(() => {
        result.current.setFieldValue('email', '');
        result.current.touchField('email');
      });

      // Empty values don't trigger validation
      expect(result.current.fieldStates.email.valid).toBe(false);
      expect(result.current.fieldStates.email.error).toBeNull();

      // Non-empty but invalid format - second rule fails
      act(() => {
        result.current.setFieldValue('email', 'not-an-email');
        result.current.touchField('email');
      });

      expect(result.current.fieldStates.email.error).toBe('Please enter a valid email');
    });

    it('should not validate empty values', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: { email: emailRules },
        })
      );

      act(() => {
        result.current.setFieldValue('email', '');
        result.current.touchField('email');
      });

      expect(result.current.fieldStates.email.valid).toBe(false);
      expect(result.current.fieldStates.email.error).toBeNull();
      expect(result.current.fieldStates.email.successMessage).toBeNull();
    });
  });

  // ==========================================================================
  // Form-level State
  // ==========================================================================

  describe('form-level state', () => {
    it('should update completedFields count', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: {
            email: emailRules,
            password: passwordRules,
          },
        })
      );

      expect(result.current.completedFields).toBe(0);

      act(() => {
        result.current.setFieldValue('email', 'test@example.com');
        result.current.touchField('email');
      });

      expect(result.current.completedFields).toBe(1);

      act(() => {
        result.current.setFieldValue('password', 'password123');
        result.current.touchField('password');
      });

      expect(result.current.completedFields).toBe(2);
    });

    it('should set isFormValid when all fields are valid', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: {
            email: emailRules,
            password: passwordRules,
          },
        })
      );

      expect(result.current.isFormValid).toBe(false);

      act(() => {
        result.current.setFieldValue('email', 'test@example.com');
        result.current.touchField('email');
      });

      expect(result.current.isFormValid).toBe(false);

      act(() => {
        result.current.setFieldValue('password', 'password123');
        result.current.touchField('password');
      });

      expect(result.current.isFormValid).toBe(true);
    });

    it('should set isFormValid to false when any field becomes invalid', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: {
            email: emailRules,
            password: passwordRules,
          },
        })
      );

      // Make both valid
      act(() => {
        result.current.setFieldValue('email', 'test@example.com');
        result.current.touchField('email');
        result.current.setFieldValue('password', 'password123');
        result.current.touchField('password');
      });

      expect(result.current.isFormValid).toBe(true);

      // Make one invalid
      act(() => {
        result.current.setFieldValue('email', 'invalid');
        result.current.touchField('email');
      });

      expect(result.current.isFormValid).toBe(false);
    });
  });

  // ==========================================================================
  // resetForm
  // ==========================================================================

  describe('resetForm', () => {
    it('should reset all fields to initial state', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: {
            email: emailRules,
            password: passwordRules,
          },
        })
      );

      // Fill in fields
      act(() => {
        result.current.setFieldValue('email', 'test@example.com');
        result.current.touchField('email');
        result.current.setFieldValue('password', 'password123');
        result.current.touchField('password');
      });

      expect(result.current.isFormValid).toBe(true);

      // Reset
      act(() => {
        result.current.resetForm();
      });

      expect(result.current.fieldStates.email).toEqual({
        value: '',
        touched: false,
        valid: false,
        error: null,
        successMessage: null,
      });

      expect(result.current.fieldStates.password).toEqual({
        value: '',
        touched: false,
        valid: false,
        error: null,
        successMessage: null,
      });

      expect(result.current.isFormValid).toBe(false);
      expect(result.current.completedFields).toBe(0);
    });
  });

  // ==========================================================================
  // getFieldProps
  // ==========================================================================

  describe('getFieldProps', () => {
    it('should return value, onChange, and onBlur', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: { email: emailRules },
        })
      );

      const props = result.current.getFieldProps('email');

      expect(props).toHaveProperty('value');
      expect(props).toHaveProperty('onChange');
      expect(props).toHaveProperty('onBlur');
      expect(typeof props.onChange).toBe('function');
      expect(typeof props.onBlur).toBe('function');
    });

    it('should update value when onChange is called', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: { email: emailRules },
        })
      );

      const props = result.current.getFieldProps('email');

      act(() => {
        props.onChange({ target: { value: 'test@example.com' } } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.fieldStates.email.value).toBe('test@example.com');
    });

    it('should touch field when onBlur is called', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: { email: emailRules },
        })
      );

      const props = result.current.getFieldProps('email');

      act(() => {
        props.onBlur();
      });

      expect(result.current.fieldStates.email.touched).toBe(true);
    });
  });

  // ==========================================================================
  // Custom Debounce
  // ==========================================================================

  describe('custom debounce', () => {
    it('should respect custom debounce time', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          fields: { email: emailRules },
          debounceMs: 500,
        })
      );

      act(() => {
        result.current.setFieldValue('email', 'test@example.com');
      });

      // After 300ms, validation should not have run
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current.fieldStates.email.valid).toBe(false);

      // After 500ms total, validation should have run
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current.fieldStates.email.valid).toBe(true);
    });
  });
});

// ============================================================================
// validationRules Tests
// ============================================================================

describe('validationRules', () => {
  describe('required', () => {
    it('should fail for empty string', () => {
      const rule = validationRules.required();
      expect(rule.validate('')).toBe(false);
      expect(rule.validate('   ')).toBe(false);
    });

    it('should pass for non-empty string', () => {
      const rule = validationRules.required();
      expect(rule.validate('hello')).toBe(true);
    });

    it('should use custom message', () => {
      const rule = validationRules.required('Custom required message');
      expect(rule.message).toBe('Custom required message');
    });
  });

  describe('email', () => {
    it('should validate email format', () => {
      const rule = validationRules.email();
      expect(rule.validate('test@example.com')).toBe(true);
      expect(rule.validate('user.name@domain.co.uk')).toBe(true);
      expect(rule.validate('invalid')).toBe(false);
      expect(rule.validate('missing@domain')).toBe(false);
      expect(rule.validate('@nodomain.com')).toBe(false);
    });

    it('should have success message', () => {
      const rule = validationRules.email();
      expect(rule.successMessage).toBe("Great! That's a valid email address");
    });
  });

  describe('minLength', () => {
    it('should validate minimum length', () => {
      const rule = validationRules.minLength(5);
      expect(rule.validate('1234')).toBe(false);
      expect(rule.validate('12345')).toBe(true);
      expect(rule.validate('123456')).toBe(true);
    });

    it('should use custom messages', () => {
      const rule = validationRules.minLength(5, 'Too short', 'Good length!');
      expect(rule.message).toBe('Too short');
      expect(rule.successMessage).toBe('Good length!');
    });
  });

  describe('maxLength', () => {
    it('should validate maximum length', () => {
      const rule = validationRules.maxLength(5);
      expect(rule.validate('1234')).toBe(true);
      expect(rule.validate('12345')).toBe(true);
      expect(rule.validate('123456')).toBe(false);
    });
  });

  describe('strongPassword', () => {
    it('should require 8+ chars, uppercase, lowercase, and number', () => {
      const rule = validationRules.strongPassword();
      expect(rule.validate('weak')).toBe(false);
      expect(rule.validate('weakpassword')).toBe(false);
      expect(rule.validate('Weakpass')).toBe(false);
      expect(rule.validate('Weakpass1')).toBe(true);
      expect(rule.validate('StrongP4ss')).toBe(true);
    });

    it('should have success message', () => {
      const rule = validationRules.strongPassword();
      expect(rule.successMessage).toBe("Strong password! You're all set");
    });
  });

  describe('displayName', () => {
    it('should validate 2-50 character length', () => {
      const rule = validationRules.displayName();
      expect(rule.validate('A')).toBe(false);
      expect(rule.validate('AB')).toBe(true);
      expect(rule.validate('A'.repeat(50))).toBe(true);
      expect(rule.validate('A'.repeat(51))).toBe(false);
    });

    it('should have success message', () => {
      const rule = validationRules.displayName();
      expect(rule.successMessage).toBe('Perfect! Your name looks good');
    });
  });

  describe('pattern', () => {
    it('should validate against custom regex', () => {
      const rule = validationRules.pattern(/^\d{3}-\d{4}$/, 'Invalid format');
      expect(rule.validate('123-4567')).toBe(true);
      expect(rule.validate('1234567')).toBe(false);
      expect(rule.validate('abc-defg')).toBe(false);
    });
  });

  describe('matches', () => {
    it('should validate that values match', () => {
      let compareValue = 'password123';
      const rule = validationRules.matches(() => compareValue);
      
      expect(rule.validate('password123')).toBe(true);
      expect(rule.validate('different')).toBe(false);
      
      compareValue = 'newpassword';
      expect(rule.validate('newpassword')).toBe(true);
    });

    it('should have success message', () => {
      const rule = validationRules.matches(() => 'test');
      expect(rule.successMessage).toBe('Values match!');
    });
  });
});
