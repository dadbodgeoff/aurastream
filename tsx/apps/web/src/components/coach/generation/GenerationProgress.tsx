'use client';

/**
 * GenerationProgress Component
 * 
 * Displays generation progress with skeleton placeholder,
 * animated progress bar, and status message.
 * 
 * @module coach/generation/GenerationProgress
 */

import React, { memo, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';

// ============================================================================
// Type Definitions
// ============================================================================

export interface GenerationProgressProps {
  /** Current generation status */
  status: 'queued' | 'processing';
  /** Progress percentage (0-100) */
  progress?: number;
  /** Custom status message */
  statusMessage?: string;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MESSAGES: Record<'queued' | 'processing', string> = {
  queued: 'Starting generation...',
  processing: 'Creating your asset...',
};

// ============================================================================
// Sub-Components
// ============================================================================

interface SkeletonImageProps {
  animate: boolean;
}

/**
 * Skeleton placeholder for the image area
 */
const SkeletonImage = memo(function SkeletonImage({ animate }: SkeletonImageProps) {
  return (
    <div
      className={cn(
        'aspect-video w-full rounded-lg',
        'bg-white/5 overflow-hidden',
        'flex items-center justify-center'
      )}
      aria-hidden="true"
    >
      {/* Shimmer effect */}
      <div
        className={cn(
          'absolute inset-0',
          animate && 'animate-shimmer'
        )}
      />
      
      {/* Placeholder icon */}
      <svg
        className="w-12 h-12 text-white/10"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  );
});

SkeletonImage.displayName = 'SkeletonImage';

interface ProgressBarProps {
  progress: number;
  animate: boolean;
}

/**
 * Animated progress bar
 */
const ProgressBar = memo(function ProgressBar({ progress, animate }: ProgressBarProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Animate progress changes smoothly
  useEffect(() => {
    if (animate) {
      // Use requestAnimationFrame for smooth animation
      const startProgress = displayProgress;
      const diff = progress - startProgress;
      const duration = 300; // ms
      const startTime = performance.now();

      const animateProgress = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progressRatio = Math.min(elapsed / duration, 1);
        
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progressRatio, 3);
        const newProgress = startProgress + diff * eased;
        
        setDisplayProgress(newProgress);

        if (progressRatio < 1) {
          requestAnimationFrame(animateProgress);
        }
      };

      requestAnimationFrame(animateProgress);
    } else {
      setDisplayProgress(progress);
    }
  }, [progress, animate]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full space-y-2">
      {/* Progress track */}
      <div
        className="h-2 bg-white/10 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(displayProgress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Generation progress: ${Math.round(displayProgress)}%`}
      >
        {/* Progress fill */}
        <div
          className={cn(
            'h-full bg-accent-600 rounded-full',
            animate && 'transition-[width] duration-300 ease-out'
          )}
          style={{ width: `${displayProgress}%` }}
        />
      </div>

      {/* Progress percentage */}
      <div className="flex justify-end">
        <span className="text-xs text-text-tertiary tabular-nums">
          {Math.round(displayProgress)}%
        </span>
      </div>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';

// ============================================================================
// Main Component
// ============================================================================

/**
 * GenerationProgress displays the current generation status with visual feedback.
 * 
 * Features:
 * - Skeleton placeholder for image area
 * - Animated progress bar
 * - Status message (customizable)
 * - Reduced motion support
 * - Accessible progress bar with ARIA attributes
 * 
 * @example
 * ```tsx
 * <GenerationProgress
 *   status="processing"
 *   progress={60}
 *   statusMessage="Creating your thumbnail..."
 * />
 * ```
 */
export const GenerationProgress = memo(function GenerationProgress({
  status,
  progress = 0,
  statusMessage,
  className,
  testId = 'generation-progress',
}: GenerationProgressProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;

  const message = statusMessage || DEFAULT_MESSAGES[status];

  return (
    <div
      data-testid={testId}
      className={cn('space-y-4', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Skeleton image placeholder */}
      <div className="relative">
        <SkeletonImage animate={shouldAnimate} />
        
        {/* Pulsing overlay for queued state */}
        {status === 'queued' && shouldAnimate && (
          <div
            className="absolute inset-0 rounded-lg bg-accent-500/5 animate-pulse"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Status message */}
      <p className="text-sm text-text-secondary text-center">
        {message}
      </p>

      {/* Progress bar */}
      <ProgressBar progress={progress} animate={shouldAnimate} />

      {/* Screen reader announcement */}
      <span className="sr-only">
        {status === 'queued' 
          ? 'Generation queued, waiting to start' 
          : `Generation in progress, ${Math.round(progress)}% complete`
        }
      </span>
    </div>
  );
});

GenerationProgress.displayName = 'GenerationProgress';

export default GenerationProgress;
