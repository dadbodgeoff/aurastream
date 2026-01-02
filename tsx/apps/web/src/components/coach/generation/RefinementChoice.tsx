'use client';

/**
 * RefinementChoice Component
 * 
 * Displays "Satisfied?" or "Refine" choice after image generation.
 * Part of the multi-turn refinement flow for cheaper image edits.
 * 
 * @module coach/generation/RefinementChoice
 */

import React, { memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { RefinementUsageStatus } from '@aurastream/api-client';

// ============================================================================
// Type Definitions
// ============================================================================

export interface RefinementChoiceProps {
  /** Callback when user is satisfied with the image */
  onSatisfied: () => void;
  /** Callback when user wants to refine */
  onRefine: () => void;
  /** Refinement usage status for tier-based limits */
  usageStatus?: RefinementUsageStatus;
  /** Whether refinement is in progress */
  isRefining?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Icon Components
// ============================================================================

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const PencilIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

// ============================================================================
// Sub-Components
// ============================================================================

interface UsageBadgeProps {
  usageStatus: RefinementUsageStatus;
}

/**
 * Badge showing refinement usage status
 */
const UsageBadge = memo(function UsageBadge({ usageStatus }: UsageBadgeProps) {
  if (usageStatus.isUnlimited) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-400">
        <SparklesIcon className="w-3 h-3" />
        Unlimited refinements
      </span>
    );
  }

  if (usageStatus.freeRemaining > 0) {
    return (
      <span className="text-xs text-text-secondary">
        {usageStatus.freeRemaining} free refinement{usageStatus.freeRemaining !== 1 ? 's' : ''} remaining
      </span>
    );
  }

  return (
    <span className="text-xs text-amber-400">
      Refinements will count as creations
    </span>
  );
});

UsageBadge.displayName = 'UsageBadge';

// ============================================================================
// Main Component
// ============================================================================

/**
 * RefinementChoice displays the "Satisfied/Refine" choice after generation.
 * 
 * Features:
 * - Clear choice between accepting or refining
 * - Shows refinement usage status based on tier
 * - Disabled state during refinement
 * - Keyboard accessible
 * 
 * @example
 * ```tsx
 * <RefinementChoice
 *   onSatisfied={() => endSession()}
 *   onRefine={() => showRefineInput()}
 *   usageStatus={{
 *     canRefine: true,
 *     freeRemaining: 3,
 *     isUnlimited: false,
 *     tier: 'pro',
 *     message: '3 free refinements remaining',
 *   }}
 * />
 * ```
 */
export const RefinementChoice = memo(function RefinementChoice({
  onSatisfied,
  onRefine,
  usageStatus,
  isRefining = false,
  className,
  testId = 'refinement-choice',
}: RefinementChoiceProps) {
  const canRefine = usageStatus?.canRefine ?? true;

  return (
    <div
      data-testid={testId}
      className={cn(
        'space-y-3 p-4 rounded-lg',
        'bg-white/5 border border-border-default',
        className
      )}
    >
      {/* Question */}
      <p className="text-sm font-medium text-text-primary text-center">
        Happy with this result?
      </p>

      {/* Choice buttons */}
      <div className="flex gap-3">
        {/* Satisfied button */}
        <button
          type="button"
          onClick={onSatisfied}
          disabled={isRefining}
          className={cn(
            'flex-1 flex items-center justify-center gap-2',
            'px-4 py-3 rounded-lg',
            'bg-green-600 hover:bg-green-500',
            'text-white font-medium text-sm',
            'transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <CheckIcon className="w-5 h-5" />
          I'm Happy
        </button>

        {/* Refine button */}
        <button
          type="button"
          onClick={onRefine}
          disabled={isRefining || !canRefine}
          className={cn(
            'flex-1 flex items-center justify-center gap-2',
            'px-4 py-3 rounded-lg',
            'bg-white/10 hover:bg-white/20',
            'text-text-primary font-medium text-sm',
            'transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <PencilIcon className="w-5 h-5" />
          Refine It
        </button>
      </div>

      {/* Usage status */}
      {usageStatus && canRefine && (
        <div className="text-center">
          <UsageBadge usageStatus={usageStatus} />
        </div>
      )}

      {/* Upgrade message for free tier */}
      {usageStatus && !canRefine && (
        <p className="text-xs text-center text-amber-400">
          {usageStatus.message || 'Upgrade to Pro or Studio to refine images'}
        </p>
      )}
    </div>
  );
});

RefinementChoice.displayName = 'RefinementChoice';

export default RefinementChoice;
