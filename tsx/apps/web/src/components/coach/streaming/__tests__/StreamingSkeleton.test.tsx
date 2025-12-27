/**
 * StreamingSkeleton Component Tests
 * 
 * Tests for the content-aware skeleton loader component.
 * 
 * @module coach/streaming/__tests__/StreamingSkeleton.test
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreamingSkeleton } from '../StreamingSkeleton';
import type { SkeletonContentType } from '../StreamingSkeleton';

// Mock useReducedMotion hook
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

describe('StreamingSkeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('text skeleton layout', () => {
    it('should render 4 lines for text type', () => {
      render(<StreamingSkeleton expectedType="text" />);
      
      const skeleton = screen.getByTestId('streaming-skeleton');
      const lines = skeleton.querySelectorAll('.h-3.rounded-md');
      
      expect(lines.length).toBe(4);
    });

    it('should have varying widths for text lines', () => {
      render(<StreamingSkeleton expectedType="text" />);
      
      const skeleton = screen.getByTestId('streaming-skeleton');
      const lines = skeleton.querySelectorAll('.h-3.rounded-md');
      
      expect(lines[0].className).toContain('w-full');
      expect(lines[1].className).toContain('w-[85%]');
      expect(lines[2].className).toContain('w-[70%]');
      expect(lines[3].className).toContain('w-[50%]');
    });
  });

  describe('prompt_card skeleton layout', () => {
    it('should render card structure with header, body, and footer', () => {
      render(<StreamingSkeleton expectedType="prompt_card" />);
      
      const skeleton = screen.getByTestId('streaming-skeleton');
      
      // Check for card container
      const card = skeleton.querySelector('.rounded-xl');
      expect(card).toBeDefined();
      
      // Check for header elements
      const headerIcon = skeleton.querySelector('.w-6.h-6');
      expect(headerIcon).toBeDefined();
      
      // Check for body lines
      const bodyLines = skeleton.querySelectorAll('.h-3.rounded-md');
      expect(bodyLines.length).toBeGreaterThanOrEqual(4);
      
      // Check for footer buttons
      const footerButtons = skeleton.querySelectorAll('.h-8.w-20');
      expect(footerButtons.length).toBe(2);
    });

    it('should have border styling for card', () => {
      render(<StreamingSkeleton expectedType="prompt_card" />);
      
      const skeleton = screen.getByTestId('streaming-skeleton');
      const card = skeleton.querySelector('.border-border-subtle');
      
      expect(card).toBeDefined();
    });
  });

  describe('validation skeleton layout', () => {
    it('should render validation list structure', () => {
      render(<StreamingSkeleton expectedType="validation" />);
      
      const skeleton = screen.getByTestId('streaming-skeleton');
      
      // Check for header with icon
      const headerIcon = skeleton.querySelector('.w-5.h-5.rounded-full');
      expect(headerIcon).toBeDefined();
      
      // Check for validation items (3 items)
      const itemIcons = skeleton.querySelectorAll('.w-4.h-4.rounded-full');
      expect(itemIcons.length).toBe(3);
      
      // Check for score indicator
      const scoreBar = skeleton.querySelector('.h-2.w-32.rounded-full');
      expect(scoreBar).toBeDefined();
    });

    it('should have icon placeholders for each validation item', () => {
      render(<StreamingSkeleton expectedType="validation" />);
      
      const skeleton = screen.getByTestId('streaming-skeleton');
      const items = skeleton.querySelectorAll('.flex.items-center.gap-3');
      
      expect(items.length).toBe(3);
    });
  });

  describe('shimmer animation', () => {
    it('should apply skeleton-shimmer class when motion is allowed', () => {
      render(<StreamingSkeleton expectedType="text" />);
      
      const skeleton = screen.getByTestId('streaming-skeleton');
      const shimmerElements = skeleton.querySelectorAll('.skeleton-shimmer');
      
      expect(shimmerElements.length).toBeGreaterThan(0);
    });

    it('should not apply skeleton-shimmer when reduced motion is preferred', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);

      render(<StreamingSkeleton expectedType="text" />);
      
      const skeleton = screen.getByTestId('streaming-skeleton');
      const shimmerElements = skeleton.querySelectorAll('.skeleton-shimmer');
      
      expect(shimmerElements.length).toBe(0);
    });
  });

  describe('accessibility', () => {
    it('should have role="status"', () => {
      render(<StreamingSkeleton expectedType="text" />);
      
      expect(screen.getByRole('status')).toBeDefined();
    });

    it('should have aria-label for loading state', () => {
      render(<StreamingSkeleton expectedType="text" />);
      
      const skeleton = screen.getByRole('status');
      expect(skeleton.getAttribute('aria-label')).toBe('Loading content...');
    });

    it('should have screen reader text', () => {
      render(<StreamingSkeleton expectedType="text" />);
      
      const srText = screen.getByText('Loading content...');
      expect(srText.className).toContain('sr-only');
    });

    it('should hide skeleton elements from screen readers', () => {
      render(<StreamingSkeleton expectedType="text" />);
      
      const skeleton = screen.getByTestId('streaming-skeleton');
      const hiddenElements = skeleton.querySelectorAll('[aria-hidden="true"]');
      
      expect(hiddenElements.length).toBeGreaterThan(0);
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<StreamingSkeleton expectedType="text" className="custom-class" />);
      
      const skeleton = screen.getByTestId('streaming-skeleton');
      expect(skeleton.className).toContain('custom-class');
    });

    it('should have full width by default', () => {
      render(<StreamingSkeleton expectedType="text" />);
      
      const skeleton = screen.getByTestId('streaming-skeleton');
      expect(skeleton.className).toContain('w-full');
    });

    it('should support custom testId', () => {
      render(<StreamingSkeleton expectedType="text" testId="custom-test-id" />);
      
      expect(screen.getByTestId('custom-test-id')).toBeDefined();
    });
  });

  describe('type handling', () => {
    it.each(['text', 'prompt_card', 'validation'] as SkeletonContentType[])(
      'should render correctly for %s type',
      (type) => {
        render(<StreamingSkeleton expectedType={type} />);
        
        expect(screen.getByTestId('streaming-skeleton')).toBeDefined();
      }
    );

    it('should default to text skeleton for unknown type', () => {
      // @ts-expect-error - Testing invalid type handling
      render(<StreamingSkeleton expectedType="unknown" />);
      
      const skeleton = screen.getByTestId('streaming-skeleton');
      const lines = skeleton.querySelectorAll('.h-3.rounded-md');
      
      // Should render text skeleton (4 lines)
      expect(lines.length).toBe(4);
    });
  });
});
