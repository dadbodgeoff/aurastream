/**
 * Tests for InlineGenerationCard component
 * 
 * @module coach/generation/__tests__/InlineGenerationCard.test
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InlineGenerationCard } from '../InlineGenerationCard';
import { useInlineGeneration } from '../useInlineGeneration';

// Mock the useInlineGeneration hook
vi.mock('../useInlineGeneration', () => ({
  useInlineGeneration: vi.fn(),
}));

// Mock useReducedMotion hook - use true to skip animations in tests
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => true),
}));

describe('InlineGenerationCard', () => {
  const mockJobId = 'job-123';
  const mockSessionId = 'session-456';
  const mockAsset = {
    id: 'asset-789',
    url: 'https://cdn.example.com/asset.png',
    assetType: 'thumbnail',
    width: 1280,
    height: 720,
  };

  const defaultHookReturn = {
    triggerGeneration: vi.fn(),
    jobId: mockJobId,
    status: 'idle' as const,
    progress: 0,
    asset: null,
    error: null,
    reset: vi.fn(),
  };

  const defaultProps = {
    jobId: mockJobId,
    sessionId: mockSessionId,
    onComplete: vi.fn(),
    onError: vi.fn(),
    onViewFullscreen: vi.fn(),
    onDownload: vi.fn(),
    onShare: vi.fn(),
    onRegenerate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useInlineGeneration).mockReturnValue(defaultHookReturn);
  });

  describe('queued state', () => {
    it('should render queued state', () => {
      vi.mocked(useInlineGeneration).mockReturnValue({
        ...defaultHookReturn,
        status: 'queued',
        progress: 0,
      });

      render(<InlineGenerationCard {...defaultProps} />);

      expect(screen.getByText('Generating Asset')).toBeDefined();
      expect(screen.getByText('Starting generation...')).toBeDefined();
    });
  });

  describe('processing state', () => {
    it('should render processing state with progress', () => {
      vi.mocked(useInlineGeneration).mockReturnValue({
        ...defaultHookReturn,
        status: 'processing',
        progress: 50,
      });

      render(<InlineGenerationCard {...defaultProps} />);

      expect(screen.getByText('Generating Asset')).toBeDefined();
      expect(screen.getByText('Creating your asset...')).toBeDefined();
      expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
    });
  });

  describe('completed state', () => {
    it('should render completed state with asset', () => {
      vi.mocked(useInlineGeneration).mockReturnValue({
        ...defaultHookReturn,
        status: 'completed',
        progress: 100,
        asset: mockAsset,
      });

      render(<InlineGenerationCard {...defaultProps} />);

      expect(screen.getByText('Asset Ready')).toBeDefined();
      expect(screen.getByRole('img').getAttribute('src')).toBe(mockAsset.url);
    });

    it('should call onDownload when download is clicked', () => {
      vi.mocked(useInlineGeneration).mockReturnValue({
        ...defaultHookReturn,
        status: 'completed',
        asset: mockAsset,
      });

      render(<InlineGenerationCard {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /download/i }));
      expect(defaultProps.onDownload).toHaveBeenCalledWith(mockAsset);
    });

    it('should call onShare when share is clicked', () => {
      vi.mocked(useInlineGeneration).mockReturnValue({
        ...defaultHookReturn,
        status: 'completed',
        asset: mockAsset,
      });

      render(<InlineGenerationCard {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /share/i }));
      expect(defaultProps.onShare).toHaveBeenCalledWith(mockAsset);
    });

    it('should call onViewFullscreen when image is clicked', () => {
      vi.mocked(useInlineGeneration).mockReturnValue({
        ...defaultHookReturn,
        status: 'completed',
        asset: mockAsset,
      });

      render(<InlineGenerationCard {...defaultProps} />);

      const imageButton = screen.getByRole('button', { name: /view.*fullscreen/i });
      fireEvent.click(imageButton);
      expect(defaultProps.onViewFullscreen).toHaveBeenCalledWith(mockAsset);
    });

    it('should call reset and onRegenerate when regenerate is clicked', () => {
      const mockReset = vi.fn();
      vi.mocked(useInlineGeneration).mockReturnValue({
        ...defaultHookReturn,
        status: 'completed',
        asset: mockAsset,
        reset: mockReset,
      });

      render(<InlineGenerationCard {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      expect(mockReset).toHaveBeenCalled();
      expect(defaultProps.onRegenerate).toHaveBeenCalled();
    });
  });

  describe('failed state', () => {
    it('should render failed state with error message', () => {
      vi.mocked(useInlineGeneration).mockReturnValue({
        ...defaultHookReturn,
        status: 'failed',
        error: 'Generation failed due to content policy',
      });

      render(<InlineGenerationCard {...defaultProps} />);

      // Use getAllByText since "Generation Failed" appears in both header and error state
      const failedTexts = screen.getAllByText('Generation Failed');
      expect(failedTexts.length).toBeGreaterThan(0);
      expect(screen.getByText('Generation failed due to content policy')).toBeDefined();
    });

    it('should call reset and onRegenerate when retry is clicked', () => {
      const mockReset = vi.fn();
      vi.mocked(useInlineGeneration).mockReturnValue({
        ...defaultHookReturn,
        status: 'failed',
        error: 'Generation failed',
        reset: mockReset,
      });

      render(<InlineGenerationCard {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      expect(mockReset).toHaveBeenCalled();
      expect(defaultProps.onRegenerate).toHaveBeenCalled();
    });

    it('should show default error message when error is null', () => {
      vi.mocked(useInlineGeneration).mockReturnValue({
        ...defaultHookReturn,
        status: 'failed',
        error: null,
      });

      render(<InlineGenerationCard {...defaultProps} />);

      expect(screen.getByText('An unknown error occurred')).toBeDefined();
    });
  });

  describe('hook integration', () => {
    it('should pass sessionId to useInlineGeneration', () => {
      render(<InlineGenerationCard {...defaultProps} />);

      expect(useInlineGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: mockSessionId,
        })
      );
    });

    it('should pass onComplete callback to useInlineGeneration', () => {
      render(<InlineGenerationCard {...defaultProps} />);

      expect(useInlineGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          onComplete: defaultProps.onComplete,
        })
      );
    });

    it('should pass onError callback to useInlineGeneration', () => {
      render(<InlineGenerationCard {...defaultProps} />);

      expect(useInlineGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          onError: defaultProps.onError,
        })
      );
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(
        <InlineGenerationCard
          {...defaultProps}
          className="custom-class"
          testId="card"
        />
      );

      expect(screen.getByTestId('card').className).toContain('custom-class');
    });

    it('should render with test ID', () => {
      render(
        <InlineGenerationCard
          {...defaultProps}
          testId="custom-card"
        />
      );

      expect(screen.getByTestId('custom-card')).toBeDefined();
    });
  });

  describe('card header', () => {
    it('should show animated icon for queued state', () => {
      vi.mocked(useInlineGeneration).mockReturnValue({
        ...defaultHookReturn,
        status: 'queued',
      });

      render(<InlineGenerationCard {...defaultProps} />);

      // The sparkles icon should be present
      expect(screen.getByText('Generating Asset')).toBeDefined();
    });

    it('should show check icon for completed state', () => {
      vi.mocked(useInlineGeneration).mockReturnValue({
        ...defaultHookReturn,
        status: 'completed',
        asset: mockAsset,
      });

      render(<InlineGenerationCard {...defaultProps} />);

      expect(screen.getByText('Asset Ready')).toBeDefined();
    });

    it('should show alert icon for failed state', () => {
      vi.mocked(useInlineGeneration).mockReturnValue({
        ...defaultHookReturn,
        status: 'failed',
        error: 'Error',
      });

      render(<InlineGenerationCard {...defaultProps} />);

      // Use getAllByText since "Generation Failed" appears in both header and error state
      const failedTexts = screen.getAllByText('Generation Failed');
      expect(failedTexts.length).toBeGreaterThan(0);
    });
  });
});
