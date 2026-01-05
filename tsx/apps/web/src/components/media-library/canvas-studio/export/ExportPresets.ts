/**
 * Export Presets Module
 * 
 * Platform-specific export presets with optimal settings for each platform.
 * Includes helper functions for preset management and recommendations.
 */

import type { ExportPreset, ExportPlatform, ExportFormat } from './types';

// ============================================================================
// Platform Presets
// ============================================================================

/**
 * YouTube Thumbnail preset
 * Optimal for YouTube video thumbnails
 */
export const YOUTUBE_THUMBNAIL_PRESET: ExportPreset = {
  id: 'youtube_thumbnail',
  name: 'YouTube Thumbnail',
  description: 'Optimized for YouTube video thumbnails (1280×720)',
  icon: 'youtube',
  format: 'png',
  quality: 90,
  dimensions: { width: 1280, height: 720 },
  maxFileSize: 2048, // 2MB limit
  supportsTransparency: false,
};

/**
 * Twitch Emote preset
 * Includes all required size variants
 */
export const TWITCH_EMOTE_PRESET: ExportPreset = {
  id: 'twitch_emote',
  name: 'Twitch Emote',
  description: 'Twitch emote with all required sizes',
  icon: 'twitch',
  format: 'png',
  quality: 100,
  dimensions: { width: 112, height: 112 },
  maxFileSize: 1024, // 1MB limit per emote
  supportsTransparency: true,
  variants: [
    { width: 112, height: 112, label: '112×112 (4x)' },
    { width: 56, height: 56, label: '56×56 (2x)' },
    { width: 28, height: 28, label: '28×28 (1x)' },
  ],
};

/**
 * Twitch Badge preset
 * Includes all required size variants
 */
export const TWITCH_BADGE_PRESET: ExportPreset = {
  id: 'twitch_badge',
  name: 'Twitch Badge',
  description: 'Twitch subscriber/bit badge with all sizes',
  icon: 'twitch',
  format: 'png',
  quality: 100,
  dimensions: { width: 72, height: 72 },
  maxFileSize: 25, // 25KB limit per badge
  supportsTransparency: true,
  variants: [
    { width: 72, height: 72, label: '72×72 (3x)' },
    { width: 36, height: 36, label: '36×36 (2x)' },
    { width: 18, height: 18, label: '18×18 (1x)' },
  ],
};

/**
 * Twitch Panel preset
 */
export const TWITCH_PANEL_PRESET: ExportPreset = {
  id: 'twitch_panel',
  name: 'Twitch Panel',
  description: 'Twitch channel panel (320×160 recommended)',
  icon: 'twitch',
  format: 'png',
  quality: 95,
  dimensions: { width: 320, height: 160 },
  maxFileSize: 2500, // 2.5MB limit
  supportsTransparency: true,
};

/**
 * Twitch Banner preset
 */
export const TWITCH_BANNER_PRESET: ExportPreset = {
  id: 'twitch_banner',
  name: 'Twitch Banner',
  description: 'Twitch profile banner (1200×480)',
  icon: 'twitch',
  format: 'png',
  quality: 95,
  dimensions: { width: 1200, height: 480 },
  maxFileSize: 10240, // 10MB limit
  supportsTransparency: false,
};

/**
 * Twitch Offline Screen preset
 */
export const TWITCH_OFFLINE_PRESET: ExportPreset = {
  id: 'twitch_offline',
  name: 'Twitch Offline Screen',
  description: 'Twitch offline/video player banner (1920×1080)',
  icon: 'twitch',
  format: 'png',
  quality: 90,
  dimensions: { width: 1920, height: 1080 },
  maxFileSize: 10240, // 10MB limit
  supportsTransparency: false,
};

/**
 * Instagram Story preset
 */
export const INSTAGRAM_STORY_PRESET: ExportPreset = {
  id: 'instagram_story',
  name: 'Instagram Story',
  description: 'Instagram story format (1080×1920)',
  icon: 'instagram',
  format: 'jpg',
  quality: 85,
  dimensions: { width: 1080, height: 1920 },
  supportsTransparency: false,
};

/**
 * Instagram Post preset
 */
export const INSTAGRAM_POST_PRESET: ExportPreset = {
  id: 'instagram_post',
  name: 'Instagram Post',
  description: 'Instagram square post (1080×1080)',
  icon: 'instagram',
  format: 'jpg',
  quality: 85,
  dimensions: { width: 1080, height: 1080 },
  supportsTransparency: false,
};

/**
 * TikTok Story preset
 */
export const TIKTOK_STORY_PRESET: ExportPreset = {
  id: 'tiktok_story',
  name: 'TikTok Story',
  description: 'TikTok vertical format (1080×1920)',
  icon: 'tiktok',
  format: 'jpg',
  quality: 85,
  dimensions: { width: 1080, height: 1920 },
  supportsTransparency: false,
};

/**
 * Discord Emoji preset
 */
export const DISCORD_EMOJI_PRESET: ExportPreset = {
  id: 'discord_emoji',
  name: 'Discord Emoji',
  description: 'Discord custom emoji (128×128)',
  icon: 'discord',
  format: 'png',
  quality: 100,
  dimensions: { width: 128, height: 128 },
  maxFileSize: 256, // 256KB limit
  supportsTransparency: true,
};

/**
 * Discord Banner preset
 */
export const DISCORD_BANNER_PRESET: ExportPreset = {
  id: 'discord_banner',
  name: 'Discord Banner',
  description: 'Discord server banner (960×540)',
  icon: 'discord',
  format: 'png',
  quality: 90,
  dimensions: { width: 960, height: 540 },
  supportsTransparency: false,
};

/**
 * Custom export preset (user-defined settings)
 */
export const CUSTOM_PRESET: ExportPreset = {
  id: 'custom',
  name: 'Custom',
  description: 'Custom export settings',
  icon: 'settings',
  format: 'png',
  quality: 90,
  dimensions: { width: 1920, height: 1080 },
  supportsTransparency: true,
};

// ============================================================================
// Preset Collections
// ============================================================================

/**
 * All available export presets
 */
export const EXPORT_PRESETS: ExportPreset[] = [
  YOUTUBE_THUMBNAIL_PRESET,
  TWITCH_EMOTE_PRESET,
  TWITCH_BADGE_PRESET,
  TWITCH_PANEL_PRESET,
  TWITCH_BANNER_PRESET,
  TWITCH_OFFLINE_PRESET,
  INSTAGRAM_STORY_PRESET,
  INSTAGRAM_POST_PRESET,
  TIKTOK_STORY_PRESET,
  DISCORD_EMOJI_PRESET,
  DISCORD_BANNER_PRESET,
  CUSTOM_PRESET,
];

/**
 * Presets grouped by platform category
 */
export const PRESETS_BY_CATEGORY: Record<string, ExportPreset[]> = {
  youtube: [YOUTUBE_THUMBNAIL_PRESET],
  twitch: [
    TWITCH_EMOTE_PRESET,
    TWITCH_BADGE_PRESET,
    TWITCH_PANEL_PRESET,
    TWITCH_BANNER_PRESET,
    TWITCH_OFFLINE_PRESET,
  ],
  instagram: [INSTAGRAM_STORY_PRESET, INSTAGRAM_POST_PRESET],
  tiktok: [TIKTOK_STORY_PRESET],
  discord: [DISCORD_EMOJI_PRESET, DISCORD_BANNER_PRESET],
  custom: [CUSTOM_PRESET],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a preset by its ID
 * 
 * @param id - The preset ID to find
 * @returns The matching preset or undefined
 */
export function getPresetById(id: ExportPlatform): ExportPreset | undefined {
  return EXPORT_PRESETS.find(preset => preset.id === id);
}

/**
 * Get all presets for a specific platform category
 * 
 * @param platform - Platform category (youtube, twitch, instagram, etc.)
 * @returns Array of presets for that platform
 */
export function getPresetsForPlatform(platform: string): ExportPreset[] {
  return PRESETS_BY_CATEGORY[platform.toLowerCase()] || [];
}

/**
 * Get the recommended preset based on canvas type
 * Maps canvas types to the most appropriate export preset
 * 
 * @param canvasType - The type of canvas being exported
 * @returns The recommended preset for that canvas type
 */
export function getRecommendedPreset(canvasType: string): ExportPreset {
  const canvasToPreset: Record<string, ExportPlatform> = {
    // YouTube
    youtube_thumbnail: 'youtube_thumbnail',
    
    // Twitch
    twitch_emote: 'twitch_emote',
    twitch_badge: 'twitch_badge',
    twitch_panel: 'twitch_panel',
    twitch_banner: 'twitch_banner',
    twitch_offline: 'twitch_offline',
    
    // Instagram
    instagram_story: 'instagram_story',
    instagram_post: 'instagram_post',
    
    // TikTok
    tiktok_story: 'tiktok_story',
    
    // Discord
    discord_emoji: 'discord_emoji',
    discord_banner: 'discord_banner',
  };

  const presetId = canvasToPreset[canvasType] || 'custom';
  return getPresetById(presetId) || CUSTOM_PRESET;
}

/**
 * Get quality value from quality preset name
 * 
 * @param quality - Quality preset name
 * @returns Numeric quality value (0-100)
 */
export function getQualityValue(quality: 'low' | 'medium' | 'high' | 'max'): number {
  const qualityMap: Record<string, number> = {
    low: 60,
    medium: 75,
    high: 90,
    max: 100,
  };
  return qualityMap[quality] || 90;
}

/**
 * Get quality preset name from numeric value
 * 
 * @param value - Numeric quality value (0-100)
 * @returns Quality preset name
 */
export function getQualityPreset(value: number): 'low' | 'medium' | 'high' | 'max' {
  if (value >= 95) return 'max';
  if (value >= 85) return 'high';
  if (value >= 70) return 'medium';
  return 'low';
}

/**
 * Check if a format supports transparency
 * 
 * @param format - Export format
 * @returns Whether the format supports transparency
 */
export function formatSupportsTransparency(format: ExportFormat): boolean {
  return format === 'png' || format === 'webp';
}

/**
 * Get the MIME type for an export format
 * 
 * @param format - Export format
 * @returns MIME type string
 */
export function getFormatMimeType(format: ExportFormat): string {
  const mimeTypes: Record<ExportFormat, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    webp: 'image/webp',
  };
  return mimeTypes[format];
}

/**
 * Get file extension for an export format
 * 
 * @param format - Export format
 * @returns File extension (without dot)
 */
export function getFormatExtension(format: ExportFormat): string {
  const extensions: Record<ExportFormat, string> = {
    png: 'png',
    jpg: 'jpg',
    webp: 'webp',
  };
  return extensions[format];
}
