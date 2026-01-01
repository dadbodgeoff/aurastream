'use client';

/**
 * IntelPreview Component
 * 
 * Dashboard 2.0 - Task 1.1
 * Compact preview of Today's Mission for the dashboard overview.
 * Links to the full Intel dashboard for detailed insights.
 * 
 * @module dashboard/overview/IntelPreview
 */

import { memo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useIntelMission } from '@aurastream/api-client';
import { ArrowRightIcon, TrendsIcon } from '../icons';

// Inline skeleton component to avoid module resolution issues
const IntelPreviewSkeleton = ({ className }: { className?: string }) => (
  <div
    role="status"
    aria-label="Loading intel preview..."
    className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-interactive-600/10 via-transparent to-transparent border border-interactive-500/20 p-5 ${className || ''}`}
  >
    <p className="sr-only">Loading your personalized recommendations...</p>
    <div className="absolute top-0 right-0 w-32 h-32 bg-interactive-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-interactive-400/50 uppercase tracking-wider">
          <TrendsIcon size="sm" />
          <span>Today&apos;s Mission</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-5 w-full bg-white/5 rounded animate-pulse" />
        <div className="h-5 w-3/4 bg-white/5 rounded animate-pulse" />
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        <div className="h-5 w-24 rounded-full bg-white/5 animate-pulse" />
        <div className="h-5 w-28 rounded-full bg-white/5 animate-pulse" />
        <div className="h-5 w-20 rounded-full bg-white/5 animate-pulse" />
      </div>
      <div className="h-5 w-24 bg-white/5 rounded animate-pulse" />
    </div>
  </div>
);

// =============================================================================
// Types
// =============================================================================

export interface IntelPreviewProps {
  /** Additional CSS classes */
  className?: string;
  /** Fallback content when no mission is available */
  fallback?: React.ReactNode;
}

// =============================================================================
// Factor Badge Component
// =============================================================================

interface FactorBadgeProps {
  label: string;
  active: boolean;
  variant?: 'default' | 'success' | 'warning';
}

const FactorBadge = memo(function FactorBadge({ 
  label, 
  active, 
  variant = 'default' 
}: FactorBadgeProps) {
  if (!active) return null;
  
  const variantStyles = {
    default: 'bg-interactive-600/15 text-interactive-300 border-interactive-500/25',
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  };
  
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-micro font-medium border',
      variantStyles[variant]
    )}>
      {label}
    </span>
  );
});

// =============================================================================
// Confidence Indicator Component
// =============================================================================

interface ConfidenceIndicatorProps {
  value: number;
}

const ConfidenceIndicator = memo(function ConfidenceIndicator({ value }: ConfidenceIndicatorProps) {
  const percentage = Math.min(100, Math.max(0, value));
  
  // Color based on confidence level
  const getColor = () => {
    if (percentage >= 80) return 'text-emerald-400';
    if (percentage >= 60) return 'text-interactive-400';
    if (percentage >= 40) return 'text-amber-400';
    return 'text-red-400';
  };
  
  return (
    <div 
      className="flex items-center gap-2"
      role="meter"
      aria-label="Confidence score"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="relative w-10 h-10">
        {/* Background circle */}
        <svg 
          className="w-10 h-10 -rotate-90" 
          viewBox="0 0 36 36"
          aria-hidden="true"
        >
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-white/10"
          />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${percentage * 0.94} 100`}
            strokeLinecap="round"
            className={cn('transition-all duration-500 motion-reduce:transition-none', getColor())}
          />
        </svg>
        {/* Percentage text */}
        <span 
          className={cn(
            'absolute inset-0 flex items-center justify-center text-micro font-bold',
            getColor()
          )}
          aria-hidden="true"
        >
          {percentage}
        </span>
      </div>
    </div>
  );
});

// =============================================================================
// Expanded Stats Fallback Component
// =============================================================================

const ExpandedStatsFallback = memo(function ExpandedStatsFallback() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-interactive-600/10 via-transparent to-transparent border border-interactive-500/20 p-5">
      <div className="flex items-center gap-2 text-xs font-semibold text-interactive-400 uppercase tracking-wider mb-4">
        <TrendsIcon size="sm" />
        <span>Creator Intel</span>
      </div>
      
      <div className="text-center py-4">
        <p className="text-text-secondary text-sm mb-3">
          Subscribe to categories to get personalized content recommendations
        </p>
        <Link
          href="/dashboard/intel"
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
            'bg-interactive-600/20 hover:bg-interactive-600/30',
            'text-interactive-300 font-medium text-sm',
            'transition-colors'
          )}
        >
          Set Up Intel
          <ArrowRightIcon size="sm" />
        </Link>
      </div>
    </div>
  );
});

// =============================================================================
// Main IntelPreview Component
// =============================================================================

/**
 * Compact Intel preview for the dashboard overview.
 * 
 * Features:
 * - Shows Today's Mission recommendation with confidence
 * - Displays key factors as badges
 * - Links to full Intel dashboard
 * - Graceful fallback when no mission available
 * 
 * @example
 * ```tsx
 * <IntelPreview />
 * 
 * // With custom fallback
 * <IntelPreview fallback={<CustomFallback />} />
 * ```
 */
export const IntelPreview = memo(function IntelPreview({
  className,
  fallback,
}: IntelPreviewProps) {
  const { data: mission, isLoading, isError } = useIntelMission();
  
  // Loading state
  if (isLoading) {
    return <IntelPreviewSkeleton className={className} />;
  }
  
  // No mission available - show fallback
  if (isError || !mission) {
    return fallback ?? <ExpandedStatsFallback />;
  }
  
  // Extract key factors
  const factors = mission.factors;
  const keyFactors = [
    { label: 'Low Competition', active: factors.competition === 'low', variant: 'success' as const },
    { label: 'Viral Opportunity', active: factors.viralOpportunity, variant: 'success' as const },
    { label: 'Good Timing', active: factors.timing, variant: 'default' as const },
    { label: 'Matches History', active: factors.historyMatch, variant: 'default' as const },
  ];
  
  return (
    <article 
      className={cn(
        'relative overflow-hidden rounded-xl',
        'bg-gradient-to-br from-interactive-600/10 via-transparent to-transparent',
        'border border-interactive-500/20',
        'p-5',
        'transition-all duration-200 motion-reduce:transition-none',
        'hover:border-interactive-500/30 hover:shadow-lg hover:shadow-interactive-500/5',
        className
      )}
      aria-label="Today's Mission - AI-powered content recommendation"
    >
      {/* Decorative gradient orb */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-interactive-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" aria-hidden="true" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-interactive-400 uppercase tracking-wider">
            <TrendsIcon size="sm" />
            <span>Today&apos;s Mission</span>
          </div>
          <ConfidenceIndicator value={mission.confidence} />
        </div>
        
        {/* Recommendation */}
        <h3 className="text-base font-semibold text-text-primary mb-2 line-clamp-2">
          {mission.recommendation}
        </h3>
        
        {/* Key Factors */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {keyFactors.map((factor) => (
            <FactorBadge
              key={factor.label}
              label={factor.label}
              active={factor.active}
              variant={factor.variant}
            />
          ))}
          {mission.categoryName && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-micro font-medium bg-white/5 text-text-muted border border-white/10">
              {mission.categoryName}
            </span>
          )}
        </div>
        
        {/* CTA Link */}
        <Link
          href="/dashboard/intel"
          className={cn(
            'inline-flex items-center gap-1.5 text-sm font-medium',
            'text-interactive-400 hover:text-interactive-300',
            'transition-colors motion-reduce:transition-none group',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-base rounded'
          )}
          aria-label="View full Intel dashboard for more recommendations"
        >
          View Intel
          <ArrowRightIcon 
            size="sm" 
            className="transition-transform motion-reduce:transition-none group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" 
            aria-hidden="true"
          />
        </Link>
      </div>
    </article>
  );
});

IntelPreview.displayName = 'IntelPreview';

export default IntelPreview;
