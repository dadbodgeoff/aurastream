'use client';

import React, { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useScrollLock, useFocusTrap } from '@/hooks';

export interface LightboxOverlayProps {
  /** Whether the overlay is visible */
  isOpen: boolean;
  /** Callback when backdrop is clicked */
  onClose: () => void;
  /** Content to render inside the overlay */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * LightboxOverlay - Full-screen overlay backdrop for the lightbox
 *
 * Features:
 * - Full-screen fixed positioning
 * - Backdrop blur effect
 * - Click to close (on backdrop only)
 * - Fade in/out animation
 * - Scroll lock when open
 * - Focus trap for accessibility
 * - z-index: 50 (above modals)
 *
 * @example
 * ```tsx
 * <LightboxOverlay isOpen={isOpen} onClose={handleClose}>
 *   <LightboxContent />
 * </LightboxOverlay>
 * ```
 */
export function LightboxOverlay({
  isOpen,
  onClose,
  children,
  className,
  testId = 'lightbox-overlay',
}: LightboxOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Lock scroll when lightbox is open
  useScrollLock(isOpen);

  // Trap focus inside the lightbox
  useFocusTrap(overlayRef, isOpen);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the backdrop
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      data-testid={testId}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
      className={cn(
        // Fixed full-screen positioning
        'fixed inset-0 z-50',
        // Flex centering for content
        'flex items-center justify-center',
        // Backdrop styling
        'bg-black/80 backdrop-blur-sm',
        // Animation with reduced motion support
        'animate-fade-in motion-reduce:animate-none',
        className
      )}
      onClick={handleBackdropClick}
    >
      {children}
    </div>
  );
}

/**
 * CSS animation keyframes (add to globals.css if not present):
 *
 * @keyframes fade-in {
 *   from { opacity: 0; }
 *   to { opacity: 1; }
 * }
 *
 * .animate-fade-in {
 *   animation: fade-in 200ms ease-out;
 * }
 */
