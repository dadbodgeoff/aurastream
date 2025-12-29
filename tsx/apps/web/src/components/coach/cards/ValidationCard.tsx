'use client';

/**
 * ValidationCard Component
 * 
 * Shows validation results with issues and quality score.
 * Displays errors, warnings, and info with clickable suggestions.
 * 
 * @module coach/cards/ValidationCard
 */

import React, { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';
import { CardBase } from './CardBase';

// ============================================================================
// Type Definitions
// ============================================================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  /** Severity level of the issue */
  severity: ValidationSeverity;
  /** Unique code for the issue */
  code: string;
  /** Human-readable message */
  message: string;
  /** Optional suggestion for fixing the issue */
  suggestion?: string;
}

export interface ValidationResult {
  /** Whether the prompt is valid */
  isValid: boolean;
  /** Whether the prompt is ready for generation */
  isGenerationReady: boolean;
  /** Quality score from 0-100 */
  qualityScore: number;
  /** List of validation issues */
  issues: ValidationIssue[];
}

export interface ValidationCardProps {
  /** Validation result to display */
  result: ValidationResult;
  /** Callback when a fix suggestion is clicked */
  onApplyFix?: (issueCode: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Icon Components
// ============================================================================

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ErrorIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const WarningIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const InfoIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

// ============================================================================
// Sub-Components
// ============================================================================

interface IssueItemProps {
  issue: ValidationIssue;
  onApplyFix?: (code: string) => void;
  animate: boolean;
}

/**
 * Individual validation issue item
 */
const IssueItem = memo(function IssueItem({ issue, onApplyFix, animate }: IssueItemProps) {
  const { severity, code, message, suggestion } = issue;

  const handleApplyFix = useCallback(() => {
    if (onApplyFix) {
      onApplyFix(code);
    }
  }, [onApplyFix, code]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onApplyFix) {
      e.preventDefault();
      handleApplyFix();
    }
  }, [handleApplyFix, onApplyFix]);

  // Severity-specific styling
  const severityConfig: Record<ValidationSeverity, { icon: React.ReactNode; color: string; bgColor: string }> = {
    error: {
      icon: <ErrorIcon className="w-4 h-4" />,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    warning: {
      icon: <WarningIcon className="w-4 h-4" />,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    info: {
      icon: <InfoIcon className="w-4 h-4" />,
      color: 'text-primary-400',
      bgColor: 'bg-primary-500/10',
    },
  };

  const config = severityConfig[severity];

  return (
    <div
      className={cn(
        'rounded-lg p-3',
        config.bgColor,
        animate && 'transition-colors duration-200'
      )}
      role="listitem"
    >
      {/* Issue Header */}
      <div className="flex items-start gap-2">
        <span className={cn('flex-shrink-0 mt-0.5', config.color)} aria-hidden="true">
          {config.icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm', config.color)}>
            <span className="font-medium capitalize">{severity}:</span>{' '}
            <span className="text-text-primary">{message}</span>
          </p>
          
          {/* Suggestion */}
          {suggestion && (
            <div className="mt-2">
              {onApplyFix ? (
                <button
                  type="button"
                  onClick={handleApplyFix}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    'inline-flex items-center gap-1.5',
                    'text-xs text-text-secondary hover:text-accent-400',
                    'transition-colors',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:rounded'
                  )}
                  aria-label={`Apply fix: ${suggestion}`}
                >
                  <ArrowRightIcon className="w-3 h-3" />
                  <span>{suggestion}</span>
                </button>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-text-tertiary">
                  <ArrowRightIcon className="w-3 h-3" />
                  <span>{suggestion}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

IssueItem.displayName = 'IssueItem';

interface QualityScoreSummaryProps {
  score: number;
  isValid: boolean;
  isGenerationReady: boolean;
  animate: boolean;
}

/**
 * Quality score summary at bottom of card
 */
const QualityScoreSummary = memo(function QualityScoreSummary({
  score,
  isValid,
  isGenerationReady,
  animate,
}: QualityScoreSummaryProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreTextColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="pt-3 border-t border-border-subtle space-y-2">
      {/* Quality Score Bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">Quality Score</span>
        <span className={cn('text-sm font-medium', getScoreTextColor(score))}>
          {score}%
        </span>
      </div>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full',
            getScoreColor(score),
            animate && 'transition-all duration-500 ease-out'
          )}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Quality score: ${score}%`}
        />
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-4 text-xs">
        <span className={cn(
          'flex items-center gap-1',
          isValid ? 'text-green-400' : 'text-red-400'
        )}>
          {isValid ? '✓' : '✗'} Valid
        </span>
        <span className={cn(
          'flex items-center gap-1',
          isGenerationReady ? 'text-green-400' : 'text-yellow-400'
        )}>
          {isGenerationReady ? '✓' : '○'} Ready to generate
        </span>
      </div>
    </div>
  );
});

QualityScoreSummary.displayName = 'QualityScoreSummary';

// ============================================================================
// Main Component
// ============================================================================

/**
 * ValidationCard displays validation results with issues and quality score.
 * 
 * Features:
 * - Severity icons: ❌ error (red), ⚠️ warning (yellow), ℹ️ info (blue)
 * - Clickable suggestions that call onApplyFix
 * - Overall quality score at bottom
 * - Valid/Ready status indicators
 * - Keyboard accessible
 * - Reduced motion support
 * 
 * @example
 * ```tsx
 * <ValidationCard
 *   result={{
 *     isValid: true,
 *     isGenerationReady: true,
 *     qualityScore: 85,
 *     issues: [
 *       { severity: 'warning', code: 'detail', message: 'Could add more detail', suggestion: 'Add specific character pose' },
 *       { severity: 'info', code: 'style', message: 'Consider style reference', suggestion: 'Try "pixel art" or "anime"' },
 *     ],
 *   }}
 *   onApplyFix={(code) => applyFix(code)}
 * />
 * ```
 */
export const ValidationCard = memo(function ValidationCard({
  result,
  onApplyFix,
  className,
  testId = 'validation-card',
}: ValidationCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  
  const { isValid, isGenerationReady, qualityScore, issues } = result;
  const hasIssues = issues.length > 0;

  return (
    <CardBase
      title="Validation Results"
      icon={<CheckCircleIcon className={cn('w-5 h-5', isValid ? 'text-green-400' : 'text-yellow-400')} />}
      className={className}
      testId={testId}
    >
      <div className="space-y-4">
        {/* Issues List */}
        {hasIssues ? (
          <div className="space-y-2" role="list" aria-label="Validation issues">
            {issues.map((issue) => (
              <IssueItem
                key={issue.code}
                issue={issue}
                onApplyFix={onApplyFix}
                animate={shouldAnimate}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircleIcon className="w-5 h-5" />
            <span>All checks passed!</span>
          </div>
        )}

        {/* Quality Score Summary */}
        <QualityScoreSummary
          score={qualityScore}
          isValid={isValid}
          isGenerationReady={isGenerationReady}
          animate={shouldAnimate}
        />
      </div>
    </CardBase>
  );
});

ValidationCard.displayName = 'ValidationCard';

export default ValidationCard;
