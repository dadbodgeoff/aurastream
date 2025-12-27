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
          'fixed inset-y-0 left-0 z-50 w-72 bg-background-surface',
          'border-r border-border-subtle',
          'transform transition-transform duration-300 ease-out motion-reduce:duration-0',
          'drawer-animated-left',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {children}
      </div>
    </>
  );
}
