'use client';

/**
 * UsageDisplay Component
 * 
 * A sleek, enterprise-grade usage tracking display that shows
 * generation limits, coach access, and tier information.
 * 
 * @module usage/UsageDisplay
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';
import { useUsageStats } from '../../hooks/useUsageStats';
import type { UsageStats } from '@aurastream/api-client/src/types/usage';

// ============================================================================
// Type Definitions
// ============================================================================

export interface UsageDisplayProps {
  /** Display variant */
  variant?: 'full' | 'compact' | 'minimal';
  /** Show upgrade CTA */
  showUpgrade?: boolean;
  /** Callback when upgrade is clicked */
  onUpgrade?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID */
  testId?: string;
}

// ============================================================================
// Icon Components
// ============================================================================

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21,15 16,10 5,21" />
  </svg>
);

const ChatIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ArrowUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const InfinityIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
  </svg>
);

// ============================================================================
// Sub-Components
// ============================================================================

interface TierBadgeProps {
  tier: UsageStats['tier'];
  tierDisplay: string;
}

const TierBadge = memo(function TierBadge({ tier, tierDisplay }: TierBadgeProps) {
  const colors = {
    free: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    pro: 'bg-interactive-600/10 text-interactive-400 border-interactive-500/30',
    studio: 'bg-accent-600/10 text-accent-400 border-accent-500/30',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
      colors[tier]
    )}>
      {tier === 'studio' && <SparklesIcon className="w-3 h-3" />}
      {tierDisplay}
    </span>
  );
});

TierBadge.displayName = 'TierBadge';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  isUnlimited?: boolean;
}

const ProgressRing = memo(function ProgressRing({
  percentage,
  size = 48,
  strokeWidth = 4,
  isUnlimited = false,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  // Color based on usage
  const getColor = () => {
    if (isUnlimited) return 'stroke-accent-500';
    if (percentage >= 100) return 'stroke-red-500';
    if (percentage >= 80) return 'stroke-yellow-500';
    return 'stroke-interactive-500';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/10"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={isUnlimited ? 0 : offset}
          className={cn('transition-all duration-500', getColor())}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isUnlimited ? (
          <InfinityIcon className="w-5 h-5 text-accent-400" />
        ) : (
          <span className={cn(
            'text-xs font-bold',
            percentage >= 100 ? 'text-red-400' : percentage >= 80 ? 'text-yellow-400' : 'text-text-primary'
          )}>
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    </div>
  );
});

ProgressRing.displayName = 'ProgressRing';

interface UsageBarProps {
  used: number;
  limit: number;
  label: string;
  icon: React.ReactNode;
}

const UsageBar = memo(function UsageBar({ used, limit, label, icon }: UsageBarProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);
  
  const getBarColor = () => {
    if (isUnlimited) return 'bg-accent-500';
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-interactive-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          {icon}
          <span>{label}</span>
        </div>
        <span className="text-sm font-medium text-text-primary">
          {isUnlimited ? (
            <span className="flex items-center gap-1">
              {used} <InfinityIcon className="w-4 h-4 text-accent-400" />
            </span>
          ) : (
            `${used} / ${limit}`
          )}
        </span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getBarColor())}
          style={{ width: isUnlimited ? '100%' : `${percentage}%` }}
        />
      </div>
    </div>
  );
});

UsageBar.displayName = 'UsageBar';

interface CoachStatusProps {
  available: boolean;
  trialAvailable: boolean;
  trialUsed: boolean;
  messagesPerSession: number;
}

const CoachStatus = memo(function CoachStatus({
  available,
  trialAvailable,
  trialUsed,
  messagesPerSession,
}: CoachStatusProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          available ? 'bg-accent-500/20' : 'bg-white/10'
        )}>
          <ChatIcon className={cn('w-5 h-5', available ? 'text-accent-400' : 'text-text-tertiary')} />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">Prompt Coach</p>
          <p className="text-xs text-text-tertiary">
            {available ? (
              trialAvailable ? '1 free trial session' : `${messagesPerSession} messages/session`
            ) : (
              trialUsed ? 'Trial used' : 'Studio only'
            )}
          </p>
        </div>
      </div>
      <div className={cn(
        'px-2 py-1 rounded text-xs font-medium',
        available 
          ? trialAvailable 
            ? 'bg-yellow-500/20 text-yellow-400' 
            : 'bg-green-500/20 text-green-400'
          : 'bg-white/10 text-text-tertiary'
      )}>
        {available ? (trialAvailable ? 'Trial' : 'Active') : 'Locked'}
      </div>
    </div>
  );
});

CoachStatus.displayName = 'CoachStatus';

// ============================================================================
// Loading Skeleton
// ============================================================================

const UsageSkeleton = memo(function UsageSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 w-20 bg-white/10 rounded-full" />
        <div className="h-12 w-12 bg-white/10 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full bg-white/10 rounded" />
        <div className="h-2 w-full bg-white/10 rounded-full" />
      </div>
      <div className="h-16 w-full bg-white/10 rounded-lg" />
    </div>
  );
});

UsageSkeleton.displayName = 'UsageSkeleton';

// ============================================================================
// Main Component
// ============================================================================

/**
 * UsageDisplay shows the user's current usage statistics
 * in a clean, enterprise-grade design.
 * 
 * @example
 * ```tsx
 * <UsageDisplay 
 *   variant="full" 
 *   showUpgrade 
 *   onUpgrade={() => router.push('/pricing')} 
 * />
 * ```
 */
export const UsageDisplay = memo(function UsageDisplay({
  variant = 'full',
  showUpgrade = true,
  onUpgrade,
  className,
  testId = 'usage-display',
}: UsageDisplayProps) {
  const prefersReducedMotion = useReducedMotion();
  const { data, isLoading, isNearLimit, isAtLimit } = useUsageStats();

  if (isLoading) {
    return (
      <div data-testid={testId} className={cn('p-4', className)}>
        <UsageSkeleton />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const isUnlimited = data.generationsLimit === -1;

  // Minimal variant - just the progress ring
  if (variant === 'minimal') {
    return (
      <div data-testid={testId} className={cn('flex items-center gap-3', className)}>
        <ProgressRing 
          percentage={data.generationsPercentage} 
          size={36} 
          strokeWidth={3}
          isUnlimited={isUnlimited}
        />
        <div className="text-sm">
          <span className="font-medium text-text-primary">{data.generationsUsed}</span>
          <span className="text-text-tertiary">
            {isUnlimited ? ' used' : ` / ${data.generationsLimit}`}
          </span>
        </div>
      </div>
    );
  }

  // Compact variant - horizontal layout
  if (variant === 'compact') {
    return (
      <div 
        data-testid={testId} 
        className={cn(
          'flex items-center justify-between p-3 rounded-lg',
          'bg-background-surface border border-border-default',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <TierBadge tier={data.tier} tierDisplay={data.tierDisplay} />
          <div className="h-4 w-px bg-border-default" />
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-text-tertiary" />
            <span className="text-sm text-text-primary">
              {isUnlimited ? (
                <span className="flex items-center gap-1">
                  {data.generationsUsed} <InfinityIcon className="w-3 h-3 text-purple-400" />
                </span>
              ) : (
                `${data.generationsRemaining} left`
              )}
            </span>
          </div>
        </div>
        {showUpgrade && data.canUpgrade && (
          <button
            onClick={onUpgrade}
            className={cn(
              'text-xs font-medium text-accent-400 hover:text-accent-300',
              'transition-colors'
            )}
          >
            Upgrade
          </button>
        )}
      </div>
    );
  }

  // Full variant - detailed card
  return (
    <div 
      data-testid={testId}
      className={cn(
        'p-5 rounded-xl',
        'bg-background-surface border border-border-default',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <TierBadge tier={data.tier} tierDisplay={data.tierDisplay} />
          {data.daysRemaining !== null && (
            <p className="text-xs text-text-tertiary mt-2">
              {data.daysRemaining} days remaining
            </p>
          )}
        </div>
        <ProgressRing 
          percentage={data.generationsPercentage}
          isUnlimited={isUnlimited}
        />
      </div>

      {/* Usage Bar */}
      <div className="mb-5">
        <UsageBar
          used={data.generationsUsed}
          limit={data.generationsLimit}
          label="Generations"
          icon={<ImageIcon className="w-4 h-4" />}
        />
      </div>

      {/* Coach Status */}
      <CoachStatus
        available={data.coachAvailable}
        trialAvailable={data.coachTrialAvailable}
        trialUsed={data.coachTrialUsed}
        messagesPerSession={data.coachMessagesPerSession}
      />

      {/* Warning Banner */}
      {isNearLimit && !isUnlimited && (
        <div className={cn(
          'mt-4 p-3 rounded-lg',
          isAtLimit 
            ? 'bg-red-500/10 border border-red-500/30' 
            : 'bg-yellow-500/10 border border-yellow-500/30'
        )}>
          <p className={cn(
            'text-sm font-medium',
            isAtLimit ? 'text-red-400' : 'text-yellow-400'
          )}>
            {isAtLimit 
              ? "You've reached your limit" 
              : `${data.generationsRemaining} generation${data.generationsRemaining === 1 ? '' : 's'} remaining`
            }
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            {isAtLimit 
              ? 'Upgrade to continue creating assets'
              : 'Consider upgrading for more generations'
            }
          </p>
        </div>
      )}

      {/* Upgrade CTA */}
      {showUpgrade && data.canUpgrade && (
        <button
          onClick={onUpgrade}
          className={cn(
            'w-full mt-4 py-2.5 px-4 rounded-lg',
            'bg-accent-600 hover:bg-accent-500',
            'text-white text-sm font-medium',
            'flex items-center justify-center gap-2',
            'transition-colors',
            !prefersReducedMotion && 'transition-transform hover:scale-[1.02]'
          )}
        >
          <ArrowUpIcon className="w-4 h-4" />
          Upgrade to {data.tier === 'free' ? 'Pro' : 'Studio'}
        </button>
      )}

      {/* Upgrade Benefits */}
      {showUpgrade && data.canUpgrade && data.upgradeBenefits.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-default">
          <p className="text-xs font-medium text-text-secondary mb-2">
            Upgrade benefits:
          </p>
          <ul className="space-y-1.5">
            {data.upgradeBenefits.slice(0, 3).map((benefit, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-text-tertiary">
                <CheckIcon className="w-3 h-3 text-green-400 flex-shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

UsageDisplay.displayName = 'UsageDisplay';

export default UsageDisplay;
