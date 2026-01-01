'use client';

/**
 * QuickActionsGrid Component
 * 
 * Dashboard 2.0 - Task 1.2
 * 2x2 grid of quick action cards for common dashboard actions.
 * Responsive layout: 2x2 desktop, 2x1 tablet, 1x1 mobile.
 * 
 * @module dashboard/overview/QuickActionsGrid
 */

import { memo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { 
  CreateIcon, 
  BrandIcon, 
  LibraryIcon, 
  CommunityIcon,
  ArrowRightIcon,
} from '../icons';

// =============================================================================
// Types
// =============================================================================

export interface QuickAction {
  /** Unique identifier */
  id: string;
  /** Navigation href */
  href: string;
  /** Action title */
  title: string;
  /** Short description */
  description: string;
  /** Icon component */
  icon: React.ReactNode;
  /** Visual variant */
  variant?: 'default' | 'primary' | 'accent';
  /** Optional badge text */
  badge?: string;
  /** Whether action is disabled */
  disabled?: boolean;
}

export interface QuickActionsGridProps {
  /** Custom actions (overrides defaults) */
  actions?: QuickAction[];
  /** Additional CSS classes */
  className?: string;
  /** Number of columns on desktop */
  columns?: 2 | 3 | 4;
}

// =============================================================================
// Default Actions
// =============================================================================

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: 'create',
    href: '/dashboard/create',
    title: 'Create',
    description: 'Generate new assets with AI',
    icon: <CreateIcon size="md" />,
    variant: 'primary',
  },
  {
    id: 'brand-studio',
    href: '/dashboard/brand-kits',
    title: 'Brand Studio',
    description: 'Manage your brand identity',
    icon: <BrandIcon size="md" />,
    variant: 'default',
  },
  {
    id: 'assets',
    href: '/dashboard/assets',
    title: 'Assets',
    description: 'View your generated content',
    icon: <LibraryIcon size="md" />,
    variant: 'default',
  },
  {
    id: 'community',
    href: '/community',
    title: 'Community',
    description: 'Connect with other creators',
    icon: <CommunityIcon size="md" />,
    variant: 'accent',
  },
];

// =============================================================================
// QuickActionCard Component
// =============================================================================

interface QuickActionCardProps {
  action: QuickAction;
}

const QuickActionCard = memo(function QuickActionCard({ action }: QuickActionCardProps) {
  const { href, title, description, icon, variant = 'default', badge, disabled } = action;
  
  const variantStyles = {
    default: {
      container: 'bg-background-surface/50 border-border-subtle hover:border-border-default',
      icon: 'bg-background-elevated text-text-secondary',
      arrow: 'text-text-tertiary',
    },
    primary: {
      container: 'bg-interactive-600/10 border-interactive-600/20 hover:border-interactive-600/40',
      icon: 'bg-interactive-600 text-white shadow-lg shadow-interactive-600/20',
      arrow: 'text-interactive-600',
    },
    accent: {
      container: 'bg-accent-500/10 border-accent-500/20 hover:border-accent-500/40',
      icon: 'bg-accent-500 text-white shadow-lg shadow-accent-500/20',
      arrow: 'text-accent-500',
    },
  };
  
  const styles = variantStyles[variant];
  
  const content = (
    <>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
          'transition-transform duration-200 motion-reduce:transition-none group-hover:scale-105 motion-reduce:group-hover:scale-100',
          styles.icon
        )}>
          {icon}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-text-primary">
              {title}
            </h3>
            {badge && (
              <span className="px-1.5 py-0.5 text-micro font-medium bg-interactive-600 text-white rounded-full">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">
            {description}
          </p>
        </div>
      </div>
      
      {/* Arrow indicator */}
      <div 
        className={cn(
          'absolute top-3 right-3',
          'opacity-0 group-hover:opacity-100',
          'transition-all duration-200 motion-reduce:transition-none',
          'group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0',
          styles.arrow
        )}
        aria-hidden="true"
      >
        <ArrowRightIcon size="sm" />
      </div>
    </>
  );
  
  // Disabled state
  if (disabled) {
    return (
      <div 
        className={cn(
          'group relative p-4 rounded-xl border',
          'opacity-50 cursor-not-allowed',
          'bg-background-surface/50 border-border-subtle'
        )}
        aria-disabled="true"
        role="link"
      >
        {content}
      </div>
    );
  }
  
  return (
    <Link
      href={href}
      className={cn(
        'group relative p-4 rounded-xl border',
        'transition-all duration-200 motion-reduce:transition-none',
        'shadow-sm hover:shadow-md',
        'hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
        'active:scale-[0.99] motion-reduce:active:scale-100',
        'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:ring-offset-2 focus:ring-offset-background-base',
        styles.container
      )}
      aria-label={`${title}: ${description}`}
    >
      {content}
    </Link>
  );
});

QuickActionCard.displayName = 'QuickActionCard';

// =============================================================================
// Main QuickActionsGrid Component
// =============================================================================

/**
 * Grid of quick action cards for the dashboard overview.
 * 
 * Features:
 * - 2x2 grid layout (responsive)
 * - Hover effects with translateY and shadow
 * - Multiple visual variants
 * - Keyboard accessible
 * 
 * @example
 * ```tsx
 * // Default actions
 * <QuickActionsGrid />
 * 
 * // Custom actions
 * <QuickActionsGrid actions={customActions} />
 * 
 * // Different column count
 * <QuickActionsGrid columns={3} />
 * ```
 */
export const QuickActionsGrid = memo(function QuickActionsGrid({
  actions = DEFAULT_ACTIONS,
  className,
  columns = 2,
}: QuickActionsGridProps) {
  const columnStyles = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };
  
  return (
    <div 
      className={cn(
        'grid gap-3',
        columnStyles[columns],
        className
      )}
      role="navigation"
      aria-label="Quick actions"
    >
      {actions.map((action) => (
        <QuickActionCard key={action.id} action={action} />
      ))}
    </div>
  );
});

QuickActionsGrid.displayName = 'QuickActionsGrid';

export default QuickActionsGrid;
