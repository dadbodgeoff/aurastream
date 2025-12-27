'use client';

/**
 * TurnsIndicator Component
 * 
 * Displays the number of turns used/remaining in a coach session.
 * Shows progress dots and warning states when turns are running low.
 * 
 * @module coach/context/TurnsIndicator
 */

import React, { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Type Definitions
// ============================================================================

export interface TurnsIndicatorProps {
  /** Number of turns used */
  used: number;
  /** Total turns available */
  total: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show compact mode (just text, no dots) */
  compact?: boolean;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Threshold for warning state (yellow) */
const WARNING_THRESHOLD = 3;

/** Threshold for critical state (red) */
const CRITICAL_THRESHOLD = 1;

/** Maximum dots to show before switching to compact */
const MAX_DOTS = 10;

// ============================================================================
// Sub-Components
// ============================================================================

interface ProgressDotProps {
  isUsed: boolean;
  isWarning: boolean;
  isCritical: boolean;
  index: number;
}

/**
 * Individual progress dot
 */
const ProgressDot = memo(function ProgressDot({
  isUsed,
  isWarning,
  isCritical,
}: ProgressDotProps) {
  return (
    <span
      className={cn(
        'w-2 h-2 rounded-full transition-colors',
        isUsed
          ? 'bg-text-tertiary'
          : isCritical
            ? 'bg-red-400'
            : isWarning
              ? 'bg-yellow-400'
              : 'bg-accent-500'
      )}
      aria-hidden="true"
    />
  );
});

ProgressDot.displayName = 'ProgressDot';

// ============================================================================
// Main Component
// ============================================================================

/**
 * TurnsIndicator displays turns used/remaining with visual progress.
 * 
 * Features:
 * - Progress dots showing used vs remaining turns
 * - Warning state (yellow) when < 3 turns remaining
 * - Critical state (red) when 1 turn remaining
 * - Compact mode for space-constrained layouts
 * - Accessible progress indication with ARIA attributes
 * 
 * @example
 * ```tsx
 * <TurnsIndicator used={3} total={10} />
 * ```
 */
export const TurnsIndicator = memo(function TurnsIndicator({
  used,
  total,
  className,
  compact = false,
  testId = 'turns-indicator',
}: TurnsIndicatorProps) {
  const remaining = Math.max(0, total - used);
  const isWarning = remaining <= WARNING_THRESHOLD && remaining > CRITICAL_THRESHOLD;
  const isCritical = remaining <= CRITICAL_THRESHOLD && remaining > 0;
  const isExhausted = remaining === 0;

  // Determine text color based on state
  const textColorClass = useMemo(() => {
    if (isExhausted) return 'text-red-400';
    if (isCritical) return 'text-red-400';
    if (isWarning) return 'text-yellow-400';
    return 'text-text-secondary';
  }, [isExhausted, isCritical, isWarning]);

  // Generate dots array
  const dots = useMemo(() => {
    if (compact || total > MAX_DOTS) return null;
    return Array.from({ length: total }, (_, i) => ({
      index: i,
      isUsed: i < used,
    }));
  }, [compact, total, used]);

  // Accessibility label
  const ariaLabel = `${remaining} of ${total} turns remaining${
    isWarning ? ', running low' : ''
  }${isCritical ? ', critical' : ''}${isExhausted ? ', exhausted' : ''}`;

  return (
    <div
      data-testid={testId}
      className={cn('flex items-center gap-2', className)}
      role="progressbar"
      aria-valuenow={remaining}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={ariaLabel}
    >
      {/* Progress dots (non-compact mode) */}
      {dots && (
        <div className="flex items-center gap-1" aria-hidden="true">
          {dots.map((dot) => (
            <ProgressDot
              key={dot.index}
              index={dot.index}
              isUsed={dot.isUsed}
              isWarning={isWarning}
              isCritical={isCritical}
            />
          ))}
        </div>
      )}

      {/* Text indicator */}
      <span
        className={cn(
          'text-sm font-medium tabular-nums',
          textColorClass
        )}
      >
        {remaining}/{total}
        {!compact && (
          <span className="text-text-tertiary ml-1">
            {remaining === 1 ? 'turn left' : 'turns left'}
          </span>
        )}
      </span>

      {/* Warning icon for low turns */}
      {(isWarning || isCritical) && !isExhausted && (
        <span
          className={cn(
            'flex-shrink-0',
            isCritical ? 'text-red-400' : 'text-yellow-400'
          )}
          aria-hidden="true"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </span>
      )}
    </div>
  );
});

TurnsIndicator.displayName = 'TurnsIndicator';

export default TurnsIndicator;
