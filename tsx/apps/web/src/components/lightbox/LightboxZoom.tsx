'use client';

import React, { useRef, useCallback } from 'react';
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { cn } from '@/lib/utils';
import type { LightboxImage } from '@aurastream/shared';

export interface LightboxZoomProps {
  /** The image to display */
  image: LightboxImage;
  /** Additional CSS classes for the container */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * LightboxZoom - Zoomable image component using react-zoom-pan-pinch
 *
 * Features:
 * - Pinch-to-zoom on mobile
 * - Wheel zoom on desktop
 * - Double-click/tap to reset zoom
 * - Smooth animations
 * - Pan when zoomed in
 * - Constrained to image bounds
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
 * />
 * ```
 */
export function LightboxZoom({
  image,
  className,
  testId = 'lightbox-zoom',
}: LightboxZoomProps) {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  /**
   * Reset zoom to initial state on double-click
   */
  const handleDoubleClick = useCallback(() => {
    if (transformRef.current) {
      transformRef.current.resetTransform();
    }
  }, []);

  return (
    <div
      data-testid={testId}
      className={cn(
        'relative flex items-center justify-center',
        'w-full h-full max-w-[90vw] max-h-[85vh]',
        className
      )}
    >
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit
        wheel={{
          step: 0.1,
          smoothStep: 0.005,
        }}
        pinch={{
          step: 5,
        }}
        doubleClick={{
          mode: 'reset',
        }}
        panning={{
          velocityDisabled: false,
        }}
        alignmentAnimation={{
          sizeX: 100,
          sizeY: 100,
          velocityAlignmentTime: 200,
        }}
        velocityAnimation={{
          sensitivity: 1,
          animationTime: 200,
        }}
      >
        <TransformComponent
            wrapperClass="!w-full !h-full"
            contentClass="!w-full !h-full flex items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              onDoubleClick={handleDoubleClick}
              className={cn(
                'max-w-full max-h-[85vh] w-auto h-auto',
                'object-contain select-none',
                'rounded-lg shadow-2xl',
                // Smooth transitions
                'transition-transform duration-200 ease-out motion-reduce:transition-none'
              )}
              draggable={false}
            />
          </TransformComponent>
      </TransformWrapper>
    </div>
  );
}

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
