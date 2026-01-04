/**
 * Canvas Export Module
 * 
 * Provides functionality to render placement canvas to exportable images.
 * Enables single-image generation instead of multiple asset attachments.
 * 
 * @module canvas-export
 */

export { CanvasRenderer } from './CanvasRenderer';
export type { CanvasRendererHandle } from './CanvasRenderer';

export { useCanvasExport } from './useCanvasExport';

export type {
  ExportQuality,
  ExportFormat,
  CanvasExportConfig,
  CanvasExportResult,
  CanvasRendererProps,
  SketchElementType,
  SketchElement,
  FreehandElement,
  RectangleElement,
  CircleElement,
  LineElement,
  TextElement,
  ArrowElement,
  AnySketchElement,
} from './types';

export { EXPORT_PRESETS } from './types';
