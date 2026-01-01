'use client';

/**
 * Badge & Tag Component System
 * 
 * Provides consistent badge/tag/pill styling across the application.
 * 
 * Badge: Small status indicators (e.g., "PRO", "NEW", "LIVE")
 * Tag: Clickable labels for filtering/categorization
 * Pill: Rounded indicators for counts or status
 * 
 * Usage:
 *   <Badge variant="success">Active</Badge>
 *   <Tag onClick={handleClick}>Fortnite</Tag>
 *   <Pill count={42} />
 */

import { forwardRef, type ReactNode, type MouseEventHandler } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// BADGE COMPONENT
// ============================================================================

export type BadgeVariant = 
  | 'default'   // Neutral gray
  | 'primary'   // Teal brand color
  | 'secondary' // Subtle gray
  | 'success'   // Green
  | 'warning'   // Yellow/Orange
  | 'error'     // Red
  | 'info'      // Blue
  | 'premium';  // Gold/special

export type BadgeSize = 'xs' | 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  className?: string;
  dot?: boolean; // Show status dot
  icon?: ReactNode;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-white/10 text-text-secondary border-white/10',
  primary: 'bg-interactive-500/20 text-interactive-300 border-interactive-500/30',
  secondary: 'bg-white/5 text-text-tertiary border-white/5',
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  premium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const badgeSizes: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-micro leading-tight',
  sm: 'px-2 py-0.5 text-xs leading-tight',
  md: 'px-2.5 py-1 text-xs leading-tight',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-text-tertiary',
  primary: 'bg-interactive-400',
  secondary: 'bg-text-muted',
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  error: 'bg-red-400',
  info: 'bg-blue-400',
  premium: 'bg-yellow-400',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  {
    variant = 'default',
    size = 'sm',
    children,
    className,
    dot = false,
    icon,
  },
  ref
) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-md border',
        badgeVariants[variant],
        badgeSizes[size],
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
});

// ============================================================================
// TAG COMPONENT (Interactive)
// ============================================================================

export type TagVariant = 'default' | 'primary' | 'outline';

export interface TagProps {
  variant?: TagVariant;
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  selected?: boolean;
  disabled?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  icon?: ReactNode;
}

const tagVariants: Record<TagVariant, { base: string; selected: string }> = {
  default: {
    base: 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10 hover:text-text-primary',
    selected: 'bg-interactive-500/20 text-interactive-300 border-interactive-500/30',
  },
  primary: {
    base: 'bg-interactive-500/10 text-interactive-300 border-interactive-500/20 hover:bg-interactive-500/20',
    selected: 'bg-interactive-500 text-white border-interactive-500',
  },
  outline: {
    base: 'bg-transparent text-text-secondary border-white/20 hover:border-white/40 hover:text-text-primary',
    selected: 'bg-white/5 text-text-primary border-interactive-500',
  },
};

export const Tag = forwardRef<HTMLButtonElement, TagProps>(function Tag(
  {
    variant = 'default',
    children,
    className,
    onClick,
    selected = false,
    disabled = false,
    removable = false,
    onRemove,
    icon,
  },
  ref
) {
  const styles = tagVariants[variant];
  
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all duration-150',
        selected ? styles.selected : styles.base,
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
        className
      )}
    >
      {icon && <span className="flex-shrink-0 w-3.5 h-3.5">{icon}</span>}
      {children}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-0.5 -mr-1 p-0.5 rounded hover:bg-white/10 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </button>
  );
});

// ============================================================================
// PILL COMPONENT (Counts/Status)
// ============================================================================

export type PillVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';

export interface PillProps {
  variant?: PillVariant;
  count?: number;
  label?: string;
  className?: string;
  max?: number; // Max count before showing "99+"
}

const pillVariants: Record<PillVariant, string> = {
  default: 'bg-white/10 text-text-secondary',
  primary: 'bg-interactive-500 text-white',
  success: 'bg-green-500 text-white',
  warning: 'bg-yellow-500 text-black',
  error: 'bg-red-500 text-white',
};

export const Pill = forwardRef<HTMLSpanElement, PillProps>(function Pill(
  {
    variant = 'default',
    count,
    label,
    className,
    max = 99,
  },
  ref
) {
  const displayValue = count !== undefined 
    ? (count > max ? `${max}+` : count.toString())
    : label;

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-micro font-semibold rounded-full',
        pillVariants[variant],
        className
      )}
    >
      {displayValue}
    </span>
  );
});

// ============================================================================
// STATUS DOT COMPONENT
// ============================================================================

export type StatusDotVariant = 'online' | 'offline' | 'busy' | 'away' | 'live';

export interface StatusDotProps {
  variant?: StatusDotVariant;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusDotColors: Record<StatusDotVariant, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-500',
  busy: 'bg-red-500',
  away: 'bg-yellow-500',
  live: 'bg-red-500',
};

const statusDotSizes: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

export const StatusDot = forwardRef<HTMLSpanElement, StatusDotProps>(function StatusDot(
  {
    variant = 'online',
    pulse = false,
    size = 'md',
    className,
  },
  ref
) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-block rounded-full',
        statusDotColors[variant],
        statusDotSizes[size],
        pulse && 'animate-pulse',
        className
      )}
    />
  );
});
