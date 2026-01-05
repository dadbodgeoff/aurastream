/**
 * Platform Export Module
 * 
 * Multi-format export logic for Canvas Studio.
 * Handles canvas-to-image conversion, platform-specific exports,
 * filename generation, and export validation.
 */

import type {
  ExportFormat,
  ExportOptions,
  ExportPlatform,
  ExportResult,
  ExportValidation,
  FileSizeEstimate,
} from './types';
import {
  getPresetById,
  getFormatMimeType,
  getFormatExtension,
  formatSupportsTransparency,
} from './ExportPresets';

// ============================================================================
// Canvas Export Functions
// ============================================================================

/**
 * Export a canvas element to the specified format
 * 
 * @param canvas - HTML Canvas element to export
 * @param options - Export options (format, quality, scale)
 * @returns Promise resolving to ExportResult
 */
export async function exportToFormat(
  canvas: HTMLCanvasElement,
  options: ExportOptions
): Promise<ExportResult> {
  const { format, quality, scale } = options;
  
  // Create a scaled canvas if needed
  const exportCanvas = scale !== 1 
    ? createScaledCanvas(canvas, scale)
    : canvas;
  
  // Get MIME type for the format
  const mimeType = getFormatMimeType(format);
  
  // Convert quality from 0-100 to 0-1 for canvas API
  const qualityValue = quality / 100;
  
  // Export to data URL
  const dataUrl = exportCanvas.toDataURL(mimeType, qualityValue);
  
  // Convert to blob
  const blob = await dataUrlToBlob(dataUrl);
  
  // Generate filename
  const filename = generateFilename(options.platform || 'custom', format);
  
  return {
    dataUrl,
    blob,
    filename,
    format,
    dimensions: {
      width: exportCanvas.width,
      height: exportCanvas.height,
    },
    fileSize: blob.size,
  };
}

/**
 * Export canvas with platform-specific preset settings
 * 
 * @param canvas - HTML Canvas element to export
 * @param platform - Target platform preset
 * @returns Promise resolving to ExportResult
 */
export async function exportForPlatform(
  canvas: HTMLCanvasElement,
  platform: ExportPlatform
): Promise<ExportResult> {
  const preset = getPresetById(platform);
  
  if (!preset) {
    throw new Error(`Unknown platform preset: ${platform}`);
  }
  
  // Calculate scale to match preset dimensions
  const scaleX = preset.dimensions.width / canvas.width;
  const scaleY = preset.dimensions.height / canvas.height;
  const scale = Math.min(scaleX, scaleY);
  
  const options: ExportOptions = {
    format: preset.format,
    quality: preset.quality,
    scale,
    platform,
  };
  
  return exportToFormat(canvas, options);
}

/**
 * Export all size variants for a platform (e.g., Twitch emotes)
 * 
 * @param canvas - HTML Canvas element to export
 * @param platform - Target platform preset
 * @returns Promise resolving to array of ExportResults
 */
export async function exportAllVariants(
  canvas: HTMLCanvasElement,
  platform: ExportPlatform
): Promise<ExportResult[]> {
  const preset = getPresetById(platform);
  
  if (!preset) {
    throw new Error(`Unknown platform preset: ${platform}`);
  }
  
  // If no variants, just export the main size
  if (!preset.variants || preset.variants.length === 0) {
    const result = await exportForPlatform(canvas, platform);
    return [result];
  }
  
  // Export each variant
  const results: ExportResult[] = [];
  
  for (const variant of preset.variants) {
    const scaledCanvas = resizeCanvas(canvas, variant.width, variant.height);
    
    const options: ExportOptions = {
      format: preset.format,
      quality: preset.quality,
      scale: 1,
      platform,
    };
    
    const dataUrl = scaledCanvas.toDataURL(
      getFormatMimeType(preset.format),
      preset.quality / 100
    );
    
    const blob = await dataUrlToBlob(dataUrl);
    const filename = generateFilename(platform, preset.format, variant.label);
    
    results.push({
      dataUrl,
      blob,
      filename,
      format: preset.format,
      dimensions: { width: variant.width, height: variant.height },
      fileSize: blob.size,
    });
  }
  
  return results;
}

// ============================================================================
// Filename Generation
// ============================================================================

/**
 * Generate an appropriate filename for the export
 * 
 * @param platform - Target platform
 * @param format - Export format
 * @param variant - Optional variant label (e.g., "112x112")
 * @returns Generated filename
 */
export function generateFilename(
  platform: ExportPlatform,
  format: ExportFormat,
  variant?: string
): string {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const extension = getFormatExtension(format);
  
  // Platform-specific naming
  const platformNames: Record<ExportPlatform, string> = {
    youtube_thumbnail: 'youtube-thumbnail',
    twitch_emote: 'twitch-emote',
    twitch_badge: 'twitch-badge',
    twitch_panel: 'twitch-panel',
    twitch_banner: 'twitch-banner',
    twitch_offline: 'twitch-offline',
    instagram_story: 'instagram-story',
    instagram_post: 'instagram-post',
    tiktok_story: 'tiktok-story',
    discord_emoji: 'discord-emoji',
    discord_banner: 'discord-banner',
    custom: 'canvas-export',
  };
  
  const baseName = platformNames[platform] || 'export';
  const variantSuffix = variant ? `-${variant.replace(/[×x]/g, 'x').replace(/[^a-z0-9x]/gi, '')}` : '';
  
  return `${baseName}${variantSuffix}-${timestamp}.${extension}`;
}

// ============================================================================
// Export Validation
// ============================================================================

/**
 * Validate an export result against platform requirements
 * 
 * @param result - Export result to validate
 * @param platform - Target platform
 * @returns Validation result with errors, warnings, and suggestions
 */
export function validateExport(
  result: ExportResult,
  platform: ExportPlatform
): ExportValidation {
  const preset = getPresetById(platform);
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  if (!preset) {
    return {
      isValid: true,
      errors: [],
      warnings: ['Unknown platform - validation skipped'],
      suggestions: [],
    };
  }
  
  // Check file size
  if (preset.maxFileSize) {
    const maxBytes = preset.maxFileSize * 1024;
    if (result.fileSize > maxBytes) {
      errors.push(
        `File size (${formatFileSize(result.fileSize)}) exceeds ${platform} limit of ${preset.maxFileSize}KB`
      );
      suggestions.push('Try reducing quality or dimensions');
    } else if (result.fileSize > maxBytes * 0.9) {
      warnings.push(
        `File size is close to ${platform} limit (${Math.round((result.fileSize / maxBytes) * 100)}%)`
      );
    }
  }
  
  // Check dimensions
  const { width, height } = result.dimensions;
  const { width: targetWidth, height: targetHeight } = preset.dimensions;
  
  if (width !== targetWidth || height !== targetHeight) {
    warnings.push(
      `Dimensions (${width}×${height}) differ from recommended ${targetWidth}×${targetHeight}`
    );
  }
  
  // Check format compatibility
  if (result.format !== preset.format) {
    if (preset.supportsTransparency && !formatSupportsTransparency(result.format)) {
      warnings.push(
        `${result.format.toUpperCase()} doesn't support transparency - consider using PNG`
      );
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

// ============================================================================
// File Size Estimation
// ============================================================================

/**
 * Estimate file size for given export parameters
 * This is an approximation based on typical compression ratios
 * 
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param format - Export format
 * @param quality - Quality level (0-100)
 * @returns File size estimate
 */
export function getFileSizeEstimate(
  width: number,
  height: number,
  format: ExportFormat,
  quality: number
): FileSizeEstimate {
  // Base calculation: uncompressed RGBA
  const uncompressedSize = width * height * 4;
  
  // Compression ratios (approximate)
  const compressionRatios: Record<ExportFormat, (q: number) => number> = {
    png: () => 0.3, // PNG compression is quality-independent
    jpg: (q) => 0.05 + (q / 100) * 0.15, // JPG varies with quality
    webp: (q) => 0.03 + (q / 100) * 0.12, // WebP is more efficient
  };
  
  const ratio = compressionRatios[format](quality);
  const estimatedBytes = Math.round(uncompressedSize * ratio);
  
  return {
    bytes: estimatedBytes,
    formatted: formatFileSize(estimatedBytes),
    exceedsLimit: false, // Will be set by caller if needed
  };
}

/**
 * Estimate file size with platform limit check
 * 
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param format - Export format
 * @param quality - Quality level (0-100)
 * @param platform - Target platform for limit check
 * @returns File size estimate with limit check
 */
export function getFileSizeEstimateForPlatform(
  width: number,
  height: number,
  format: ExportFormat,
  quality: number,
  platform: ExportPlatform
): FileSizeEstimate {
  const estimate = getFileSizeEstimate(width, height, format, quality);
  const preset = getPresetById(platform);
  
  if (preset?.maxFileSize) {
    estimate.exceedsLimit = estimate.bytes > preset.maxFileSize * 1024;
  }
  
  return estimate;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a scaled copy of a canvas
 * 
 * @param canvas - Source canvas
 * @param scale - Scale factor
 * @returns New scaled canvas
 */
function createScaledCanvas(
  canvas: HTMLCanvasElement,
  scale: number
): HTMLCanvasElement {
  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = Math.round(canvas.width * scale);
  scaledCanvas.height = Math.round(canvas.height * scale);
  
  const ctx = scaledCanvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
  }
  
  return scaledCanvas;
}

/**
 * Resize a canvas to specific dimensions
 * 
 * @param canvas - Source canvas
 * @param width - Target width
 * @param height - Target height
 * @returns New resized canvas
 */
function resizeCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): HTMLCanvasElement {
  const resizedCanvas = document.createElement('canvas');
  resizedCanvas.width = width;
  resizedCanvas.height = height;
  
  const ctx = resizedCanvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, width, height);
  }
  
  return resizedCanvas;
}

/**
 * Convert a data URL to a Blob
 * 
 * @param dataUrl - Data URL string
 * @returns Promise resolving to Blob
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Format file size in human-readable format
 * 
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "256 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

/**
 * Trigger a file download
 * 
 * @param blob - Blob to download
 * @param filename - Filename for the download
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download an export result
 * 
 * @param result - Export result to download
 */
export function downloadExportResult(result: ExportResult): void {
  downloadBlob(result.blob, result.filename);
}
