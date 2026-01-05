/**
 * Export Module for Canvas Studio
 * 
 * Provides comprehensive export functionality including:
 * - Platform-specific presets (YouTube, Twitch, Instagram, Discord, etc.)
 * - Multi-format export (PNG, JPG, WebP)
 * - Quality and scale controls
 * - Clipboard integration
 * - Export validation
 */

// Types
export type {
  ExportFormat,
  ExportQuality,
  ExportPlatform,
  ExportOptions,
  ExportPreset,
  ExportResult,
  ExportValidation,
  FileSizeEstimate,
  ExportPanelState,
} from './types';

// Presets
export {
  // Individual presets
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
  // Collections
  EXPORT_PRESETS,
  PRESETS_BY_CATEGORY,
  // Helper functions
  getPresetById,
  getPresetsForPlatform,
  getRecommendedPreset,
  getQualityValue,
  getQualityPreset,
  formatSupportsTransparency,
  getFormatMimeType,
  getFormatExtension,
} from './ExportPresets';

// Platform Export
export {
  exportToFormat,
  exportForPlatform,
  exportAllVariants,
  generateFilename,
  validateExport,
  getFileSizeEstimate,
  getFileSizeEstimateForPlatform,
  formatFileSize,
  downloadBlob,
  downloadExportResult,
} from './PlatformExport';

// Clipboard Export
export {
  isClipboardSupported,
  isLegacyClipboardSupported,
  copyToClipboard,
  copyDataUrlToClipboard,
  copyToClipboardWithFallback,
  copyTextToClipboard,
  getClipboardSupport,
} from './ClipboardExport';
export type { ClipboardResult, ClipboardSupport } from './ClipboardExport';

// UI Components
export { ExportPanel, default } from './ExportPanel';
export type { ExportPanelProps } from './ExportPanel';
