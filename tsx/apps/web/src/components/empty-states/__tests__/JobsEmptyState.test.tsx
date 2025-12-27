/**
 * JobsEmptyState Component Tests
 * 
 * Tests for the jobs/generation queue empty state component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JobsEmptyState } from '../JobsEmptyState';

// Mock the useReducedMotion hook
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

// ============================================================================
// Tests
// ============================================================================

describe('JobsEmptyState', () => {
  const mockOnQuickCreate = vi.fn();
  const mockOnViewAssets = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Rendering
  // ==========================================================================

  describe('rendering', () => {
    it('should render with correct title', () => {
      render(<JobsEmptyState onQuickCreate={mockOnQuickCreate} />);
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading.textContent).toBe('Nothing generating');
    });

    it('should render the illustration', () => {
      render(<JobsEmptyState onQuickCreate={mockOnQuickCreate} />);
      
      const container = screen.getByTestId('jobs-empty-state');
      expect(container.querySelector('svg')).toBeDefined();
    });

    it('should render Quick Create button', () => {
      render(<JobsEmptyState onQuickCreate={mockOnQuickCreate} />);
      
      expect(screen.getByRole('button', { name: /Quick Create/i })).toBeDefined();
    });

    it('should render view assets link when provided', () => {
      render(
        <JobsEmptyState
          onQuickCreate={mockOnQuickCreate}
          onViewAssets={mockOnViewAssets}
        />
      );
      
      expect(screen.getByRole('button', { name: /View your assets/i })).toBeDefined();
    });

    it('should not render view assets link when not provided', () => {
      render(<JobsEmptyState onQuickCreate={mockOnQuickCreate} />);
      
      expect(screen.queryByRole('button', { name: /View your assets/i })).toBeNull();
    });
  });

  // ==========================================================================
  // Tier-Specific Messaging
  // ==========================================================================

  describe('tier-specific messaging', () => {
    it('should show free tier message by default', () => {
      render(<JobsEmptyState onQuickCreate={mockOnQuickCreate} />);
      
      expect(screen.getByText(/AI-powered generation/i)).toBeDefined();
    });

    it('should show free tier message explicitly', () => {
      render(<JobsEmptyState tier="free" onQuickCreate={mockOnQuickCreate} />);
      
      expect(screen.getByText(/AI-powered generation/i)).toBeDefined();
    });

    it('should show pro tier message', () => {
      render(<JobsEmptyState tier="pro" onQuickCreate={mockOnQuickCreate} />);
      
      expect(screen.getByText(/faster processing and priority queue/i)).toBeDefined();
    });

    it('should show studio tier message', () => {
      render(<JobsEmptyState tier="studio" onQuickCreate={mockOnQuickCreate} />);
      
      expect(screen.getByText(/Prompt Coach for AI-guided asset creation/i)).toBeDefined();
    });
  });

  // ==========================================================================
  // Actions
  // ==========================================================================

  describe('actions', () => {
    it('should call onQuickCreate when Quick Create is clicked', () => {
      render(<JobsEmptyState onQuickCreate={mockOnQuickCreate} />);
      
      fireEvent.click(screen.getByRole('button', { name: /Quick Create/i }));
      
      expect(mockOnQuickCreate).toHaveBeenCalledTimes(1);
    });

    it('should call onViewAssets when view assets is clicked', () => {
      render(
        <JobsEmptyState
          onQuickCreate={mockOnQuickCreate}
          onViewAssets={mockOnViewAssets}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /View your assets/i }));
      
      expect(mockOnViewAssets).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(<JobsEmptyState onQuickCreate={mockOnQuickCreate} />);
      
      expect(screen.getByRole('heading', { level: 2 })).toBeDefined();
    });

    it('should have accessible button with icon', () => {
      render(<JobsEmptyState onQuickCreate={mockOnQuickCreate} />);
      
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
        <JobsEmptyState
          onQuickCreate={mockOnQuickCreate}
          className="custom-class"
        />
      );
      
      const container = screen.getByTestId('jobs-empty-state');
      expect(container.className).toContain('custom-class');
    });
  });
});
