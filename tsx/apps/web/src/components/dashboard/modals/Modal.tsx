'use client';

import { useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useScrollLock, useFocusTrap } from '@/hooks';
import { XIcon } from '../icons';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  className,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Use hooks for scroll lock and focus trap
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen);

  // Handle escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with motion-reduce support and @starting-style animation */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 backdrop-blur-sm',
          'transition-opacity duration-300 motion-reduce:duration-0',
          'modal-overlay-animated'
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal with motion-reduce support and @starting-style animation */}
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        className={cn(
          'relative w-full bg-background-surface border border-border-subtle rounded-2xl shadow-xl',
          'transform transition-all duration-300 motion-reduce:duration-0',
          'modal-content-animated',
          sizeStyles[size],
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between p-4 sm:p-6 border-b border-border-subtle">
            <div>
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold text-text-primary">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="text-sm text-text-muted mt-1">
                  {description}
                </p>
              )}
            </div>
            {/* Close button with 44x44px touch target */}
            <button
              onClick={onClose}
              className={cn(
                'flex items-center justify-center w-11 h-11 -mr-2 -mt-2',
                'text-text-muted hover:text-text-secondary rounded-lg',
                'hover:bg-background-elevated active:bg-background-elevated active:scale-95',
                'transition-all duration-75',
                'focus:outline-none focus:ring-2 focus:ring-interactive-600'
              )}
              aria-label="Close modal"
            >
              <XIcon size="md" />
            </button>
          </div>
        )}

        {/* Content with mobile-responsive max-height */}
        <div className="p-4 sm:p-6 max-h-[80vh] sm:max-h-[60vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-border-subtle">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
