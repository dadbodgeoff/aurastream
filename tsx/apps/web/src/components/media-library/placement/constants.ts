/**
 * Asset Placement System Constants
 * 
 * Canvas dimensions, default values, and configuration for the placement system.
 */

import type { CanvasDimensions, AssetPlacement, CanvasRegion } from './types';
import type { MediaAsset } from '@aurastream/api-client';

/**
 * Canvas dimensions for each asset type
 * Maps asset type IDs to their actual pixel dimensions
 */
export const CANVAS_DIMENSIONS: Record<string, CanvasDimensions> = {
  // YouTube
  thumbnail: { width: 1280, height: 720, label: 'YouTube Thumbnail' },
  youtube_thumbnail: { width: 1280, height: 720, label: 'YouTube Thumbnail' },
  
  // Twitch
  twitch_emote: { width: 112, height: 112, label: 'Twitch Emote' },
  twitch_emote_112: { width: 112, height: 112, label: 'Twitch Emote (112px)' },
  twitch_emote_56: { width: 56, height: 56, label: 'Twitch Emote (56px)' },
  twitch_emote_28: { width: 28, height: 28, label: 'Twitch Emote (28px)' },
  twitch_badge: { width: 72, height: 72, label: 'Twitch Badge' },
  twitch_panel: { width: 320, height: 160, label: 'Twitch Panel' },
  twitch_banner: { width: 1200, height: 480, label: 'Twitch Banner' },
  twitch_offline: { width: 1920, height: 1080, label: 'Twitch Offline Screen' },
  
  // TikTok
  tiktok_emote: { width: 300, height: 300, label: 'TikTok Emote' },
  tiktok_emote_300: { width: 300, height: 300, label: 'TikTok Emote (300px)' },
  tiktok_emote_200: { width: 200, height: 200, label: 'TikTok Emote (200px)' },
  tiktok_emote_100: { width: 100, height: 100, label: 'TikTok Emote (100px)' },
  
  // Stories/Vertical
  story_graphic: { width: 1080, height: 1920, label: 'Story Graphic' },
  tiktok_story: { width: 1080, height: 1920, label: 'TikTok Story' },
  instagram_story: { width: 1080, height: 1920, label: 'Instagram Story' },
  instagram_reel: { width: 1080, height: 1920, label: 'Instagram Reel' },
  
  // Overlays
  overlay: { width: 1920, height: 1080, label: 'Stream Overlay' },
  
  // Profile
  profile_picture: { width: 512, height: 512, label: 'Profile Picture' },
  streamer_logo: { width: 512, height: 512, label: 'Streamer Logo' },
  
  // Clips
  clip_cover: { width: 1080, height: 1080, label: 'Clip Cover' },
  
  // Default fallback
  default: { width: 1280, height: 720, label: 'Custom Asset' },
};

/**
 * Get canvas dimensions for an asset type
 */
export function getCanvasDimensions(assetType: string): CanvasDimensions {
  return CANVAS_DIMENSIONS[assetType] || CANVAS_DIMENSIONS.default;
}

/**
 * Default placement values for new assets
 */
export const DEFAULT_PLACEMENT = {
  position: {
    x: 50,
    y: 50,
    anchor: 'center' as const,
  },
  size: {
    width: 20,
    height: 20,
    unit: 'percent' as const,
    maintainAspectRatio: true,
  },
  rotation: 0,
  opacity: 100,
};

/**
 * Minimum and maximum size constraints
 */
export const SIZE_CONSTRAINTS = {
  minPercent: 5,
  maxPercent: 100,
  minPx: 10,
  maxPxRatio: 0.9, // Max 90% of canvas dimension
};

/**
 * Snap-to-grid settings
 */
export const SNAP_SETTINGS = {
  enabled: true,
  gridSize: 5, // Snap to 5% increments
  edgeThreshold: 3, // Snap to edges within 3%
};

/**
 * Preset positions for quick placement
 */
export const POSITION_PRESETS: Array<{
  id: string;
  label: string;
  icon: string;
  position: { x: number; y: number };
}> = [
  { id: 'top-left', label: 'Top Left', icon: '↖', position: { x: 10, y: 10 } },
  { id: 'top-center', label: 'Top Center', icon: '↑', position: { x: 50, y: 10 } },
  { id: 'top-right', label: 'Top Right', icon: '↗', position: { x: 90, y: 10 } },
  { id: 'center-left', label: 'Center Left', icon: '←', position: { x: 10, y: 50 } },
  { id: 'center', label: 'Center', icon: '◉', position: { x: 50, y: 50 } },
  { id: 'center-right', label: 'Center Right', icon: '→', position: { x: 90, y: 50 } },
  { id: 'bottom-left', label: 'Bottom Left', icon: '↙', position: { x: 10, y: 90 } },
  { id: 'bottom-center', label: 'Bottom Center', icon: '↓', position: { x: 50, y: 90 } },
  { id: 'bottom-right', label: 'Bottom Right', icon: '↘', position: { x: 90, y: 90 } },
];

/**
 * Size presets for quick sizing
 */
export const SIZE_PRESETS: Array<{
  id: string;
  label: string;
  size: number;
  unit: 'percent' | 'px';
}> = [
  { id: 'tiny', label: 'Tiny', size: 5, unit: 'percent' },
  { id: 'small', label: 'Small', size: 10, unit: 'percent' },
  { id: 'medium', label: 'Medium', size: 20, unit: 'percent' },
  { id: 'large', label: 'Large', size: 35, unit: 'percent' },
  { id: 'xlarge', label: 'X-Large', size: 50, unit: 'percent' },
];

/**
 * Get region name from position coordinates
 */
export function getRegionFromPosition(x: number, y: number): CanvasRegion {
  const col = x < 33 ? 'left' : x > 66 ? 'right' : 'center';
  const row = y < 33 ? 'top' : y > 66 ? 'bottom' : 'center';
  
  if (row === 'center' && col === 'center') return 'center';
  if (row === 'center') return `center-${col}` as CanvasRegion;
  if (col === 'center') return `${row}-center` as CanvasRegion;
  return `${row}-${col}` as CanvasRegion;
}

/**
 * Create default placement for an asset
 */
export function createDefaultPlacement(
  asset: MediaAsset,
  index: number,
  canvasDimensions: CanvasDimensions
): AssetPlacement {
  // Stagger multiple assets so they don't overlap
  const offsetX = (index % 3) * 25;
  const offsetY = Math.floor(index / 3) * 25;
  
  return {
    assetId: asset.id,
    asset,
    position: {
      x: Math.min(DEFAULT_PLACEMENT.position.x + offsetX, 90),
      y: Math.min(DEFAULT_PLACEMENT.position.y + offsetY, 90),
      anchor: DEFAULT_PLACEMENT.position.anchor,
    },
    size: {
      ...DEFAULT_PLACEMENT.size,
    },
    zIndex: index + 1,
    rotation: DEFAULT_PLACEMENT.rotation,
    opacity: DEFAULT_PLACEMENT.opacity,
  };
}

/**
 * Calculate actual pixel dimensions from percentage
 */
export function percentToPixels(
  percent: number,
  canvasDimension: number
): number {
  return Math.round((percent / 100) * canvasDimension);
}

/**
 * Calculate percentage from pixel dimensions
 */
export function pixelsToPercent(
  pixels: number,
  canvasDimension: number
): number {
  return Math.round((pixels / canvasDimension) * 100 * 10) / 10;
}
