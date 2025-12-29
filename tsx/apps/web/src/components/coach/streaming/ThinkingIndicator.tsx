'use client';

/**
 * ThinkingIndicator Component
 * 
 * Animated indicator showing the coach's current thinking stage.
 * Features bouncing dots with staggered animation and stage-specific messages.
 * 
 * @module coach/streaming/ThinkingIndicator
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Thinking stages with corresponding messages
 */
export type ThinkingStage = 'thinking' | 'analyzing' | 'crafting' | 'validating' | 'reconnecting';

export interface ThinkingIndicatorProps {
  /** Current thinking stage */
  stage: ThinkingStage;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Stage-specific messages displayed to the user
 */
const STAGE_MESSAGES: Record<ThinkingStage, string> = {
  thinking: 'Coach is thinking...',
  analyzing: 'Analyzing your brand context...',
  crafting: 'Crafting your prompt...',
  validating: 'Validating quality...',
  reconnecting: 'Reconnecting...',
};

// ============================================================================
// Sub-Components
// ============================================================================

interface BouncingDotsProps {
  animate: boolean;
}

/**
 * Three bouncing dots with staggered animation
 */
const BouncingDots = memo(function BouncingDots({ animate }: BouncingDotsProps) {
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            'w-2 h-2 rounded-full bg-interactive-500',
            animate && 'animate-bounce'
          )}
          style={{
            animationDelay: animate ? `${index * 150}ms` : undefined,
            animationDuration: animate ? '0.6s' : undefined,
          }}
        />
      ))}
    </div>
  );
});

BouncingDots.displayName = 'BouncingDots';

// ============================================================================
// Main Component
// ============================================================================

/**
 * ThinkingIndicator displays the coach's current thinking stage
 * with animated bouncing dots and stage-specific messages.
 * 
 * Features:
 * - Animated bouncing dots (3 dots with staggered animation)
 * - Stage-specific messages
 * - Reduced motion support (respects prefers-reduced-motion)
 * - Accessible with proper ARIA attributes
 * 
 * @example
 * ```tsx
 * <ThinkingIndicator stage="thinking" />
 * <ThinkingIndicator stage="analyzing" />
 * <ThinkingIndicator stage="crafting" />
 * <ThinkingIndicator stage="validating" />
 * ```
 */
export const ThinkingIndicator = memo(function ThinkingIndicator({
  stage,
  className,
  testId = 'thinking-indicator',
}: ThinkingIndicatorProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  const message = STAGE_MESSAGES[stage];

  return (
    <div
      data-testid={testId}
      role="status"
      aria-live="polite"
      aria-label={message}
      className={cn(
        'flex items-center gap-3 px-4 py-3',
        'bg-background-surface/50 border border-border-subtle rounded-2xl rounded-tl-sm',
        'text-sm text-text-muted',
        className
      )}
    >
      <BouncingDots animate={shouldAnimate} />
      <span>{message}</span>
    </div>
  );
});

ThinkingIndicator.displayName = 'ThinkingIndicator';

export default ThinkingIndicator;
