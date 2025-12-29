'use client';

/**
 * AssetGridSkeleton Component
 * 
 * Content-aware skeleton loader for the asset grid layout.
 * Mimics the exact dimensions and layout of the asset grid to prevent CLS.
 * 
 * @module ui/skeletons/AssetGridSkeleton
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';

/**
 * Props for AssetGridSkeleton component
 */
export interface AssetGridSkeletonProps {
  /** Number of skeleton cards to render (default: 6) */
  count?: number;
  /** Number of columns on desktop (default: 3) */
  columns?: number;
  /** Whether to use brand-colored shimmer (teal tint) */
  brandColored?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * Individual asset card skeleton
 */
const AssetCardSkeleton = memo(function AssetCardSkeleton({
  brandColored,
  animate,
}: {
  brandColored?: boolean;
  animate: boolean;
}) {
  const shimmerClass = animate
    ? brandColored
      ? 'skeleton-shimmer-brand'
      : 'skeleton-shimmer'
    : '';

  return (
    <div
      aria-hidden="true"
      className="bg-background-surface/50 border border-border-subtle rounded-xl overflow-hidden"
    >
      {/* Asset image - square aspect ratio */}
      <div className="aspect-square">
        <div
          className={cn(
            'w-full h-full bg-white/5',
            shimmerClass
          )}
        />
      </div>
      
      {/* Asset info */}
      <div className="p-3 space-y-2">
        {/* Title line */}
        <div
          className={cn(
            'h-4 w-3/4 rounded-md bg-white/5',
            shimmerClass
          )}
        />
        
        {/* Metadata line (type badge + timestamp) */}
        <div className="flex items-center justify-between">
          <div
            className={cn(
              'h-5 w-20 rounded-full bg-white/5',
              shimmerClass
            )}
          />
          <div
            className={cn(
              'h-3 w-16 rounded-md bg-white/5',
              shimmerClass
            )}
          />
        </div>
      </div>
    </div>
  );
});

AssetCardSkeleton.displayName = 'AssetCardSkeleton';

/**
 * Content-aware skeleton for asset grid layouts.
 * 
 * Features:
 * - Responsive grid (3-4 columns desktop, 2 tablet, 1 mobile)
 * - Shimmer animation with reduced motion support
 * - Brand-colored shimmer option
 * - Exact dimensions to prevent layout shift
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <AssetGridSkeleton />
 * 
 * // Custom count and columns
 * <AssetGridSkeleton count={9} columns={4} />
 * 
 * // With brand-colored shimmer
 * <AssetGridSkeleton brandColored />
 * ```
 */
export const AssetGridSkeleton = memo(function AssetGridSkeleton({
  count = 6,
  columns = 3,
  brandColored = false,
  className,
  testId = 'asset-grid-skeleton',
}: AssetGridSkeletonProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;

  // Generate responsive grid classes based on columns prop
  const gridColsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }[columns] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div
      data-testid={testId}
      role="status"
      aria-label="Loading your assets..."
      className={cn('space-y-4', className)}
    >
      {/* Contextual loading message */}
      <p className="sr-only">Loading your assets...</p>
      
      {/* Grid of skeleton cards */}
      <div className={cn('grid gap-4', gridColsClass)}>
        {Array.from({ length: count }).map((_, index) => (
          <AssetCardSkeleton
            key={index}
            brandColored={brandColored}
            animate={shouldAnimate}
          />
        ))}
      </div>
    </div>
  );
});

AssetGridSkeleton.displayName = 'AssetGridSkeleton';

export default AssetGridSkeleton;
