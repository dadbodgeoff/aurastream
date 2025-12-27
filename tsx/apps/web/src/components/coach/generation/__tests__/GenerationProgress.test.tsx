/**
 * Tests for GenerationProgress component
 * 
 * @module coach/generation/__tests__/GenerationProgress.test
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GenerationProgress } from '../GenerationProgress';

// Mock useReducedMotion hook
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

import { useReducedMotion } from '@aurastream/shared';

describe('GenerationProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Use reduced motion by default to skip animations in tests
    vi.mocked(useReducedMotion).mockReturnValue(true);
  });

  describe('rendering', () => {
    it('should render with queued status', () => {
      render(<GenerationProgress status="queued" />);

      expect(screen.getByText('Starting generation...')).toBeDefined();
      expect(screen.getByRole('progressbar')).toBeDefined();
    });

    it('should render with processing status', () => {
      render(<GenerationProgress status="processing" progress={50} />);

      expect(screen.getByText('Creating your asset...')).toBeDefined();
      expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
    });

    it('should render custom status message', () => {
      render(
        <GenerationProgress
          status="processing"
          statusMessage="Generating your thumbnail..."
        />
      );

      expect(screen.getByText('Generating your thumbnail...')).toBeDefined();
    });

    it('should render with test ID', () => {
      render(
        <GenerationProgress
          status="queued"
          testId="custom-progress"
        />
      );

      expect(screen.getByTestId('custom-progress')).toBeDefined();
    });
  });

  describe('progress bar', () => {
    it('should display 0% progress initially', () => {
      render(<GenerationProgress status="queued" />);

      expect(screen.getByText('0%')).toBeDefined();
    });

    it('should display progress percentage', () => {
      render(<GenerationProgress status="processing" progress={75} />);

      expect(screen.getByText('75%')).toBeDefined();
    });

    it('should have correct ARIA attributes', () => {
      render(<GenerationProgress status="processing" progress={60} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar.getAttribute('aria-valuenow')).toBe('60');
      expect(progressbar.getAttribute('aria-valuemin')).toBe('0');
      expect(progressbar.getAttribute('aria-valuemax')).toBe('100');
      expect(progressbar.getAttribute('aria-label')).toBe('Generation progress: 60%');
    });
  });

  describe('accessibility', () => {
    it('should have status role', () => {
      render(<GenerationProgress status="queued" />);

      expect(screen.getByRole('status')).toBeDefined();
    });

    it('should have aria-live polite', () => {
      render(<GenerationProgress status="queued" />);

      expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
    });

    it('should have aria-busy true', () => {
      render(<GenerationProgress status="processing" />);

      expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
    });

    it('should have screen reader text for queued status', () => {
      render(<GenerationProgress status="queued" />);

      expect(
        screen.getByText('Generation queued, waiting to start')
      ).toBeDefined();
    });

    it('should have screen reader text for processing status', () => {
      render(<GenerationProgress status="processing" progress={45} />);

      expect(
        screen.getByText('Generation in progress, 45% complete')
      ).toBeDefined();
    });
  });

  describe('reduced motion', () => {
    it('should respect reduced motion preference', () => {
      vi.mocked(useReducedMotion).mockReturnValue(true);

      render(<GenerationProgress status="processing" progress={50} />);

      // Component should still render, just without animations
      expect(screen.getByRole('progressbar')).toBeDefined();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(
        <GenerationProgress
          status="queued"
          className="custom-class"
          testId="progress"
        />
      );

      expect(screen.getByTestId('progress').className).toContain('custom-class');
    });
  });
});
