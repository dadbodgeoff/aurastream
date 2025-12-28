'use client';

import { cn } from '@/lib/utils';
import { Logo } from '@/components/brand';

interface MobileHeaderProps {
  onMenuClick: () => void;
  title?: string;
  className?: string;
}

/**
 * MobileHeader - Simplified header for mobile
 * 
 * Since we now have bottom navigation, the header is simpler:
 * - Shows logo on the left
 * - Optional page title
 * - Small menu button for accessing "More" options
 * - Only visible on mobile (md:hidden)
 */
export function MobileHeader({ onMenuClick, title, className }: MobileHeaderProps) {
  return (
    <header 
      className={cn(
        'sticky top-0 z-30 flex items-center justify-between h-14 px-4',
        'bg-background-surface/95 backdrop-blur-lg border-b border-border-subtle',
        'md:hidden',
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Logo size="sm" />
        {title && (
          <span className="text-sm font-medium text-text-secondary truncate max-w-[150px]">
            {title}
          </span>
        )}
      </div>
      
      {/* Menu button - smaller, for "More" access */}
      <button
        onClick={onMenuClick}
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-lg',
          'text-text-secondary hover:text-text-primary',
          'hover:bg-background-elevated active:bg-background-elevated active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-interactive-600',
          'transition-all duration-75'
        )}
        aria-label="Open menu"
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" 
          />
        </svg>
      </button>
    </header>
  );
}
