/**
 * Lightbox Store Tests
 * Comprehensive tests for the Zustand lightbox store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useLightboxStore,
  getLightboxState,
  hasGallery,
  getGalleryCount,
  type LightboxImage,
} from '../stores/lightboxStore';

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
  width: 1280,
  height: 720,
};

const mockImage3: LightboxImage = {
  src: 'https://example.com/image3.png',
  alt: 'Test image 3',
  assetId: 'asset-3',
  assetType: 'twitch_banner',
};

const mockGallery: LightboxImage[] = [mockImage1, mockImage2, mockImage3];

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Reset the store to initial state before each test
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
 * Get the current store state
 */
function getState() {
  return useLightboxStore.getState();
}

// ============================================================================
// Tests
// ============================================================================

describe('LightboxStore', () => {
  beforeEach(() => {
    resetStore();
  });

  // ==========================================================================
  // Initial State
  // ==========================================================================

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = getState();

      expect(state.isOpen).toBe(false);
      expect(state.currentImage).toBeNull();
      expect(state.gallery).toEqual([]);
      expect(state.currentIndex).toBe(0);
    });
  });

  // ==========================================================================
  // Open Action
  // ==========================================================================

  describe('open', () => {
    it('should open lightbox with a single image', () => {
      const { open } = getState();

      open(mockImage1);

      const state = getState();
      expect(state.isOpen).toBe(true);
      expect(state.currentImage).toEqual(mockImage1);
      expect(state.gallery).toEqual([mockImage1]);
      expect(state.currentIndex).toBe(0);
    });

    it('should open lightbox with a gallery', () => {
      const { open } = getState();

      open(mockImage2, mockGallery);

      const state = getState();
      expect(state.isOpen).toBe(true);
      expect(state.currentImage).toEqual(mockImage2);
      expect(state.gallery).toEqual(mockGallery);
      expect(state.currentIndex).toBe(1); // mockImage2 is at index 1
    });

    it('should set index to 0 if image not found in gallery', () => {
      const { open } = getState();
      const unknownImage: LightboxImage = {
        src: 'https://example.com/unknown.png',
        alt: 'Unknown image',
      };

      open(unknownImage, mockGallery);

      const state = getState();
      expect(state.currentIndex).toBe(0);
      expect(state.currentImage).toEqual(unknownImage);
    });

    it('should handle image with minimal properties', () => {
      const { open } = getState();
      const minimalImage: LightboxImage = {
        src: 'https://example.com/minimal.png',
        alt: 'Minimal image',
      };

      open(minimalImage);

      const state = getState();
      expect(state.isOpen).toBe(true);
      expect(state.currentImage).toEqual(minimalImage);
      expect(state.currentImage?.assetId).toBeUndefined();
      expect(state.currentImage?.assetType).toBeUndefined();
    });
  });

  // ==========================================================================
  // Close Action
  // ==========================================================================

  describe('close', () => {
    it('should close lightbox and reset state', () => {
      const { open, close } = getState();

      // Open first
      open(mockImage1, mockGallery);
      expect(getState().isOpen).toBe(true);

      // Then close
      close();

      const state = getState();
      expect(state.isOpen).toBe(false);
      expect(state.currentImage).toBeNull();
      expect(state.gallery).toEqual([]);
      expect(state.currentIndex).toBe(0);
    });

    it('should be safe to call when already closed', () => {
      const { close } = getState();

      // Should not throw
      expect(() => close()).not.toThrow();

      const state = getState();
      expect(state.isOpen).toBe(false);
    });
  });

  // ==========================================================================
  // Navigation Actions
  // ==========================================================================

  describe('next', () => {
    it('should navigate to next image in gallery', () => {
      const { open, next } = getState();

      open(mockImage1, mockGallery);
      expect(getState().currentIndex).toBe(0);

      next();

      const state = getState();
      expect(state.currentIndex).toBe(1);
      expect(state.currentImage).toEqual(mockImage2);
    });

    it('should wrap around to first image', () => {
      const { open, next } = getState();

      open(mockImage3, mockGallery); // Start at index 2
      expect(getState().currentIndex).toBe(2);

      next();

      const state = getState();
      expect(state.currentIndex).toBe(0);
      expect(state.currentImage).toEqual(mockImage1);
    });

    it('should do nothing with empty gallery', () => {
      const { next } = getState();

      // Don't open anything
      next();

      const state = getState();
      expect(state.currentIndex).toBe(0);
      expect(state.currentImage).toBeNull();
    });

    it('should work with single image gallery', () => {
      const { open, next } = getState();

      open(mockImage1); // Single image gallery

      next();

      const state = getState();
      expect(state.currentIndex).toBe(0);
      expect(state.currentImage).toEqual(mockImage1);
    });
  });

  describe('prev', () => {
    it('should navigate to previous image in gallery', () => {
      const { open, prev } = getState();

      open(mockImage2, mockGallery); // Start at index 1
      expect(getState().currentIndex).toBe(1);

      prev();

      const state = getState();
      expect(state.currentIndex).toBe(0);
      expect(state.currentImage).toEqual(mockImage1);
    });

    it('should wrap around to last image', () => {
      const { open, prev } = getState();

      open(mockImage1, mockGallery); // Start at index 0
      expect(getState().currentIndex).toBe(0);

      prev();

      const state = getState();
      expect(state.currentIndex).toBe(2);
      expect(state.currentImage).toEqual(mockImage3);
    });

    it('should do nothing with empty gallery', () => {
      const { prev } = getState();

      prev();

      const state = getState();
      expect(state.currentIndex).toBe(0);
      expect(state.currentImage).toBeNull();
    });
  });

  describe('setIndex', () => {
    it('should set index directly', () => {
      const { open, setIndex } = getState();

      open(mockImage1, mockGallery);

      setIndex(2);

      const state = getState();
      expect(state.currentIndex).toBe(2);
      expect(state.currentImage).toEqual(mockImage3);
    });

    it('should clamp index to valid range (too high)', () => {
      const { open, setIndex } = getState();

      open(mockImage1, mockGallery);

      setIndex(100);

      const state = getState();
      expect(state.currentIndex).toBe(2); // Max valid index
      expect(state.currentImage).toEqual(mockImage3);
    });

    it('should clamp index to valid range (negative)', () => {
      const { open, setIndex } = getState();

      open(mockImage2, mockGallery);

      setIndex(-5);

      const state = getState();
      expect(state.currentIndex).toBe(0);
      expect(state.currentImage).toEqual(mockImage1);
    });

    it('should do nothing with empty gallery', () => {
      const { setIndex } = getState();

      setIndex(5);

      const state = getState();
      expect(state.currentIndex).toBe(0);
    });
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  describe('getLightboxState', () => {
    it('should return current state', () => {
      const { open } = getState();
      open(mockImage1);

      const state = getLightboxState();
      expect(state.isOpen).toBe(true);
      expect(state.currentImage).toEqual(mockImage1);
    });
  });

  describe('hasGallery', () => {
    it('should return false when no gallery', () => {
      expect(hasGallery()).toBe(false);
    });

    it('should return false for single image', () => {
      const { open } = getState();
      open(mockImage1);

      expect(hasGallery()).toBe(false);
    });

    it('should return true for multiple images', () => {
      const { open } = getState();
      open(mockImage1, mockGallery);

      expect(hasGallery()).toBe(true);
    });
  });

  describe('getGalleryCount', () => {
    it('should return 0 when no gallery', () => {
      expect(getGalleryCount()).toBe(0);
    });

    it('should return 1 for single image', () => {
      const { open } = getState();
      open(mockImage1);

      expect(getGalleryCount()).toBe(1);
    });

    it('should return correct count for gallery', () => {
      const { open } = getState();
      open(mockImage1, mockGallery);

      expect(getGalleryCount()).toBe(3);
    });
  });

  // ==========================================================================
  // State Transitions
  // ==========================================================================

  describe('state transitions', () => {
    it('should handle complete workflow', () => {
      const { open, next, prev, close } = getState();

      // Open gallery
      open(mockImage1, mockGallery);
      expect(getState().isOpen).toBe(true);
      expect(getState().currentIndex).toBe(0);

      // Navigate forward
      next();
      expect(getState().currentIndex).toBe(1);
      expect(getState().currentImage).toEqual(mockImage2);

      // Navigate forward again
      next();
      expect(getState().currentIndex).toBe(2);
      expect(getState().currentImage).toEqual(mockImage3);

      // Navigate backward
      prev();
      expect(getState().currentIndex).toBe(1);
      expect(getState().currentImage).toEqual(mockImage2);

      // Close
      close();
      expect(getState().isOpen).toBe(false);
      expect(getState().currentImage).toBeNull();
    });

    it('should handle rapid navigation', () => {
      const { open, next, prev } = getState();

      open(mockImage1, mockGallery);

      // Rapid navigation
      for (let i = 0; i < 10; i++) {
        next();
      }

      // Should have wrapped around multiple times
      // 10 % 3 = 1
      expect(getState().currentIndex).toBe(1);

      for (let i = 0; i < 5; i++) {
        prev();
      }

      // 1 - 5 = -4, wrapped: (1 - 5 + 3*2) % 3 = 2
      expect(getState().currentIndex).toBe(2);
    });

    it('should handle open/close cycles', () => {
      const { open, close } = getState();

      // Multiple open/close cycles
      for (let i = 0; i < 5; i++) {
        open(mockImage1, mockGallery);
        expect(getState().isOpen).toBe(true);

        close();
        expect(getState().isOpen).toBe(false);
        expect(getState().gallery).toEqual([]);
      }
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle images with special characters in URLs', () => {
      const { open } = getState();
      const specialImage: LightboxImage = {
        src: 'https://example.com/image%20with%20spaces.png?query=value&other=123',
        alt: 'Image with "quotes" and <brackets>',
      };

      open(specialImage);

      const state = getState();
      expect(state.currentImage?.src).toBe(specialImage.src);
      expect(state.currentImage?.alt).toBe(specialImage.alt);
    });

    it('should handle images with unicode in alt text', () => {
      const { open } = getState();
      const unicodeImage: LightboxImage = {
        src: 'https://example.com/emoji.png',
        alt: '🎮 Gaming emote 🎯 with unicode',
      };

      open(unicodeImage);

      expect(getState().currentImage?.alt).toBe('🎮 Gaming emote 🎯 with unicode');
    });

    it('should handle very large gallery', () => {
      const { open, setIndex } = getState();
      const largeGallery: LightboxImage[] = Array.from({ length: 1000 }, (_, i) => ({
        src: `https://example.com/image${i}.png`,
        alt: `Image ${i}`,
        assetId: `asset-${i}`,
      }));

      open(largeGallery[0], largeGallery);

      expect(getState().gallery.length).toBe(1000);

      setIndex(999);
      expect(getState().currentIndex).toBe(999);
      expect(getState().currentImage?.assetId).toBe('asset-999');
    });

    it('should handle empty alt text', () => {
      const { open } = getState();
      const emptyAltImage: LightboxImage = {
        src: 'https://example.com/image.png',
        alt: '',
      };

      open(emptyAltImage);

      expect(getState().currentImage?.alt).toBe('');
    });
  });
});
