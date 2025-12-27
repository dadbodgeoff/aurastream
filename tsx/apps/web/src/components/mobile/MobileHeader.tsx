'use client';

import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  onMenuClick: () => void;
  title?: string;
  className?: string;
}

/**
 * MobileHeader - Header with hamburger menu for mobile
 * 
 * Features:
 * - Hamburger button with 44x44px touch target
 * - Active state for touch feedback
 * - Proper ARIA labels
 * - Only visible on mobile (md:hidden)
 */
export function MobileHeader({ onMenuClick, title, className }: MobileHeaderProps) {
  return (
    <header 
      className={cn(
        'sticky top-0 z-30 flex items-center h-16 px-4',
        'bg-background-surface border-b border-border-subtle',
        'md:hidden',
        className
      )}
    >
      {/* Hamburger button - 44x44px touch target */}
      <button
        onClick={onMenuClick}
        className={cn(
          'flex items-center justify-center w-11 h-11 -ml-2 rounded-lg',
          'text-text-primary',
          'active:bg-background-elevated active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-interactive-600 focus:ring-offset-2 focus:ring-offset-background-surface',
          'transition-transform duration-75'
        )}
        aria-label="Open navigation menu"
        aria-expanded="false"
        aria-controls="mobile-navigation"
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 6h16M4 12h16M4 18h16" 
          />
        </svg>
      </button>
      
      {title && (
        <h1 className="ml-3 text-lg font-semibold text-text-primary truncate">
          {title}
        </h1>
      )}
    </header>
  );
}
