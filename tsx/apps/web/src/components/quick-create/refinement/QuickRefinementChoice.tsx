'use client';

/**
 * QuickRefinementChoice Component
 * 
 * Dead simple "Happy with this?" choice for Quick Create results.
 * Even a 5-year-old can understand: Love it, Tweak it, or Start Over.
 * 
 * @module quick-create/refinement/QuickRefinementChoice
 */

import React, { memo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { SubscriptionTier } from '@aurastream/api-client';

// ============================================================================
// Type Definitions
// ============================================================================

export interface QuickRefinementChoiceProps {
  /** Callback when user loves the result */
  onLoveIt: () => void;
  /** Callback when user wants to tweak */
  onTweak: () => void;
  /** User's subscription tier */
  tier?: SubscriptionTier;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Icon Components
// ============================================================================

const HeartIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

// ============================================================================
// Main Component
// ============================================================================

/**
 * QuickRefinementChoice - The "Happy with this?" moment.
 * 
 * Super simple UX:
 * - ✅ "I Love It!" → Done, show download options
 * - ✨ "Almost... tweak it" → Show refinement input
 * - 💡 Hint to start fresh for major changes
 */
export const QuickRefinementChoice = memo(function QuickRefinementChoice({
  onLoveIt,
  onTweak,
  tier = 'free',
  disabled = false,
  className,
}: QuickRefinementChoiceProps) {
  const canRefine = tier !== 'free';

  return (
    <div
      data-testid="quick-refinement-choice"
      className={cn(
        'space-y-4 p-5 rounded-xl',
        'bg-background-surface border border-border-subtle',
        className
      )}
    >
      {/* Question - friendly and clear */}
      <h3 className="text-lg font-semibold text-text-primary text-center">
        Happy with this? 🎨
      </h3>

      {/* Choice buttons - big and obvious */}
      <div className="flex gap-3">
        {/* Love It button - primary action */}
        <button
          type="button"
          onClick={onLoveIt}
          disabled={disabled}
          className={cn(
            'flex-1 flex items-center justify-center gap-2',
            'px-5 py-4 rounded-xl',
            'bg-emerald-600 hover:bg-emerald-500',
            'text-white font-semibold text-base',
            'transition-all transform hover:scale-[1.02]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
          )}
        >
          <HeartIcon className="w-5 h-5" />
          I Love It!
        </button>

        {/* Tweak button - secondary action */}
        <button
          type="button"
          onClick={onTweak}
          disabled={disabled || !canRefine}
          className={cn(
            'flex-1 flex items-center justify-center gap-2',
            'px-5 py-4 rounded-xl',
            'bg-interactive-600 hover:bg-interactive-500',
            'text-white font-semibold text-base',
            'transition-all transform hover:scale-[1.02]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500/50',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
          )}
        >
          <SparklesIcon className="w-5 h-5" />
          Almost... tweak it
        </button>
      </div>

      {/* Free tier upgrade hint */}
      {!canRefine && (
        <p className="text-sm text-center text-amber-400">
          ✨ <Link href="/dashboard/settings/subscription" className="underline hover:text-amber-300">Upgrade to Pro</Link> to tweak your creations
        </p>
      )}

      {/* Start fresh hint */}
      <p className="text-sm text-center text-text-tertiary">
        💡 Way off? Just{' '}
        <Link href="/intel/create" className="text-interactive-400 hover:text-interactive-300 underline">
          start fresh
        </Link>
      </p>
    </div>
  );
});

QuickRefinementChoice.displayName = 'QuickRefinementChoice';

export default QuickRefinementChoice;
