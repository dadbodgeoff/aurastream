/**
 * Enterprise Skeleton Loading System
 * 
 * Unified skeleton components for consistent loading states
 * across the application with accessibility support.
 * 
 * @module ui/Skeleton
 */

'use client';

import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';

// ============================================================================
// Types
// ============================================================================

export interface SkeletonProps {
  /** Additional CSS classes */
  className?: string;
  /** Width (CSS value or number for pixels) */
  width?: string | number;
  /** Height (CSS value or number for pixels) */
  height?: string | number;
  /** Border radius variant */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Whether to show shimmer animation */
  animate?: boolean;
  /** Accessible label for screen readers */
  'aria-label'?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
}

export interface SkeletonTextProps {
  /** Number of lines to render */
  lines?: number;
  /** Width of the last line (percentage) */
  lastLineWidth?: number;
  /** Line height */
  lineHeight?: 'sm' | 'md' | 'lg';
  /** Gap between lines */
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface SkeletonCardProps {
  /** Show image placeholder */
  showImage?: boolean;
  /** Image aspect ratio */
  imageAspect?: 'square' | 'video' | 'wide';
  /** Number of text lines */
  lines?: number;
  /** Show action buttons */
  showActions?: boolean;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const ROUNDED_CLASSES = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

const LINE_HEIGHT_CLASSES = {
  sm: 'h-3',
  md: 'h-4',
  lg: 'h-5',
};

const GAP_CLASSES = {
  sm: 'gap-1.5',
  md: 'gap-2',
  lg: 'gap-3',
};

const IMAGE_ASPECT_CLASSES = {
  square: 'aspect-square',
  video: 'aspect-video',
  wide: 'aspect-[2/1]',
};

// ============================================================================
// Base Skeleton Component
// ============================================================================

/**
 * Base skeleton component for loading placeholders.
 * 
 * Features:
 * - Shimmer animation (respects reduced motion)
 * - Customizable dimensions and border radius
 * - Accessible with aria-label
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <Skeleton className="h-12 w-full" />
 * 
 * // With specific dimensions
 * <Skeleton width={200} height={40} rounded="lg" />
 * 
 * // Circle avatar
 * <Skeleton width={48} height={48} rounded="full" />
 * ```
 */
export function Skeleton({
  className,
  width,
  height,
  rounded = 'md',
  animate = true,
  'aria-label': ariaLabel = 'Loading...',
  style: customStyle,
}: SkeletonProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animate && !prefersReducedMotion;

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    ...customStyle,
  };

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={cn(
        'bg-background-surface/60',
        ROUNDED_CLASSES[rounded],
        shouldAnimate && 'animate-pulse',
        className,
      )}
      style={style}
    />
  );
}

// ============================================================================
// Skeleton Text Component
// ============================================================================

/**
 * Skeleton for text content with multiple lines.
 * 
 * @example
 * ```tsx
 * <SkeletonText lines={3} lastLineWidth={60} />
 * ```
 */
export function SkeletonText({
  lines = 3,
  lastLineWidth = 75,
  lineHeight = 'md',
  gap = 'md',
  className,
}: SkeletonTextProps): JSX.Element {
  return (
    <div
      role="status"
      aria-label="Loading text..."
      className={cn('flex flex-col', GAP_CLASSES[gap], className)}
    >
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            LINE_HEIGHT_CLASSES[lineHeight],
            index === lines - 1 ? `w-[${lastLineWidth}%]` : 'w-full',
          )}
          style={index === lines - 1 ? { width: `${lastLineWidth}%` } : undefined}
          aria-label=""
        />
      ))}
    </div>
  );
}

// ============================================================================
// Skeleton Card Component
// ============================================================================

/**
 * Skeleton for card layouts with image and text.
 * 
 * @example
 * ```tsx
 * <SkeletonCard showImage imageAspect="video" lines={2} showActions />
 * ```
 */
export function SkeletonCard({
  showImage = true,
  imageAspect = 'video',
  lines = 2,
  showActions = false,
  className,
}: SkeletonCardProps): JSX.Element {
  return (
    <div
      role="status"
      aria-label="Loading card..."
      className={cn(
        'rounded-xl border border-border-subtle bg-background-surface overflow-hidden',
        className,
      )}
    >
      {/* Image placeholder */}
      {showImage && (
        <Skeleton
          className={cn('w-full', IMAGE_ASPECT_CLASSES[imageAspect])}
          rounded="none"
          aria-label=""
        />
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        <SkeletonText lines={lines} />

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 w-20" rounded="lg" aria-label="" />
            <Skeleton className="h-8 w-20" rounded="lg" aria-label="" />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Specialized Skeleton Components
// ============================================================================

/**
 * Skeleton for asset grid items.
 */
export function AssetGridSkeleton({ count = 6 }: { count?: number }): JSX.Element {
  return (
    <div
      role="status"
      aria-label="Loading assets..."
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border-subtle bg-background-surface overflow-hidden"
        >
          <Skeleton className="w-full aspect-square" rounded="none" aria-label="" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" aria-label="" />
            <Skeleton className="h-3 w-1/2" aria-label="" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for brand kit cards.
 */
export function BrandKitCardSkeleton({ count = 3 }: { count?: number }): JSX.Element {
  return (
    <div
      role="status"
      aria-label="Loading brand kits..."
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border-subtle bg-background-surface p-4 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <Skeleton width={48} height={48} rounded="lg" aria-label="" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3" aria-label="" />
              <Skeleton className="h-3 w-1/3" aria-label="" />
            </div>
          </div>

          {/* Color swatches */}
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} width={24} height={24} rounded="full" aria-label="" />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" rounded="lg" aria-label="" />
            <Skeleton className="h-9 w-9" rounded="lg" aria-label="" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for dashboard stats.
 */
export function DashboardStatsSkeleton(): JSX.Element {
  return (
    <div
      role="status"
      aria-label="Loading stats..."
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border-subtle bg-background-surface p-4 space-y-2"
        >
          <Skeleton className="h-4 w-1/2" aria-label="" />
          <Skeleton className="h-8 w-3/4" aria-label="" />
          <Skeleton className="h-3 w-2/3" aria-label="" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for coach messages.
 */
export function CoachMessageSkeleton({ isUser = false }: { isUser?: boolean }): JSX.Element {
  return (
    <div
      role="status"
      aria-label="Loading message..."
      className={cn(
        'flex gap-3 p-4',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      <Skeleton width={40} height={40} rounded="full" aria-label="" />
      <div className={cn('flex-1 max-w-[80%] space-y-2', isUser && 'items-end')}>
        <Skeleton className="h-4 w-24" aria-label="" />
        <div className="rounded-xl bg-background-surface p-4 space-y-2">
          <SkeletonText lines={3} />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for table rows.
 */
export function TableRowSkeleton({
  columns = 4,
  rows = 5,
}: {
  columns?: number;
  rows?: number;
}): JSX.Element {
  return (
    <div role="status" aria-label="Loading table..." className="space-y-2">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 p-4 rounded-lg bg-background-surface"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                'h-4',
                colIndex === 0 ? 'w-1/4' : 'flex-1',
              )}
              aria-label=""
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for user profile.
 */
export function ProfileSkeleton(): JSX.Element {
  return (
    <div
      role="status"
      aria-label="Loading profile..."
      className="flex items-center gap-4"
    >
      <Skeleton width={64} height={64} rounded="full" aria-label="" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" aria-label="" />
        <Skeleton className="h-4 w-48" aria-label="" />
        <Skeleton className="h-3 w-24" aria-label="" />
      </div>
    </div>
  );
}

/**
 * Full page loading skeleton.
 */
export function PageSkeleton(): JSX.Element {
  return (
    <div
      role="status"
      aria-label="Loading page..."
      className="space-y-6 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" aria-label="" />
          <Skeleton className="h-4 w-64" aria-label="" />
        </div>
        <Skeleton className="h-10 w-32" rounded="lg" aria-label="" />
      </div>

      {/* Stats */}
      <DashboardStatsSkeleton />

      {/* Content grid */}
      <AssetGridSkeleton count={8} />
    </div>
  );
}

export default Skeleton;
