/**
 * MethodSelectorCard Component
 * 
 * Individual card for selecting a creation method in Create Studio.
 * Displays icon, title, description, and selection state.
 * 
 * @module create/MethodSelectorCard
 */

'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// =============================================================================
// Types
// =============================================================================

export type CreationMethod = 'quick' | 'custom' | 'coach';

export interface MethodSelectorCardProps {
  /** Creation method identifier */
  method: CreationMethod;
  /** Card title */
  title: string;
  /** Card description */
  description: string;
  /** Icon component */
  icon: React.ReactNode;
  /** Whether this card is selected */
  isSelected: boolean;
  /** Whether this is a PRO feature */
  isPro?: boolean;
  /** Whether the card is disabled */
  disabled?: boolean;
  /** Click handler */
  onClick: () => void;
  /** Test ID for e2e testing */
  testId?: string;
}

// =============================================================================
// Styles
// =============================================================================

const cardStyles = {
  base: [
    'relative flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-150',
    'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-background-base',
  ].join(' '),
  selected: 'border-interactive-600 bg-interactive-600/10',
  unselected: 'border-border-subtle bg-background-surface/50 hover:border-border-default hover:bg-background-surface',
  disabled: 'opacity-50 cursor-not-allowed',
};

// =============================================================================
// Component
// =============================================================================

export function MethodSelectorCard({
  method,
  title,
  description,
  icon,
  isSelected,
  isPro = false,
  disabled = false,
  onClick,
  testId,
}: MethodSelectorCardProps) {
  const handleClick = () => {
    if (!disabled) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        cardStyles.base,
        isSelected ? cardStyles.selected : cardStyles.unselected,
        disabled && cardStyles.disabled,
      )}
      whileHover={!disabled ? { scale: 1.01 } : undefined}
      whileTap={!disabled ? { scale: 0.99 } : undefined}
      data-testid={testId || `method-card-${method}`}
      data-method={method}
      data-selected={isSelected}
    >
      {/* Icon */}
      <div className={cn(
        'w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0',
        isSelected ? 'bg-interactive-600/20 text-interactive-400' : 'bg-background-elevated text-text-secondary',
      )}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={cn(
            'text-sm font-semibold',
            isSelected ? 'text-text-primary' : 'text-text-primary',
          )}>
            {title}
          </h3>
          {isPro && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-accent-600 text-white rounded">
              PRO
            </span>
          )}
        </div>
        <p className="text-xs text-text-secondary line-clamp-1">
          {description}
        </p>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          className="w-5 h-5 rounded-full bg-interactive-600 flex items-center justify-center flex-shrink-0"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <CheckIcon className="w-3 h-3 text-white" />
        </motion.div>
      )}
    </motion.button>
  );
}

// =============================================================================
// Icons
// =============================================================================

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default MethodSelectorCard;
