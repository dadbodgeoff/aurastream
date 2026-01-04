/**
 * CanvasRenderer Component
 * 
 * Renders asset placements to an HTML5 canvas for export.
 * Provides both visual preview and export functionality.
 * 
 * @module canvas-export/CanvasRenderer
 */

'use client';

import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import type { AssetPlacement } from '../placement/types';
import type { CanvasExportConfig, CanvasExportResult, AnySketchElement } from './types';

const DEFAULT_CONFIG: CanvasExportConfig = {
  scale: 2,
  format: 'png',
  quality: 0.95,
  backgroundColor: null,
  includeGrid: false,
};

interface CanvasRendererProps {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Asset placements to render */
  placements: AssetPlacement[];
  /** Sketch elements to render */
  sketchElements?: AnySketchElement[];
  /** Export configuration */
  config?: Partial<CanvasExportConfig>;
  /** Show canvas preview (vs hidden for export only) */
  showPreview?: boolean;
  /** Optional className */
  className?: string;
}

export interface CanvasRendererHandle {
  /** Export canvas to image */
  export: () => Promise<CanvasExportResult>;
  /** Get canvas element */
  getCanvas: () => HTMLCanvasElement | null;
}

/**
 * Load image with CORS support
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${url}`));
    img.src = url;
  });
}

/**
 * CanvasRenderer - Renders placements to exportable canvas
 */
export const CanvasRenderer = forwardRef<CanvasRendererHandle, CanvasRendererProps>(
  function CanvasRenderer(
    {
      width,
      height,
      placements,
      sketchElements = [],
      config: userConfig,
      showPreview = false,
      className,
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map());
    const [isRendering, setIsRendering] = useState(false);
    
    const config: CanvasExportConfig = {
      ...DEFAULT_CONFIG,
      ...userConfig,
    };
    
    // Preload all placement images
    useEffect(() => {
      const loadAllImages = async () => {
        const imageMap = new Map<string, HTMLImageElement>();
        
        for (const placement of placements) {
          const url = placement.asset.processedUrl || placement.asset.thumbnailUrl || placement.asset.url;
          if (!url || imageMap.has(url)) continue;
          
          try {
            const img = await loadImage(url);
            imageMap.set(url, img);
          } catch (err) {
            console.warn(`Failed to preload image for ${placement.asset.displayName}`);
          }
        }
        
        setLoadedImages(imageMap);
      };
      
      loadAllImages();
    }, [placements]);
    
    // Render to canvas
    const render = useCallback((scale: number = 1) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      
      // Set canvas size
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      
      // Clear canvas
      ctx.clearRect(0, 0, scaledWidth, scaledHeight);
      
      // Fill background if specified
      if (config.backgroundColor) {
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, 0, scaledWidth, scaledHeight);
      }
      
      // Sort placements by z-index
      const sortedPlacements = [...placements].sort((a, b) => a.zIndex - b.zIndex);
      
      // Draw each placement
      for (const placement of sortedPlacements) {
        const { asset, position, size, rotation, opacity } = placement;
        const url = asset.processedUrl || asset.thumbnailUrl || asset.url;
        const img = url ? loadedImages.get(url) : null;
        
        if (!img) continue;
        
        // Calculate positions
        const x = (position.x / 100) * scaledWidth;
        const y = (position.y / 100) * scaledHeight;
        
        let drawWidth: number;
        let drawHeight: number;
        
        if (size.unit === 'percent') {
          drawWidth = (size.width / 100) * scaledWidth;
          drawHeight = (size.height / 100) * scaledHeight;
        } else {
          drawWidth = size.width * scale;
          drawHeight = size.height * scale;
        }
        
        ctx.save();
        ctx.globalAlpha = opacity / 100;
        ctx.translate(x, y);
        
        if (rotation !== 0) {
          ctx.rotate((rotation * Math.PI) / 180);
        }
        
        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();
      }
      
      // Draw sketch elements
      const sortedSketch = [...sketchElements].sort((a, b) => a.zIndex - b.zIndex);
      
      for (const element of sortedSketch) {
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
            ctx.moveTo(
              (element.points[0].x / 100) * scaledWidth,
              (element.points[0].y / 100) * scaledHeight
            );
            for (let i = 1; i < element.points.length; i++) {
              ctx.lineTo(
                (element.points[i].x / 100) * scaledWidth,
                (element.points[i].y / 100) * scaledHeight
              );
            }
            ctx.stroke();
            break;
          }
          
          case 'rectangle': {
            const rx = (element.x / 100) * scaledWidth;
            const ry = (element.y / 100) * scaledHeight;
            const rw = (element.width / 100) * scaledWidth;
            const rh = (element.height / 100) * scaledHeight;
            
            if (element.filled) {
              ctx.fillRect(rx, ry, rw, rh);
            } else {
              ctx.strokeRect(rx, ry, rw, rh);
            }
            break;
          }
          
          case 'circle': {
            const cx = (element.cx / 100) * scaledWidth;
            const cy = (element.cy / 100) * scaledHeight;
            const radiusX = (element.rx / 100) * scaledWidth;
            const radiusY = (element.ry / 100) * scaledHeight;
            
            ctx.beginPath();
            ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
            if (element.filled) {
              ctx.fill();
            }
            ctx.stroke();
            break;
          }
          
          case 'line': {
            const sx = (element.startX / 100) * scaledWidth;
            const sy = (element.startY / 100) * scaledHeight;
            const ex = (element.endX / 100) * scaledWidth;
            const ey = (element.endY / 100) * scaledHeight;
            
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            break;
          }
          
          case 'text': {
            ctx.font = `${element.fontSize * scale}px ${element.fontFamily}`;
            ctx.fillText(
              element.text,
              (element.x / 100) * scaledWidth,
              (element.y / 100) * scaledHeight
            );
            break;
          }
          
          case 'arrow': {
            const sx = (element.startX / 100) * scaledWidth;
            const sy = (element.startY / 100) * scaledHeight;
            const ex = (element.endX / 100) * scaledWidth;
            const ey = (element.endY / 100) * scaledHeight;
            
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            
            // Arrowhead
            const angle = Math.atan2(ey - sy, ex - sx);
            const headLen = 15 * scale;
            
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(
              ex - headLen * Math.cos(angle - Math.PI / 6),
              ey - headLen * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(ex, ey);
            ctx.lineTo(
              ex - headLen * Math.cos(angle + Math.PI / 6),
              ey - headLen * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
            break;
          }
          
          case 'image': {
            // Image elements are rendered as placements, skip here
            // They're converted back to placements before save
            break;
          }
        }
        
        ctx.restore();
      }
    }, [width, height, placements, sketchElements, loadedImages, config.backgroundColor]);
    
    // Re-render when images load or placements change
    useEffect(() => {
      if (showPreview && loadedImages.size > 0) {
        render(1);
      }
    }, [showPreview, loadedImages, render]);
    
    // Export function
    const exportCanvas = useCallback(async (): Promise<CanvasExportResult> => {
      setIsRendering(true);
      
      try {
        // Create offscreen canvas at export scale
        const exportCanvas = document.createElement('canvas');
        const scaledWidth = width * config.scale;
        const scaledHeight = height * config.scale;
        exportCanvas.width = scaledWidth;
        exportCanvas.height = scaledHeight;
        
        const ctx = exportCanvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');
        
        // Clear and fill background
        ctx.clearRect(0, 0, scaledWidth, scaledHeight);
        if (config.backgroundColor) {
          ctx.fillStyle = config.backgroundColor;
          ctx.fillRect(0, 0, scaledWidth, scaledHeight);
        }
        
        // Sort and draw placements
        const sortedPlacements = [...placements].sort((a, b) => a.zIndex - b.zIndex);
        
        for (const placement of sortedPlacements) {
          const { asset, position, size, rotation, opacity } = placement;
          const url = asset.processedUrl || asset.thumbnailUrl || asset.url;
          
          if (!url) continue;
          
          // Load image fresh for export (ensures CORS)
          let img: HTMLImageElement;
          try {
            img = await loadImage(url);
          } catch {
            console.warn(`Skipping ${asset.displayName} - failed to load`);
            continue;
          }
          
          const x = (position.x / 100) * scaledWidth;
          const y = (position.y / 100) * scaledHeight;
          
          let drawWidth: number;
          let drawHeight: number;
          
          if (size.unit === 'percent') {
            drawWidth = (size.width / 100) * scaledWidth;
            drawHeight = (size.height / 100) * scaledHeight;
          } else {
            drawWidth = size.width * config.scale;
            drawHeight = size.height * config.scale;
          }
          
          ctx.save();
          ctx.globalAlpha = opacity / 100;
          ctx.translate(x, y);
          
          if (rotation !== 0) {
            ctx.rotate((rotation * Math.PI) / 180);
          }
          
          ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
          ctx.restore();
        }
        
        // Draw sketch elements at export scale
        const sortedSketch = [...sketchElements].sort((a, b) => a.zIndex - b.zIndex);
        
        for (const element of sortedSketch) {
          ctx.save();
          ctx.globalAlpha = element.opacity / 100;
          ctx.strokeStyle = element.color;
          ctx.fillStyle = element.color;
          ctx.lineWidth = element.strokeWidth * config.scale;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // Same drawing logic as render()
          switch (element.type) {
            case 'freehand': {
              if (element.points.length < 2) break;
              ctx.beginPath();
              ctx.moveTo(
                (element.points[0].x / 100) * scaledWidth,
                (element.points[0].y / 100) * scaledHeight
              );
              for (let i = 1; i < element.points.length; i++) {
                ctx.lineTo(
                  (element.points[i].x / 100) * scaledWidth,
                  (element.points[i].y / 100) * scaledHeight
                );
              }
              ctx.stroke();
              break;
            }
            case 'rectangle': {
              const rx = (element.x / 100) * scaledWidth;
              const ry = (element.y / 100) * scaledHeight;
              const rw = (element.width / 100) * scaledWidth;
              const rh = (element.height / 100) * scaledHeight;
              element.filled ? ctx.fillRect(rx, ry, rw, rh) : ctx.strokeRect(rx, ry, rw, rh);
              break;
            }
            case 'circle': {
              const cx = (element.cx / 100) * scaledWidth;
              const cy = (element.cy / 100) * scaledHeight;
              const radiusX = (element.rx / 100) * scaledWidth;
              const radiusY = (element.ry / 100) * scaledHeight;
              ctx.beginPath();
              ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
              if (element.filled) ctx.fill();
              ctx.stroke();
              break;
            }
            case 'line': {
              const lsx = (element.startX / 100) * scaledWidth;
              const lsy = (element.startY / 100) * scaledHeight;
              const lex = (element.endX / 100) * scaledWidth;
              const ley = (element.endY / 100) * scaledHeight;
              ctx.beginPath();
              ctx.moveTo(lsx, lsy);
              ctx.lineTo(lex, ley);
              ctx.stroke();
              break;
            }
            case 'text': {
              ctx.font = `${element.fontSize * config.scale}px ${element.fontFamily}`;
              ctx.fillText(
                element.text,
                (element.x / 100) * scaledWidth,
                (element.y / 100) * scaledHeight
              );
              break;
            }
            case 'arrow': {
              const sx = (element.startX / 100) * scaledWidth;
              const sy = (element.startY / 100) * scaledHeight;
              const ex = (element.endX / 100) * scaledWidth;
              const ey = (element.endY / 100) * scaledHeight;
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(ex, ey);
              ctx.stroke();
              const angle = Math.atan2(ey - sy, ex - sx);
              const headLen = 15 * config.scale;
              ctx.beginPath();
              ctx.moveTo(ex, ey);
              ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
              ctx.moveTo(ex, ey);
              ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
              ctx.stroke();
              break;
            }
            case 'image': {
              // Image elements are rendered as placements, skip here
              break;
            }
          }
          ctx.restore();
        }
        
        // Export to blob
        const mimeType = `image/${config.format}`;
        const blob = await new Promise<Blob>((resolve, reject) => {
          exportCanvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Blob creation failed'))),
            mimeType,
            config.quality
          );
        });
        
        const dataUrl = exportCanvas.toDataURL(mimeType, config.quality);
        
        return {
          blob,
          dataUrl,
          width: scaledWidth,
          height: scaledHeight,
          fileSize: blob.size,
          exportedAt: new Date().toISOString(),
        };
      } finally {
        setIsRendering(false);
      }
    }, [width, height, placements, sketchElements, config]);
    
    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      export: exportCanvas,
      getCanvas: () => canvasRef.current,
    }), [exportCanvas]);
    
    if (!showPreview) {
      return null;
    }
    
    return (
      <canvas
        ref={canvasRef}
        className={cn('max-w-full h-auto', className)}
        style={{
          aspectRatio: `${width} / ${height}`,
        }}
      />
    );
  }
);

export default CanvasRenderer;
