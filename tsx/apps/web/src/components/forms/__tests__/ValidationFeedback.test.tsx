/**
 * ValidationFeedback Component Tests
 * 
 * Tests for the validation feedback component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationFeedback } from '../ValidationFeedback';

// Mock the useReducedMotion hook
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

// ============================================================================
// Tests
// ============================================================================

describe('ValidationFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Rendering
  // ==========================================================================

  describe('rendering', () => {
    it('should render error message', () => {
      render(
        <ValidationFeedback
          type="error"
          message="This field is required"
        />
      );
      
      expect(screen.getByText('This field is required')).toBeDefined();
    });

    it('should render success message', () => {
      render(
        <ValidationFeedback
          type="success"
          message="Great! That's valid"
        />
      );
      
      expect(screen.getByText("Great! That's valid")).toBeDefined();
    });

    it('should not render when type is none', () => {
      render(
        <ValidationFeedback
          type="none"
          message="Some message"
        />
      );
      
      expect(screen.queryByText('Some message')).toBeNull();
    });

    it('should not render when message is null', () => {
      render(
        <ValidationFeedback
          type="error"
          message={null}
        />
      );
      
      expect(screen.queryByTestId('validation-feedback')).toBeNull();
    });

    it('should render with custom testId', () => {
      render(
        <ValidationFeedback
          type="error"
          message="Error"
          testId="custom-feedback"
        />
      );
      
      expect(screen.getByTestId('custom-feedback')).toBeDefined();
    });

    it('should apply custom className', () => {
      render(
        <ValidationFeedback
          type="error"
          message="Error"
          className="custom-class"
        />
      );
      
      const feedback = screen.getByTestId('validation-feedback');
      expect(feedback.className).toContain('custom-class');
    });
  });

  // ==========================================================================
  // Error State
  // ==========================================================================

  describe('error state', () => {
    it('should have role="alert" for errors', () => {
      render(
        <ValidationFeedback
          type="error"
          message="Error message"
        />
      );
      
      expect(screen.getByRole('alert')).toBeDefined();
    });

    it('should have error styling', () => {
      render(
        <ValidationFeedback
          type="error"
          message="Error message"
        />
      );
      
      const feedback = screen.getByTestId('validation-feedback');
      expect(feedback.className).toContain('text-error-light');
    });
  });

  // ==========================================================================
  // Success State
  // ==========================================================================

  describe('success state', () => {
    it('should not have role="alert" for success', () => {
      render(
        <ValidationFeedback
          type="success"
          message="Success message"
        />
      );
      
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('should have success styling', () => {
      render(
        <ValidationFeedback
          type="success"
          message="Success message"
        />
      );
      
      const feedback = screen.getByTestId('validation-feedback');
      expect(feedback.className).toContain('text-success-light');
    });
  });

  // ==========================================================================
  // Animation
  // ==========================================================================

  describe('animation', () => {
    it('should have animation class when reduced motion is not preferred', () => {
      render(
        <ValidationFeedback
          type="error"
          message="Error"
        />
      );
      
      const feedback = screen.getByTestId('validation-feedback');
      expect(feedback.className).toContain('animate-fade-in');
    });

    it('should respect reduced motion preference', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);
      
      render(
        <ValidationFeedback
          type="error"
          message="Error"
        />
      );
      
      const feedback = screen.getByTestId('validation-feedback');
      expect(feedback.className).not.toContain('animate-fade-in');
    });
  });
});
