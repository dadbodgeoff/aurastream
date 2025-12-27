/**
 * FormProgress Component Tests
 * 
 * Tests for the form progress component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormProgress } from '../FormProgress';

// Mock the useReducedMotion hook
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

// ============================================================================
// Tests
// ============================================================================

describe('FormProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Rendering
  // ==========================================================================

  describe('rendering', () => {
    it('should render progress bar', () => {
      render(
        <FormProgress
          completedFields={1}
          totalFields={3}
        />
      );
      
      expect(screen.getByTestId('form-progress')).toBeDefined();
      expect(screen.getByTestId('form-progress-fill')).toBeDefined();
    });

    it('should render label by default', () => {
      render(
        <FormProgress
          completedFields={1}
          totalFields={3}
        />
      );
      
      expect(screen.getByText('1 of 3 fields complete')).toBeDefined();
    });

    it('should hide label when showLabel is false', () => {
      render(
        <FormProgress
          completedFields={1}
          totalFields={3}
          showLabel={false}
        />
      );
      
      expect(screen.queryByTestId('form-progress-label')).toBeNull();
    });

    it('should render with custom testId', () => {
      render(
        <FormProgress
          completedFields={1}
          totalFields={3}
          testId="custom-progress"
        />
      );
      
      expect(screen.getByTestId('custom-progress')).toBeDefined();
    });

    it('should apply custom className', () => {
      render(
        <FormProgress
          completedFields={1}
          totalFields={3}
          className="custom-class"
        />
      );
      
      const progress = screen.getByTestId('form-progress');
      expect(progress.className).toContain('custom-class');
    });
  });

  // ==========================================================================
  // Progress Calculation
  // ==========================================================================

  describe('progress calculation', () => {
    it('should show 0% progress when no fields are complete', () => {
      render(
        <FormProgress
          completedFields={0}
          totalFields={3}
        />
      );
      
      const fill = screen.getByTestId('form-progress-fill');
      expect(fill.style.width).toBe('0%');
    });

    it('should show correct percentage for partial completion', () => {
      render(
        <FormProgress
          completedFields={1}
          totalFields={4}
        />
      );
      
      const fill = screen.getByTestId('form-progress-fill');
      expect(fill.style.width).toBe('25%');
    });

    it('should show 100% progress when all fields are complete', () => {
      render(
        <FormProgress
          completedFields={3}
          totalFields={3}
        />
      );
      
      const fill = screen.getByTestId('form-progress-fill');
      expect(fill.style.width).toBe('100%');
    });

    it('should handle zero total fields', () => {
      render(
        <FormProgress
          completedFields={0}
          totalFields={0}
        />
      );
      
      const fill = screen.getByTestId('form-progress-fill');
      expect(fill.style.width).toBe('0%');
    });
  });

  // ==========================================================================
  // Completion State
  // ==========================================================================

  describe('completion state', () => {
    it('should show completion message when all fields are complete', () => {
      render(
        <FormProgress
          completedFields={3}
          totalFields={3}
        />
      );
      
      expect(screen.getByText('All fields complete!')).toBeDefined();
    });

    it('should have success styling when complete', () => {
      render(
        <FormProgress
          completedFields={3}
          totalFields={3}
        />
      );
      
      const fill = screen.getByTestId('form-progress-fill');
      expect(fill.className).toContain('bg-success-main');
    });

    it('should have interactive styling when not complete', () => {
      render(
        <FormProgress
          completedFields={1}
          totalFields={3}
        />
      );
      
      const fill = screen.getByTestId('form-progress-fill');
      expect(fill.className).toContain('bg-interactive-600');
    });

    it('should have success text styling when complete', () => {
      render(
        <FormProgress
          completedFields={3}
          totalFields={3}
        />
      );
      
      const label = screen.getByTestId('form-progress-label');
      expect(label.className).toContain('text-success-light');
    });
  });

  // ==========================================================================
  // Custom Label Format
  // ==========================================================================

  describe('custom label format', () => {
    it('should use custom formatLabel function', () => {
      const formatLabel = (completed: number, total: number) =>
        `${completed}/${total} done`;
      
      render(
        <FormProgress
          completedFields={2}
          totalFields={5}
          formatLabel={formatLabel}
        />
      );
      
      expect(screen.getByText('2/5 done')).toBeDefined();
    });

    it('should pass correct values to formatLabel', () => {
      const formatLabel = vi.fn((completed, total) => `${completed} of ${total}`);
      
      render(
        <FormProgress
          completedFields={3}
          totalFields={7}
          formatLabel={formatLabel}
        />
      );
      
      expect(formatLabel).toHaveBeenCalledWith(3, 7);
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  describe('accessibility', () => {
    it('should have progressbar role', () => {
      render(
        <FormProgress
          completedFields={1}
          totalFields={3}
        />
      );
      
      expect(screen.getByRole('progressbar')).toBeDefined();
    });

    it('should have aria-valuenow', () => {
      render(
        <FormProgress
          completedFields={2}
          totalFields={5}
        />
      );
      
      const progress = screen.getByRole('progressbar');
      expect(progress.getAttribute('aria-valuenow')).toBe('2');
    });

    it('should have aria-valuemin', () => {
      render(
        <FormProgress
          completedFields={2}
          totalFields={5}
        />
      );
      
      const progress = screen.getByRole('progressbar');
      expect(progress.getAttribute('aria-valuemin')).toBe('0');
    });

    it('should have aria-valuemax', () => {
      render(
        <FormProgress
          completedFields={2}
          totalFields={5}
        />
      );
      
      const progress = screen.getByRole('progressbar');
      expect(progress.getAttribute('aria-valuemax')).toBe('5');
    });

    it('should have aria-label', () => {
      render(
        <FormProgress
          completedFields={2}
          totalFields={5}
        />
      );
      
      const progress = screen.getByRole('progressbar');
      expect(progress.getAttribute('aria-label')).toBe('2 of 5 fields complete');
    });
  });

  // ==========================================================================
  // Animation
  // ==========================================================================

  describe('animation', () => {
    it('should have transition class when reduced motion is not preferred', () => {
      render(
        <FormProgress
          completedFields={1}
          totalFields={3}
        />
      );
      
      const fill = screen.getByTestId('form-progress-fill');
      expect(fill.className).toContain('transition-all');
    });

    it('should respect reduced motion preference', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);
      
      render(
        <FormProgress
          completedFields={1}
          totalFields={3}
        />
      );
      
      const fill = screen.getByTestId('form-progress-fill');
      expect(fill.className).not.toContain('transition-all');
    });
  });
});
