'use client';

/**
 * ChainOfThought Component
 * 
 * Collapsible display for AI reasoning/chain-of-thought content.
 * Allows users to optionally view the coach's reasoning process.
 * 
 * @module coach/streaming/ChainOfThought
 */

import React, { memo, useState, useCallback, useId } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ChainOfThoughtProps {
  /** The reasoning text to display */
  reasoning: string;
  /** Whether the reasoning is expanded (controlled mode) */
  isExpanded?: boolean;
  /** Callback when toggle is clicked (controlled mode) */
  onToggle?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Icon Components
// ============================================================================

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const BrainIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  </svg>
);

// ============================================================================
// Main Component
// ============================================================================

/**
 * ChainOfThought displays collapsible AI reasoning content.
 * 
 * Features:
 * - Collapsible reasoning display
 * - Italic text, muted color
 * - "Show reasoning" / "Hide reasoning" toggle
 * - Smooth expand/collapse animation
 * - Supports both controlled and uncontrolled modes
 * - Reduced motion support
 * 
 * @example
 * ```tsx
 * // Uncontrolled mode
 * <ChainOfThought reasoning="First, I analyzed the brand colors..." />
 * 
 * // Controlled mode
 * <ChainOfThought
 *   reasoning="First, I analyzed the brand colors..."
 *   isExpanded={expanded}
 *   onToggle={() => setExpanded(!expanded)}
 * />
 * ```
 */
export const ChainOfThought = memo(function ChainOfThought({
  reasoning,
  isExpanded: controlledExpanded,
  onToggle,
  className,
  testId = 'chain-of-thought',
}: ChainOfThoughtProps) {
  const prefersReducedMotion = useReducedMotion();
  const contentId = useId();
  
  // Internal state for uncontrolled mode
  const [internalExpanded, setInternalExpanded] = useState(false);
  
  // Determine if we're in controlled mode
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;

  const handleToggle = useCallback(() => {
    if (isControlled && onToggle) {
      onToggle();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  }, [isControlled, onToggle]);

  // Don't render if no reasoning provided
  if (!reasoning || reasoning.trim().length === 0) {
    return null;
  }

  return (
    <div
      data-testid={testId}
      className={cn(
        'border-t border-border-subtle pt-3 mt-3',
        className
      )}
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        className={cn(
          'flex items-center gap-2 text-xs text-text-muted',
          'hover:text-text-secondary transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-surface',
          'rounded-md px-2 py-1 -ml-2'
        )}
      >
        <BrainIcon className="w-3.5 h-3.5" />
        <span>{isExpanded ? 'Hide reasoning' : 'Show reasoning'}</span>
        <ChevronDownIcon
          className={cn(
            'w-3.5 h-3.5 transition-transform',
            isExpanded && 'rotate-180',
            prefersReducedMotion && 'transition-none'
          )}
        />
      </button>

      {/* Collapsible content */}
      <div
        id={contentId}
        role="region"
        aria-labelledby={`${contentId}-toggle`}
        className={cn(
          'overflow-hidden',
          !prefersReducedMotion && 'transition-all duration-200 ease-out',
          isExpanded ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'
        )}
      >
        <div
          className={cn(
            'text-xs text-text-muted italic',
            'bg-background-elevated/30 rounded-lg p-3',
            'border border-border-subtle/50'
          )}
        >
          <p className="whitespace-pre-wrap leading-relaxed">{reasoning}</p>
        </div>
      </div>
    </div>
  );
});

ChainOfThought.displayName = 'ChainOfThought';

export default ChainOfThought;
