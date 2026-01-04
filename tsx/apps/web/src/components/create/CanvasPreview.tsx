/**
 * CanvasPreview Component
 * 
 * Shows a live preview of the canvas composition that will be sent to AI.
 * Renders asset placements and sketch elements on a scaled-down canvas.
 * 
 * @module create/CanvasPreview
 */

'use client';

import { useRef, useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import type { AssetPlacement } from '../media-library/placement/types';
import type { AnySketchElement } from '../media-library/canvas-export/types';
import { getCanvasDimensions } from '../media-library/placement/constants';

// ============================================================================
// Types
// ============================================================================

export interface CanvasPreviewProps {
  /** Asset placements to render */
  placements: AssetPlacement[];
  /** Sketch elements to render */
  sketchElements: AnySketchElement[];
  /** Asset type for determining canvas dimensions */
  assetType?: string;
  /** Canvas width override (default: from assetType or 1280) */
  width?: number;
  /** Canvas height override (default: from assetType or 720) */
  height?: number;
  /** Preview scale factor (default: 0.25) */
  scale?: number;
  /** Additional className */
  className?: string;
}

// ============================================================================
// CanvasPreview Component
// ============================================================================

export function CanvasPreview({
  placements,
  sketchElements,
  assetType,
  width: widthOverride,
  height: heightOverride,
  scale = 0.25,
  className,
}: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map());
  
  // Get dimensions from asset type or use overrides/defaults
  const dimensions = assetType ? getCanvasDimensions(assetType) : null;
  const width = widthOverride ?? dimensions?.width ?? 1280;
  const height = heightOverride ?? dimensions?.height ?? 720;
  
  // Load images for placements
  useEffect(() => {
    const loadAllImages = async () => {
      const imageMap = new Map<string, HTMLImageElement>();
      
      for (const placement of placements) {
        const url = placement.asset.processedUrl || placement.asset.thumbnailUrl || placement.asset.url;
        if (!url || imageMap.has(url)) continue;
        
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = url;
          });
          imageMap.set(url, img);
        } catch {
          console.warn(`Failed to load image for preview`);
        }
      }
      
      setLoadedImages(imageMap);
    };
    
    if (placements.length > 0) {
      loadAllImages();
    } else {
      setLoadedImages(new Map());
    }
  }, [placements]);
  
  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size (scaled down for preview)
    canvas.width = width * scale;
    canvas.height = height * scale;
    
    // Clear with dark background to show transparency
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid pattern to indicate canvas area
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Sort and draw placements by z-index
    const sortedPlacements = [...placements].sort((a, b) => a.zIndex - b.zIndex);
    
    for (const placement of sortedPlacements) {
      const { asset, position, size, rotation, opacity } = placement;
      const url = asset.processedUrl || asset.thumbnailUrl || asset.url;
      const img = url ? loadedImages.get(url) : null;
      
      if (!img) continue;
      
      const x = (position.x / 100) * canvas.width;
      const y = (position.y / 100) * canvas.height;
      
      const drawWidth = (size.width / 100) * canvas.width;
      const drawHeight = (size.height / 100) * canvas.height;
      
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
            (element.points[0].x / 100) * canvas.width,
            (element.points[0].y / 100) * canvas.height
          );
          for (let i = 1; i < element.points.length; i++) {
            ctx.lineTo(
              (element.points[i].x / 100) * canvas.width,
              (element.points[i].y / 100) * canvas.height
            );
          }
          ctx.stroke();
          break;
        }
        case 'rectangle': {
          const rx = (element.x / 100) * canvas.width;
          const ry = (element.y / 100) * canvas.height;
          const rw = (element.width / 100) * canvas.width;
          const rh = (element.height / 100) * canvas.height;
          element.filled ? ctx.fillRect(rx, ry, rw, rh) : ctx.strokeRect(rx, ry, rw, rh);
          break;
        }
        case 'circle': {
          const cx = (element.cx / 100) * canvas.width;
          const cy = (element.cy / 100) * canvas.height;
          const radiusX = (element.rx / 100) * canvas.width;
          const radiusY = (element.ry / 100) * canvas.height;
          ctx.beginPath();
          ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
          if (element.filled) ctx.fill();
          ctx.stroke();
          break;
        }
        case 'arrow': {
          const sx = (element.startX / 100) * canvas.width;
          const sy = (element.startY / 100) * canvas.height;
          const ex = (element.endX / 100) * canvas.width;
          const ey = (element.endY / 100) * canvas.height;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          // Draw arrowhead
          const angle = Math.atan2(ey - sy, ex - sx);
          const headLen = 8 * scale;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
          break;
        }
        case 'text': {
          ctx.font = `${element.fontSize * scale}px ${element.fontFamily}`;
          ctx.fillText(
            element.text,
            (element.x / 100) * canvas.width,
            (element.y / 100) * canvas.height
          );
          break;
        }
      }
      ctx.restore();
    }
  }, [placements, sketchElements, loadedImages, width, height, scale]);
  
  // Don't render if nothing to show
  if (placements.length === 0 && sketchElements.length === 0) {
    return null;
  }
  
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <Eye className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-medium text-emerald-400">Canvas Preview</span>
        <span className="text-xs text-text-tertiary ml-auto">Visual reference for AI</span>
      </div>
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          className="rounded-lg border border-emerald-500/30"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
      <p className="text-xs text-text-tertiary mt-2 text-center">
        {placements.length} asset{placements.length !== 1 ? 's' : ''} • {sketchElements.length} sketch element{sketchElements.length !== 1 ? 's' : ''}
      </p>
      <p className="text-xs text-emerald-400/80 mt-1 text-center italic">
        AI will adapt this layout to match your prompt
      </p>
    </div>
  );
}

export default CanvasPreview;
