'use client';

/**
 * RefineInput Component
 * 
 * Input field for entering refinement instructions.
 * Shows usage status and handles submission.
 * 
 * @module coach/generation/RefineInput
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { RefinementUsageStatus } from '@aurastream/api-client';

// ============================================================================
// Type Definitions
// ============================================================================

export interface RefineInputProps {
  /** Callback when refinement is submitted */
  onSubmit: (refinement: string) => void;
  /** Callback to cancel and go back */
  onCancel: () => void;
  /** Refinement usage status */
  usageStatus?: RefinementUsageStatus;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Icon Components
// ============================================================================

const SendIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const LoadingSpinner = ({ className }: { className?: string }) => (
  <svg className={cn('animate-spin', className)} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ============================================================================
// Constants
// ============================================================================

const MIN_LENGTH = 3;
const MAX_LENGTH = 500;

const SUGGESTION_CHIPS = [
  'Make it brighter',
  'Add more contrast',
  'Change the colors',
  'Make it more vibrant',
  'Add a glow effect',
];

// ============================================================================
// Main Component
// ============================================================================

/**
 * RefineInput provides an input field for refinement instructions.
 * 
 * Features:
 * - Textarea with character count
 * - Suggestion chips for quick refinements
 * - Usage status display
 * - Submit/cancel actions
 * - Auto-focus on mount
 * 
 * @example
 * ```tsx
 * <RefineInput
 *   onSubmit={(text) => handleRefine(text)}
 *   onCancel={() => setShowRefine(false)}
 *   usageStatus={refinementStatus}
 *   isSubmitting={isRefining}
 * />
 * ```
 */
export const RefineInput = memo(function RefineInput({
  onSubmit,
  onCancel,
  usageStatus,
  isSubmitting = false,
  className,
  testId = 'refine-input',
}: RefineInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= MAX_LENGTH) {
      setValue(newValue);
    }
  }, []);

  // Handle submit
  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed.length >= MIN_LENGTH && !isSubmitting) {
      onSubmit(trimmed);
    }
  }, [value, isSubmitting, onSubmit]);

  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  }, [handleSubmit, onCancel]);

  // Handle suggestion chip click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setValue(suggestion);
    textareaRef.current?.focus();
  }, []);

  const isValid = value.trim().length >= MIN_LENGTH;
  const charCount = value.length;
  const showWarning = usageStatus && !usageStatus.isUnlimited && usageStatus.freeRemaining === 0;

  return (
    <div
      data-testid={testId}
      className={cn('space-y-3', className)}
    >
      {/* Back button */}
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className={cn(
          'inline-flex items-center gap-1.5',
          'text-sm text-text-secondary hover:text-text-primary',
          'transition-colors',
          'disabled:opacity-50'
        )}
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back
      </button>

      {/* Input area */}
      <div className="space-y-2">
        <label htmlFor="refine-input" className="block text-sm font-medium text-text-primary">
          What would you like to change?
        </label>
        
        <div className="relative">
          <textarea
            ref={textareaRef}
            id="refine-input"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Make the colors more vibrant, add a subtle glow..."
            disabled={isSubmitting}
            rows={3}
            className={cn(
              'w-full px-4 py-3 rounded-lg resize-none',
              'bg-background-surface border border-border-default',
              'text-text-primary placeholder-text-tertiary',
              'focus:outline-none focus:ring-2 focus:ring-accent-600/50 focus:border-accent-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors'
            )}
            aria-describedby="refine-hint"
          />
          
          {/* Character count */}
          <span
            className={cn(
              'absolute bottom-2 right-2 text-xs',
              charCount > MAX_LENGTH * 0.9 ? 'text-amber-400' : 'text-text-tertiary'
            )}
          >
            {charCount}/{MAX_LENGTH}
          </span>
        </div>

        {/* Hint text */}
        <p id="refine-hint" className="text-xs text-text-tertiary">
          Press Enter to submit, Shift+Enter for new line, Escape to cancel
        </p>
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTION_CHIPS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => handleSuggestionClick(suggestion)}
            disabled={isSubmitting}
            className={cn(
              'px-3 py-1.5 rounded-full',
              'text-xs font-medium',
              'bg-white/5 hover:bg-white/10',
              'text-text-secondary hover:text-text-primary',
              'border border-border-default',
              'transition-colors',
              'disabled:opacity-50'
            )}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Warning for paid refinements */}
      {showWarning && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-400">
            ⚠️ This refinement will count as 1 creation
          </p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || isSubmitting}
        className={cn(
          'w-full flex items-center justify-center gap-2',
          'px-4 py-3 rounded-lg',
          'bg-accent-600 hover:bg-accent-500',
          'text-white font-medium text-sm',
          'transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isSubmitting ? (
          <>
            <LoadingSpinner className="w-5 h-5" />
            Refining...
          </>
        ) : (
          <>
            <SendIcon className="w-5 h-5" />
            Refine Image
          </>
        )}
      </button>
    </div>
  );
});

RefineInput.displayName = 'RefineInput';

export default RefineInput;
