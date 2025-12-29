'use client';

/**
 * DashboardStatsSkeleton Component
 * 
 * Content-aware skeleton loader for dashboard stats cards.
 * Mimics the exact dimensions and layout of stats cards to prevent CLS.
 * 
 * @module ui/skeletons/DashboardStatsSkeleton
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';

/**
 * Props for DashboardStatsSkeleton component
 */
export interface DashboardStatsSkeletonProps {
  /** Number of stat cards to render (default: 4) */
  count?: number;
  /** Whether to use brand-colored shimmer (teal tint) */
  brandColored?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * Individual stat card skeleton
 */
const StatCardSkeleton = memo(function StatCardSkeleton({
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
      {/* Header with icon and trend */}
      <div className="flex items-start justify-between mb-3">
        {/* Icon placeholder */}
        <div
          className={cn(
            'w-10 h-10 rounded-lg bg-white/5',
            shimmerClass
          )}
        />
        
        {/* Trend indicator placeholder */}
        <div
          className={cn(
            'w-12 h-5 rounded-full bg-white/5',
            shimmerClass
          )}
        />
      </div>
      
      {/* Number/value placeholder */}
      <div
        className={cn(
          'h-8 w-24 rounded-md bg-white/5 mb-2',
          shimmerClass
        )}
      />
      
      {/* Label placeholder */}
      <div
        className={cn(
          'h-4 w-32 rounded-md bg-white/5',
          shimmerClass
        )}
      />
    </div>
  );
});

StatCardSkeleton.displayName = 'StatCardSkeleton';

/**
 * Content-aware skeleton for dashboard stats cards.
 * 
 * Features:
 * - 4 cards in a row layout (responsive)
 * - Icon placeholder, number, and label
 * - Shimmer animation with reduced motion support
 * - Brand-colored shimmer option
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <DashboardStatsSkeleton />
 * 
 * // Custom count
 * <DashboardStatsSkeleton count={3} />
 * 
 * // With brand-colored shimmer
 * <DashboardStatsSkeleton brandColored />
 * ```
 */
export const DashboardStatsSkeleton = memo(function DashboardStatsSkeleton({
  count = 4,
  brandColored = false,
  className,
  testId = 'dashboard-stats-skeleton',
}: DashboardStatsSkeletonProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;

  return (
    <div
      data-testid={testId}
      role="status"
      aria-label="Loading your stats..."
      className={cn('space-y-4', className)}
    >
      {/* Contextual loading message */}
      <p className="sr-only">Loading your stats...</p>
      
      {/* Grid of stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, index) => (
          <StatCardSkeleton
            key={index}
            brandColored={brandColored}
            animate={shouldAnimate}
          />
        ))}
      </div>
    </div>
  );
});

DashboardStatsSkeleton.displayName = 'DashboardStatsSkeleton';

export default DashboardStatsSkeleton;
