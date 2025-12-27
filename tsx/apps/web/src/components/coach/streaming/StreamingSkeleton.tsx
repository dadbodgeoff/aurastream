'use client';

/**
 * StreamingSkeleton Component
 * 
 * Content-aware skeleton loader for different types of streaming content.
 * Provides visual placeholders while content is being generated.
 * 
 * @module coach/streaming/StreamingSkeleton
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Expected content types for skeleton layouts
 */
export type SkeletonContentType = 'text' | 'prompt_card' | 'validation';

export interface StreamingSkeletonProps {
  /** Expected type of content being loaded */
  expectedType: SkeletonContentType;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface SkeletonLineProps {
  width: string;
  animate: boolean;
}

/**
 * Single skeleton line with shimmer animation
 */
const SkeletonLine = memo(function SkeletonLine({ width, animate }: SkeletonLineProps) {
  return (
    <div
      className={cn(
        'h-3 rounded-md bg-white/5',
        width,
        animate && 'skeleton-shimmer'
      )}
      aria-hidden="true"
    />
  );
});

SkeletonLine.displayName = 'SkeletonLine';

/**
 * Text skeleton - 3-4 lines of varying width
 */
const TextSkeleton = memo(function TextSkeleton({ animate }: { animate: boolean }) {
  const lineWidths = ['w-full', 'w-[85%]', 'w-[70%]', 'w-[50%]'];

  return (
    <div className="space-y-2" aria-hidden="true">
      {lineWidths.map((width, index) => (
        <SkeletonLine key={index} width={width} animate={animate} />
      ))}
    </div>
  );
});

TextSkeleton.displayName = 'TextSkeleton';

/**
 * Prompt card skeleton - Card with header, body, footer
 */
const PromptCardSkeleton = memo(function PromptCardSkeleton({ animate }: { animate: boolean }) {
  const shimmerClass = animate ? 'skeleton-shimmer' : '';

  return (
    <div
      className="bg-background-elevated/50 border border-border-subtle rounded-xl overflow-hidden"
      aria-hidden="true"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-3">
        <div className={cn('w-6 h-6 rounded-md bg-white/5', shimmerClass)} />
        <div className={cn('h-4 w-32 rounded-md bg-white/5', shimmerClass)} />
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <SkeletonLine width="w-full" animate={animate} />
        <SkeletonLine width="w-[90%]" animate={animate} />
        <SkeletonLine width="w-[75%]" animate={animate} />
        <SkeletonLine width="w-[60%]" animate={animate} />
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border-subtle flex items-center justify-between">
        <div className={cn('h-3 w-24 rounded-md bg-white/5', shimmerClass)} />
        <div className="flex gap-2">
          <div className={cn('h-8 w-20 rounded-md bg-white/5', shimmerClass)} />
          <div className={cn('h-8 w-20 rounded-md bg-white/5', shimmerClass)} />
        </div>
      </div>
    </div>
  );
});

PromptCardSkeleton.displayName = 'PromptCardSkeleton';

/**
 * Validation skeleton - List with icon placeholders
 */
const ValidationSkeleton = memo(function ValidationSkeleton({ animate }: { animate: boolean }) {
  const shimmerClass = animate ? 'skeleton-shimmer' : '';
  const items = [1, 2, 3];

  return (
    <div className="space-y-3" aria-hidden="true">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className={cn('w-5 h-5 rounded-full bg-white/5', shimmerClass)} />
        <div className={cn('h-4 w-28 rounded-md bg-white/5', shimmerClass)} />
      </div>

      {/* Validation items */}
      <div className="space-y-2 pl-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-3">
            <div className={cn('w-4 h-4 rounded-full bg-white/5 flex-shrink-0', shimmerClass)} />
            <div className={cn('h-3 rounded-md bg-white/5 flex-1', shimmerClass)} />
          </div>
        ))}
      </div>

      {/* Score indicator */}
      <div className="flex items-center gap-2 pt-2">
        <div className={cn('h-2 w-32 rounded-full bg-white/5', shimmerClass)} />
        <div className={cn('h-3 w-12 rounded-md bg-white/5', shimmerClass)} />
      </div>
    </div>
  );
});

ValidationSkeleton.displayName = 'ValidationSkeleton';

// ============================================================================
// Main Component
// ============================================================================

/**
 * StreamingSkeleton provides content-aware skeleton layouts
 * for different types of streaming content.
 * 
 * Features:
 * - Different layouts based on expectedType:
 *   - text: 3-4 lines of varying width (100%, 85%, 70%, 50%)
 *   - prompt_card: Card skeleton with header, body area, footer
 *   - validation: List skeleton with icon placeholders
 * - Shimmer animation with brand colors
 * - Reduced motion support
 * 
 * @example
 * ```tsx
 * <StreamingSkeleton expectedType="text" />
 * <StreamingSkeleton expectedType="prompt_card" />
 * <StreamingSkeleton expectedType="validation" />
 * ```
 */
export const StreamingSkeleton = memo(function StreamingSkeleton({
  expectedType,
  className,
  testId = 'streaming-skeleton',
}: StreamingSkeletonProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;

  const renderSkeleton = () => {
    switch (expectedType) {
      case 'text':
        return <TextSkeleton animate={shouldAnimate} />;
      case 'prompt_card':
        return <PromptCardSkeleton animate={shouldAnimate} />;
      case 'validation':
        return <ValidationSkeleton animate={shouldAnimate} />;
      default:
        return <TextSkeleton animate={shouldAnimate} />;
    }
  };

  return (
    <div
      data-testid={testId}
      role="status"
      aria-label="Loading content..."
      className={cn('w-full', className)}
    >
      <span className="sr-only">Loading content...</span>
      {renderSkeleton()}
    </div>
  );
});

StreamingSkeleton.displayName = 'StreamingSkeleton';

export default StreamingSkeleton;
