/**
 * MethodSelector Component
 * 
 * Card-based selector for choosing creation method in Create Studio.
 * Displays two cards: Quick Create and Build Your Own (with integrated Coach).
 * 
 * @module create/MethodSelector
 */

'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MethodSelectorCard, type CreationMethod } from './MethodSelectorCard';

// =============================================================================
// Types
// =============================================================================

export interface MethodSelectorProps {
  /** Currently selected method */
  selectedMethod: CreationMethod;
  /** Callback when method changes */
  onMethodChange: (method: CreationMethod) => void;
  /** Whether user has premium access */
  isPremiumUser: boolean;
  /** Additional className */
  className?: string;
  /** Test ID for e2e testing */
  testId?: string;
}

// =============================================================================
// Icons
// =============================================================================

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

// =============================================================================
// Method Configuration
// =============================================================================

interface MethodConfig {
  method: CreationMethod;
  title: string;
  description: string;
  icon: React.ReactNode;
  isPro?: boolean;
}

const METHODS: MethodConfig[] = [
  {
    method: 'quick',
    title: 'Quick Create',
    description: 'Pick a template, add your vibe, done in seconds.',
    icon: <BoltIcon className="w-5 h-5" />,
  },
  {
    method: 'custom',
    title: 'Build Your Own',
    description: 'Full control with optional AI Coach assistance.',
    icon: <SparklesIcon className="w-5 h-5" />,
  },
];

// =============================================================================
// Component
// =============================================================================

export function MethodSelector({
  selectedMethod,
  onMethodChange,
  isPremiumUser,
  className,
  testId = 'method-selector',
}: MethodSelectorProps) {
  const handleMethodSelect = useCallback((method: CreationMethod) => {
    onMethodChange(method);
  }, [onMethodChange]);

  return (
    <div className={cn('space-y-2', className)} data-testid={testId}>
      {/* Section Header */}
      <h2 className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
        Choose Your Creation Method
      </h2>

      {/* Method Cards */}
      <div
        role="radiogroup"
        aria-label="Creation method selection"
        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
      >
        {METHODS.map((config) => (
          <MethodSelectorCard
            key={config.method}
            method={config.method}
            title={config.title}
            description={config.description}
            icon={config.icon}
            isSelected={selectedMethod === config.method}
            isPro={config.isPro && !isPremiumUser}
            onClick={() => handleMethodSelect(config.method)}
            testId={`${testId}-${config.method}`}
          />
        ))}
      </div>

      {/* Hint for non-premium users about Coach in Build Your Own */}
      {!isPremiumUser && selectedMethod === 'custom' && (
        <p className="text-micro text-text-muted">
          💡 Hint: AI Coach assistance is available with Pro subscription
        </p>
      )}
    </div>
  );
}

export default MethodSelector;
export type { CreationMethod };
