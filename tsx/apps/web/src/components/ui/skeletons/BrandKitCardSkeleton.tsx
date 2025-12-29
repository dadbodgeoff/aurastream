'use client';

/**
 * BrandKitCardSkeleton Component
 * 
 * Content-aware skeleton loader for brand kit cards.
 * Mimics the exact dimensions and layout of brand kit cards to prevent CLS.
 * 
 * @module ui/skeletons/BrandKitCardSkeleton
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';

/**
 * Props for BrandKitCardSkeleton component
 */
export interface BrandKitCardSkeletonProps {
  /** Number of skeleton cards to render (default: 3) */
  count?: number;
  /** Whether to use brand-colored shimmer (teal tint) */
  brandColored?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * Individual brand kit card skeleton
 */
const BrandKitCardSkeletonItem = memo(function BrandKitCardSkeletonItem({
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
      className="bg-background-surface/50 border border-border-subtle rounded-xl p-6"
    >
      {/* Header with logo and name */}
      <div className="flex items-start gap-4 mb-4">
        {/* Logo placeholder */}
        <div
          className={cn(
            'w-16 h-16 rounded-lg bg-white/5 flex-shrink-0',
            shimmerClass
          )}
        />
        
        <div className="flex-1 space-y-2">
          {/* Brand name */}
          <div
            className={cn(
              'h-5 w-2/3 rounded-md bg-white/5',
              shimmerClass
            )}
          />
          
          {/* Description line */}
          <div
            className={cn(
              'h-3 w-full rounded-md bg-white/5',
              shimmerClass
            )}
          />
          
          {/* Active badge placeholder */}
          <div
            className={cn(
              'h-5 w-16 rounded-full bg-white/5',
              shimmerClass
            )}
          />
        </div>
      </div>
      
      {/* Color swatches placeholder (4 circles) */}
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'w-6 h-6 rounded-full bg-white/5',
              shimmerClass
            )}
          />
        ))}
        {/* Plus indicator for more colors */}
        <div
          className={cn(
            'w-6 h-6 rounded-full bg-white/5',
            shimmerClass
          )}
        />
      </div>
      
      {/* Footer with actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
        <div
          className={cn(
            'h-3 w-20 rounded-md bg-white/5',
            shimmerClass
          )}
        />
        <div className="flex gap-2">
          <div
            className={cn(
              'w-8 h-8 rounded-md bg-white/5',
              shimmerClass
            )}
          />
          <div
            className={cn(
              'w-8 h-8 rounded-md bg-white/5',
              shimmerClass
            )}
          />
        </div>
      </div>
    </div>
  );
});

BrandKitCardSkeletonItem.displayName = 'BrandKitCardSkeletonItem';

/**
 * Content-aware skeleton for brand kit card layouts.
 * 
 * Features:
 * - Color swatches placeholder (4 circles)
 * - Name and description lines
 * - Active badge placeholder
 * - Shimmer animation with reduced motion support
 * - Brand-colored shimmer option
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <BrandKitCardSkeleton />
 * 
 * // Custom count
 * <BrandKitCardSkeleton count={5} />
 * 
 * // With brand-colored shimmer
 * <BrandKitCardSkeleton brandColored />
 * ```
 */
export const BrandKitCardSkeleton = memo(function BrandKitCardSkeleton({
  count = 3,
  brandColored = false,
  className,
  testId = 'brand-kit-card-skeleton',
}: BrandKitCardSkeletonProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;

  return (
    <div
      data-testid={testId}
      role="status"
      aria-label="Loading brand kits..."
      className={cn('space-y-4', className)}
    >
      {/* Contextual loading message */}
      <p className="sr-only">Loading brand kits...</p>
      
      {/* Grid of skeleton cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, index) => (
          <BrandKitCardSkeletonItem
            key={index}
            brandColored={brandColored}
            animate={shouldAnimate}
          />
        ))}
      </div>
    </div>
  );
});

BrandKitCardSkeleton.displayName = 'BrandKitCardSkeleton';

export default BrandKitCardSkeleton;
