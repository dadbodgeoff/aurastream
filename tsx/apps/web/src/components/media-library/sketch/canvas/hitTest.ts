/**
 * Hit Testing Utilities
 * 
 * Functions for detecting element selection and resize handle hits.
 */

import type { AnySketchElement } from '../../canvas-export/types';
import { SELECTION_TOLERANCE } from '../constants';

/**
 * Calculate distance between two points
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Calculate distance from point to line segment
 */
export function pointToLineDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx: number;
  let yy: number;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  return distance(px, py, xx, yy);
}

/**
 * Hit test for element selection
 */
export function hitTest(
  x: number,
  y: number,
  element: AnySketchElement,
  tolerance: number = SELECTION_TOLERANCE
): boolean {
  switch (element.type) {
    case 'freehand': {
      for (let i = 1; i < element.points.length; i++) {
        const p1 = element.points[i - 1];
        const p2 = element.points[i];
        const d = pointToLineDistance(x, y, p1.x, p1.y, p2.x, p2.y);
        if (d < tolerance + element.strokeWidth / 2) return true;
      }
      return false;
    }
    
    case 'rectangle': {
      const { x: rx, y: ry, width, height, filled } = element;
      if (filled) {
        return x >= rx && x <= rx + width && y >= ry && y <= ry + height;
      }
      const nearLeft = Math.abs(x - rx) < tolerance && y >= ry && y <= ry + height;
      const nearRight = Math.abs(x - (rx + width)) < tolerance && y >= ry && y <= ry + height;
      const nearTop = Math.abs(y - ry) < tolerance && x >= rx && x <= rx + width;
      const nearBottom = Math.abs(y - (ry + height)) < tolerance && x >= rx && x <= rx + width;
      return nearLeft || nearRight || nearTop || nearBottom;
    }
    
    case 'circle': {
      const { cx, cy, rx: radiusX, ry: radiusY, filled } = element;
      if (radiusX === 0 || radiusY === 0) return false;
      const normalizedDist = Math.sqrt(
        Math.pow((x - cx) / radiusX, 2) + Math.pow((y - cy) / radiusY, 2)
      );
      if (filled) {
        return normalizedDist <= 1;
      }
      const toleranceNorm = tolerance / Math.min(radiusX, radiusY);
      return Math.abs(normalizedDist - 1) < toleranceNorm;
    }
    
    case 'line':
    case 'arrow': {
      const d = pointToLineDistance(x, y, element.startX, element.startY, element.endX, element.endY);
      return d < tolerance + element.strokeWidth / 2;
    }
    
    case 'text': {
      const textWidth = element.text.length * element.fontSize * 0.6;
      const textHeight = element.fontSize;
      return (
        x >= element.x &&
        x <= element.x + textWidth &&
        y >= element.y - textHeight &&
        y <= element.y
      );
    }
    
    case 'sticker': {
      return (
        x >= element.x - element.width / 2 &&
        x <= element.x + element.width / 2 &&
        y >= element.y - element.height / 2 &&
        y <= element.y + element.height / 2
      );
    }
    
    case 'image': {
      return (
        x >= element.x - element.width / 2 &&
        x <= element.x + element.width / 2 &&
        y >= element.y - element.height / 2 &&
        y <= element.y + element.height / 2
      );
    }
    
    default:
      return false;
  }
}

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

/**
 * Check if click is on a resize handle for image elements
 */
export function hitTestResizeHandle(
  x: number,
  y: number,
  element: AnySketchElement,
  handleRadius: number = 2
): ResizeHandle | null {
  if (element.type !== 'image') return null;
  
  const halfW = element.width / 2;
  const halfH = element.height / 2;
  
  const handles: Array<{ name: ResizeHandle; hx: number; hy: number }> = [
    { name: 'nw', hx: element.x - halfW, hy: element.y - halfH },
    { name: 'ne', hx: element.x + halfW, hy: element.y - halfH },
    { name: 'sw', hx: element.x - halfW, hy: element.y + halfH },
    { name: 'se', hx: element.x + halfW, hy: element.y + halfH },
  ];
  
  for (const handle of handles) {
    const dist = Math.sqrt((x - handle.hx) ** 2 + (y - handle.hy) ** 2);
    if (dist <= handleRadius) {
      return handle.name;
    }
  }
  
  return null;
}
