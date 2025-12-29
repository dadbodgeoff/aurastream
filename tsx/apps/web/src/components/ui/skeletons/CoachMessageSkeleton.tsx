'use client';

/**
 * CoachMessageSkeleton Component
 * 
 * Content-aware skeleton loader for coach chat message bubbles.
 * Mimics the exact dimensions and layout of coach messages to prevent CLS.
 * 
 * @module ui/skeletons/CoachMessageSkeleton
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';

/**
 * Props for CoachMessageSkeleton component
 */
export interface CoachMessageSkeletonProps {
  /** Number of message skeletons to render (default: 3) */
  count?: number;
  /** Whether to use brand-colored shimmer (teal tint) */
  brandColored?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * Line width patterns for natural-looking message text
 */
const lineWidthPatterns = [
  ['w-full', 'w-4/5', 'w-3/5'],
  ['w-full', 'w-full', 'w-2/3'],
  ['w-5/6', 'w-full', 'w-1/2'],
  ['w-full', 'w-3/4'],
  ['w-4/5', 'w-full', 'w-5/6', 'w-1/3'],
];

/**
 * Individual coach message skeleton
 */
const MessageSkeleton = memo(function MessageSkeleton({
  brandColored,
  animate,
  patternIndex,
}: {
  brandColored?: boolean;
  animate: boolean;
  patternIndex: number;
}) {
  const shimmerClass = animate
    ? brandColored
      ? 'skeleton-shimmer-brand'
      : 'skeleton-shimmer'
    : '';

  const lineWidths = lineWidthPatterns[patternIndex % lineWidthPatterns.length];

  return (
    <div
      aria-hidden="true"
      className="flex items-start gap-3"
    >
      {/* Avatar placeholder */}
      <div
        className={cn(
          'w-8 h-8 rounded-full bg-white/5 flex-shrink-0',
          shimmerClass
        )}
      />
      
      {/* Message bubble */}
      <div className="flex-1 max-w-[80%]">
        <div className="bg-background-surface/50 border border-border-subtle rounded-2xl rounded-tl-sm p-4 space-y-2">
          {/* Message lines with varying widths */}
          {lineWidths.map((width, index) => (
            <div
              key={index}
              className={cn(
                'h-3 rounded-md bg-white/5',
                width,
                shimmerClass
              )}
            />
          ))}
        </div>
        
        {/* Timestamp placeholder */}
        <div
          className={cn(
            'h-2 w-16 rounded-md bg-white/5 mt-1 ml-1',
            shimmerClass
          )}
        />
      </div>
    </div>
  );
});

MessageSkeleton.displayName = 'MessageSkeleton';

/**
 * Content-aware skeleton for coach chat messages.
 * 
 * Features:
 * - Avatar placeholder with message bubbles
 * - Varying line widths for natural appearance
 * - Shimmer animation with reduced motion support
 * - Brand-colored shimmer option
 * - "Coach is thinking..." contextual message
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <CoachMessageSkeleton />
 * 
 * // Custom count
 * <CoachMessageSkeleton count={5} />
 * 
 * // With brand-colored shimmer
 * <CoachMessageSkeleton brandColored />
 * ```
 */
export const CoachMessageSkeleton = memo(function CoachMessageSkeleton({
  count = 3,
  brandColored = false,
  className,
  testId = 'coach-message-skeleton',
}: CoachMessageSkeletonProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;

  return (
    <div
      data-testid={testId}
      role="status"
      aria-label="Coach is thinking..."
      className={cn('space-y-4', className)}
    >
      {/* Contextual loading message */}
      <p className="sr-only">Coach is thinking...</p>
      
      {/* Stack of message skeletons */}
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, index) => (
          <MessageSkeleton
            key={index}
            brandColored={brandColored}
            animate={shouldAnimate}
            patternIndex={index}
          />
        ))}
      </div>
      
      {/* Typing indicator */}
      <div className="flex items-center gap-2 text-sm text-white/50">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full bg-white/30',
                shouldAnimate && 'animate-bounce',
                i === 1 && shouldAnimate && 'animation-delay-100',
                i === 2 && shouldAnimate && 'animation-delay-200'
              )}
              style={{
                animationDelay: shouldAnimate ? `${i * 150}ms` : undefined,
              }}
            />
          ))}
        </div>
        <span>Coach is thinking...</span>
      </div>
    </div>
  );
});

CoachMessageSkeleton.displayName = 'CoachMessageSkeleton';

export default CoachMessageSkeleton;
