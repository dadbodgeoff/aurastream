'use client';

import { useCallback } from 'react';
import { useLightboxStore, type LightboxImage } from '@aurastream/shared';

/**
 * Return type for the useLightbox hook
 */
export interface UseLightboxReturn {
  /** Whether the lightbox is currently open */
  isOpen: boolean;
  /** The currently displayed image */
  currentImage: LightboxImage | null;
  /** Current index in the gallery */
  currentIndex: number;
  /** Total number of images in the gallery */
  galleryCount: number;
  /** Whether gallery mode is active (more than one image) */
  hasGallery: boolean;
  /** Open lightbox with a single image */
  openImage: (image: LightboxImage) => void;
  /** Open lightbox with a gallery of images */
  openGallery: (images: LightboxImage[], startIndex?: number) => void;
  /** Close the lightbox */
  close: () => void;
  /** Navigate to next image */
  next: () => void;
  /** Navigate to previous image */
  prev: () => void;
  /** Navigate to specific index */
  goToIndex: (index: number) => void;
}

/**
 * useLightbox - Convenience hook for lightbox operations
 *
 * Wraps the lightbox store and provides easy-to-use methods
 * for opening single images or galleries.
 *
 * @returns Lightbox state and control methods
 *
 * @example Single image
 * ```typescript
 * function AssetCard({ asset }) {
 *   const { openImage } = useLightbox();
 *
 *   return (
 *     <img
 *       src={asset.url}
 *       alt={asset.name}
 *       onClick={() => openImage({
 *         src: asset.url,
 *         alt: asset.name,
 *         assetId: asset.id,
 *         assetType: asset.type,
 *       })}
 *     />
 *   );
 * }
 * ```
 *
 * @example Gallery
 * ```typescript
 * function AssetGrid({ assets }) {
 *   const { openGallery } = useLightbox();
 *
 *   const gallery = assets.map(a => ({
 *     src: a.url,
 *     alt: a.name,
 *     assetId: a.id,
 *   }));
 *
 *   return (
 *     <div className="grid grid-cols-3 gap-4">
 *       {assets.map((asset, index) => (
 *         <img
 *           key={asset.id}
 *           src={asset.url}
 *           alt={asset.name}
 *           onClick={() => openGallery(gallery, index)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLightbox(): UseLightboxReturn {
  const {
    isOpen,
    currentImage,
    currentIndex,
    gallery,
    open,
    close,
    next,
    prev,
    setIndex,
  } = useLightboxStore();

  /**
   * Open lightbox with a single image
   */
  const openImage = useCallback(
    (image: LightboxImage) => {
      open(image);
    },
    [open]
  );

  /**
   * Open lightbox with a gallery of images
   */
  const openGallery = useCallback(
    (images: LightboxImage[], startIndex: number = 0) => {
      if (images.length === 0) return;

      const clampedIndex = Math.max(0, Math.min(startIndex, images.length - 1));
      open(images[clampedIndex], images);
    },
    [open]
  );

  /**
   * Navigate to a specific index in the gallery
   */
  const goToIndex = useCallback(
    (index: number) => {
      setIndex(index);
    },
    [setIndex]
  );

  return {
    isOpen,
    currentImage,
    currentIndex,
    galleryCount: gallery.length,
    hasGallery: gallery.length > 1,
    openImage,
    openGallery,
    close,
    next,
    prev,
    goToIndex,
  };
}
