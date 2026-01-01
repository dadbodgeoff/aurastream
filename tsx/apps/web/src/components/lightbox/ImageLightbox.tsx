'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useLightbox } from './useLightbox';
import { LightboxOverlay } from './LightboxOverlay';
import { LightboxZoom, type LightboxZoomRef } from './LightboxZoom';
import { LightboxControls } from './LightboxControls';

export interface ImageLightboxProps {
  /** Callback when download is clicked */
  onDownload?: (assetId?: string) => void;
  /** Callback when share is clicked */
  onShare?: (assetId?: string) => void;
  /** Callback when copy link is clicked */
  onCopyLink?: (assetId?: string) => void;
  /** Callback when regenerate is clicked */
  onRegenerate?: (assetId?: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * ImageLightbox - Full-featured image lightbox component
 *
 * Features:
 * - Full-screen image viewing with zoom
 * - Gallery navigation (prev/next)
 * - Keyboard navigation (Escape, Arrow keys)
 * - Mobile gestures (pinch-to-zoom, swipe)
 * - Focus trap for accessibility
 * - Screen reader announcements
 * - Action controls (download, share, copy link, regenerate)
 * - Reduced motion support
 * - Zoom resets on close and navigation
 *
 * This component reads from the global lightbox store.
 * Use the useLightbox hook to open images.
 */
export function ImageLightbox({
  onDownload,
  onShare,
  onCopyLink,
  onRegenerate,
  className,
  testId = 'image-lightbox',
}: ImageLightboxProps) {
  const {
    isOpen,
    currentImage,
    currentIndex,
    galleryCount,
    hasGallery,
    close,
    next,
    prev,
  } = useLightbox();

  // Track the element that triggered the lightbox for focus restoration
  const triggerElementRef = useRef<Element | null>(null);

  // Ref to the LightboxZoom component for programmatic reset
  const zoomRef = useRef<LightboxZoomRef>(null);

  // Track if image is zoomed (to disable swipe navigation)
  const [isZoomed, setIsZoomed] = useState(false);

  // Reset trigger - increments when we need to reset zoom
  const [resetTrigger, setResetTrigger] = useState(0);

  // Touch tracking for swipe gestures
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  // Minimum swipe distance for navigation
  const minSwipeDistance = 50;

  // Store the trigger element when lightbox opens
  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement;
    }
  }, [isOpen]);

  // Restore focus when lightbox closes
  useEffect(() => {
    if (!isOpen && triggerElementRef.current instanceof HTMLElement) {
      triggerElementRef.current.focus();
      triggerElementRef.current = null;
    }
  }, [isOpen]);

  // Reset zoom when lightbox closes
  useEffect(() => {
    if (!isOpen) {
      setIsZoomed(false);
      setResetTrigger(prev => prev + 1);
    }
  }, [isOpen]);

  // Reset zoom when navigating to a different image
  useEffect(() => {
    setIsZoomed(false);
    setResetTrigger(prev => prev + 1);
  }, [currentIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'ArrowLeft':
          if (hasGallery && !isZoomed) {
            e.preventDefault();
            prev();
          }
          break;
        case 'ArrowRight':
          if (hasGallery && !isZoomed) {
            e.preventDefault();
            next();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasGallery, isZoomed, close, next, prev]);

  // Handle touch start for swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isZoomed) return;
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, [isZoomed]);

  // Handle touch move for swipe gestures
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isZoomed) return;
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, [isZoomed]);

  // Handle touch end for swipe gestures
  const handleTouchEnd = useCallback(() => {
    if (isZoomed) return;
    if (!touchStart || !touchEnd || !hasGallery) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontalSwipe && Math.abs(distanceX) > minSwipeDistance) {
      if (distanceX > 0) {
        next();
      } else {
        prev();
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, hasGallery, isZoomed, next, prev]);

  // Handle zoom state changes from LightboxZoom
  const handleZoomChange = useCallback((zoomed: boolean) => {
    setIsZoomed(zoomed);
  }, []);

  // Handle action callbacks
  const handleDownload = useCallback(() => {
    onDownload?.(currentImage?.assetId);
  }, [onDownload, currentImage]);

  const handleShare = useCallback(() => {
    onShare?.(currentImage?.assetId);
  }, [onShare, currentImage]);

  const handleCopyLink = useCallback(() => {
    onCopyLink?.(currentImage?.assetId);
  }, [onCopyLink, currentImage]);

  const handleRegenerate = useCallback(() => {
    onRegenerate?.(currentImage?.assetId);
  }, [onRegenerate, currentImage]);

  if (!isOpen || !currentImage) return null;

  return (
    <LightboxOverlay
      isOpen={isOpen}
      onClose={close}
      className={className}
      testId={testId}
    >
      {/* Screen reader announcement */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {hasGallery
          ? `Image ${currentIndex + 1} of ${galleryCount}. ${currentImage.alt}. Press Escape to close, Arrow keys to navigate.`
          : `${currentImage.alt}. Press Escape to close.`}
      </div>

      {/* Main content container */}
      <div
        className="relative flex flex-col items-center justify-center w-full h-full p-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Close button */}
        <button
          onClick={close}
          className={cn(
            'absolute top-4 right-4 z-10',
            'w-11 h-11 flex items-center justify-center',
            'bg-background-elevated/80 backdrop-blur-sm rounded-full',
            'border border-border-subtle',
            'text-text-secondary hover:text-text-primary',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-interactive-600'
          )}
          aria-label="Close lightbox"
        >
          <CloseIcon />
        </button>

        {/* Gallery navigation - Previous */}
        {hasGallery && !isZoomed && (
          <button
            onClick={prev}
            className={cn(
              'absolute left-4 top-1/2 -translate-y-1/2 z-10',
              'w-11 h-11 flex items-center justify-center',
              'bg-background-elevated/80 backdrop-blur-sm rounded-full',
              'border border-border-subtle',
              'text-text-secondary hover:text-text-primary',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-interactive-600',
              'hidden sm:flex'
            )}
            aria-label="Previous image"
          >
            <ChevronLeftIcon />
          </button>
        )}

        {/* Image with zoom */}
        <LightboxZoom
          ref={zoomRef}
          image={currentImage}
          onZoomChange={handleZoomChange}
          resetTrigger={resetTrigger}
        />

        {/* Gallery navigation - Next */}
        {hasGallery && !isZoomed && (
          <button
            onClick={next}
            className={cn(
              'absolute right-4 top-1/2 -translate-y-1/2 z-10',
              'w-11 h-11 flex items-center justify-center',
              'bg-background-elevated/80 backdrop-blur-sm rounded-full',
              'border border-border-subtle',
              'text-text-secondary hover:text-text-primary',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-interactive-600',
              'hidden sm:flex'
            )}
            aria-label="Next image"
          >
            <ChevronRightIcon />
          </button>
        )}

        {/* Gallery indicator */}
        {hasGallery && (
          <div
            className={cn(
              'absolute top-4 left-1/2 -translate-x-1/2',
              'px-3 py-1.5 rounded-full',
              'bg-background-elevated/80 backdrop-blur-sm',
              'border border-border-subtle',
              'text-sm text-text-secondary'
            )}
            aria-hidden="true"
          >
            {currentIndex + 1} / {galleryCount}
          </div>
        )}

        {/* Zoom hint (shows when not zoomed) */}
        {!isZoomed && (
          <div
            className={cn(
              'absolute bottom-20 left-1/2 -translate-x-1/2',
              'px-3 py-1.5 rounded-full',
              'bg-background-elevated/60 backdrop-blur-sm',
              'border border-border-subtle',
              'text-xs text-text-muted',
              'opacity-60 pointer-events-none',
              'hidden sm:block'
            )}
            aria-hidden="true"
          >
            Scroll to zoom • Double-click to reset
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <LightboxControls
            onDownload={handleDownload}
            onShare={handleShare}
            onCopyLink={handleCopyLink}
            onRegenerate={onRegenerate ? handleRegenerate : undefined}
            assetType={currentImage.assetType}
          />
        </div>
      </div>
    </LightboxOverlay>
  );
}


// =============================================================================
// Icons
// =============================================================================

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
