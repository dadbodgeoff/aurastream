'use client';

/**
 * ResponsiveModal Component
 *
 * A responsive modal component that adapts its presentation based on screen size:
 * - Desktop (>768px): Centered dialog with backdrop blur
 * - Mobile (≤768px): Bottom sheet sliding up from bottom with swipe-to-close
 *
 * Features:
 * - Automatic mobile/desktop detection
 * - Drag handle with swipe-to-close gesture on mobile
 * - Focus trap for accessibility
 * - Scroll lock to prevent background scrolling
 * - Backdrop click to close
 * - Escape key to close
 * - Reduced motion support
 * - Proper ARIA attributes
 *
 * @module ui/ResponsiveModal
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ResponsiveModal isOpen={isOpen} onClose={onClose} title="Settings">
 *   <SettingsContent />
 * </ResponsiveModal>
 *
 * // With custom options
 * <ResponsiveModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   title="Confirm Action"
 *   description="Are you sure you want to proceed?"
 *   maxHeight="80vh"
 *   showDragHandle={true}
 *   closeOnBackdrop={true}
 *   closeOnEscape={true}
 * >
 *   <ConfirmationContent />
 * </ResponsiveModal>
 *
 * // Force desktop mode on mobile
 * <ResponsiveModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   forceDesktop={true}
 * >
 *   <Content />
 * </ResponsiveModal>
 * ```
 */

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  type ReactNode,
  type TouchEvent,
  type MouseEvent,
} from 'react';
import { cn } from '@/lib/utils';
import { useScrollLock, useFocusTrap } from '@/hooks';
import { useMobileDetection, useReducedMotion } from '@aurastream/shared';

/**
 * Props for the ResponsiveModal component.
 */
export interface ResponsiveModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback fired when the modal should close */
  onClose: () => void;
  /** Optional title displayed in the modal header */
  title?: string;
  /** Optional description displayed below the title */
  description?: string;
  /** Content to render inside the modal */
  children: ReactNode;
  /** Force desktop mode even on mobile devices */
  forceDesktop?: boolean;
  /** Maximum height for bottom sheet (default: 90vh) */
  maxHeight?: string;
  /** Show drag handle on mobile (default: true) */
  showDragHandle?: boolean;
  /** Close on backdrop click (default: true) */
  closeOnBackdrop?: boolean;
  /** Close on escape key (default: true) */
  closeOnEscape?: boolean;
  /** Additional class names for the modal content */
  className?: string;
}

/** Threshold in pixels for swipe-to-close gesture */
const SWIPE_CLOSE_THRESHOLD = 100;

/** Minimum drag distance to start tracking swipe */
const DRAG_START_THRESHOLD = 10;

/**
 * ResponsiveModal - A modal that adapts to desktop and mobile layouts.
 *
 * On desktop (>768px), renders as a centered dialog with backdrop blur.
 * On mobile (≤768px), renders as a bottom sheet with swipe-to-close.
 *
 * @param props - Component props
 * @returns The modal component or null if not open
 */
export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  forceDesktop = false,
  maxHeight = '90vh',
  showDragHandle = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
}: ResponsiveModalProps): ReactNode {
  const modalRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useMobileDetection();
  const prefersReducedMotion = useReducedMotion();

  // Determine if we should use mobile layout
  const useMobileLayout = isMobile && !forceDesktop;

  // Drag state for swipe-to-close
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  // Use hooks for scroll lock and focus trap
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen);

  /**
   * Handle escape key press to close modal
   */
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  /**
   * Handle backdrop click to close modal
   */
  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (closeOnBackdrop && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdrop, onClose]
  );

  /**
   * Handle touch start for swipe gesture
   */
  const handleTouchStart = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (!useMobileLayout) return;
      const touch = e.touches[0];
      setDragStartY(touch.clientY);
      setIsDragging(false);
      setDragOffsetY(0);
    },
    [useMobileLayout]
  );

  /**
   * Handle touch move for swipe gesture
   */
  const handleTouchMove = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (!useMobileLayout) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - dragStartY;

      // Only track downward drags (positive deltaY)
      if (deltaY > DRAG_START_THRESHOLD) {
        setIsDragging(true);
        setDragOffsetY(deltaY);
      }
    },
    [useMobileLayout, dragStartY]
  );

  /**
   * Handle touch end for swipe gesture
   */
  const handleTouchEnd = useCallback(() => {
    if (!useMobileLayout || !isDragging) {
      setDragOffsetY(0);
      setIsDragging(false);
      return;
    }

    // If dragged down more than threshold, close the modal
    if (dragOffsetY > SWIPE_CLOSE_THRESHOLD) {
      setIsClosing(true);
      // Delay close to allow animation
      const delay = prefersReducedMotion ? 0 : 200;
      setTimeout(() => {
        onClose();
        setIsClosing(false);
        setDragOffsetY(0);
        setIsDragging(false);
      }, delay);
    } else {
      // Snap back
      setDragOffsetY(0);
      setIsDragging(false);
    }
  }, [useMobileLayout, isDragging, dragOffsetY, prefersReducedMotion, onClose]);

  // Add escape key listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleEscape]);

  // Reset drag state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsDragging(false);
      setDragOffsetY(0);
      setIsClosing(false);
    }
  }, [isOpen]);

  // Don't render if not open
  if (!isOpen) return null;

  // Calculate transform for drag gesture
  const dragTransform = isDragging || isClosing
    ? `translateY(${isClosing ? '100%' : `${dragOffsetY}px`})`
    : undefined;

  // Transition duration based on reduced motion preference
  const transitionDuration = prefersReducedMotion ? '0ms' : '300ms';

  return (
    <div
      className="fixed inset-0 z-50"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 backdrop-blur-sm',
          'transition-opacity',
          prefersReducedMotion ? 'duration-0' : 'duration-300'
        )}
        style={{
          opacity: isDragging ? Math.max(0.3, 1 - dragOffsetY / 300) : 1,
        }}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal Container - different layout for mobile vs desktop */}
      <div
        className={cn(
          'absolute',
          useMobileLayout
            ? 'inset-x-0 bottom-0' // Bottom sheet positioning
            : 'inset-0 flex items-center justify-center p-4' // Centered dialog
        )}
        onClick={useMobileLayout ? undefined : handleBackdropClick}
      >
        {/* Modal Content */}
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'responsive-modal-title' : undefined}
          aria-describedby={description ? 'responsive-modal-description' : undefined}
          className={cn(
            'relative bg-background-surface border border-border-subtle shadow-xl',
            'transition-transform',
            prefersReducedMotion ? 'duration-0' : 'duration-300',
            // Desktop styles
            !useMobileLayout && [
              'w-full max-w-lg rounded-2xl',
              'animate-in fade-in-0 zoom-in-95',
              prefersReducedMotion && 'animate-none',
            ],
            // Mobile bottom sheet styles
            useMobileLayout && [
              'w-full rounded-t-2xl',
              !isDragging && !isClosing && 'animate-in slide-in-from-bottom',
              prefersReducedMotion && 'animate-none',
            ],
            className
          )}
          style={{
            maxHeight: useMobileLayout ? maxHeight : '80vh',
            transform: useMobileLayout ? dragTransform : undefined,
            transitionDuration: isDragging ? '0ms' : transitionDuration,
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag Handle - Mobile only */}
          {useMobileLayout && showDragHandle && (
            <div
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
              aria-hidden="true"
            >
              <div className="w-12 h-1.5 bg-text-muted/30 rounded-full" />
            </div>
          )}

          {/* Header */}
          {(title || description) && (
            <div
              className={cn(
                'px-4 sm:px-6',
                useMobileLayout && showDragHandle ? 'pb-4' : 'py-4 sm:py-6',
                'border-b border-border-subtle'
              )}
            >
              {title && (
                <h2
                  id="responsive-modal-title"
                  className="text-lg font-semibold text-text-primary"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="responsive-modal-description"
                  className="text-sm text-text-muted mt-1"
                >
                  {description}
                </p>
              )}
            </div>
          )}

          {/* Content */}
          <div
            className={cn(
              'p-4 sm:p-6 overflow-y-auto',
              // Adjust max height based on header presence
              title || description
                ? 'max-h-[calc(80vh-8rem)]'
                : useMobileLayout && showDragHandle
                  ? 'max-h-[calc(90vh-2rem)]'
                  : 'max-h-[80vh]'
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResponsiveModal;
