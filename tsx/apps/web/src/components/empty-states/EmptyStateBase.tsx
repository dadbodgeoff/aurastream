/**
 * EmptyStateBase Component
 * 
 * Base component for all empty state displays with glassmorphism styling,
 * animations, and support for primary/secondary actions.
 * 
 * @module empty-states/EmptyStateBase
 */

'use client';

import React from 'react';
import { useReducedMotion } from '@aurastream/shared';
import { cn } from '@/lib/utils';

/**
 * Action configuration for empty state buttons.
 */
export interface EmptyStateAction {
  /** Button label text */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Optional icon to display before label */
  icon?: React.ReactNode;
}

/**
 * Props for the EmptyStateBase component.
 */
export interface EmptyStateProps {
  /** Illustration component to display (typically an SVG) */
  illustration: React.ReactNode;
  /** Main title text */
  title: string;
  /** Description text explaining the empty state */
  description: string;
  /** Primary call-to-action button configuration */
  primaryAction?: EmptyStateAction;
  /** Secondary action link configuration */
  secondaryAction?: EmptyStateAction;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * EmptyStateBase - A reusable empty state component with glassmorphism styling.
 * 
 * Features:
 * - Centered layout with illustration, title, description, and actions
 * - Glassmorphism card style matching existing UI patterns
 * - Fade-up animation on mount (respects reduced motion)
 * - Primary button with interactive colors
 * - Secondary text link style
 * - Fully accessible with proper heading structure
 * 
 * @example
 * ```tsx
 * <EmptyStateBase
 *   illustration={<NoAssetsIllustration />}
 *   title="No assets yet"
 *   description="Create your first asset to get started"
 *   primaryAction={{
 *     label: "Create Asset",
 *     onClick: () => router.push('/create'),
 *     icon: <PlusIcon />
 *   }}
 *   secondaryAction={{
 *     label: "Learn more",
 *     onClick: () => window.open('/docs')
 *   }}
 * />
 * ```
 */
export function EmptyStateBase({
  illustration,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  testId = 'empty-state',
}: EmptyStateProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      data-testid={testId}
      className={cn(
        // Container - centered flex layout
        'flex flex-col items-center justify-center w-full py-12 px-4',
        // Animation
        !prefersReducedMotion && 'animate-fade-in-up',
        'motion-reduce:animate-none',
        className
      )}
    >
      {/* Glassmorphism card */}
      <div
        className={cn(
          // Glass effect
          'bg-background-surface/50 backdrop-blur-sm',
          'border border-border-subtle rounded-xl',
          // Layout
          'flex flex-col items-center text-center',
          'p-8 sm:p-10 max-w-md w-full',
          // Subtle shadow
          'shadow-lg shadow-black/5'
        )}
      >
        {/* Glass overlay for enhanced effect */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-xl"
          aria-hidden="true"
        />

        {/* Illustration container */}
        <div
          className="relative z-10 mb-6 flex items-center justify-center"
          aria-hidden="true"
        >
          {illustration}
        </div>

        {/* Title */}
        <h2 className="relative z-10 text-xl font-semibold text-text-primary mb-2">
          {title}
        </h2>

        {/* Description */}
        <p className="relative z-10 text-text-secondary text-sm leading-relaxed mb-6 max-w-xs">
          {description}
        </p>

        {/* Actions container */}
        {(primaryAction || secondaryAction) && (
          <div className="relative z-10 flex flex-col items-center gap-3 w-full">
            {/* Primary action button */}
            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className={cn(
                  // Base styles
                  'inline-flex items-center justify-center gap-2',
                  'px-6 py-3 rounded-lg font-medium text-sm',
                  // Colors
                  'bg-interactive-600 text-white',
                  'hover:bg-interactive-500',
                  // Focus state
                  'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:ring-offset-2 focus:ring-offset-background-base',
                  // Transitions
                  'transition-colors duration-200',
                  // Touch feedback
                  'active:scale-[0.98] motion-reduce:active:scale-100',
                  // Min touch target
                  'min-h-[44px]'
                )}
              >
                {primaryAction.icon && (
                  <span className="w-5 h-5 flex-shrink-0">
                    {primaryAction.icon}
                  </span>
                )}
                {primaryAction.label}
              </button>
            )}

            {/* Secondary action link */}
            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className={cn(
                  // Base styles
                  'inline-flex items-center justify-center',
                  'px-4 py-2 text-sm font-medium',
                  // Colors - text link style
                  'text-text-secondary hover:text-text-primary',
                  // Underline on hover
                  'hover:underline underline-offset-2',
                  // Focus state
                  'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:ring-offset-2 focus:ring-offset-background-base rounded',
                  // Transitions
                  'transition-colors duration-200',
                  // Min touch target
                  'min-h-[44px]'
                )}
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

EmptyStateBase.displayName = 'EmptyStateBase';

export default EmptyStateBase;
