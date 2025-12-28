'use client';

/**
 * usePinchZoom Hook
 * 
 * A comprehensive hook for handling pinch-to-zoom, pan, and wheel zoom gestures.
 * Designed for mobile-first enterprise UX with accessibility support.
 * 
 * Features:
 * - Pinch-to-zoom on touch devices
 * - Wheel zoom on desktop
 * - Double-tap to zoom/reset
 * - Pan when zoomed in
 * - Smooth animations with reduced motion support
 * - Constrained zoom levels
 * 
 * @example
 * ```tsx
 * function ZoomableImage() {
 *   const { handlers, state, reset } = usePinchZoom({
 *     minScale: 1,
 *     maxScale: 4,
 *     doubleTapZoom: true,
 *     wheelZoom: true,
 *   });
 * 
 *   return (
 *     <div {...handlers}>
 *       <img
 *         src="/image.png"
 *         style={{
 *           transform: `scale(${state.scale}) translate(${state.offset.x}px, ${state.offset.y}px)`,
 *         }}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type { TouchEvent, WheelEvent, MouseEvent } from 'react';

/**
 * Configuration options for the usePinchZoom hook
 */
export interface UsePinchZoomOptions {
  /** Minimum scale level (default: 1) */
  minScale?: number;
  /** Maximum scale level (default: 4) */
  maxScale?: number;
  /** Enable double-tap to zoom (default: true) */
  doubleTapZoom?: boolean;
  /** Scale level for double-tap zoom (default: 2) */
  doubleTapScale?: number;
  /** Enable wheel zoom on desktop (default: true) */
  wheelZoom?: boolean;
  /** Wheel zoom sensitivity (default: 0.1) */
  wheelSensitivity?: number;
  /** Initial scale (default: 1) */
  initialScale?: number;
  /** Initial offset (default: { x: 0, y: 0 }) */
  initialOffset?: { x: number; y: number };
  /** Callback when zoom state changes */
  onZoomChange?: (state: PinchZoomState) => void;
}

/**
 * Current zoom state
 */
export interface PinchZoomState {
  /** Current scale level */
  scale: number;
  /** Current pan offset */
  offset: { x: number; y: number };
  /** Whether currently zoomed in (scale > 1) */
  isZoomed: boolean;
  /** Whether currently panning */
  isPanning: boolean;
  /** Whether currently pinching */
  isPinching: boolean;
}


/**
 * Event handlers to spread on the container element
 */
export interface PinchZoomHandlers {
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
  onWheel: (e: WheelEvent) => void;
  onMouseDown: (e: MouseEvent) => void;
  onMouseMove: (e: MouseEvent) => void;
  onMouseUp: (e: MouseEvent) => void;
  onMouseLeave: (e: MouseEvent) => void;
}

/**
 * Return type for the usePinchZoom hook
 */
export interface UsePinchZoomReturn {
  /** Event handlers to spread on the container */
  handlers: PinchZoomHandlers;
  /** Current zoom state */
  state: PinchZoomState;
  /** Reset zoom to initial state */
  reset: () => void;
  /** Programmatically set scale */
  setScale: (scale: number) => void;
  /** Programmatically set offset */
  setOffset: (offset: { x: number; y: number }) => void;
  /** Zoom in by a step */
  zoomIn: (step?: number) => void;
  /** Zoom out by a step */
  zoomOut: (step?: number) => void;
}

/**
 * Touch point interface for type compatibility
 */
interface TouchPoint {
  clientX: number;
  clientY: number;
}

/**
 * Calculate distance between two touch points
 */
function getDistance(touch1: TouchPoint, touch2: TouchPoint): number {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate center point between two touches
 */
function getCenter(touch1: TouchPoint, touch2: TouchPoint): { x: number; y: number } {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Hook for handling pinch-to-zoom, pan, and wheel zoom gestures
 */
export function usePinchZoom(options: UsePinchZoomOptions = {}): UsePinchZoomReturn {
  const {
    minScale = 1,
    maxScale = 4,
    doubleTapZoom = true,
    doubleTapScale = 2,
    wheelZoom = true,
    wheelSensitivity = 0.1,
    initialScale = 1,
    initialOffset = { x: 0, y: 0 },
    onZoomChange,
  } = options;

  // State
  const [scale, setScaleState] = useState(initialScale);
  const [offset, setOffsetState] = useState(initialOffset);
  const [isPanning, setIsPanning] = useState(false);
  const [isPinching, setIsPinching] = useState(false);

  // Refs for tracking gesture state
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const lastDistanceRef = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPositionRef = useRef<{ x: number; y: number } | null>(null);
  const initialPinchScaleRef = useRef<number>(1);
  const mouseDownRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);

  // Double-tap detection threshold (ms)
  const DOUBLE_TAP_THRESHOLD = 300;
  const DOUBLE_TAP_DISTANCE = 30;

  /**
   * Update state and notify callback
   */
  const updateState = useCallback((newScale: number, newOffset: { x: number; y: number }) => {
    const clampedScale = clamp(newScale, minScale, maxScale);
    setScaleState(clampedScale);
    setOffsetState(newOffset);
    
    onZoomChange?.({
      scale: clampedScale,
      offset: newOffset,
      isZoomed: clampedScale > 1,
      isPanning,
      isPinching,
    });
  }, [minScale, maxScale, onZoomChange, isPanning, isPinching]);

  /**
   * Reset zoom to initial state
   */
  const reset = useCallback(() => {
    setScaleState(initialScale);
    setOffsetState(initialOffset);
    setIsPanning(false);
    setIsPinching(false);
    lastTouchRef.current = null;
    lastDistanceRef.current = null;
    
    onZoomChange?.({
      scale: initialScale,
      offset: initialOffset,
      isZoomed: false,
      isPanning: false,
      isPinching: false,
    });
  }, [initialScale, initialOffset, onZoomChange]);

  /**
   * Programmatically set scale
   */
  const setScale = useCallback((newScale: number) => {
    const clampedScale = clamp(newScale, minScale, maxScale);
    setScaleState(clampedScale);
    
    // Reset offset if zooming back to 1
    if (clampedScale <= 1) {
      setOffsetState({ x: 0, y: 0 });
    }
  }, [minScale, maxScale]);

  /**
   * Programmatically set offset
   */
  const setOffset = useCallback((newOffset: { x: number; y: number }) => {
    setOffsetState(newOffset);
  }, []);

  /**
   * Zoom in by a step
   */
  const zoomIn = useCallback((step = 0.5) => {
    setScaleState(prev => clamp(prev + step, minScale, maxScale));
  }, [minScale, maxScale]);

  /**
   * Zoom out by a step
   */
  const zoomOut = useCallback((step = 0.5) => {
    setScaleState(prev => {
      const newScale = clamp(prev - step, minScale, maxScale);
      // Reset offset if zooming back to 1
      if (newScale <= 1) {
        setOffsetState({ x: 0, y: 0 });
      }
      return newScale;
    });
  }, [minScale, maxScale]);


  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touches = e.touches;

    if (touches.length === 2) {
      // Pinch start
      setIsPinching(true);
      lastDistanceRef.current = getDistance(touches[0], touches[1]);
      initialPinchScaleRef.current = scale;
      lastTouchRef.current = getCenter(touches[0], touches[1]);
    } else if (touches.length === 1) {
      const touch = touches[0];
      const now = Date.now();
      const lastTap = lastTapTimeRef.current;
      const lastPos = lastTapPositionRef.current;

      // Check for double-tap
      if (
        doubleTapZoom &&
        now - lastTap < DOUBLE_TAP_THRESHOLD &&
        lastPos &&
        Math.abs(touch.clientX - lastPos.x) < DOUBLE_TAP_DISTANCE &&
        Math.abs(touch.clientY - lastPos.y) < DOUBLE_TAP_DISTANCE
      ) {
        // Double-tap detected - toggle zoom
        if (scale > 1) {
          reset();
        } else {
          updateState(doubleTapScale, { x: 0, y: 0 });
        }
        lastTapTimeRef.current = 0;
        lastTapPositionRef.current = null;
      } else {
        // Single tap - start pan if zoomed
        lastTapTimeRef.current = now;
        lastTapPositionRef.current = { x: touch.clientX, y: touch.clientY };
        
        if (scale > 1) {
          setIsPanning(true);
          lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
        }
      }
    }
  }, [scale, doubleTapZoom, doubleTapScale, reset, updateState]);

  /**
   * Handle touch move
   */
  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touches = e.touches;

    if (touches.length === 2 && isPinching) {
      // Pinch zoom
      const newDistance = getDistance(touches[0], touches[1]);
      const lastDistance = lastDistanceRef.current;

      if (lastDistance !== null) {
        const scaleFactor = newDistance / lastDistance;
        const newScale = clamp(initialPinchScaleRef.current * scaleFactor, minScale, maxScale);
        
        // Calculate new offset to zoom towards center of pinch
        const center = getCenter(touches[0], touches[1]);
        const lastCenter = lastTouchRef.current;
        
        if (lastCenter) {
          const dx = center.x - lastCenter.x;
          const dy = center.y - lastCenter.y;
          
          setOffsetState(prev => ({
            x: prev.x + dx / newScale,
            y: prev.y + dy / newScale,
          }));
        }
        
        setScaleState(newScale);
        lastTouchRef.current = center;
      }
      
      lastDistanceRef.current = newDistance;
      
      // Prevent default to stop page scroll during pinch
      e.preventDefault();
    } else if (touches.length === 1 && isPanning && scale > 1) {
      // Pan
      const touch = touches[0];
      const lastTouch = lastTouchRef.current;

      if (lastTouch) {
        const dx = touch.clientX - lastTouch.x;
        const dy = touch.clientY - lastTouch.y;

        setOffsetState(prev => ({
          x: prev.x + dx / scale,
          y: prev.y + dy / scale,
        }));
      }

      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      
      // Prevent default to stop page scroll during pan
      e.preventDefault();
    }
  }, [isPinching, isPanning, scale, minScale, maxScale]);

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const touches = e.touches;

    if (touches.length < 2) {
      setIsPinching(false);
      lastDistanceRef.current = null;
    }

    if (touches.length === 0) {
      setIsPanning(false);
      lastTouchRef.current = null;
    } else if (touches.length === 1) {
      // Transition from pinch to pan
      lastTouchRef.current = {
        x: touches[0].clientX,
        y: touches[0].clientY,
      };
    }
  }, []);

  /**
   * Handle wheel zoom
   */
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!wheelZoom) return;

    e.preventDefault();

    const delta = -e.deltaY * wheelSensitivity * 0.01;
    const newScale = clamp(scale + delta, minScale, maxScale);

    // Zoom towards cursor position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    if (newScale > 1) {
      const scaleDiff = newScale - scale;
      setOffsetState(prev => ({
        x: prev.x - (x * scaleDiff) / (newScale * scale),
        y: prev.y - (y * scaleDiff) / (newScale * scale),
      }));
    } else {
      // Reset offset when zooming back to 1
      setOffsetState({ x: 0, y: 0 });
    }

    setScaleState(newScale);
  }, [wheelZoom, wheelSensitivity, scale, minScale, maxScale]);

  /**
   * Handle mouse down for desktop panning
   */
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (scale > 1) {
      mouseDownRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      setIsPanning(true);
    }
  }, [scale]);

  /**
   * Handle mouse move for desktop panning
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (mouseDownRef.current && scale > 1) {
      const lastPos = lastMousePosRef.current;
      if (lastPos) {
        const dx = e.clientX - lastPos.x;
        const dy = e.clientY - lastPos.y;

        setOffsetState(prev => ({
          x: prev.x + dx / scale,
          y: prev.y + dy / scale,
        }));
      }
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }
  }, [scale]);

  /**
   * Handle mouse up
   */
  const handleMouseUp = useCallback(() => {
    mouseDownRef.current = false;
    lastMousePosRef.current = null;
    setIsPanning(false);
  }, []);

  /**
   * Handle mouse leave
   */
  const handleMouseLeave = useCallback(() => {
    mouseDownRef.current = false;
    lastMousePosRef.current = null;
    setIsPanning(false);
  }, []);

  // Memoize handlers object
  const handlers: PinchZoomHandlers = useMemo(() => ({
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onWheel: handleWheel,
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
  }), [
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  ]);

  // Memoize state object
  const state: PinchZoomState = useMemo(() => ({
    scale,
    offset,
    isZoomed: scale > 1,
    isPanning,
    isPinching,
  }), [scale, offset, isPanning, isPinching]);

  return {
    handlers,
    state,
    reset,
    setScale,
    setOffset,
    zoomIn,
    zoomOut,
  };
}

export type { UsePinchZoomOptions as PinchZoomOptions };
