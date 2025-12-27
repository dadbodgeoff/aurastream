/**
 * AssetsEmptyState Component Tests
 * 
 * Tests for the assets empty state component with tier-specific messaging.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssetsEmptyState } from '../AssetsEmptyState';

// Mock the useReducedMotion hook
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

// ============================================================================
// Tests
// ============================================================================

describe('AssetsEmptyState', () => {
  const mockOnCreateAsset = vi.fn();
  const mockOnBrowseTemplates = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Rendering
  // ==========================================================================

  describe('rendering', () => {
    it('should render with correct title', () => {
      render(<AssetsEmptyState onCreateAsset={mockOnCreateAsset} />);
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading.textContent).toBe('Create your first asset');
    });

    it('should render the NoAssets illustration', () => {
      render(<AssetsEmptyState onCreateAsset={mockOnCreateAsset} />);
      
      // The illustration should be present (SVG element)
      const container = screen.getByTestId('assets-empty-state');
      expect(container.querySelector('svg')).toBeDefined();
    });

    it('should render Quick Create button', () => {
      render(<AssetsEmptyState onCreateAsset={mockOnCreateAsset} />);
      
      expect(screen.getByRole('button', { name: /Quick Create/i })).toBeDefined();
    });

    it('should render browse templates link when provided', () => {
      render(
        <AssetsEmptyState
          onCreateAsset={mockOnCreateAsset}
          onBrowseTemplates={mockOnBrowseTemplates}
        />
      );
      
      expect(screen.getByRole('button', { name: /Browse templates/i })).toBeDefined();
    });

    it('should not render browse templates link when not provided', () => {
      render(<AssetsEmptyState onCreateAsset={mockOnCreateAsset} />);
      
      expect(screen.queryByRole('button', { name: /Browse templates/i })).toBeNull();
    });
  });

  // ==========================================================================
  // Tier-Specific Messaging
  // ==========================================================================

  describe('tier-specific messaging', () => {
    it('should show free tier message by default', () => {
      render(<AssetsEmptyState onCreateAsset={mockOnCreateAsset} />);
      
      expect(screen.getByText(/Upgrade anytime for more features/i)).toBeDefined();
    });

    it('should show free tier message explicitly', () => {
      render(<AssetsEmptyState tier="free" onCreateAsset={mockOnCreateAsset} />);
      
      expect(screen.getByText(/Upgrade anytime for more features/i)).toBeDefined();
    });

    it('should show pro tier message', () => {
      render(<AssetsEmptyState tier="pro" onCreateAsset={mockOnCreateAsset} />);
      
      expect(screen.getByText(/Upgrade to Studio for the Prompt Coach/i)).toBeDefined();
    });

    it('should show studio tier message', () => {
      render(<AssetsEmptyState tier="studio" onCreateAsset={mockOnCreateAsset} />);
      
      expect(screen.getByText(/full brand customization and the Prompt Coach/i)).toBeDefined();
    });
  });

  // ==========================================================================
  // Actions
  // ==========================================================================

  describe('actions', () => {
    it('should call onCreateAsset when Quick Create is clicked', () => {
      render(<AssetsEmptyState onCreateAsset={mockOnCreateAsset} />);
      
      fireEvent.click(screen.getByRole('button', { name: /Quick Create/i }));
      
      expect(mockOnCreateAsset).toHaveBeenCalledTimes(1);
    });

    it('should call onBrowseTemplates when browse templates is clicked', () => {
      render(
        <AssetsEmptyState
          onCreateAsset={mockOnCreateAsset}
          onBrowseTemplates={mockOnBrowseTemplates}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /Browse templates/i }));
      
      expect(mockOnBrowseTemplates).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(<AssetsEmptyState onCreateAsset={mockOnCreateAsset} />);
      
      expect(screen.getByRole('heading', { level: 2 })).toBeDefined();
    });

    it('should have accessible button with icon', () => {
      render(<AssetsEmptyState onCreateAsset={mockOnCreateAsset} />);
      
      const button = screen.getByRole('button', { name: /Quick Create/i });
      expect(button.textContent).toContain('Quick Create');
    });
  });

  // ==========================================================================
  // Custom Styling
  // ==========================================================================

  describe('custom styling', () => {
    it('should apply custom className', () => {
      render(
        <AssetsEmptyState
          onCreateAsset={mockOnCreateAsset}
          className="custom-class"
        />
      );
      
      const container = screen.getByTestId('assets-empty-state');
      expect(container.className).toContain('custom-class');
    });
  });
});
