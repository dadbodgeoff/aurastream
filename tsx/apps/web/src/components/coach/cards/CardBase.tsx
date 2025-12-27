'use client';

/**
 * CardBase Component
 * 
 * Shared card styling component for AI Assistant Cards.
 * Provides glassmorphism styling matching AuraStream design system.
 * 
 * @module coach/cards/CardBase
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Type Definitions
// ============================================================================

export interface CardBaseProps {
  /** Card title displayed in header */
  title: string;
  /** Optional icon to display before title */
  icon?: React.ReactNode;
  /** Card content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * CardBase provides shared styling for AI Assistant Cards.
 * 
 * Features:
 * - Glassmorphism styling with backdrop blur
 * - Border with subtle glow
 * - Rounded corners (rounded-xl)
 * - Consistent padding and spacing
 * - Optional icon in header
 * 
 * @example
 * ```tsx
 * <CardBase title="Refined Prompt" icon={<SparklesIcon />}>
 *   <p>Card content here</p>
 * </CardBase>
 * ```
 */
export const CardBase = memo(function CardBase({
  title,
  icon,
  children,
  className,
  testId = 'card-base',
}: CardBaseProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        // Glassmorphism styling
        'bg-white/5 backdrop-blur-sm',
        // Border with subtle glow
        'border border-border-default',
        // Rounded corners
        'rounded-xl',
        // Shadow for depth
        'shadow-lg shadow-black/5',
        // Overflow handling
        'overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-2',
          'px-4 py-3',
          'border-b border-border-subtle',
          'bg-white/[0.02]'
        )}
      >
        {icon && (
          <span className="text-accent-500 flex-shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        <h3 className="text-sm font-medium text-text-primary">{title}</h3>
      </div>

      {/* Content */}
      <div className="p-4">{children}</div>
    </div>
  );
});

CardBase.displayName = 'CardBase';

export default CardBase;
