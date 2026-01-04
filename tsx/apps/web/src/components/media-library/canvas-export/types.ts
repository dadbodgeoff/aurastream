/**
 * Canvas Export Types
 * 
 * Types for rendering placement canvas to exportable images.
 * Enables single-image generation instead of multiple asset attachments.
 */

import type { AssetPlacement } from '../placement/types';

/**
 * Export quality settings
 */
export type ExportQuality = 'standard' | 'high' | 'ultra';

/**
 * Export format options
 */
export type ExportFormat = 'png' | 'jpeg' | 'webp';

/**
 * Canvas export configuration
 */
export interface CanvasExportConfig {
  /** Scale multiplier for export (2 = 2x resolution) */
  scale: number;
  /** Export format */
  format: ExportFormat;
  /** JPEG/WebP quality (0-1) */
  quality: number;
  /** Background color (null = transparent) */
  backgroundColor: string | null;
  /** Include grid overlay in export */
  includeGrid: boolean;
}

/**
 * Preset export configurations
 */
export const EXPORT_PRESETS: Record<ExportQuality, CanvasExportConfig> = {
  standard: {
    scale: 1,
    format: 'png',
    quality: 0.92,
    backgroundColor: null,
    includeGrid: false,
  },
  high: {
    scale: 2,
    format: 'png',
    quality: 0.95,
    backgroundColor: null,
    includeGrid: false,
  },
  ultra: {
    scale: 3,
    format: 'png',
    quality: 1,
    backgroundColor: null,
    includeGrid: false,
  },
};

/**
 * Canvas export result
 */
export interface CanvasExportResult {
  /** Exported image as Blob */
  blob: Blob;
  /** Data URL for preview */
  dataUrl: string;
  /** Export dimensions */
  width: number;
  height: number;
  /** File size in bytes */
  fileSize: number;
  /** Export timestamp */
  exportedAt: string;
}

/**
 * Canvas renderer props
 */
export interface CanvasRendererProps {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Asset placements to render */
  placements: AssetPlacement[];
  /** Export configuration */
  config?: Partial<CanvasExportConfig>;
  /** Callback when export is ready */
  onExportReady?: (exporter: () => Promise<CanvasExportResult>) => void;
  /** Optional className */
  className?: string;
}

/**
 * Sketch element types
 */
export type SketchElementType = 'freehand' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'sticker' | 'image';

/**
 * Line element (simple straight line without arrowhead)
 */
export interface LineElement extends SketchElement {
  type: 'line';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * Base sketch element
 */
export interface SketchElement {
  id: string;
  type: SketchElementType;
  zIndex: number;
  opacity: number;
  color: string;
  strokeWidth: number;
}

/**
 * Freehand drawing element
 */
export interface FreehandElement extends SketchElement {
  type: 'freehand';
  points: Array<{ x: number; y: number }>;
}

/**
 * Rectangle element
 */
export interface RectangleElement extends SketchElement {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  filled: boolean;
}

/**
 * Text annotation element
 */
export interface TextElement extends SketchElement {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
}

/**
 * Arrow element
 */
export interface ArrowElement extends SketchElement {
  type: 'arrow';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * Circle/ellipse element
 */
export interface CircleElement extends SketchElement {
  type: 'circle';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  filled: boolean;
}

/**
 * Sticker element
 */
export interface StickerElement extends SketchElement {
  type: 'sticker';
  x: number;
  y: number;
  width: number;
  height: number;
  /** Sticker ID from the sticker library */
  stickerId: string;
  /** Sticker content (emoji, SVG, or image URL) */
  content: string;
  /** Sticker type for rendering */
  stickerType: 'emoji' | 'svg' | 'image';
  /** Rotation in degrees */
  rotation: number;
}

/**
 * Image/Asset element for media library assets
 */
export interface ImageElement extends SketchElement {
  type: 'image';
  /** Center X position (percentage) */
  x: number;
  /** Center Y position (percentage) */
  y: number;
  /** Width (percentage) */
  width: number;
  /** Height (percentage) */
  height: number;
  /** Image URL */
  src: string;
  /** Thumbnail URL for preview */
  thumbnailSrc?: string;
  /** Original asset ID from media library */
  assetId?: string;
  /** Display name */
  displayName?: string;
  /** Rotation in degrees */
  rotation: number;
  /** Whether to maintain aspect ratio */
  maintainAspectRatio: boolean;
}

/**
 * Union type for all sketch elements
 */
export type AnySketchElement = FreehandElement | RectangleElement | TextElement | ArrowElement | CircleElement | LineElement | StickerElement | ImageElement;
