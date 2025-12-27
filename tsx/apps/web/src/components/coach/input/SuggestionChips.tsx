'use client';

/**
 * SuggestionChips Component
 * 
 * Horizontal scrollable chip buttons for quick suggestion selection.
 * Supports keyboard navigation, animations, and disabled states.
 * 
 * @module coach/input/SuggestionChips
 */

import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';
import type { Suggestion } from './useSuggestionContext';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SuggestionChipsProps {
  /** Array of suggestions to display as chips */
  suggestions: Suggestion[];
  /** Callback when a chip is selected */
  onSelect: (action: string) => void;
  /** Whether chips are disabled (e.g., during streaming) */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface ChipButtonProps {
  suggestion: Suggestion;
  onSelect: (action: string) => void;
  disabled: boolean;
  animate: boolean;
  index: number;
  isVisible: boolean;
}

/**
 * Individual chip button with hover and focus states
 */
const ChipButton = memo(function ChipButton({
  suggestion,
  onSelect,
  disabled,
  animate,
  index,
  isVisible,
}: ChipButtonProps) {
  const { id, label, action } = suggestion;

  const handleClick = useCallback(() => {
    if (!disabled) {
      onSelect(action);
    }
  }, [onSelect, action, disabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      onSelect(action);
    }
  }, [onSelect, action, disabled]);

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={cn(
        // Base styles
        'flex-shrink-0 px-3 py-1.5',
        'text-sm font-medium',
        'rounded-full',
        // Background and border
        'bg-white/10 border border-border-subtle',
        // Text color
        'text-text-primary',
        // Hover states (when not disabled)
        !disabled && 'hover:bg-white/20 hover:border-accent-500/50',
        // Focus states
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-base',
        // Disabled state
        disabled && 'cursor-not-allowed pointer-events-none',
        // Transitions
        animate && 'transition-all duration-200',
        // Animation for appearance (disabled takes precedence)
        animate && 'transform',
        disabled 
          ? 'opacity-50' 
          : (isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')
      )}
      style={{
        // Staggered animation delay
        transitionDelay: animate && isVisible ? `${index * 50}ms` : '0ms',
      }}
      aria-label={label}
      data-testid={`chip-${id}`}
    >
      {label}
    </button>
  );
});

ChipButton.displayName = 'ChipButton';

// ============================================================================
// Main Component
// ============================================================================

/**
 * SuggestionChips displays horizontal scrollable chip buttons.
 * 
 * Features:
 * - Horizontal scroll on mobile (overflow-x-auto)
 * - Keyboard navigation (Tab + Enter)
 * - Animated appearance (staggered fade-in)
 * - Disabled state during streaming
 * - Reduced motion support
 * 
 * @example
 * ```tsx
 * <SuggestionChips
 *   suggestions={[
 *     { id: 'hype', label: 'Hype energy', action: 'I want hype energy' },
 *     { id: 'cozy', label: 'Cozy vibes', action: 'I want cozy vibes' },
 *   ]}
 *   onSelect={(action) => sendMessage(action)}
 *   disabled={isStreaming}
 * />
 * ```
 */
export const SuggestionChips = memo(function SuggestionChips({
  suggestions,
  onSelect,
  disabled = false,
  className,
  testId = 'suggestion-chips',
}: SuggestionChipsProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!shouldAnimate);

  // Trigger staggered animation on mount
  useEffect(() => {
    if (shouldAnimate) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [shouldAnimate]);

  // Reset visibility when suggestions change
  useEffect(() => {
    if (shouldAnimate) {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [suggestions, shouldAnimate]);

  // Handle arrow key navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!containerRef.current) return;

    const buttons = containerRef.current.querySelectorAll('button:not([disabled])');
    const currentIndex = Array.from(buttons).findIndex(
      (btn) => btn === document.activeElement
    );

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
      (buttons[nextIndex] as HTMLButtonElement)?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
      (buttons[prevIndex] as HTMLButtonElement)?.focus();
    }
  }, []);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      data-testid={testId}
      role="group"
      aria-label="Quick suggestions"
      onKeyDown={handleKeyDown}
      className={cn(
        // Horizontal scroll container
        'flex gap-2 overflow-x-auto',
        // Hide scrollbar but keep functionality
        'scrollbar-hide',
        // Padding for scroll shadows
        'px-1 py-1',
        // Snap scrolling on touch devices
        'snap-x snap-mandatory',
        className
      )}
      style={{
        // Hide scrollbar cross-browser
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {suggestions.map((suggestion, index) => (
        <ChipButton
          key={suggestion.id}
          suggestion={suggestion}
          onSelect={onSelect}
          disabled={disabled}
          animate={shouldAnimate}
          index={index}
          isVisible={isVisible || !shouldAnimate}
        />
      ))}
    </div>
  );
});

SuggestionChips.displayName = 'SuggestionChips';

export default SuggestionChips;
