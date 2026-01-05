/**
 * Canvas Coordinate Utilities
 * 
 * Functions for converting between screen and canvas coordinates.
 */

import type { DrawingEvent } from '../types';

/**
 * Get canvas-relative coordinates from mouse/touch event
 * Returns coordinates as percentages (0-100)
 */
export function getCanvasCoords(
  e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent,
  canvas: HTMLDivElement
): DrawingEvent {
  const rect = canvas.getBoundingClientRect();
  
  let clientX: number;
  let clientY: number;
  
  if ('touches' in e) {
    const touch = e.touches[0] || e.changedTouches[0];
    clientX = touch.clientX;
    clientY = touch.clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  
  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
    shiftKey: 'shiftKey' in e ? e.shiftKey : false,
  };
}

/**
 * Convert percentage to viewBox pixel coordinates
 */
export function toViewBoxX(pct: number, width: number): number {
  return (pct / 100) * width;
}

export function toViewBoxY(pct: number, height: number): number {
  return (pct / 100) * height;
}
