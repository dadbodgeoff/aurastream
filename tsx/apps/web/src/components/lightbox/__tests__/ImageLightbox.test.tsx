/**
 * ImageLightbox Component Tests
 *
 * Comprehensive tests for the image lightbox component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageLightbox } from '../ImageLightbox';
import { useLightboxStore, type LightboxImage } from '@aurastream/shared';

// ============================================================================
// Mocks
// ============================================================================

// Mock the hooks
vi.mock('@/hooks', () => ({
  useScrollLock: vi.fn(),
  useFocusTrap: vi.fn(),
}));

// Mock react-zoom-pan-pinch
vi.mock('react-zoom-pan-pinch', () => ({
  TransformWrapper: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="transform-wrapper">{children}</div>
  ),
  TransformComponent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="transform-component">{children}</div>
  ),
}));

// ============================================================================
// Test Data
// ============================================================================

const mockImage1: LightboxImage = {
  src: 'https://example.com/image1.png',
  alt: 'Test image 1',
  assetId: 'asset-1',
  assetType: 'twitch_emote',
  width: 112,
  height: 112,
};

const mockImage2: LightboxImage = {
  src: 'https://example.com/image2.png',
  alt: 'Test image 2',
  assetId: 'asset-2',
  assetType: 'youtube_thumbnail',
};

const mockImage3: LightboxImage = {
  src: 'https://example.com/image3.png',
  alt: 'Test image 3',
  assetId: 'asset-3',
};

const mockGallery: LightboxImage[] = [mockImage1, mockImage2, mockImage3];

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Reset the lightbox store to initial state
 */
function resetStore(): void {
  useLightboxStore.setState({
    isOpen: false,
    currentImage: null,
    gallery: [],
    currentIndex: 0,
  });
}

/**
 * Open the lightbox with an image
 */
function openLightbox(image: LightboxImage, gallery?: LightboxImage[]): void {
  useLightboxStore.getState().open(image, gallery);
}

// ============================================================================
// Tests
// ============================================================================

describe('ImageLightbox', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetStore();
  });

  // ==========================================================================
  // Rendering
  // ==========================================================================

  describe('rendering', () => {
    it('should not render when closed', () => {
      render(<ImageLightbox />);

      expect(screen.queryByTestId('image-lightbox')).toBeNull();
    });

    it('should render when open', () => {
      openLightbox(mockImage1);

      render(<ImageLightbox />);

      expect(screen.getByTestId('image-lightbox')).toBeDefined();
    });

    it('should render the image', () => {
      openLightbox(mockImage1);

      render(<ImageLightbox />);

      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toBe(mockImage1.src);
      expect(img.getAttribute('alt')).toBe(mockImage1.alt);
    });

    it('should render close button', () => {
      openLightbox(mockImage1);

      render(<ImageLightbox />);

      expect(screen.getByLabelText('Close lightbox')).toBeDefined();
    });

    it('should render controls', () => {
      openLightbox(mockImage1);

      render(<ImageLightbox />);

      expect(screen.getByTestId('lightbox-controls')).toBeDefined();
    });

    it('should apply custom testId', () => {
      openLightbox(mockImage1);

      render(<ImageLightbox testId="custom-lightbox" />);

      expect(screen.getByTestId('custom-lightbox')).toBeDefined();
    });
  });

  // ==========================================================================
  // Gallery Navigation
  // ==========================================================================

  describe('gallery navigation', () => {
    it('should show navigation buttons for gallery', () => {
      openLightbox(mockImage1, mockGallery);

      render(<ImageLightbox />);

      expect(screen.getByLabelText('Previous image')).toBeDefined();
      expect(screen.getByLabelText('Next image')).toBeDefined();
    });

    it('should not show navigation buttons for single image', () => {
      openLightbox(mockImage1);

      render(<ImageLightbox />);

      expect(screen.queryByLabelText('Previous image')).toBeNull();
      expect(screen.queryByLabelText('Next image')).toBeNull();
    });

    it('should show gallery indicator', () => {
      openLightbox(mockImage1, mockGallery);

      render(<ImageLightbox />);

      expect(screen.getByText('1 / 3')).toBeDefined();
    });

    it('should navigate to next image on button click', () => {
      openLightbox(mockImage1, mockGallery);

      render(<ImageLightbox />);

      fireEvent.click(screen.getByLabelText('Next image'));

      expect(screen.getByText('2 / 3')).toBeDefined();
    });

    it('should navigate to previous image on button click', () => {
      openLightbox(mockImage2, mockGallery);

      render(<ImageLightbox />);

      fireEvent.click(screen.getByLabelText('Previous image'));

      expect(screen.getByText('1 / 3')).toBeDefined();
    });
  });

  // ==========================================================================
  // Keyboard Navigation
  // ==========================================================================

  describe('keyboard navigation', () => {
    it('should close on Escape key', () => {
      openLightbox(mockImage1);

      render(<ImageLightbox />);

      expect(screen.getByTestId('image-lightbox')).toBeDefined();

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByTestId('image-lightbox')).toBeNull();
    });

    it('should navigate to next image on ArrowRight', () => {
      openLightbox(mockImage1, mockGallery);

      render(<ImageLightbox />);

      expect(screen.getByText('1 / 3')).toBeDefined();

      fireEvent.keyDown(document, { key: 'ArrowRight' });

      expect(screen.getByText('2 / 3')).toBeDefined();
    });

    it('should navigate to previous image on ArrowLeft', () => {
      openLightbox(mockImage2, mockGallery);

      render(<ImageLightbox />);

      expect(screen.getByText('2 / 3')).toBeDefined();

      fireEvent.keyDown(document, { key: 'ArrowLeft' });

      expect(screen.getByText('1 / 3')).toBeDefined();
    });

    it('should not navigate on arrow keys for single image', () => {
      openLightbox(mockImage1);

      render(<ImageLightbox />);

      // Should not throw or cause issues
      fireEvent.keyDown(document, { key: 'ArrowRight' });
      fireEvent.keyDown(document, { key: 'ArrowLeft' });

      expect(screen.getByTestId('image-lightbox')).toBeDefined();
    });
  });

  // ==========================================================================
  // Close Behavior
  // ==========================================================================

  describe('close behavior', () => {
    it('should close on close button click', () => {
      openLightbox(mockImage1);

      render(<ImageLightbox />);

      fireEvent.click(screen.getByLabelText('Close lightbox'));

      expect(screen.queryByTestId('image-lightbox')).toBeNull();
    });

    it('should close on backdrop click', () => {
      openLightbox(mockImage1);

      render(<ImageLightbox />);

      // Click on the overlay (backdrop)
      fireEvent.click(screen.getByTestId('image-lightbox'));

      expect(screen.queryByTestId('image-lightbox')).toBeNull();
    });
  });

  // ==========================================================================
  // Action Callbacks
  // ==========================================================================

  describe('action callbacks', () => {
    it('should call onDownload with assetId', () => {
      const onDownload = vi.fn();
      openLightbox(mockImage1);

      render(<ImageLightbox onDownload={onDownload} />);

      fireEvent.click(screen.getByTitle('Download image'));

      expect(onDownload).toHaveBeenCalledWith('asset-1');
    });

    it('should call onShare with assetId', () => {
      const onShare = vi.fn();
      openLightbox(mockImage1);

      render(<ImageLightbox onShare={onShare} />);

      fireEvent.click(screen.getByTitle('Share image'));

      expect(onShare).toHaveBeenCalledWith('asset-1');
    });

    it('should call onCopyLink with assetId', () => {
      const onCopyLink = vi.fn();
      openLightbox(mockImage1);

      render(<ImageLightbox onCopyLink={onCopyLink} />);

      fireEvent.click(screen.getByTitle('Copy link to clipboard'));

      expect(onCopyLink).toHaveBeenCalledWith('asset-1');
    });

    it('should call onRegenerate with assetId when provided', () => {
      const onRegenerate = vi.fn();
      openLightbox(mockImage1);

      render(<ImageLightbox onRegenerate={onRegenerate} />);

      fireEvent.click(screen.getByTitle(/Regenerate/));

      expect(onRegenerate).toHaveBeenCalledWith('asset-1');
    });

    it('should not show regenerate button when callback not provided', () => {
      openLightbox(mockImage1);

      render(<ImageLightbox />);

      expect(screen.queryByTitle(/Regenerate/)).toBeNull();
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  describe('accessibility', () => {
    it('should have dialog role', () => {
      openLightbox(mockImage1);

      render(<ImageLightbox />);

      expect(screen.getByRole('dialog')).toBeDefined();
    });

    it('should have aria-modal attribute', () => {
      openLightbox(mockImage1);

      render(<ImageLightbox />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
    });

    it('should announce image for screen readers', () => {
      openLightbox(mockImage1);

      render(<ImageLightbox />);

      const announcement = screen.getByRole('status');
      expect(announcement.textContent).toContain('Test image 1');
      expect(announcement.textContent).toContain('Press Escape to close');
    });

    it('should announce gallery position for screen readers', () => {
      openLightbox(mockImage1, mockGallery);

      render(<ImageLightbox />);

      const announcement = screen.getByRole('status');
      expect(announcement.textContent).toContain('Image 1 of 3');
      expect(announcement.textContent).toContain('Arrow keys to navigate');
    });

    it('should have accessible button labels', () => {
      openLightbox(mockImage1, mockGallery);

      render(<ImageLightbox />);

      expect(screen.getByLabelText('Close lightbox')).toBeDefined();
      expect(screen.getByLabelText('Previous image')).toBeDefined();
      expect(screen.getByLabelText('Next image')).toBeDefined();
    });
  });

  // ==========================================================================
  // Touch Gestures
  // ==========================================================================

  describe('touch gestures', () => {
    it('should handle swipe left for next image', () => {
      openLightbox(mockImage1, mockGallery);

      render(<ImageLightbox />);

      const container = screen.getByTestId('image-lightbox').querySelector('[class*="flex-col"]');
      if (!container) throw new Error('Container not found');

      // Simulate swipe left
      fireEvent.touchStart(container, {
        targetTouches: [{ clientX: 300, clientY: 200 }],
      });
      fireEvent.touchMove(container, {
        targetTouches: [{ clientX: 100, clientY: 200 }],
      });
      fireEvent.touchEnd(container);

      expect(screen.getByText('2 / 3')).toBeDefined();
    });

    it('should handle swipe right for previous image', () => {
      openLightbox(mockImage2, mockGallery);

      render(<ImageLightbox />);

      const container = screen.getByTestId('image-lightbox').querySelector('[class*="flex-col"]');
      if (!container) throw new Error('Container not found');

      // Simulate swipe right
      fireEvent.touchStart(container, {
        targetTouches: [{ clientX: 100, clientY: 200 }],
      });
      fireEvent.touchMove(container, {
        targetTouches: [{ clientX: 300, clientY: 200 }],
      });
      fireEvent.touchEnd(container);

      expect(screen.getByText('1 / 3')).toBeDefined();
    });

    it('should ignore small swipes', () => {
      openLightbox(mockImage1, mockGallery);

      render(<ImageLightbox />);

      const container = screen.getByTestId('image-lightbox').querySelector('[class*="flex-col"]');
      if (!container) throw new Error('Container not found');

      // Simulate small swipe (less than threshold)
      fireEvent.touchStart(container, {
        targetTouches: [{ clientX: 200, clientY: 200 }],
      });
      fireEvent.touchMove(container, {
        targetTouches: [{ clientX: 180, clientY: 200 }],
      });
      fireEvent.touchEnd(container);

      // Should still be on first image
      expect(screen.getByText('1 / 3')).toBeDefined();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle image without assetId', () => {
      const onDownload = vi.fn();
      const imageWithoutId: LightboxImage = {
        src: 'https://example.com/image.png',
        alt: 'Image without ID',
      };
      openLightbox(imageWithoutId);

      render(<ImageLightbox onDownload={onDownload} />);

      fireEvent.click(screen.getByTitle('Download image'));

      expect(onDownload).toHaveBeenCalledWith(undefined);
    });

    it('should handle rapid open/close', async () => {
      const { rerender } = render(<ImageLightbox />);

      for (let i = 0; i < 3; i++) {
        // Open
        await waitFor(() => {
          openLightbox(mockImage1);
        });
        rerender(<ImageLightbox />);
        
        await waitFor(() => {
          expect(screen.getByTestId('image-lightbox')).toBeDefined();
        });

        // Close
        await waitFor(() => {
          useLightboxStore.getState().close();
        });
        rerender(<ImageLightbox />);
        
        await waitFor(() => {
          expect(screen.queryByTestId('image-lightbox')).toBeNull();
        });
      }
    });

    it('should handle gallery navigation at boundaries', () => {
      openLightbox(mockImage3, mockGallery); // Start at last image

      render(<ImageLightbox />);

      expect(screen.getByText('3 / 3')).toBeDefined();

      // Navigate next (should wrap to first)
      fireEvent.click(screen.getByLabelText('Next image'));
      expect(screen.getByText('1 / 3')).toBeDefined();

      // Navigate prev (should wrap to last)
      fireEvent.click(screen.getByLabelText('Previous image'));
      expect(screen.getByText('3 / 3')).toBeDefined();
    });
  });
});
