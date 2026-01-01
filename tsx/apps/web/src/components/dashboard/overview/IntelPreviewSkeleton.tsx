'use client';

/**
 * IntelPreviewSkeleton Component
 * 
 * Dashboard 2.0 - Task 1.1
 * Loading skeleton for the IntelPreview component.
 * Matches the exact layout to prevent CLS.
 * 
 * @module dashboard/overview/IntelPreviewSkeleton
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';
import { TrendsIcon } from '../icons';

// =============================================================================
// Types
// =============================================================================

export interface IntelPreviewSkeletonProps {
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// =============================================================================
// Skeleton Pulse Component
// =============================================================================

interface SkeletonPulseProps {
  className?: string;
  animate?: boolean;
}

const SkeletonPulse = memo(function SkeletonPulse({ 
  className, 
  animate = true 
}: SkeletonPulseProps) {
  return (
    <div 
      className={cn(
        'bg-white/5 rounded',
        animate && 'animate-pulse',
        className
      )} 
    />
  );
});

// =============================================================================
// Main IntelPreviewSkeleton Component
// =============================================================================

/**
 * Content-aware skeleton for the IntelPreview component.
 * 
 * Features:
 * - Matches exact layout of IntelPreview
 * - Shimmer animation with reduced motion support
 * - Accessible with proper ARIA attributes
 * 
 * @example
 * ```tsx
 * <IntelPreviewSkeleton />
 * ```
 */
export const IntelPreviewSkeleton = memo(function IntelPreviewSkeleton({
  className,
  testId = 'intel-preview-skeleton',
}: IntelPreviewSkeletonProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  
  return (
    <div
      data-testid={testId}
      role="status"
      aria-label="Loading intel preview..."
      className={cn(
        'relative overflow-hidden rounded-xl',
        'bg-gradient-to-br from-interactive-600/10 via-transparent to-transparent',
        'border border-interactive-500/20',
        'p-5',
        className
      )}
    >
      {/* Screen reader text */}
      <p className="sr-only">Loading your personalized recommendations...</p>
      
      {/* Decorative gradient orb */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-interactive-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-interactive-400/50 uppercase tracking-wider">
            <TrendsIcon size="sm" />
            <span>Today&apos;s Mission</span>
          </div>
          
          {/* Confidence ring skeleton */}
          <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
        </div>
        
        {/* Recommendation skeleton */}
        <div className="space-y-2 mb-4">
          <SkeletonPulse 
            className="h-5 w-full" 
            animate={shouldAnimate} 
          />
          <SkeletonPulse 
            className="h-5 w-3/4" 
            animate={shouldAnimate} 
          />
        </div>
        
        {/* Key factors skeleton */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <SkeletonPulse 
            className="h-5 w-24 rounded-full" 
            animate={shouldAnimate} 
          />
          <SkeletonPulse 
            className="h-5 w-28 rounded-full" 
            animate={shouldAnimate} 
          />
          <SkeletonPulse 
            className="h-5 w-20 rounded-full" 
            animate={shouldAnimate} 
          />
        </div>
        
        {/* CTA skeleton */}
        <SkeletonPulse 
          className="h-5 w-24" 
          animate={shouldAnimate} 
        />
      </div>
    </div>
  );
});

IntelPreviewSkeleton.displayName = 'IntelPreviewSkeleton';

export default IntelPreviewSkeleton;
