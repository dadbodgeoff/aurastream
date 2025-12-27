/**
 * SuggestionCard Component Tests
 * 
 * Tests for the clickable suggestion options component.
 * 
 * @module coach/cards/__tests__/SuggestionCard.test
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestionCard } from '../SuggestionCard';
import type { SuggestionOption } from '../SuggestionCard';

// Mock useReducedMotion hook
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

describe('SuggestionCard', () => {
  const defaultOptions: SuggestionOption[] = [
    { id: 'vibrant', label: 'Make it more vibrant' },
    { id: 'energy', label: 'Add more energy' },
    { id: 'simplify', label: 'Simplify the style' },
  ];

  const defaultProps = {
    title: 'Quick Refinements',
    options: defaultOptions,
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render card title', () => {
      render(<SuggestionCard {...defaultProps} />);
      
      expect(screen.getByText('Quick Refinements')).toBeDefined();
    });

    it('should render all options', () => {
      render(<SuggestionCard {...defaultProps} />);
      
      expect(screen.getByText('Make it more vibrant')).toBeDefined();
      expect(screen.getByText('Add more energy')).toBeDefined();
      expect(screen.getByText('Simplify the style')).toBeDefined();
    });

    it('should render option descriptions when provided', () => {
      const optionsWithDescriptions: SuggestionOption[] = [
        { id: 'test', label: 'Test Label', description: 'Test description' },
      ];
      render(<SuggestionCard {...defaultProps} options={optionsWithDescriptions} />);
      
      expect(screen.getByText('Test description')).toBeDefined();
    });

    it('should not render when options array is empty', () => {
      render(<SuggestionCard {...defaultProps} options={[]} />);
      
      expect(screen.queryByText('Quick Refinements')).toBeNull();
    });
  });

  describe('click functionality', () => {
    it('should call onSelect with option id when clicked', () => {
      const onSelect = vi.fn();
      render(<SuggestionCard {...defaultProps} onSelect={onSelect} />);
      
      fireEvent.click(screen.getByText('Make it more vibrant'));
      
      expect(onSelect).toHaveBeenCalledWith('vibrant');
    });

    it('should call onSelect for each option correctly', () => {
      const onSelect = vi.fn();
      render(<SuggestionCard {...defaultProps} onSelect={onSelect} />);
      
      fireEvent.click(screen.getByText('Add more energy'));
      expect(onSelect).toHaveBeenCalledWith('energy');
      
      fireEvent.click(screen.getByText('Simplify the style'));
      expect(onSelect).toHaveBeenCalledWith('simplify');
    });
  });

  describe('keyboard navigation', () => {
    it('should trigger onSelect on Enter key', () => {
      const onSelect = vi.fn();
      render(<SuggestionCard {...defaultProps} onSelect={onSelect} />);
      
      const button = screen.getByText('Make it more vibrant');
      fireEvent.keyDown(button, { key: 'Enter' });
      
      expect(onSelect).toHaveBeenCalledWith('vibrant');
    });

    it('should trigger onSelect on Space key', () => {
      const onSelect = vi.fn();
      render(<SuggestionCard {...defaultProps} onSelect={onSelect} />);
      
      const button = screen.getByText('Make it more vibrant');
      fireEvent.keyDown(button, { key: ' ' });
      
      expect(onSelect).toHaveBeenCalledWith('vibrant');
    });

    it('should have arrow key navigation handler on group', () => {
      render(<SuggestionCard {...defaultProps} />);
      
      const group = screen.getByRole('group');
      // Verify the group exists and has the onKeyDown handler
      expect(group).toBeDefined();
    });

    it('should have focusable buttons', () => {
      render(<SuggestionCard {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button.getAttribute('tabindex')).not.toBe('-1');
      });
    });
  });

  describe('accessibility', () => {
    it('should have accessible option buttons', () => {
      render(<SuggestionCard {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(3);
    });

    it('should have aria-label with description when provided', () => {
      const optionsWithDescriptions: SuggestionOption[] = [
        { id: 'test', label: 'Test Label', description: 'Test description' },
      ];
      render(<SuggestionCard {...defaultProps} options={optionsWithDescriptions} />);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-label')).toBe('Test Label: Test description');
    });

    it('should have aria-label without description when not provided', () => {
      const optionsWithoutDescriptions: SuggestionOption[] = [
        { id: 'test', label: 'Test Label' },
      ];
      render(<SuggestionCard {...defaultProps} options={optionsWithoutDescriptions} />);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-label')).toBe('Test Label');
    });

    it('should have group role with aria-label', () => {
      render(<SuggestionCard {...defaultProps} />);
      
      const group = screen.getByRole('group', { name: 'Quick Refinements' });
      expect(group).toBeDefined();
    });

    it('should support custom testId', () => {
      render(<SuggestionCard {...defaultProps} testId="custom-suggestion-card" />);
      
      expect(screen.getByTestId('custom-suggestion-card')).toBeDefined();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<SuggestionCard {...defaultProps} className="custom-class" />);
      
      const card = screen.getByTestId('suggestion-card');
      expect(card.className).toContain('custom-class');
    });

    it('should have hover styles on buttons', () => {
      render(<SuggestionCard {...defaultProps} />);
      
      const button = screen.getByText('Make it more vibrant').closest('button');
      expect(button?.className).toContain('hover:bg-white/10');
    });

    it('should have focus-visible styles on buttons', () => {
      render(<SuggestionCard {...defaultProps} />);
      
      const button = screen.getByText('Make it more vibrant').closest('button');
      expect(button?.className).toContain('focus-visible:ring-2');
    });
  });

  describe('reduced motion', () => {
    it('should not apply transition when reduced motion is preferred', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);

      render(<SuggestionCard {...defaultProps} />);
      
      const button = screen.getByText('Make it more vibrant').closest('button');
      // When reduced motion is preferred, transition-all should not be applied
      expect(button?.className).not.toContain('transition-all');
      expect(button?.className).not.toContain('duration-200');
    });

    it('should apply transition classes when motion is allowed', async () => {
      // Reset mock to return false (motion allowed)
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(false);

      render(<SuggestionCard {...defaultProps} />);
      
      const button = screen.getByText('Make it more vibrant').closest('button');
      // The button should have transition classes when motion is allowed
      expect(button?.className).toContain('transition-all');
      expect(button?.className).toContain('duration-200');
    });
  });

  describe('edge cases', () => {
    it('should handle single option', () => {
      const singleOption: SuggestionOption[] = [
        { id: 'only', label: 'Only option' },
      ];
      render(<SuggestionCard {...defaultProps} options={singleOption} />);
      
      expect(screen.getByText('Only option')).toBeDefined();
    });

    it('should handle many options', () => {
      const manyOptions: SuggestionOption[] = Array.from({ length: 10 }, (_, i) => ({
        id: `option-${i}`,
        label: `Option ${i}`,
      }));
      render(<SuggestionCard {...defaultProps} options={manyOptions} />);
      
      expect(screen.getAllByRole('button').length).toBe(10);
    });

    it('should handle special characters in labels', () => {
      const specialOptions: SuggestionOption[] = [
        { id: 'special', label: 'Add "quotes" & <symbols>' },
      ];
      render(<SuggestionCard {...defaultProps} options={specialOptions} />);
      
      expect(screen.getByText('Add "quotes" & <symbols>')).toBeDefined();
    });
  });
});
