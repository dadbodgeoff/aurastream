'use client';

/**
 * QuickRefineInput Component
 * 
 * Dead simple refinement input for Quick Create.
 * One text field, some quick suggestions, done.
 * 
 * @module quick-create/refinement/QuickRefineInput
 */

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ============================================================================
// Type Definitions
// ============================================================================

export interface QuickRefineInputProps {
  /** Callback when refinement is submitted */
  onSubmit: (refinement: string) => void;
  /** Callback to go back to choice */
  onBack: () => void;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Icon Components
// ============================================================================

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
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
const MAX_LENGTH = 300;

/** Quick suggestions - common tweaks users want */
const QUICK_SUGGESTIONS = [
  'Make it brighter',
  'More contrast',
  'Change colors',
  'Add glow effect',
  'Make it darker',
];

// ============================================================================
// Main Component
// ============================================================================

/**
 * QuickRefineInput - Simple refinement input.
 * 
 * Features:
 * - One textarea, that's it
 * - Quick suggestion chips for common tweaks
 * - Character limit (300)
 * - Enter to submit, Escape to cancel
 */
export const QuickRefineInput = memo(function QuickRefineInput({
  onSubmit,
  onBack,
  isSubmitting = false,
  className,
}: QuickRefineInputProps) {
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
      onBack();
    }
  }, [handleSubmit, onBack]);

  // Handle suggestion chip click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setValue(suggestion);
    textareaRef.current?.focus();
  }, []);

  const isValid = value.trim().length >= MIN_LENGTH;
  const charCount = value.length;

  return (
    <div
      data-testid="quick-refine-input"
      className={cn('space-y-4', className)}
    >
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
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

      {/* Title */}
      <h3 className="text-lg font-semibold text-text-primary">
        What would you like to change? ✨
      </h3>

      {/* Quick suggestion chips */}
      <div className="flex flex-wrap gap-2">
        {QUICK_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => handleSuggestionClick(suggestion)}
            disabled={isSubmitting}
            className={cn(
              'px-3 py-1.5 rounded-full',
              'text-sm font-medium',
              'bg-white/5 hover:bg-white/10',
              'text-text-secondary hover:text-text-primary',
              'border border-border-subtle',
              'transition-colors',
              'disabled:opacity-50'
            )}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="e.g., Make the background darker and add more glow"
          disabled={isSubmitting}
          rows={3}
          className={cn(
            'w-full px-4 py-3 rounded-xl resize-none',
            'bg-background-elevated border border-border-subtle',
            'text-text-primary placeholder-text-tertiary',
            'focus:outline-none focus:ring-2 focus:ring-interactive-600/50 focus:border-interactive-600',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors'
          )}
          aria-describedby="refine-hint"
        />
        
        {/* Character count */}
        <span
          className={cn(
            'absolute bottom-2 right-3 text-xs',
            charCount > MAX_LENGTH * 0.9 ? 'text-amber-400' : 'text-text-tertiary'
          )}
        >
          {charCount}/{MAX_LENGTH}
        </span>
      </div>

      {/* Hint text */}
      <p id="refine-hint" className="text-xs text-text-tertiary">
        Press Enter to submit • Escape to go back
      </p>

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || isSubmitting}
        className={cn(
          'w-full flex items-center justify-center gap-2',
          'px-5 py-4 rounded-xl',
          'bg-interactive-600 hover:bg-interactive-500',
          'text-white font-semibold text-base',
          'transition-all transform hover:scale-[1.01]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500/50',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
        )}
      >
        {isSubmitting ? (
          <>
            <LoadingSpinner className="w-5 h-5" />
            Tweaking...
          </>
        ) : (
          <>
            <SparklesIcon className="w-5 h-5" />
            Tweak It
          </>
        )}
      </button>

      {/* Big changes hint */}
      <p className="text-xs text-center text-amber-500/80">
        ⚠️ Big changes needed? Better to{' '}
        <Link href="/dashboard/quick-create" className="underline hover:text-amber-400">
          start fresh
        </Link>
      </p>
    </div>
  );
});

QuickRefineInput.displayName = 'QuickRefineInput';

export default QuickRefineInput;
