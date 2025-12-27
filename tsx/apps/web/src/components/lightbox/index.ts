/**
 * Lightbox Components
 *
 * A full-featured image lightbox system for viewing and interacting with images.
 *
 * @module components/lightbox
 *
 * @example Basic usage
 * ```tsx
 * // 1. Add ImageLightbox to your layout
 * import { ImageLightbox } from '@/components/lightbox';
 *
 * export default function Layout({ children }) {
 *   return (
 *     <>
 *       {children}
 *       <ImageLightbox
 *         onDownload={(id) => downloadAsset(id)}
 *         onShare={(id) => shareAsset(id)}
 *         onCopyLink={(id) => copyLink(id)}
 *       />
 *     </>
 *   );
 * }
 *
 * // 2. Use the hook to open images
 * import { useLightbox } from '@/components/lightbox';
 *
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
 *       })}
 *     />
 *   );
 * }
 * ```
 */

// Main component
export { ImageLightbox } from './ImageLightbox';
export type { ImageLightboxProps } from './ImageLightbox';

// Sub-components (for custom implementations)
export { LightboxOverlay } from './LightboxOverlay';
export type { LightboxOverlayProps } from './LightboxOverlay';

export { LightboxZoom, ZoomControls } from './LightboxZoom';
export type { LightboxZoomProps, ZoomControlsProps } from './LightboxZoom';

export { LightboxControls } from './LightboxControls';
export type { LightboxControlsProps } from './LightboxControls';

// Hook
export { useLightbox } from './useLightbox';
export type { UseLightboxReturn } from './useLightbox';

// Re-export store types from shared package
export type { LightboxImage, LightboxStore } from '@aurastream/shared';
