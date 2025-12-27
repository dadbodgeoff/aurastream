/**
 * Tests for GenerationResult component
 * 
 * @module coach/generation/__tests__/GenerationResult.test
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GenerationResult } from '../GenerationResult';
import type { Asset } from '../useInlineGeneration';

// Mock useReducedMotion hook
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

import { useReducedMotion } from '@aurastream/shared';

describe('GenerationResult', () => {
  const mockAsset: Asset = {
    id: 'asset-123',
    url: 'https://cdn.example.com/asset.png',
    assetType: 'thumbnail',
    width: 1280,
    height: 720,
  };

  const defaultProps = {
    asset: mockAsset,
    onDownload: vi.fn(),
    onShare: vi.fn(),
    onRegenerate: vi.fn(),
    onViewFullscreen: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useReducedMotion).mockReturnValue(false);
  });

  describe('rendering', () => {
    it('should render the asset image', () => {
      render(<GenerationResult {...defaultProps} />);

      const image = screen.getByRole('img');
      expect(image.getAttribute('src')).toBe(mockAsset.url);
      expect(image.getAttribute('alt')).toBe('Generated thumbnail');
    });

    it('should render action buttons', () => {
      render(<GenerationResult {...defaultProps} />);

      expect(screen.getByRole('button', { name: /download/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /share/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /regenerate/i })).toBeDefined();
    });

    it('should render with test ID', () => {
      render(<GenerationResult {...defaultProps} testId="custom-result" />);

      expect(screen.getByTestId('custom-result')).toBeDefined();
    });
  });

  describe('interactions', () => {
    it('should call onDownload when download button is clicked', () => {
      render(<GenerationResult {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /download/i }));
      expect(defaultProps.onDownload).toHaveBeenCalledTimes(1);
    });

    it('should call onShare when share button is clicked', () => {
      render(<GenerationResult {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /share/i }));
      expect(defaultProps.onShare).toHaveBeenCalledTimes(1);
    });

    it('should call onRegenerate when regenerate button is clicked', () => {
      render(<GenerationResult {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      expect(defaultProps.onRegenerate).toHaveBeenCalledTimes(1);
    });

    it('should call onViewFullscreen when image is clicked', () => {
      render(<GenerationResult {...defaultProps} />);

      const imageButton = screen.getByRole('button', { name: /view.*fullscreen/i });
      fireEvent.click(imageButton);
      expect(defaultProps.onViewFullscreen).toHaveBeenCalledTimes(1);
    });

    it('should call onViewFullscreen on Enter key', () => {
      render(<GenerationResult {...defaultProps} />);

      const imageButton = screen.getByRole('button', { name: /view.*fullscreen/i });
      fireEvent.keyDown(imageButton, { key: 'Enter' });
      expect(defaultProps.onViewFullscreen).toHaveBeenCalledTimes(1);
    });

    it('should call onViewFullscreen on Space key', () => {
      render(<GenerationResult {...defaultProps} />);

      const imageButton = screen.getByRole('button', { name: /view.*fullscreen/i });
      fireEvent.keyDown(imageButton, { key: ' ' });
      expect(defaultProps.onViewFullscreen).toHaveBeenCalledTimes(1);
    });
  });

  describe('hover state', () => {
    it('should show overlay on hover', () => {
      render(<GenerationResult {...defaultProps} />);

      const imageButton = screen.getByRole('button', { name: /view.*fullscreen/i });
      
      fireEvent.mouseEnter(imageButton);
      expect(screen.getByText('View Full')).toBeDefined();
    });
  });

  describe('image loading', () => {
    it('should handle image load', () => {
      render(<GenerationResult {...defaultProps} />);

      const image = screen.getByRole('img');
      fireEvent.load(image);

      // Image should be visible after load
      expect(image).toBeDefined();
    });

    it('should handle image error', () => {
      render(<GenerationResult {...defaultProps} />);

      const image = screen.getByRole('img');
      fireEvent.error(image);

      expect(screen.getByText('Failed to load image')).toBeDefined();
    });
  });

  describe('aspect ratio', () => {
    it('should use aspect-video for landscape images', () => {
      render(<GenerationResult {...defaultProps} />);

      const imageContainer = screen.getByRole('button', { name: /view.*fullscreen/i });
      expect(imageContainer.className).toContain('aspect-video');
    });

    it('should use aspect-square for square images', () => {
      const squareAsset: Asset = {
        ...mockAsset,
        width: 1080,
        height: 1080,
      };

      render(<GenerationResult {...defaultProps} asset={squareAsset} />);

      const imageContainer = screen.getByRole('button', { name: /view.*fullscreen/i });
      expect(imageContainer.className).toContain('aspect-square');
    });
  });

  describe('accessibility', () => {
    it('should have accessible image alt text', () => {
      render(<GenerationResult {...defaultProps} />);

      const image = screen.getByRole('img');
      expect(image.getAttribute('alt')).toBe('Generated thumbnail');
    });

    it('should have accessible button labels', () => {
      render(<GenerationResult {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Download' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Share' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Regenerate' })).toBeDefined();
    });

    it('should have screen reader announcement', () => {
      render(<GenerationResult {...defaultProps} />);

      expect(
        screen.getByText(/Asset generated successfully.*thumbnail.*1280x720/i)
      ).toBeDefined();
    });

    it('should be keyboard focusable', () => {
      render(<GenerationResult {...defaultProps} />);

      const imageButton = screen.getByRole('button', { name: /view.*fullscreen/i });
      expect(imageButton.getAttribute('tabIndex')).toBe('0');
    });
  });

  describe('reduced motion', () => {
    it('should respect reduced motion preference', () => {
      vi.mocked(useReducedMotion).mockReturnValue(true);

      render(<GenerationResult {...defaultProps} />);

      // Component should still render and be functional
      expect(screen.getByRole('img')).toBeDefined();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(
        <GenerationResult
          {...defaultProps}
          className="custom-class"
          testId="result"
        />
      );

      expect(screen.getByTestId('result').className).toContain('custom-class');
    });
  });
});
