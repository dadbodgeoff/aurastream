/**
 * Lightbox Store using Zustand
 * Manages the state for the image lightbox/gallery viewer
 *
 * Features:
 * - Single image viewing
 * - Gallery navigation with prev/next
 * - Tracks current index in gallery
 * - Asset metadata support (id, type, dimensions)
 *
 * @module stores/lightboxStore
 */

import { create } from 'zustand';

/**
 * Represents an image in the lightbox
 */
export interface LightboxImage {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Optional asset ID for tracking/actions */
  assetId?: string;
  /** Optional asset type (e.g., 'twitch_emote', 'youtube_thumbnail') */
  assetType?: string;
  /** Optional image width in pixels */
  width?: number;
  /** Optional image height in pixels */
  height?: number;
}

/**
 * Lightbox store state and actions
 */
export interface LightboxStore {
  /** Whether the lightbox is currently open */
  isOpen: boolean;
  /** The currently displayed image */
  currentImage: LightboxImage | null;
  /** Array of images for gallery mode */
  gallery: LightboxImage[];
  /** Current index in the gallery */
  currentIndex: number;

  /**
   * Open the lightbox with an image
   * @param image - The image to display
   * @param gallery - Optional array of images for gallery navigation
   */
  open: (image: LightboxImage, gallery?: LightboxImage[]) => void;

  /**
   * Close the lightbox
   */
  close: () => void;

  /**
   * Navigate to the next image in the gallery
   */
  next: () => void;

  /**
   * Navigate to the previous image in the gallery
   */
  prev: () => void;

  /**
   * Set the current index directly
   * @param index - The index to navigate to
   */
  setIndex: (index: number) => void;
}

/**
 * Lightbox store for managing image viewer state
 *
 * @example
 * ```typescript
 * import { useLightboxStore } from '@aurastream/shared';
 *
 * function ImageThumbnail({ src, alt }) {
 *   const { open } = useLightboxStore();
 *
 *   return (
 *     <img
 *       src={src}
 *       alt={alt}
 *       onClick={() => open({ src, alt })}
 *       className="cursor-pointer"
 *     />
 *   );
 * }
 * ```
 *
 * @example Gallery mode
 * ```typescript
 * function AssetGallery({ assets }) {
 *   const { open } = useLightboxStore();
 *
 *   const gallery = assets.map(a => ({
 *     src: a.url,
 *     alt: a.name,
 *     assetId: a.id,
 *     assetType: a.type,
 *   }));
 *
 *   return (
 *     <div className="grid grid-cols-3 gap-4">
 *       {assets.map((asset, index) => (
 *         <img
 *           key={asset.id}
 *           src={asset.url}
 *           alt={asset.name}
 *           onClick={() => open(gallery[index], gallery)}
 *           className="cursor-pointer"
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export const useLightboxStore = create<LightboxStore>((set, get) => ({
  // Initial state
  isOpen: false,
  currentImage: null,
  gallery: [],
  currentIndex: 0,

  // Actions
  open: (image: LightboxImage, gallery?: LightboxImage[]) => {
    const galleryArray = gallery ?? [image];
    const index = gallery
      ? gallery.findIndex((img) => img.src === image.src)
      : 0;

    set({
      isOpen: true,
      currentImage: image,
      gallery: galleryArray,
      currentIndex: index >= 0 ? index : 0,
    });
  },

  close: () => {
    set({
      isOpen: false,
      currentImage: null,
      gallery: [],
      currentIndex: 0,
    });
  },

  next: () => {
    const { gallery, currentIndex } = get();
    if (gallery.length === 0) return;

    const nextIndex = (currentIndex + 1) % gallery.length;
    set({
      currentIndex: nextIndex,
      currentImage: gallery[nextIndex],
    });
  },

  prev: () => {
    const { gallery, currentIndex } = get();
    if (gallery.length === 0) return;

    const prevIndex = (currentIndex - 1 + gallery.length) % gallery.length;
    set({
      currentIndex: prevIndex,
      currentImage: gallery[prevIndex],
    });
  },

  setIndex: (index: number) => {
    const { gallery } = get();
    if (gallery.length === 0) return;

    // Clamp index to valid range
    const clampedIndex = Math.max(0, Math.min(index, gallery.length - 1));
    set({
      currentIndex: clampedIndex,
      currentImage: gallery[clampedIndex],
    });
  },
}));

/**
 * Get the current lightbox state (non-reactive)
 * Useful for accessing state outside of React components
 *
 * @returns Current lightbox state
 *
 * @example
 * ```typescript
 * const state = getLightboxState();
 * if (state.isOpen) {
 *   console.log('Viewing:', state.currentImage?.src);
 * }
 * ```
 */
export function getLightboxState(): LightboxStore {
  return useLightboxStore.getState();
}

/**
 * Check if the lightbox has a gallery (more than one image)
 *
 * @returns True if gallery mode is active
 */
export function hasGallery(): boolean {
  const { gallery } = useLightboxStore.getState();
  return gallery.length > 1;
}

/**
 * Get the total number of images in the gallery
 *
 * @returns Number of images in gallery
 */
export function getGalleryCount(): number {
  return useLightboxStore.getState().gallery.length;
}
