'use client';

import React, { useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { usePinchZoom, useReducedMotion } from '@aurastream/shared';
import { cn } from '@/lib/utils';
import type { LightboxImage } from '@aurastream/shared';

export interface LightboxZoomProps {
  /** The image to display */
  image: LightboxImage;
  /** Additional CSS classes for the container */
  className?: string;
  /** Test ID for testing */
  testId?: string;
  /** Callback when zoom state changes (for disabling swipe when zoomed) */
  onZoomChange?: (isZoomed: boolean) => void;
  /** External reset trigger (increments to trigger reset) */
  resetTrigger?: number;
}

export interface LightboxZoomRef {
  /** Reset zoom to initial state */
  reset: () => void;
  /** Get current zoom state */
  isZoomed: () => boolean;
}

/**
 * LightboxZoom - Zoomable image component using custom usePinchZoom hook
 *
 * Features:
 * - Pinch-to-zoom on mobile
 * - Wheel zoom on desktop
 * - Double-tap to zoom/reset
 * - Smooth animations with reduced motion support
 * - Pan when zoomed in
 * - Mouse drag panning on desktop
 * - Constrained zoom levels (1x - 4x)
 *
 * @example
 * ```tsx
 * <LightboxZoom
 *   image={{
 *     src: '/path/to/image.png',
 *     alt: 'My image',
 *     width: 1920,
 *     height: 1080,
 *   }}
 *   onZoomChange={(isZoomed) => setSwipeDisabled(isZoomed)}
 * />
 * ```
 */
export const LightboxZoom = forwardRef<LightboxZoomRef, LightboxZoomProps>(
  function LightboxZoom(
    {
      image,
      className,
      testId = 'lightbox-zoom',
      onZoomChange,
      resetTrigger,
    },
    ref
  ) {
    const prefersReducedMotion = useReducedMotion();

    const {
      handlers: zoomHandlers,
      state: zoomState,
      reset: resetZoom,
    } = usePinchZoom({
      minScale: 1,
      maxScale: 4,
      doubleTapZoom: true,
      doubleTapScale: 2,
      wheelZoom: true,
      wheelSensitivity: 0.1,
      onZoomChange: (state) => {
        onZoomChange?.(state.isZoomed);
      },
    });

    // Expose reset method via ref
    useImperativeHandle(ref, () => ({
      reset: resetZoom,
      isZoomed: () => zoomState.isZoomed,
    }), [resetZoom, zoomState.isZoomed]);

    // Reset zoom when resetTrigger changes (e.g., when navigating to different image)
    useEffect(() => {
      if (resetTrigger !== undefined) {
        resetZoom();
      }
    }, [resetTrigger, resetZoom]);

    // Notify parent of zoom state changes
    useEffect(() => {
      onZoomChange?.(zoomState.isZoomed);
    }, [zoomState.isZoomed, onZoomChange]);

    /**
     * Handle double-click to reset zoom (desktop)
     */
    const handleDoubleClick = useCallback(() => {
      resetZoom();
    }, [resetZoom]);

    // Calculate transform style
    const transformStyle = {
      transform: `scale(${zoomState.scale}) translate(${zoomState.offset.x}px, ${zoomState.offset.y}px)`,
      transition: prefersReducedMotion ? 'none' : 'transform 0.2s ease-out',
      transformOrigin: 'center center',
    };

    return (
      <div
        data-testid={testId}
        className={cn(
          'relative flex items-center justify-center',
          'w-full h-full max-w-[90vw] max-h-[85vh]',
          // Cursor changes based on zoom state
          zoomState.isZoomed ? 'cursor-grab' : 'cursor-zoom-in',
          zoomState.isPanning && 'cursor-grabbing',
          className
        )}
        {...zoomHandlers}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          onDoubleClick={handleDoubleClick}
          style={transformStyle}
          className={cn(
            'max-w-full max-h-[85vh] w-auto h-auto',
            'object-contain select-none',
            'rounded-lg shadow-2xl',
            // Disable pointer events on image to let container handle gestures
            'pointer-events-none'
          )}
          draggable={false}
        />

        {/* Zoom indicator (shows when zoomed) */}
        {zoomState.isZoomed && (
          <div
            className={cn(
              'absolute bottom-4 right-4',
              'px-2 py-1 rounded-md',
              'bg-background-elevated/80 backdrop-blur-sm',
              'border border-border-subtle',
              'text-xs text-text-secondary',
              'pointer-events-none',
              'transition-opacity duration-200',
              prefersReducedMotion && 'transition-none'
            )}
            aria-hidden="true"
          >
            {Math.round(zoomState.scale * 100)}%
          </div>
        )}
      </div>
    );
  }
);

/**
 * Zoom control buttons component (optional, for toolbar integration)
 */
export interface ZoomControlsProps {
  /** Callback to zoom in */
  onZoomIn: () => void;
  /** Callback to zoom out */
  onZoomOut: () => void;
  /** Callback to reset zoom */
  onReset: () => void;
  /** Current zoom level (1 = 100%) */
  zoomLevel?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ZoomControls - Optional zoom control buttons
 *
 * Can be used alongside LightboxZoom for explicit zoom controls.
 * The LightboxZoom component handles zoom via gestures by default.
 */
export function ZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  zoomLevel = 1,
  className,
}: ZoomControlsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2',
        'bg-background-elevated/80 backdrop-blur-sm rounded-full',
        'border border-border-subtle',
        className
      )}
    >
      <button
        onClick={onZoomOut}
        className={cn(
          'w-8 h-8 flex items-center justify-center',
          'text-text-secondary hover:text-text-primary',
          'hover:bg-background-surface rounded-full',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-interactive-600'
        )}
        aria-label="Zoom out"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>

      <span className="text-xs text-text-muted min-w-[3rem] text-center">
        {Math.round(zoomLevel * 100)}%
      </span>

      <button
        onClick={onZoomIn}
        className={cn(
          'w-8 h-8 flex items-center justify-center',
          'text-text-secondary hover:text-text-primary',
          'hover:bg-background-surface rounded-full',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-interactive-600'
        )}
        aria-label="Zoom in"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>

      <button
        onClick={onReset}
        className={cn(
          'w-8 h-8 flex items-center justify-center',
          'text-text-secondary hover:text-text-primary',
          'hover:bg-background-surface rounded-full',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-interactive-600'
        )}
        aria-label="Reset zoom"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>
    </div>
  );
}
