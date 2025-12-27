/**
 * EmptyStateBase Component Tests
 * 
 * Comprehensive tests for the base empty state component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyStateBase } from '../EmptyStateBase';

// Mock the useReducedMotion hook
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

// ============================================================================
// Test Data
// ============================================================================

const mockIllustration = <svg data-testid="mock-illustration" />;

const defaultProps = {
  illustration: mockIllustration,
  title: 'Test Title',
  description: 'Test description text',
};

// ============================================================================
// Tests
// ============================================================================

describe('EmptyStateBase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Rendering
  // ==========================================================================

  describe('rendering', () => {
    it('should render the illustration', () => {
      render(<EmptyStateBase {...defaultProps} />);
      
      expect(screen.getByTestId('mock-illustration')).toBeDefined();
    });

    it('should render the title as an h2 heading', () => {
      render(<EmptyStateBase {...defaultProps} />);
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading.textContent).toBe('Test Title');
    });

    it('should render the description', () => {
      render(<EmptyStateBase {...defaultProps} />);
      
      expect(screen.getByText('Test description text')).toBeDefined();
    });

    it('should render with custom testId', () => {
      render(<EmptyStateBase {...defaultProps} testId="custom-empty-state" />);
      
      expect(screen.getByTestId('custom-empty-state')).toBeDefined();
    });

    it('should render with default testId', () => {
      render(<EmptyStateBase {...defaultProps} />);
      
      expect(screen.getByTestId('empty-state')).toBeDefined();
    });

    it('should apply custom className', () => {
      render(<EmptyStateBase {...defaultProps} className="custom-class" />);
      
      const container = screen.getByTestId('empty-state');
      expect(container.className).toContain('custom-class');
    });
  });

  // ==========================================================================
  // Primary Action
  // ==========================================================================

  describe('primary action', () => {
    it('should render primary action button when provided', () => {
      const onClick = vi.fn();
      render(
        <EmptyStateBase
          {...defaultProps}
          primaryAction={{
            label: 'Primary Button',
            onClick,
          }}
        />
      );
      
      expect(screen.getByRole('button', { name: 'Primary Button' })).toBeDefined();
    });

    it('should call onClick when primary action is clicked', () => {
      const onClick = vi.fn();
      render(
        <EmptyStateBase
          {...defaultProps}
          primaryAction={{
            label: 'Primary Button',
            onClick,
          }}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: 'Primary Button' }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should render icon in primary action when provided', () => {
      const onClick = vi.fn();
      render(
        <EmptyStateBase
          {...defaultProps}
          primaryAction={{
            label: 'Primary Button',
            onClick,
            icon: <svg data-testid="action-icon" />,
          }}
        />
      );
      
      expect(screen.getByTestId('action-icon')).toBeDefined();
    });

    it('should not render primary action when not provided', () => {
      render(<EmptyStateBase {...defaultProps} />);
      
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  // ==========================================================================
  // Secondary Action
  // ==========================================================================

  describe('secondary action', () => {
    it('should render secondary action button when provided', () => {
      const onClick = vi.fn();
      render(
        <EmptyStateBase
          {...defaultProps}
          secondaryAction={{
            label: 'Secondary Link',
            onClick,
          }}
        />
      );
      
      expect(screen.getByRole('button', { name: 'Secondary Link' })).toBeDefined();
    });

    it('should call onClick when secondary action is clicked', () => {
      const onClick = vi.fn();
      render(
        <EmptyStateBase
          {...defaultProps}
          secondaryAction={{
            label: 'Secondary Link',
            onClick,
          }}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: 'Secondary Link' }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not render secondary action when not provided', () => {
      render(<EmptyStateBase {...defaultProps} />);
      
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  // ==========================================================================
  // Both Actions
  // ==========================================================================

  describe('both actions', () => {
    it('should render both primary and secondary actions', () => {
      const primaryClick = vi.fn();
      const secondaryClick = vi.fn();
      
      render(
        <EmptyStateBase
          {...defaultProps}
          primaryAction={{
            label: 'Primary',
            onClick: primaryClick,
          }}
          secondaryAction={{
            label: 'Secondary',
            onClick: secondaryClick,
          }}
        />
      );
      
      expect(screen.getByRole('button', { name: 'Primary' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Secondary' })).toBeDefined();
    });

    it('should handle clicks on both actions independently', () => {
      const primaryClick = vi.fn();
      const secondaryClick = vi.fn();
      
      render(
        <EmptyStateBase
          {...defaultProps}
          primaryAction={{
            label: 'Primary',
            onClick: primaryClick,
          }}
          secondaryAction={{
            label: 'Secondary',
            onClick: secondaryClick,
          }}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: 'Primary' }));
      fireEvent.click(screen.getByRole('button', { name: 'Secondary' }));
      
      expect(primaryClick).toHaveBeenCalledTimes(1);
      expect(secondaryClick).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(<EmptyStateBase {...defaultProps} />);
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeDefined();
    });

    it('should have accessible button labels', () => {
      const onClick = vi.fn();
      render(
        <EmptyStateBase
          {...defaultProps}
          primaryAction={{
            label: 'Create Asset',
            onClick,
          }}
        />
      );
      
      const button = screen.getByRole('button', { name: 'Create Asset' });
      expect(button).toBeDefined();
      expect(button.textContent).toContain('Create Asset');
    });

    it('should hide illustration from screen readers', () => {
      render(<EmptyStateBase {...defaultProps} />);
      
      // The illustration container should have aria-hidden
      const illustrationContainer = screen.getByTestId('mock-illustration').parentElement;
      expect(illustrationContainer?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  // ==========================================================================
  // Styling
  // ==========================================================================

  describe('styling', () => {
    it('should have glassmorphism card styling', () => {
      render(<EmptyStateBase {...defaultProps} />);
      
      const container = screen.getByTestId('empty-state');
      // Check for flex centering classes
      expect(container.className).toContain('flex');
      expect(container.className).toContain('flex-col');
      expect(container.className).toContain('items-center');
      expect(container.className).toContain('justify-center');
    });

    it('should have animation class when reduced motion is not preferred', () => {
      render(<EmptyStateBase {...defaultProps} />);
      
      const container = screen.getByTestId('empty-state');
      expect(container.className).toContain('animate-fade-in-up');
    });
  });

  // ==========================================================================
  // Reduced Motion
  // ==========================================================================

  describe('reduced motion', () => {
    it('should respect reduced motion preference', async () => {
      // Re-mock with reduced motion enabled
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);
      
      render(<EmptyStateBase {...defaultProps} />);
      
      const container = screen.getByTestId('empty-state');
      // Should have motion-reduce class
      expect(container.className).toContain('motion-reduce:animate-none');
    });
  });
});
