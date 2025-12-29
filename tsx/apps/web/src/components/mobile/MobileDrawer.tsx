'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useScrollLock, useFocusTrap } from '@/hooks';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * MobileDrawer - Slide-out navigation drawer for mobile
 * 
 * Features:
 * - Full-height slide from left
 * - Backdrop with touch-to-close
 * - Focus trap when open
 * - Scroll lock when open
 * - Smooth animations with reduced motion support
 */
export function MobileDrawer({ isOpen, onClose, children }: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  
  useScrollLock(isOpen);
  useFocusTrap(drawerRef, isOpen);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50',
          'transition-opacity duration-300 motion-reduce:duration-0',
          'modal-overlay-animated',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer with @starting-style animation */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 max-w-[80vw] bg-background-surface',
          'border-r border-border-subtle',
          'transform transition-transform duration-300 ease-standard motion-reduce:duration-0',
          'drawer-animated-left',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            'absolute top-4 right-4 z-10',
            'w-10 h-10 flex items-center justify-center rounded-full',
            'bg-background-elevated hover:bg-background-surface',
            'text-text-secondary hover:text-text-primary',
            'transition-colors'
          )}
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </>
  );
}
