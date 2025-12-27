/**
 * Asset dimension specifications for auto-injection into prompts.
 * 
 * Users don't need to know dimensions - we handle it automatically.
 * This module provides human-readable dimension info for UI display.
 */

export interface DimensionSpec {
  generationSize: [number, number];
  exportSize: [number, number];
  aspectRatio: string;
}

export const DIMENSION_SPECS: Record<string, DimensionSpec> = {
  // YouTube assets
  youtube_thumbnail: {
    generationSize: [1216, 832],
    exportSize: [1280, 720],
    aspectRatio: '16:9',
  },
  youtube_banner: {
    generationSize: [1536, 640],
    exportSize: [2560, 1440],
    aspectRatio: '16:9',
  },

  // Story/Vertical assets (9:16)
  tiktok_story: {
    generationSize: [832, 1216],
    exportSize: [1080, 1920],
    aspectRatio: '9:16',
  },
  story_graphic: {
    generationSize: [832, 1216],
    exportSize: [1080, 1920],
    aspectRatio: '9:16',
  },
  instagram_story: {
    generationSize: [832, 1216],
    exportSize: [1080, 1920],
    aspectRatio: '9:16',
  },
  instagram_reel: {
    generationSize: [832, 1216],
    exportSize: [1080, 1920],
    aspectRatio: '9:16',
  },

  // Twitch assets
  twitch_banner: {
    generationSize: [1536, 640],
    exportSize: [1200, 480],
    aspectRatio: '~3:1',
  },
  twitch_panel: {
    generationSize: [640, 320],
    exportSize: [320, 160],
    aspectRatio: '2:1',
  },
  twitch_offline: {
    generationSize: [1920, 1080],
    exportSize: [1920, 1080],
    aspectRatio: '16:9',
  },
  twitch_emote: {
    generationSize: [1024, 1024],
    exportSize: [512, 512],
    aspectRatio: '1:1',
  },
  twitch_badge: {
    generationSize: [1024, 1024],
    exportSize: [72, 72],
    aspectRatio: '1:1',
  },

  // Stream overlays
  overlay: {
    generationSize: [1920, 1080],
    exportSize: [1920, 1080],
    aspectRatio: '16:9',
  },
};

/**
 * Get human-readable dimension info for an asset type.
 */
export function getDimensionInfo(assetType: string): string {
  const spec = DIMENSION_SPECS[assetType];
  if (!spec) return '';

  const [width, height] = spec.exportSize;
  return `${width}×${height}px (${spec.aspectRatio})`;
}

/**
 * Get short dimension label for UI display.
 */
export function getDimensionLabel(assetType: string): string {
  const spec = DIMENSION_SPECS[assetType];
  if (!spec) return '';

  const [width, height] = spec.exportSize;
  
  if (width > height) return `${spec.aspectRatio} Landscape`;
  if (height > width) return `${spec.aspectRatio} Portrait`;
  return `${spec.aspectRatio} Square`;
}

/**
 * Get orientation for an asset type.
 */
export function getOrientation(assetType: string): 'landscape' | 'portrait' | 'square' | 'unknown' {
  const spec = DIMENSION_SPECS[assetType];
  if (!spec) return 'unknown';

  const [width, height] = spec.exportSize;
  
  if (width > height) return 'landscape';
  if (height > width) return 'portrait';
  return 'square';
}
