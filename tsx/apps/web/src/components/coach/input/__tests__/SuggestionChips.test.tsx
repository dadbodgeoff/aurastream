/**
 * SuggestionChips Component Tests
 * 
 * Tests for the horizontal scrollable chip buttons component.
 * 
 * @module coach/input/__tests__/SuggestionChips.test
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestionChips } from '../SuggestionChips';
import type { Suggestion } from '../useSuggestionContext';

// Mock useReducedMotion hook
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

describe('SuggestionChips', () => {
  const defaultSuggestions: Suggestion[] = [
    { id: 'hype', label: 'Hype energy', action: 'I want hype energy' },
    { id: 'cozy', label: 'Cozy vibes', action: 'I want cozy vibes' },
    { id: 'minimalist', label: 'Minimalist', action: 'I want minimalist style' },
  ];

  const defaultProps = {
    suggestions: defaultSuggestions,
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all suggestion chips', () => {
      render(<SuggestionChips {...defaultProps} />);

      expect(screen.getByText('Hype energy')).toBeDefined();
      expect(screen.getByText('Cozy vibes')).toBeDefined();
      expect(screen.getByText('Minimalist')).toBeDefined();
    });

    it('should render correct number of chips', () => {
      render(<SuggestionChips {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });

    it('should not render when suggestions array is empty', () => {
      render(<SuggestionChips {...defaultProps} suggestions={[]} />);

      expect(screen.queryByRole('group')).toBeNull();
    });

    it('should render with custom testId', () => {
      render(<SuggestionChips {...defaultProps} testId="custom-chips" />);

      expect(screen.getByTestId('custom-chips')).toBeDefined();
    });

    it('should render individual chip testIds', () => {
      render(<SuggestionChips {...defaultProps} />);

      expect(screen.getByTestId('chip-hype')).toBeDefined();
      expect(screen.getByTestId('chip-cozy')).toBeDefined();
      expect(screen.getByTestId('chip-minimalist')).toBeDefined();
    });
  });

  describe('click functionality', () => {
    it('should call onSelect with action when chip is clicked', () => {
      const onSelect = vi.fn();
      render(<SuggestionChips {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByText('Hype energy'));

      expect(onSelect).toHaveBeenCalledWith('I want hype energy');
    });

    it('should call onSelect for each chip correctly', () => {
      const onSelect = vi.fn();
      render(<SuggestionChips {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByText('Cozy vibes'));
      expect(onSelect).toHaveBeenCalledWith('I want cozy vibes');

      fireEvent.click(screen.getByText('Minimalist'));
      expect(onSelect).toHaveBeenCalledWith('I want minimalist style');
    });

    it('should not call onSelect when disabled', () => {
      const onSelect = vi.fn();
      render(<SuggestionChips {...defaultProps} onSelect={onSelect} disabled />);

      fireEvent.click(screen.getByText('Hype energy'));

      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('keyboard navigation', () => {
    it('should trigger onSelect on Enter key', () => {
      const onSelect = vi.fn();
      render(<SuggestionChips {...defaultProps} onSelect={onSelect} />);

      const button = screen.getByText('Hype energy');
      fireEvent.keyDown(button, { key: 'Enter' });

      expect(onSelect).toHaveBeenCalledWith('I want hype energy');
    });

    it('should trigger onSelect on Space key', () => {
      const onSelect = vi.fn();
      render(<SuggestionChips {...defaultProps} onSelect={onSelect} />);

      const button = screen.getByText('Hype energy');
      fireEvent.keyDown(button, { key: ' ' });

      expect(onSelect).toHaveBeenCalledWith('I want hype energy');
    });

    it('should not trigger onSelect on Enter when disabled', () => {
      const onSelect = vi.fn();
      render(<SuggestionChips {...defaultProps} onSelect={onSelect} disabled />);

      const button = screen.getByText('Hype energy');
      fireEvent.keyDown(button, { key: 'Enter' });

      expect(onSelect).not.toHaveBeenCalled();
    });

    it('should have arrow key navigation handler on group', () => {
      render(<SuggestionChips {...defaultProps} />);

      const group = screen.getByRole('group');
      expect(group).toBeDefined();
    });

    it('should have focusable buttons', () => {
      render(<SuggestionChips {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button.getAttribute('tabindex')).not.toBe('-1');
      });
    });
  });

  describe('disabled state', () => {
    it('should apply disabled styles when disabled', async () => {
      // Disable animations for this test
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);

      render(<SuggestionChips {...defaultProps} disabled />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveProperty('disabled', true);
        expect(button.className).toContain('opacity-50');
        expect(button.className).toContain('cursor-not-allowed');
        expect(button.className).toContain('pointer-events-none');
      });
    });

    it('should not apply disabled styles when not disabled', () => {
      render(<SuggestionChips {...defaultProps} disabled={false} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveProperty('disabled', false);
      });
    });
  });

  describe('accessibility', () => {
    it('should have group role with aria-label', () => {
      render(<SuggestionChips {...defaultProps} />);

      const group = screen.getByRole('group', { name: 'Quick suggestions' });
      expect(group).toBeDefined();
    });

    it('should have aria-label on each chip', () => {
      render(<SuggestionChips {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button, index) => {
        expect(button.getAttribute('aria-label')).toBe(
          defaultSuggestions[index].label
        );
      });
    });

    it('should support custom className', () => {
      render(<SuggestionChips {...defaultProps} className="custom-class" />);

      const group = screen.getByRole('group');
      expect(group.className).toContain('custom-class');
    });
  });

  describe('styling', () => {
    it('should have horizontal scroll container styles', () => {
      render(<SuggestionChips {...defaultProps} />);

      const group = screen.getByRole('group');
      expect(group.className).toContain('overflow-x-auto');
      expect(group.className).toContain('flex');
    });

    it('should have chip styling classes', () => {
      render(<SuggestionChips {...defaultProps} />);

      const button = screen.getByText('Hype energy');
      expect(button.className).toContain('rounded-full');
      expect(button.className).toContain('px-3');
      expect(button.className).toContain('py-1.5');
    });

    it('should have hover styles on chips', () => {
      render(<SuggestionChips {...defaultProps} />);

      const button = screen.getByText('Hype energy');
      expect(button.className).toContain('hover:bg-white/20');
    });

    it('should have focus-visible styles on chips', () => {
      render(<SuggestionChips {...defaultProps} />);

      const button = screen.getByText('Hype energy');
      expect(button.className).toContain('focus-visible:ring-2');
    });
  });

  describe('reduced motion', () => {
    it('should not apply transition when reduced motion is preferred', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);

      render(<SuggestionChips {...defaultProps} />);

      const button = screen.getByText('Hype energy');
      expect(button.className).not.toContain('transition-all');
    });

    it('should apply transition classes when motion is allowed', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(false);

      render(<SuggestionChips {...defaultProps} />);

      const button = screen.getByText('Hype energy');
      expect(button.className).toContain('transition-all');
    });
  });

  describe('edge cases', () => {
    it('should handle single suggestion', () => {
      const singleSuggestion: Suggestion[] = [
        { id: 'only', label: 'Only option', action: 'Only action' },
      ];
      render(<SuggestionChips {...defaultProps} suggestions={singleSuggestion} />);

      expect(screen.getByText('Only option')).toBeDefined();
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    it('should handle many suggestions', () => {
      const manySuggestions: Suggestion[] = Array.from({ length: 10 }, (_, i) => ({
        id: `option-${i}`,
        label: `Option ${i}`,
        action: `Action ${i}`,
      }));
      render(<SuggestionChips {...defaultProps} suggestions={manySuggestions} />);

      expect(screen.getAllByRole('button')).toHaveLength(10);
    });

    it('should handle special characters in labels', () => {
      const specialSuggestions: Suggestion[] = [
        { id: 'special', label: 'Add "quotes" & <symbols>', action: 'Special action' },
      ];
      render(<SuggestionChips {...defaultProps} suggestions={specialSuggestions} />);

      expect(screen.getByText('Add "quotes" & <symbols>')).toBeDefined();
    });

    it('should handle long labels', () => {
      const longSuggestions: Suggestion[] = [
        {
          id: 'long',
          label: 'This is a very long suggestion label that might overflow',
          action: 'Long action',
        },
      ];
      render(<SuggestionChips {...defaultProps} suggestions={longSuggestions} />);

      expect(
        screen.getByText('This is a very long suggestion label that might overflow')
      ).toBeDefined();
    });
  });
});
