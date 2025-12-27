/**
 * ThinkingIndicator Component Tests
 * 
 * Tests for the animated thinking indicator component.
 * 
 * @module coach/streaming/__tests__/ThinkingIndicator.test
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThinkingIndicator } from '../ThinkingIndicator';
import type { ThinkingStage } from '../ThinkingIndicator';

// Mock useReducedMotion hook
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

describe('ThinkingIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('stage messages', () => {
    const stageMessages: Record<ThinkingStage, string> = {
      thinking: 'Coach is thinking...',
      analyzing: 'Analyzing your brand context...',
      crafting: 'Crafting your prompt...',
      validating: 'Validating quality...',
    };

    it.each(Object.entries(stageMessages))(
      'should display correct message for %s stage',
      (stage, expectedMessage) => {
        render(<ThinkingIndicator stage={stage as ThinkingStage} />);
        
        expect(screen.getByText(expectedMessage)).toBeDefined();
      }
    );

    it('should have correct aria-label for accessibility', () => {
      render(<ThinkingIndicator stage="thinking" />);
      
      const indicator = screen.getByRole('status');
      expect(indicator.getAttribute('aria-label')).toBe('Coach is thinking...');
    });
  });

  describe('animation', () => {
    it('should render three bouncing dots', () => {
      render(<ThinkingIndicator stage="thinking" />);
      
      // Find the dots container
      const indicator = screen.getByTestId('thinking-indicator');
      const dots = indicator.querySelectorAll('.rounded-full');
      
      expect(dots.length).toBe(3);
    });

    it('should apply animate-bounce class when motion is allowed', () => {
      render(<ThinkingIndicator stage="thinking" />);
      
      const indicator = screen.getByTestId('thinking-indicator');
      const dots = indicator.querySelectorAll('.rounded-full');
      
      dots.forEach((dot) => {
        expect(dot.className).toContain('animate-bounce');
      });
    });

    it('should apply staggered animation delays', () => {
      render(<ThinkingIndicator stage="thinking" />);
      
      const indicator = screen.getByTestId('thinking-indicator');
      const dots = indicator.querySelectorAll('.rounded-full');
      
      expect((dots[0] as HTMLElement).style.animationDelay).toBe('0ms');
      expect((dots[1] as HTMLElement).style.animationDelay).toBe('150ms');
      expect((dots[2] as HTMLElement).style.animationDelay).toBe('300ms');
    });
  });

  describe('reduced motion support', () => {
    it('should not apply animate-bounce when reduced motion is preferred', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);

      render(<ThinkingIndicator stage="thinking" />);
      
      const indicator = screen.getByTestId('thinking-indicator');
      const dots = indicator.querySelectorAll('.rounded-full');
      
      dots.forEach((dot) => {
        expect(dot.className).not.toContain('animate-bounce');
      });
    });

    it('should not apply animation delays when reduced motion is preferred', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);

      render(<ThinkingIndicator stage="thinking" />);
      
      const indicator = screen.getByTestId('thinking-indicator');
      const dots = indicator.querySelectorAll('.rounded-full');
      
      dots.forEach((dot) => {
        expect((dot as HTMLElement).style.animationDelay).toBe('');
      });
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<ThinkingIndicator stage="thinking" className="custom-class" />);
      
      const indicator = screen.getByTestId('thinking-indicator');
      expect(indicator.className).toContain('custom-class');
    });

    it('should have correct base styling', () => {
      render(<ThinkingIndicator stage="thinking" />);
      
      const indicator = screen.getByTestId('thinking-indicator');
      expect(indicator.className).toContain('flex');
      expect(indicator.className).toContain('items-center');
      expect(indicator.className).toContain('gap-3');
    });

    it('should use correct color tokens for dots', () => {
      render(<ThinkingIndicator stage="thinking" />);
      
      const indicator = screen.getByTestId('thinking-indicator');
      const dots = indicator.querySelectorAll('.rounded-full');
      
      dots.forEach((dot) => {
        expect(dot.className).toContain('bg-interactive-500');
      });
    });
  });

  describe('accessibility', () => {
    it('should have role="status"', () => {
      render(<ThinkingIndicator stage="thinking" />);
      
      expect(screen.getByRole('status')).toBeDefined();
    });

    it('should have aria-live="polite"', () => {
      render(<ThinkingIndicator stage="thinking" />);
      
      const indicator = screen.getByRole('status');
      expect(indicator.getAttribute('aria-live')).toBe('polite');
    });

    it('should support custom testId', () => {
      render(<ThinkingIndicator stage="thinking" testId="custom-test-id" />);
      
      expect(screen.getByTestId('custom-test-id')).toBeDefined();
    });
  });
});
