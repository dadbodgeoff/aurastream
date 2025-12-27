/**
 * BrandKitsEmptyState Component Tests
 * 
 * Tests for the brand kits empty state component with tier-specific messaging.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrandKitsEmptyState } from '../BrandKitsEmptyState';

// Mock the useReducedMotion hook
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

// ============================================================================
// Tests
// ============================================================================

describe('BrandKitsEmptyState', () => {
  const mockOnCreateBrandKit = vi.fn();
  const mockOnLearnMore = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Rendering
  // ==========================================================================

  describe('rendering', () => {
    it('should render with correct title', () => {
      render(<BrandKitsEmptyState onCreateBrandKit={mockOnCreateBrandKit} />);
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading.textContent).toBe('Set up your brand');
    });

    it('should render the NoBrandKits illustration', () => {
      render(<BrandKitsEmptyState onCreateBrandKit={mockOnCreateBrandKit} />);
      
      const container = screen.getByTestId('brand-kits-empty-state');
      expect(container.querySelector('svg')).toBeDefined();
    });

    it('should render Create Brand Kit button', () => {
      render(<BrandKitsEmptyState onCreateBrandKit={mockOnCreateBrandKit} />);
      
      expect(screen.getByRole('button', { name: /Create Brand Kit/i })).toBeDefined();
    });

    it('should render learn more link when provided', () => {
      render(
        <BrandKitsEmptyState
          onCreateBrandKit={mockOnCreateBrandKit}
          onLearnMore={mockOnLearnMore}
        />
      );
      
      expect(screen.getByRole('button', { name: /Learn about brand kits/i })).toBeDefined();
    });

    it('should not render learn more link when not provided', () => {
      render(<BrandKitsEmptyState onCreateBrandKit={mockOnCreateBrandKit} />);
      
      expect(screen.queryByRole('button', { name: /Learn about brand kits/i })).toBeNull();
    });
  });

  // ==========================================================================
  // Tier-Specific Messaging
  // ==========================================================================

  describe('tier-specific messaging', () => {
    it('should show free tier message by default', () => {
      render(<BrandKitsEmptyState onCreateBrandKit={mockOnCreateBrandKit} />);
      
      expect(screen.getByText(/Upgrade for more customization options/i)).toBeDefined();
    });

    it('should show free tier message explicitly', () => {
      render(<BrandKitsEmptyState tier="free" onCreateBrandKit={mockOnCreateBrandKit} />);
      
      expect(screen.getByText(/Upgrade for more customization options/i)).toBeDefined();
    });

    it('should show pro tier message', () => {
      render(<BrandKitsEmptyState tier="pro" onCreateBrandKit={mockOnCreateBrandKit} />);
      
      expect(screen.getByText(/Upgrade to Studio for advanced brand guidelines/i)).toBeDefined();
    });

    it('should show studio tier message', () => {
      render(<BrandKitsEmptyState tier="studio" onCreateBrandKit={mockOnCreateBrandKit} />);
      
      expect(screen.getByText(/consistent colors, fonts, and style/i)).toBeDefined();
    });
  });

  // ==========================================================================
  // Actions
  // ==========================================================================

  describe('actions', () => {
    it('should call onCreateBrandKit when Create Brand Kit is clicked', () => {
      render(<BrandKitsEmptyState onCreateBrandKit={mockOnCreateBrandKit} />);
      
      fireEvent.click(screen.getByRole('button', { name: /Create Brand Kit/i }));
      
      expect(mockOnCreateBrandKit).toHaveBeenCalledTimes(1);
    });

    it('should call onLearnMore when learn more is clicked', () => {
      render(
        <BrandKitsEmptyState
          onCreateBrandKit={mockOnCreateBrandKit}
          onLearnMore={mockOnLearnMore}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /Learn about brand kits/i }));
      
      expect(mockOnLearnMore).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(<BrandKitsEmptyState onCreateBrandKit={mockOnCreateBrandKit} />);
      
      expect(screen.getByRole('heading', { level: 2 })).toBeDefined();
    });

    it('should have accessible button with icon', () => {
      render(<BrandKitsEmptyState onCreateBrandKit={mockOnCreateBrandKit} />);
      
      const button = screen.getByRole('button', { name: /Create Brand Kit/i });
      expect(button.textContent).toContain('Create Brand Kit');
    });
  });

  // ==========================================================================
  // Custom Styling
  // ==========================================================================

  describe('custom styling', () => {
    it('should apply custom className', () => {
      render(
        <BrandKitsEmptyState
          onCreateBrandKit={mockOnCreateBrandKit}
          className="custom-class"
        />
      );
      
      const container = screen.getByTestId('brand-kits-empty-state');
      expect(container.className).toContain('custom-class');
    });
  });
});
