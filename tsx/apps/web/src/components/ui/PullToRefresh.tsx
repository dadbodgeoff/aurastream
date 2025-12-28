'use client';

/**
 * PullToRefresh Component
 * 
 * A wrapper component that enables pull-to-refresh gesture on its children.
 * Shows visual feedback during pull and refresh operations.
 * 
 * @module ui/PullToRefresh
 * 
 * @example
 * ```tsx
 * function AssetList() {
 *   const handleRefresh = async () => {
 *     await refetchAssets();
 *   };
 *   
 *   return (
 *     <PullToRefresh onRefresh={handleRefresh}>
 *       <div className="space-y-4">
 *         {assets.map(asset => <AssetCard key={asset.id} asset={asset} />)}
 *       </div>
 *     </PullToRefresh>
 *   );
 * }
 * ```
 */

import { useMemo } from 'react';
import { usePullToRefresh, useReducedMotion } from '@aurastream/shared';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the PullToRefresh component.
 */
export interface PullToRefreshProps {
  /** Callback fired when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Content to wrap with pull-to-refresh functionality */
  children: React.ReactNode;
  /** Pull threshold in pixels (default: 80) */
  threshold?: number;
  /** Disable pull-to-refresh */
  disabled?: boolean;
  /** Custom loading indicator */
  loadingIndicator?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default pull threshold in pixels */
const DEFAULT_THRESHOLD = 80;

/** Size of the indicator in pixels */
const INDICATOR_SIZE = 40;

/** Maximum indicator offset from top */
const MAX_INDICATOR_OFFSET = 60;

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Circular progress indicator that fills as user pulls
 */
function PullProgressIndicator({ 
  progress, 
  prefersReducedMotion 
}: { 
  progress: number; 
  prefersReducedMotion: boolean;
}): JSX.Element {
  // Calculate stroke dasharray for circular progress
  const circumference = 2 * Math.PI * 16; // radius = 16
  const strokeDashoffset = circumference * (1 - Math.min(progress, 1));

  return (
    <svg
      width={INDICATOR_SIZE}
      height={INDICATOR_SIZE}
      viewBox="0 0 40 40"
      className={cn(
        'transform',
        !prefersReducedMotion && 'transition-transform duration-150',
      )}
      style={{
        transform: `rotate(${progress * 360}deg)`,
      }}
      aria-hidden="true"
    >
      {/* Background circle */}
      <circle
        cx="20"
        cy="20"
        r="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-border-default opacity-30"
      />
      {/* Progress circle */}
      <circle
        cx="20"
        cy="20"
        r="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-interactive-500"
        style={{
          strokeDasharray: circumference,
          strokeDashoffset,
          transformOrigin: 'center',
          transform: 'rotate(-90deg)',
        }}
      />
    </svg>
  );
}

/**
 * Loading spinner shown during refresh
 */
function LoadingSpinner({ 
  prefersReducedMotion 
}: { 
  prefersReducedMotion: boolean;
}): JSX.Element {
  return (
    <svg
      width={INDICATOR_SIZE}
      height={INDICATOR_SIZE}
      viewBox="0 0 40 40"
      className={cn(
        'text-interactive-500',
        !prefersReducedMotion && 'animate-spin',
      )}
      aria-label="Loading"
    >
      <circle
        cx="20"
        cy="20"
        r="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="80 20"
        className={prefersReducedMotion ? 'opacity-70' : ''}
      />
    </svg>
  );
}

/**
 * Success checkmark icon
 */
function SuccessIcon(): JSX.Element {
  return (
    <svg
      width={INDICATOR_SIZE}
      height={INDICATOR_SIZE}
      viewBox="0 0 40 40"
      className="text-green-500"
      aria-label="Success"
    >
      <circle
        cx="20"
        cy="20"
        r="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-30"
      />
      <path
        d="M12 20l6 6 10-12"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Error X icon
 */
function ErrorIcon(): JSX.Element {
  return (
    <svg
      width={INDICATOR_SIZE}
      height={INDICATOR_SIZE}
      viewBox="0 0 40 40"
      className="text-red-500"
      aria-label="Error"
    >
      <circle
        cx="20"
        cy="20"
        r="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-30"
      />
      <path
        d="M14 14l12 12M26 14l-12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * PullToRefresh wrapper component.
 * 
 * Enables pull-to-refresh gesture on its children with visual feedback.
 * 
 * Features:
 * - Circular progress indicator that fills as user pulls
 * - Loading spinner during refresh
 * - Success/error state feedback
 * - Respects reduced motion preference
 * - Custom loading indicator support
 * - Smooth animations with rubber-band effect
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <PullToRefresh onRefresh={handleRefresh}>
 *   <ContentList />
 * </PullToRefresh>
 * 
 * // With custom threshold
 * <PullToRefresh onRefresh={handleRefresh} threshold={100}>
 *   <ContentList />
 * </PullToRefresh>
 * 
 * // With custom loading indicator
 * <PullToRefresh 
 *   onRefresh={handleRefresh}
 *   loadingIndicator={<CustomSpinner />}
 * >
 *   <ContentList />
 * </PullToRefresh>
 * ```
 */
export function PullToRefresh({
  onRefresh,
  children,
  threshold = DEFAULT_THRESHOLD,
  disabled = false,
  loadingIndicator,
  className,
}: PullToRefreshProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  
  const { handlers, state, containerRef } = usePullToRefresh({
    onRefresh,
    threshold,
    disabled,
  });

  // Calculate progress (0 to 1) based on pull distance
  const progress = useMemo(() => {
    return Math.min(state.pullDistance / threshold, 1);
  }, [state.pullDistance, threshold]);

  // Calculate indicator offset (capped at MAX_INDICATOR_OFFSET)
  const indicatorOffset = useMemo(() => {
    return Math.min(state.pullDistance, MAX_INDICATOR_OFFSET);
  }, [state.pullDistance]);

  // Determine which indicator to show
  const renderIndicator = (): React.ReactNode => {
    switch (state.status) {
      case 'success':
        return <SuccessIcon />;
      case 'error':
        return <ErrorIcon />;
      case 'refreshing':
        return loadingIndicator || <LoadingSpinner prefersReducedMotion={prefersReducedMotion} />;
      case 'pulling':
      case 'triggered':
        return <PullProgressIndicator progress={progress} prefersReducedMotion={prefersReducedMotion} />;
      default:
        return null;
    }
  };

  // Should show indicator
  const showIndicator = state.status !== 'idle';

  // Content transform based on pull distance
  const contentTransform = useMemo(() => {
    if (prefersReducedMotion) {
      return 'none';
    }
    return `translateY(${state.pullDistance}px)`;
  }, [state.pullDistance, prefersReducedMotion]);

  // Content transition
  const contentTransition = useMemo(() => {
    if (prefersReducedMotion) {
      return 'none';
    }
    // No transition while actively pulling, smooth transition when releasing
    if (state.status === 'pulling' || state.status === 'triggered') {
      return 'none';
    }
    return 'transform 0.3s ease-out';
  }, [state.status, prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-auto',
        // Prevent overscroll behavior on iOS
        'overscroll-contain',
        // Touch action for proper gesture handling
        'touch-pan-y',
        className,
      )}
      {...handlers}
    >
      {/* Pull indicator - positioned absolutely at top */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 flex justify-center items-center pointer-events-none z-10',
          !prefersReducedMotion && 'transition-opacity duration-200',
        )}
        style={{
          height: INDICATOR_SIZE + 20,
          transform: `translateY(${indicatorOffset - INDICATOR_SIZE - 10}px)`,
          opacity: showIndicator ? 1 : 0,
        }}
        aria-hidden={!showIndicator}
      >
        <div
          className={cn(
            'flex items-center justify-center',
            'w-12 h-12 rounded-full',
            'bg-background-surface shadow-lg',
            'border border-border-default',
          )}
        >
          {renderIndicator()}
        </div>
      </div>

      {/* Content with transform based on pull distance */}
      <div
        style={{
          transform: contentTransform,
          transition: contentTransition,
        }}
      >
        {children}
      </div>

      {/* Screen reader announcement */}
      <div className="sr-only" role="status" aria-live="polite">
        {state.status === 'refreshing' && 'Refreshing content...'}
        {state.status === 'success' && 'Content refreshed successfully'}
        {state.status === 'error' && 'Failed to refresh content'}
      </div>
    </div>
  );
}

PullToRefresh.displayName = 'PullToRefresh';

export default PullToRefresh;
