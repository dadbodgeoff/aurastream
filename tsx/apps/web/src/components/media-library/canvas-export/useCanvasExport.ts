/**
 * useCanvasExport Hook
 * 
 * Renders asset placements to an offscreen canvas and exports as image.
 * Enables single-image generation instead of multiple asset attachments.
 * 
 * @module canvas-export/useCanvasExport
 */

import { useCallback, useRef, useState } from 'react';
import type { AssetPlacement } from '../placement/types';
import type { 
  CanvasExportConfig, 
  CanvasExportResult, 
  ExportQuality,
  EXPORT_PRESETS,
  AnySketchElement,
} from './types';

const DEFAULT_CONFIG: CanvasExportConfig = {
  scale: 2,
  format: 'png',
  quality: 0.95,
  backgroundColor: null,
  includeGrid: false,
};

interface UseCanvasExportOptions {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Export configuration */
  config?: Partial<CanvasExportConfig>;
}

interface UseCanvasExportReturn {
  /** Export the canvas with current placements */
  exportCanvas: (
    placements: AssetPlacement[],
    sketchElements?: AnySketchElement[]
  ) => Promise<CanvasExportResult>;
  /** Whether export is in progress */
  isExporting: boolean;
  /** Last export error */
  error: Error | null;
  /** Last export result */
  lastExport: CanvasExportResult | null;
}

/**
 * Load an image from URL and return as HTMLImageElement
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Draw a single placement onto the canvas
 */
async function drawPlacement(
  ctx: CanvasRenderingContext2D,
  placement: AssetPlacement,
  canvasWidth: number,
  canvasHeight: number,
  scale: number
): Promise<void> {
  const { asset, position, size, rotation, opacity } = placement;
  
  // Get image URL (prefer processed/transparent version)
  const imageUrl = asset.processedUrl || asset.thumbnailUrl || asset.url;
  if (!imageUrl) return;
  
  try {
    const img = await loadImage(imageUrl);
    
    // Calculate actual pixel positions from percentages
    const x = (position.x / 100) * canvasWidth * scale;
    const y = (position.y / 100) * canvasHeight * scale;
    
    // Calculate size
    let drawWidth: number;
    let drawHeight: number;
    
    if (size.unit === 'percent') {
      drawWidth = (size.width / 100) * canvasWidth * scale;
      drawHeight = (size.height / 100) * canvasHeight * scale;
    } else {
      drawWidth = size.width * scale;
      drawHeight = size.height * scale;
    }
    
    // Save context state
    ctx.save();
    
    // Apply opacity
    ctx.globalAlpha = opacity / 100;
    
    // Move to position and apply rotation
    ctx.translate(x, y);
    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }
    
    // Draw image centered on position
    ctx.drawImage(
      img,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );
    
    // Restore context state
    ctx.restore();
  } catch (err) {
    console.warn(`Failed to draw placement for ${asset.displayName}:`, err);
  }
}

/**
 * Draw sketch elements onto the canvas
 */
function drawSketchElements(
  ctx: CanvasRenderingContext2D,
  elements: AnySketchElement[],
  canvasWidth: number,
  canvasHeight: number,
  scale: number
): void {
  // Sort by z-index
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
  
  for (const element of sorted) {
    ctx.save();
    ctx.globalAlpha = element.opacity / 100;
    ctx.strokeStyle = element.color;
    ctx.fillStyle = element.color;
    ctx.lineWidth = element.strokeWidth * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    switch (element.type) {
      case 'freehand': {
        if (element.points.length < 2) break;
        ctx.beginPath();
        const firstPoint = element.points[0];
        ctx.moveTo(
          (firstPoint.x / 100) * canvasWidth * scale,
          (firstPoint.y / 100) * canvasHeight * scale
        );
        for (let i = 1; i < element.points.length; i++) {
          const point = element.points[i];
          ctx.lineTo(
            (point.x / 100) * canvasWidth * scale,
            (point.y / 100) * canvasHeight * scale
          );
        }
        ctx.stroke();
        break;
      }
      
      case 'rectangle': {
        const rx = (element.x / 100) * canvasWidth * scale;
        const ry = (element.y / 100) * canvasHeight * scale;
        const rw = (element.width / 100) * canvasWidth * scale;
        const rh = (element.height / 100) * canvasHeight * scale;
        
        if (element.filled) {
          ctx.fillRect(rx, ry, rw, rh);
        } else {
          ctx.strokeRect(rx, ry, rw, rh);
        }
        break;
      }
      
      case 'circle': {
        const cx = (element.cx / 100) * canvasWidth * scale;
        const cy = (element.cy / 100) * canvasHeight * scale;
        const radiusX = (element.rx / 100) * canvasWidth * scale;
        const radiusY = (element.ry / 100) * canvasHeight * scale;
        
        ctx.beginPath();
        ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
        if (element.filled) {
          ctx.fill();
        }
        ctx.stroke();
        break;
      }
      
      case 'line': {
        const lsx = (element.startX / 100) * canvasWidth * scale;
        const lsy = (element.startY / 100) * canvasHeight * scale;
        const lex = (element.endX / 100) * canvasWidth * scale;
        const ley = (element.endY / 100) * canvasHeight * scale;
        
        ctx.beginPath();
        ctx.moveTo(lsx, lsy);
        ctx.lineTo(lex, ley);
        ctx.stroke();
        break;
      }
      
      case 'text': {
        const tx = (element.x / 100) * canvasWidth * scale;
        const ty = (element.y / 100) * canvasHeight * scale;
        ctx.font = `${element.fontSize * scale}px ${element.fontFamily}`;
        ctx.fillText(element.text, tx, ty);
        break;
      }
      
      case 'arrow': {
        const sx = (element.startX / 100) * canvasWidth * scale;
        const sy = (element.startY / 100) * canvasHeight * scale;
        const ex = (element.endX / 100) * canvasWidth * scale;
        const ey = (element.endY / 100) * canvasHeight * scale;
        
        // Draw line
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        
        // Draw arrowhead
        const angle = Math.atan2(ey - sy, ex - sx);
        const headLength = 15 * scale;
        
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(
          ex - headLength * Math.cos(angle - Math.PI / 6),
          ey - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(ex, ey);
        ctx.lineTo(
          ex - headLength * Math.cos(angle + Math.PI / 6),
          ey - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
        break;
      }
    }
    
    ctx.restore();
  }
}

/**
 * Hook for exporting placement canvas to image
 */
export function useCanvasExport({
  width,
  height,
  config: userConfig,
}: UseCanvasExportOptions): UseCanvasExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastExport, setLastExport] = useState<CanvasExportResult | null>(null);
  
  const config: CanvasExportConfig = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };
  
  const exportCanvas = useCallback(async (
    placements: AssetPlacement[],
    sketchElements?: AnySketchElement[]
  ): Promise<CanvasExportResult> => {
    setIsExporting(true);
    setError(null);
    
    try {
      // Create offscreen canvas at scaled resolution
      const canvas = document.createElement('canvas');
      const scaledWidth = width * config.scale;
      const scaledHeight = height * config.scale;
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      // Fill background if specified
      if (config.backgroundColor) {
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, 0, scaledWidth, scaledHeight);
      }
      
      // Sort placements by z-index
      const sortedPlacements = [...placements].sort((a, b) => a.zIndex - b.zIndex);
      
      // Draw each placement
      for (const placement of sortedPlacements) {
        await drawPlacement(ctx, placement, width, height, config.scale);
      }
      
      // Draw sketch elements if provided
      if (sketchElements && sketchElements.length > 0) {
        drawSketchElements(ctx, sketchElements, width, height, config.scale);
      }
      
      // Export to blob
      const mimeType = `image/${config.format}`;
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create blob'));
          },
          mimeType,
          config.quality
        );
      });
      
      // Create data URL for preview
      const dataUrl = canvas.toDataURL(mimeType, config.quality);
      
      const result: CanvasExportResult = {
        blob,
        dataUrl,
        width: scaledWidth,
        height: scaledHeight,
        fileSize: blob.size,
        exportedAt: new Date().toISOString(),
      };
      
      setLastExport(result);
      return result;
      
    } catch (err) {
      const exportError = err instanceof Error ? err : new Error('Export failed');
      setError(exportError);
      throw exportError;
    } finally {
      setIsExporting(false);
    }
  }, [width, height, config]);
  
  return {
    exportCanvas,
    isExporting,
    error,
    lastExport,
  };
}

export default useCanvasExport;
