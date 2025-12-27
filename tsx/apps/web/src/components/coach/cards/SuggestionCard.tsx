'use client';

/**
 * SuggestionCard Component
 * 
 * Displays clickable suggestion options for quick refinements.
 * Supports keyboard navigation and hover states.
 * 
 * @module coach/cards/SuggestionCard
 */

import React, { memo, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';
import { CardBase } from './CardBase';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SuggestionOption {
  /** Unique identifier for the option */
  id: string;
  /** Display label for the option */
  label: string;
  /** Optional description for more context */
  description?: string;
}

export interface SuggestionCardProps {
  /** Card title */
  title: string;
  /** List of suggestion options */
  options: SuggestionOption[];
  /** Callback when an option is selected */
  onSelect: (optionId: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Icon Components
// ============================================================================

const LightbulbIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
    />
  </svg>
);

// ============================================================================
// Sub-Components
// ============================================================================

interface SuggestionButtonProps {
  option: SuggestionOption;
  onSelect: (id: string) => void;
  animate: boolean;
  index: number;
}

/**
 * Individual suggestion button with hover animation
 */
const SuggestionButton = memo(function SuggestionButton({
  option,
  onSelect,
  animate,
  index,
}: SuggestionButtonProps) {
  const { id, label, description } = option;

  const handleClick = useCallback(() => {
    onSelect(id);
  }, [onSelect, id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(id);
    }
  }, [onSelect, id]);

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'w-full text-left',
        'px-4 py-3 rounded-lg',
        'bg-white/5 hover:bg-white/10',
        'border border-border-subtle hover:border-accent-500/50',
        'text-text-primary',
        animate && 'transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-surface',
        // Subtle scale on hover
        animate && 'hover:scale-[1.01] active:scale-[0.99]'
      )}
      aria-label={description ? `${label}: ${description}` : label}
      style={{
        // Staggered animation delay for visual interest
        animationDelay: animate ? `${index * 50}ms` : undefined,
      }}
    >
      <span className="block text-sm font-medium">{label}</span>
      {description && (
        <span className="block text-xs text-text-tertiary mt-0.5">{description}</span>
      )}
    </button>
  );
});

SuggestionButton.displayName = 'SuggestionButton';

// ============================================================================
// Main Component
// ============================================================================

/**
 * SuggestionCard displays clickable suggestion options.
 * 
 * Features:
 * - Clickable option buttons
 * - Hover states with subtle animation
 * - Keyboard navigation support (Tab + Enter)
 * - Optional descriptions for each option
 * - Reduced motion support
 * 
 * @example
 * ```tsx
 * <SuggestionCard
 *   title="Quick Refinements"
 *   options={[
 *     { id: 'vibrant', label: 'Make it more vibrant' },
 *     { id: 'energy', label: 'Add more energy', description: 'Increase dynamic elements' },
 *     { id: 'simplify', label: 'Simplify the style' },
 *   ]}
 *   onSelect={(id) => applyRefinement(id)}
 * />
 * ```
 */
export const SuggestionCard = memo(function SuggestionCard({
  title,
  options,
  onSelect,
  className,
  testId = 'suggestion-card',
}: SuggestionCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle arrow key navigation within the card
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!containerRef.current) return;

    const buttons = containerRef.current.querySelectorAll('button');
    const currentIndex = Array.from(buttons).findIndex(
      (btn) => btn === document.activeElement
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
      buttons[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
      buttons[prevIndex]?.focus();
    }
  }, []);

  if (options.length === 0) {
    return null;
  }

  return (
    <CardBase
      title={title}
      icon={<LightbulbIcon className="w-5 h-5" />}
      className={className}
      testId={testId}
    >
      <div
        ref={containerRef}
        className="space-y-2"
        role="group"
        aria-label={title}
        onKeyDown={handleKeyDown}
      >
        {options.map((option, index) => (
          <SuggestionButton
            key={option.id}
            option={option}
            onSelect={onSelect}
            animate={shouldAnimate}
            index={index}
          />
        ))}
      </div>
    </CardBase>
  );
});

SuggestionCard.displayName = 'SuggestionCard';

export default SuggestionCard;
