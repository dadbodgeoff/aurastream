/**
 * Export Module Types
 * 
 * Type definitions for the Canvas Studio export functionality.
 * Supports multiple formats, quality presets, and platform-specific exports.
 */

// ============================================================================
// Export Format Types
// ============================================================================

/**
 * Supported export image formats
 */
export type ExportFormat = 'png' | 'jpg' | 'webp';

/**
 * Quality preset levels for quick selection
 */
export type ExportQuality = 'low' | 'medium' | 'high' | 'max';

/**
 * Platform-specific export presets
 * Each platform has optimal settings for their requirements
 */
export type ExportPlatform = 
  | 'youtube_thumbnail'
  | 'twitch_emote'
  | 'twitch_badge'
  | 'twitch_panel'
  | 'twitch_banner'
  | 'twitch_offline'
  | 'instagram_story'
  | 'instagram_post'
  | 'tiktok_story'
  | 'discord_emoji'
  | 'discord_banner'
  | 'custom';

// ============================================================================
// Export Configuration Types
// ============================================================================

/**
 * Export options for customizing output
 */
export interface ExportOptions {
  /** Output image format */
  format: ExportFormat;
  /** Quality level (0-100, affects file size) */
  quality: number;
  /** Scale multiplier (1x, 2x, etc.) */
  scale: number;
  /** Optional platform preset to apply */
  platform?: ExportPlatform;
}

/**
 * Platform-specific export preset configuration
 */
export interface ExportPreset {
  /** Unique identifier matching ExportPlatform */
  id: ExportPlatform;
  /** Human-readable name */
  name: string;
  /** Brief description of the preset */
  description: string;
  /** Icon identifier for UI display */
  icon: string;
  /** Recommended format for this platform */
  format: ExportFormat;
  /** Recommended quality (0-100) */
  quality: number;
  /** Target dimensions for this platform */
  dimensions: { width: number; height: number };
  /** Maximum file size in KB (if platform has limits) */
  maxFileSize?: number;
  /** Whether this preset supports transparency */
  supportsTransparency?: boolean;
  /** Additional size variants (e.g., Twitch emote sizes) */
  variants?: Array<{ width: number; height: number; label: string }>;
}

/**
 * Result of an export operation
 */
export interface ExportResult {
  /** Base64 data URL of the exported image */
  dataUrl: string;
  /** Blob object for download/clipboard operations */
  blob: Blob;
  /** Generated filename */
  filename: string;
  /** Format used for export */
  format: ExportFormat;
  /** Final dimensions of exported image */
  dimensions: { width: number; height: number };
  /** File size in bytes */
  fileSize: number;
}

// ============================================================================
// Export Validation Types
// ============================================================================

/**
 * Validation result for export against platform requirements
 */
export interface ExportValidation {
  /** Whether the export meets all requirements */
  isValid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of validation warnings */
  warnings: string[];
  /** Suggestions for improvement */
  suggestions: string[];
}

/**
 * File size estimate result
 */
export interface FileSizeEstimate {
  /** Estimated size in bytes */
  bytes: number;
  /** Formatted size string (e.g., "256 KB") */
  formatted: string;
  /** Whether estimate exceeds platform limit */
  exceedsLimit: boolean;
}

// ============================================================================
// Export State Types
// ============================================================================

/**
 * Export panel state for UI management
 */
export interface ExportPanelState {
  /** Currently selected platform preset */
  selectedPlatform: ExportPlatform;
  /** Current export options */
  options: ExportOptions;
  /** Whether export is in progress */
  isExporting: boolean;
  /** Preview URL for the export */
  previewUrl?: string;
  /** Last export result */
  lastResult?: ExportResult;
  /** Current validation state */
  validation?: ExportValidation;
}
