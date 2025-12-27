/**
 * SearchEmptyState Component Tests
 * 
 * Tests for the search results empty state component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchEmptyState } from '../SearchEmptyState';

// Mock the useReducedMotion hook
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

// ============================================================================
// Tests
// ============================================================================

describe('SearchEmptyState', () => {
  const mockOnClearSearch = vi.fn();
  const mockOnCreateNew = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Rendering
  // ==========================================================================

  describe('rendering', () => {
    it('should render with correct title', () => {
      render(<SearchEmptyState onClearSearch={mockOnClearSearch} />);
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading.textContent).toBe('No results found');
    });

    it('should render the NoResults illustration', () => {
      render(<SearchEmptyState onClearSearch={mockOnClearSearch} />);
      
      const container = screen.getByTestId('search-empty-state');
      expect(container.querySelector('svg')).toBeDefined();
    });

    it('should render Clear search button', () => {
      render(<SearchEmptyState onClearSearch={mockOnClearSearch} />);
      
      expect(screen.getByRole('button', { name: /Clear search/i })).toBeDefined();
    });

    it('should render create new link when provided', () => {
      render(
        <SearchEmptyState
          onClearSearch={mockOnClearSearch}
          onCreateNew={mockOnCreateNew}
        />
      );
      
      expect(screen.getByRole('button', { name: /Create something new/i })).toBeDefined();
    });

    it('should not render create new link when not provided', () => {
      render(<SearchEmptyState onClearSearch={mockOnClearSearch} />);
      
      expect(screen.queryByRole('button', { name: /Create something new/i })).toBeNull();
    });
  });

  // ==========================================================================
  // Query-Based Messaging
  // ==========================================================================

  describe('query-based messaging', () => {
    it('should show generic message when no query provided', () => {
      render(<SearchEmptyState onClearSearch={mockOnClearSearch} />);
      
      expect(screen.getByText(/No results found. Try adjusting your filters/i)).toBeDefined();
    });

    it('should show query-specific message when query provided', () => {
      render(<SearchEmptyState query="purple emote" onClearSearch={mockOnClearSearch} />);
      
      expect(screen.getByText(/couldn't find anything matching "purple emote"/i)).toBeDefined();
    });

    it('should show generic message for empty string query', () => {
      render(<SearchEmptyState query="" onClearSearch={mockOnClearSearch} />);
      
      expect(screen.getByText(/No results found. Try adjusting your filters/i)).toBeDefined();
    });

    it('should show generic message for whitespace-only query', () => {
      render(<SearchEmptyState query="   " onClearSearch={mockOnClearSearch} />);
      
      expect(screen.getByText(/No results found. Try adjusting your filters/i)).toBeDefined();
    });
  });

  // ==========================================================================
  // Actions
  // ==========================================================================

  describe('actions', () => {
    it('should call onClearSearch when Clear search is clicked', () => {
      render(<SearchEmptyState onClearSearch={mockOnClearSearch} />);
      
      fireEvent.click(screen.getByRole('button', { name: /Clear search/i }));
      
      expect(mockOnClearSearch).toHaveBeenCalledTimes(1);
    });

    it('should call onCreateNew when create new is clicked', () => {
      render(
        <SearchEmptyState
          onClearSearch={mockOnClearSearch}
          onCreateNew={mockOnCreateNew}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /Create something new/i }));
      
      expect(mockOnCreateNew).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(<SearchEmptyState onClearSearch={mockOnClearSearch} />);
      
      expect(screen.getByRole('heading', { level: 2 })).toBeDefined();
    });

    it('should have accessible button with icon', () => {
      render(<SearchEmptyState onClearSearch={mockOnClearSearch} />);
      
      const button = screen.getByRole('button', { name: /Clear search/i });
      expect(button.textContent).toContain('Clear search');
    });
  });

  // ==========================================================================
  // Custom Styling
  // ==========================================================================

  describe('custom styling', () => {
    it('should apply custom className', () => {
      render(
        <SearchEmptyState
          onClearSearch={mockOnClearSearch}
          className="custom-class"
        />
      );
      
      const container = screen.getByTestId('search-empty-state');
      expect(container.className).toContain('custom-class');
    });
  });
});
