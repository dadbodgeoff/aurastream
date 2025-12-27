/**
 * TurnsIndicator Component Tests
 * 
 * Tests for the turns remaining indicator component.
 * 
 * @module coach/context/__tests__/TurnsIndicator.test
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TurnsIndicator } from '../TurnsIndicator';

describe('TurnsIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with default testId', () => {
      render(<TurnsIndicator used={3} total={10} />);

      expect(screen.getByTestId('turns-indicator')).toBeDefined();
    });

    it('should render with custom testId', () => {
      render(<TurnsIndicator used={3} total={10} testId="custom-indicator" />);

      expect(screen.getByTestId('custom-indicator')).toBeDefined();
    });

    it('should display turns remaining text', () => {
      render(<TurnsIndicator used={3} total={10} />);

      expect(screen.getByText('7/10')).toBeDefined();
      expect(screen.getByText('turns left')).toBeDefined();
    });

    it('should display singular "turn left" when 1 remaining', () => {
      render(<TurnsIndicator used={9} total={10} />);

      expect(screen.getByText('1/10')).toBeDefined();
      expect(screen.getByText('turn left')).toBeDefined();
    });

    it('should apply custom className', () => {
      render(<TurnsIndicator used={3} total={10} className="custom-class" />);

      const indicator = screen.getByTestId('turns-indicator');
      expect(indicator.className).toContain('custom-class');
    });
  });

  describe('progress dots', () => {
    it('should render progress dots when total <= 10', () => {
      render(<TurnsIndicator used={3} total={10} />);

      const indicator = screen.getByTestId('turns-indicator');
      const dots = indicator.querySelectorAll('.rounded-full.w-2.h-2');
      expect(dots.length).toBe(10);
    });

    it('should not render dots when total > 10', () => {
      render(<TurnsIndicator used={3} total={15} />);

      const indicator = screen.getByTestId('turns-indicator');
      const dots = indicator.querySelectorAll('.rounded-full.w-2.h-2');
      expect(dots.length).toBe(0);
    });

    it('should not render dots in compact mode', () => {
      render(<TurnsIndicator used={3} total={10} compact />);

      const indicator = screen.getByTestId('turns-indicator');
      const dots = indicator.querySelectorAll('.rounded-full.w-2.h-2');
      expect(dots.length).toBe(0);
    });
  });

  describe('compact mode', () => {
    it('should not show "turns left" text in compact mode', () => {
      render(<TurnsIndicator used={3} total={10} compact />);

      expect(screen.getByText('7/10')).toBeDefined();
      expect(screen.queryByText('turns left')).toBeNull();
    });
  });

  describe('warning states', () => {
    it('should show normal state when >= 3 turns remaining', () => {
      render(<TurnsIndicator used={7} total={10} />);

      const indicator = screen.getByTestId('turns-indicator');
      expect(indicator.className).not.toContain('text-yellow-400');
      expect(indicator.className).not.toContain('text-red-400');
    });

    it('should show warning state when < 3 turns remaining', () => {
      render(<TurnsIndicator used={8} total={10} />);

      const indicator = screen.getByTestId('turns-indicator');
      const textElement = indicator.querySelector('.text-yellow-400');
      expect(textElement).toBeDefined();
    });

    it('should show critical state when 1 turn remaining', () => {
      render(<TurnsIndicator used={9} total={10} />);

      const indicator = screen.getByTestId('turns-indicator');
      const textElement = indicator.querySelector('.text-red-400');
      expect(textElement).toBeDefined();
    });

    it('should show exhausted state when 0 turns remaining', () => {
      render(<TurnsIndicator used={10} total={10} />);

      const indicator = screen.getByTestId('turns-indicator');
      const textElement = indicator.querySelector('.text-red-400');
      expect(textElement).toBeDefined();
    });

    it('should show warning icon when turns are low', () => {
      render(<TurnsIndicator used={8} total={10} />);

      const indicator = screen.getByTestId('turns-indicator');
      const warningIcon = indicator.querySelector('svg');
      expect(warningIcon).toBeDefined();
    });

    it('should not show warning icon when turns are not low', () => {
      render(<TurnsIndicator used={5} total={10} />);

      const indicator = screen.getByTestId('turns-indicator');
      // Only the dots should be present, no warning icon
      const svgs = indicator.querySelectorAll('svg');
      expect(svgs.length).toBe(0);
    });
  });

  describe('accessibility', () => {
    it('should have progressbar role', () => {
      render(<TurnsIndicator used={3} total={10} />);

      const indicator = screen.getByRole('progressbar');
      expect(indicator).toBeDefined();
    });

    it('should have correct aria-valuenow', () => {
      render(<TurnsIndicator used={3} total={10} />);

      const indicator = screen.getByRole('progressbar');
      expect(indicator.getAttribute('aria-valuenow')).toBe('7');
    });

    it('should have correct aria-valuemin', () => {
      render(<TurnsIndicator used={3} total={10} />);

      const indicator = screen.getByRole('progressbar');
      expect(indicator.getAttribute('aria-valuemin')).toBe('0');
    });

    it('should have correct aria-valuemax', () => {
      render(<TurnsIndicator used={3} total={10} />);

      const indicator = screen.getByRole('progressbar');
      expect(indicator.getAttribute('aria-valuemax')).toBe('10');
    });

    it('should have descriptive aria-label', () => {
      render(<TurnsIndicator used={3} total={10} />);

      const indicator = screen.getByRole('progressbar');
      expect(indicator.getAttribute('aria-label')).toContain('7 of 10 turns remaining');
    });

    it('should include warning in aria-label when low', () => {
      render(<TurnsIndicator used={8} total={10} />);

      const indicator = screen.getByRole('progressbar');
      expect(indicator.getAttribute('aria-label')).toContain('running low');
    });

    it('should include critical in aria-label when critical', () => {
      render(<TurnsIndicator used={9} total={10} />);

      const indicator = screen.getByRole('progressbar');
      expect(indicator.getAttribute('aria-label')).toContain('critical');
    });

    it('should include exhausted in aria-label when 0 remaining', () => {
      render(<TurnsIndicator used={10} total={10} />);

      const indicator = screen.getByRole('progressbar');
      expect(indicator.getAttribute('aria-label')).toContain('exhausted');
    });

    it('should have aria-hidden on dots', () => {
      render(<TurnsIndicator used={3} total={10} />);

      const indicator = screen.getByTestId('turns-indicator');
      const dotsContainer = indicator.querySelector('[aria-hidden="true"]');
      expect(dotsContainer).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle 0 used turns', () => {
      render(<TurnsIndicator used={0} total={10} />);

      expect(screen.getByText('10/10')).toBeDefined();
    });

    it('should handle all turns used', () => {
      render(<TurnsIndicator used={10} total={10} />);

      expect(screen.getByText('0/10')).toBeDefined();
    });

    it('should handle used > total gracefully', () => {
      render(<TurnsIndicator used={15} total={10} />);

      expect(screen.getByText('0/10')).toBeDefined();
    });

    it('should handle small total values', () => {
      render(<TurnsIndicator used={1} total={3} />);

      expect(screen.getByText('2/3')).toBeDefined();
    });
  });

  describe('styling', () => {
    it('should have flex layout', () => {
      render(<TurnsIndicator used={3} total={10} />);

      const indicator = screen.getByTestId('turns-indicator');
      expect(indicator.className).toContain('flex');
      expect(indicator.className).toContain('items-center');
    });

    it('should have tabular-nums for consistent number width', () => {
      render(<TurnsIndicator used={3} total={10} />);

      const indicator = screen.getByTestId('turns-indicator');
      const textElement = indicator.querySelector('.tabular-nums');
      expect(textElement).toBeDefined();
    });
  });
});
