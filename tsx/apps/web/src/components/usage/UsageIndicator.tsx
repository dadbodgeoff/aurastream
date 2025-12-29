'use client';

/**
 * UsageIndicator Component
 * 
 * A small, inline usage indicator for individual features.
 * Shows remaining uses and warns when near/at limit.
 * 
 * @module usage/UsageIndicator
 */

import React, { memo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useUsageLimits, type FeatureType, FEATURE_CONFIG } from '@aurastream/api-client';
import { toast } from '@/components/ui/Toast';

export interface UsageIndicatorProps {
  /** Which feature to show usage for */
  feature: FeatureType;
  /** Show as a badge (compact) or inline text */
  variant?: 'badge' | 'inline' | 'bar';
  /** Additional CSS classes */
  className?: string;
  /** Show warning toast when near limit (default: true) */
  showWarningToast?: boolean;
  /** Callback when upgrade is clicked */
  onUpgrade?: () => void;
}

const InfinityIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
  </svg>
);

/**
 * Small usage indicator for individual features.
 * Shows warning toast at 80% usage and upgrade CTA when limit reached.
 * 
 * @example
 * ```tsx
 * // In Vibe Branding modal header
 * <UsageIndicator feature="vibeBranding" variant="badge" />
 * 
 * // In Aura Lab page header
 * <UsageIndicator feature="auraLab" variant="inline" />
 * 
 * // With upgrade callback
 * <UsageIndicator 
 *   feature="creations" 
 *   variant="bar" 
 *   onUpgrade={() => router.push('/pricing')} 
 * />
 * ```
 */
export const UsageIndicator = memo(function UsageIndicator({
  feature,
  variant = 'badge',
  className,
  showWarningToast = true,
  onUpgrade,
}: UsageIndicatorProps) {
  const { data, isLoading } = useUsageLimits();
  const warningShownRef = useRef<string | null>(null);
  const limitShownRef = useRef<string | null>(null);

  // Show warning toast at 80% usage
  useEffect(() => {
    if (!showWarningToast || !data) return;

    const featureData = data[feature];
    const config = FEATURE_CONFIG[feature];
    const { used, limit, unlimited, remaining } = featureData;
    
    if (unlimited) return;

    const percentage = limit > 0 ? (used / limit) * 100 : 0;
    const warningKey = `${feature}-${used}`;
    const limitKey = `${feature}-limit`;

    // Show warning at 80% usage (only once per threshold)
    if (percentage >= 80 && percentage < 100 && warningShownRef.current !== warningKey) {
      warningShownRef.current = warningKey;
      toast.warning(`${config.label} usage at ${Math.round(percentage)}%`, {
        description: `You have ${remaining} ${config.label.toLowerCase()} remaining this month.`,
        action: onUpgrade ? { label: 'Upgrade', onClick: onUpgrade } : undefined,
      });
    }

    // Show limit reached toast (only once)
    if (remaining === 0 && limitShownRef.current !== limitKey) {
      limitShownRef.current = limitKey;
      toast.error(`${config.label} limit reached`, {
        description: 'Upgrade your plan for more usage.',
        action: onUpgrade ? { label: 'Upgrade Now', onClick: onUpgrade } : undefined,
      });
    }
  }, [data, feature, showWarningToast, onUpgrade]);

  if (isLoading || !data) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-5 w-16 bg-white/10 rounded" />
      </div>
    );
  }

  const featureData = data[feature];
  const config = FEATURE_CONFIG[feature];
  const { used, limit, remaining, unlimited } = featureData;
  const isAtLimit = !unlimited && remaining === 0;
  const isNearLimit = !unlimited && limit > 0 && (used / limit) >= 0.8;

  // Badge variant - compact pill
  if (variant === 'badge') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
          isAtLimit
            ? 'bg-red-500/20 text-red-400'
            : isNearLimit
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-white/10 text-text-secondary',
          className
        )}
      >
        {unlimited ? (
          <>
            <InfinityIcon className="w-3 h-3" />
            <span>Unlimited</span>
          </>
        ) : (
          <span>{remaining} left</span>
        )}
      </span>
    );
  }

  // Inline variant - text only
  if (variant === 'inline') {
    return (
      <span
        className={cn(
          'text-xs',
          isAtLimit
            ? 'text-red-400'
            : isNearLimit
              ? 'text-yellow-400'
              : 'text-text-tertiary',
          className
        )}
      >
        {unlimited ? (
          <span className="flex items-center gap-1">
            <InfinityIcon className="w-3 h-3" /> unlimited
          </span>
        ) : (
          `${remaining} of ${limit} remaining`
        )}
      </span>
    );
  }

  // Bar variant - mini progress bar
  const percentage = unlimited ? 100 : limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-tertiary">{config.label}</span>
        <span className={cn(
          'font-medium',
          isAtLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-text-secondary'
        )}>
          {unlimited ? (
            <span className="flex items-center gap-1">
              {used} <InfinityIcon className="w-3 h-3" />
            </span>
          ) : (
            `${used}/${limit}`
          )}
        </span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isAtLimit
              ? 'bg-red-500'
              : isNearLimit
                ? 'bg-yellow-500'
                : 'bg-interactive-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {/* Upgrade CTA when at limit */}
      {isAtLimit && onUpgrade && (
        <button
          onClick={onUpgrade}
          className="text-xs text-accent-400 hover:text-accent-300 font-medium mt-1"
        >
          Upgrade for more →
        </button>
      )}
    </div>
  );
});

UsageIndicator.displayName = 'UsageIndicator';

export default UsageIndicator;
