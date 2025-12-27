/**
 * ValidatedInput Component Tests
 * 
 * Comprehensive tests for the validated input component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidatedInput } from '../ValidatedInput';
import type { FieldState } from '@/hooks/useFormValidation';

// Mock the useReducedMotion hook
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

// ============================================================================
// Test Data
// ============================================================================

const defaultProps = {
  name: 'email',
  label: 'Email address',
  value: '',
  onChange: vi.fn(),
};

const createFieldState = (overrides: Partial<FieldState> = {}): FieldState => ({
  value: '',
  touched: false,
  valid: false,
  error: null,
  successMessage: null,
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('ValidatedInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Rendering
  // ==========================================================================

  describe('rendering', () => {
    it('should render the label', () => {
      render(<ValidatedInput {...defaultProps} />);
      
      expect(screen.getByText('Email address')).toBeDefined();
    });

    it('should render the input', () => {
      render(<ValidatedInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDefined();
    });

    it('should render with placeholder', () => {
      render(<ValidatedInput {...defaultProps} placeholder="you@example.com" />);
      
      const input = screen.getByPlaceholderText('you@example.com');
      expect(input).toBeDefined();
    });

    it('should render required indicator when required', () => {
      render(<ValidatedInput {...defaultProps} required />);
      
      expect(screen.getByText('*')).toBeDefined();
    });

    it('should render with custom testId', () => {
      render(<ValidatedInput {...defaultProps} testId="custom-input" />);
      
      expect(screen.getByTestId('custom-input')).toBeDefined();
    });

    it('should apply custom className', () => {
      render(<ValidatedInput {...defaultProps} className="custom-class" testId="input-container" />);
      
      const container = screen.getByTestId('input-container');
      expect(container.className).toContain('custom-class');
    });
  });

  // ==========================================================================
  // Input Types
  // ==========================================================================

  describe('input types', () => {
    it('should render text input by default', () => {
      render(<ValidatedInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      expect(input.getAttribute('type')).toBe('text');
    });

    it('should render email input', () => {
      render(<ValidatedInput {...defaultProps} type="email" />);
      
      const input = screen.getByRole('textbox');
      expect(input.getAttribute('type')).toBe('email');
    });

    it('should render password input', () => {
      render(<ValidatedInput {...defaultProps} type="password" />);
      
      // Password inputs don't have textbox role
      const input = screen.getByLabelText('Email address');
      expect(input.getAttribute('type')).toBe('password');
    });

    it('should render tel input', () => {
      render(<ValidatedInput {...defaultProps} type="tel" />);
      
      const input = screen.getByRole('textbox');
      expect(input.getAttribute('type')).toBe('tel');
    });

    it('should render url input', () => {
      render(<ValidatedInput {...defaultProps} type="url" />);
      
      const input = screen.getByRole('textbox');
      expect(input.getAttribute('type')).toBe('url');
    });
  });

  // ==========================================================================
  // Password Visibility Toggle
  // ==========================================================================

  describe('password visibility toggle', () => {
    it('should show toggle button for password inputs', () => {
      render(<ValidatedInput {...defaultProps} type="password" />);
      
      expect(screen.getByLabelText('Show password')).toBeDefined();
    });

    it('should not show toggle button for non-password inputs', () => {
      render(<ValidatedInput {...defaultProps} type="text" />);
      
      expect(screen.queryByLabelText('Show password')).toBeNull();
      expect(screen.queryByLabelText('Hide password')).toBeNull();
    });

    it('should toggle password visibility when clicked', () => {
      render(<ValidatedInput {...defaultProps} type="password" />);
      
      const input = screen.getByLabelText('Email address');
      const toggleButton = screen.getByLabelText('Show password');
      
      expect(input.getAttribute('type')).toBe('password');
      
      fireEvent.click(toggleButton);
      
      expect(input.getAttribute('type')).toBe('text');
      expect(screen.getByLabelText('Hide password')).toBeDefined();
      
      fireEvent.click(screen.getByLabelText('Hide password'));
      
      expect(input.getAttribute('type')).toBe('password');
    });
  });

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  describe('event handlers', () => {
    it('should call onChange when input value changes', () => {
      const onChange = vi.fn();
      render(<ValidatedInput {...defaultProps} onChange={onChange} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test@example.com' } });
      
      expect(onChange).toHaveBeenCalledWith('test@example.com');
    });

    it('should call onBlur when input loses focus', () => {
      const onBlur = vi.fn();
      render(<ValidatedInput {...defaultProps} onBlur={onBlur} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.blur(input);
      
      expect(onBlur).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Error State
  // ==========================================================================

  describe('error state', () => {
    it('should show error message when field has error', () => {
      const fieldState = createFieldState({
        touched: true,
        error: 'Please enter a valid email',
      });
      
      render(<ValidatedInput {...defaultProps} fieldState={fieldState} />);
      
      expect(screen.getByText('Please enter a valid email')).toBeDefined();
    });

    it('should show error icon when field has error', () => {
      const fieldState = createFieldState({
        value: 'invalid',
        touched: true,
        error: 'Please enter a valid email',
      });
      
      render(<ValidatedInput {...defaultProps} value="invalid" fieldState={fieldState} />);
      
      // The error icon should be present (X icon)
      const feedback = screen.getByRole('alert');
      expect(feedback).toBeDefined();
    });

    it('should apply error border styling', () => {
      const fieldState = createFieldState({
        touched: true,
        error: 'Error message',
      });
      
      render(<ValidatedInput {...defaultProps} fieldState={fieldState} />);
      
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('border-error-main');
    });

    it('should set aria-invalid when field has error', () => {
      const fieldState = createFieldState({
        touched: true,
        error: 'Error message',
      });
      
      render(<ValidatedInput {...defaultProps} fieldState={fieldState} />);
      
      const input = screen.getByRole('textbox');
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('should not show error when field is not touched', () => {
      const fieldState = createFieldState({
        touched: false,
        error: 'Error message',
      });
      
      render(<ValidatedInput {...defaultProps} fieldState={fieldState} />);
      
      expect(screen.queryByText('Error message')).toBeNull();
    });
  });

  // ==========================================================================
  // Success State
  // ==========================================================================

  describe('success state', () => {
    it('should show success message when field is valid', () => {
      const fieldState = createFieldState({
        touched: true,
        valid: true,
        successMessage: "Great! That's a valid email address",
      });
      
      render(<ValidatedInput {...defaultProps} fieldState={fieldState} />);
      
      expect(screen.getByText("Great! That's a valid email address")).toBeDefined();
    });

    it('should show success icon when field is valid', () => {
      const fieldState = createFieldState({
        value: 'test@example.com',
        touched: true,
        valid: true,
        successMessage: 'Valid!',
      });
      
      render(
        <ValidatedInput
          {...defaultProps}
          value="test@example.com"
          fieldState={fieldState}
        />
      );
      
      // Success feedback should be present
      expect(screen.getByText('Valid!')).toBeDefined();
    });

    it('should apply success border styling', () => {
      const fieldState = createFieldState({
        touched: true,
        valid: true,
        successMessage: 'Valid!',
      });
      
      render(<ValidatedInput {...defaultProps} fieldState={fieldState} />);
      
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('border-success-main');
    });

    it('should not show success when field is not touched', () => {
      const fieldState = createFieldState({
        touched: false,
        valid: true,
        successMessage: 'Valid!',
      });
      
      render(<ValidatedInput {...defaultProps} fieldState={fieldState} />);
      
      expect(screen.queryByText('Valid!')).toBeNull();
    });
  });

  // ==========================================================================
  // Disabled State
  // ==========================================================================

  describe('disabled state', () => {
    it('should disable input when disabled prop is true', () => {
      render(<ValidatedInput {...defaultProps} disabled />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveProperty('disabled', true);
    });

    it('should apply disabled styling', () => {
      render(<ValidatedInput {...defaultProps} disabled />);
      
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('opacity-50');
      expect(input.className).toContain('cursor-not-allowed');
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  describe('accessibility', () => {
    it('should have proper label association', () => {
      render(<ValidatedInput {...defaultProps} />);
      
      const input = screen.getByLabelText('Email address');
      expect(input).toBeDefined();
    });

    it('should have aria-describedby for error', () => {
      const fieldState = createFieldState({
        touched: true,
        error: 'Error message',
      });
      
      render(<ValidatedInput {...defaultProps} fieldState={fieldState} />);
      
      const input = screen.getByRole('textbox');
      expect(input.getAttribute('aria-describedby')).toBeDefined();
    });

    it('should have role="alert" on error feedback', () => {
      const fieldState = createFieldState({
        touched: true,
        error: 'Error message',
      });
      
      render(<ValidatedInput {...defaultProps} fieldState={fieldState} />);
      
      expect(screen.getByRole('alert')).toBeDefined();
    });

    it('should have accessible password toggle button', () => {
      render(<ValidatedInput {...defaultProps} type="password" />);
      
      const toggleButton = screen.getByLabelText('Show password');
      expect(toggleButton.getAttribute('type')).toBe('button');
    });
  });

  // ==========================================================================
  // Auto-complete and Input Mode
  // ==========================================================================

  describe('auto-complete and input mode', () => {
    it('should set autoComplete attribute', () => {
      render(<ValidatedInput {...defaultProps} autoComplete="email" />);
      
      const input = screen.getByRole('textbox');
      expect(input.getAttribute('autocomplete')).toBe('email');
    });

    it('should set inputMode attribute', () => {
      render(<ValidatedInput {...defaultProps} inputMode="email" />);
      
      const input = screen.getByRole('textbox');
      expect(input.getAttribute('inputmode')).toBe('email');
    });
  });

  // ==========================================================================
  // No Validation State
  // ==========================================================================

  describe('no validation state', () => {
    it('should render without fieldState', () => {
      render(<ValidatedInput {...defaultProps} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeDefined();
      expect(input.className).toContain('border-border-default');
    });

    it('should not show validation icons without fieldState', () => {
      render(<ValidatedInput {...defaultProps} value="test" />);
      
      // No validation feedback should be shown
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });
});
