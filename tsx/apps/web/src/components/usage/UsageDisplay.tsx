'use client';

/**
 * UsageDisplay Component
 * 
 * A sleek, enterprise-grade usage tracking display that shows
 * all 4 feature limits: Vibe Branding, Aura Lab, Coach, and Creations.
 * 
 * @module usage/UsageDisplay
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@aurastream/shared';
import { useUsageLimits, FEATURE_CONFIG, type FeatureType } from '@aurastream/api-client';

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

const PaletteIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
);

const FlaskIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const ChatIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21,15 16,10 5,21" />
  </svg>
);

const ArrowUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
  </svg>
);

const InfinityIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

// Feature icon mapping
const FeatureIcons: Record<FeatureType, React.FC<{ className?: string }>> = {
  vibeBranding: PaletteIcon,
  auraLab: FlaskIcon,
  coach: ChatIcon,
  creations: ImageIcon,
  profileCreator: UserIcon,
};

// Feature color mapping
const FeatureColors: Record<FeatureType, { bg: string; text: string; bar: string }> = {
  vibeBranding: { bg: 'bg-purple-500/20', text: 'text-purple-400', bar: 'bg-purple-500' },
  auraLab: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', bar: 'bg-cyan-500' },
  coach: { bg: 'bg-amber-500/20', text: 'text-amber-400', bar: 'bg-amber-500' },
  creations: { bg: 'bg-green-500/20', text: 'text-green-400', bar: 'bg-green-500' },
  profileCreator: { bg: 'bg-pink-500/20', text: 'text-pink-400', bar: 'bg-pink-500' },
};

// ============================================================================
// Sub-Components
// ============================================================================

interface TierBadgeProps {
  tier: string;
}

const TierBadge = memo(function TierBadge({ tier }: TierBadgeProps) {
  const colors: Record<string, string> = {
    free: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    pro: 'bg-interactive-600/10 text-interactive-400 border-interactive-500/30',
    studio: 'bg-accent-600/10 text-accent-400 border-accent-500/30',
  };

  const display = tier === 'free' ? 'Free' : tier === 'pro' ? 'Pro' : 'Studio';

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
      colors[tier] || colors.free
    )}>
      {tier === 'studio' && <SparklesIcon className="w-2.5 h-2.5" />}
      {display}
    </span>
  );
});

TierBadge.displayName = 'TierBadge';

interface FeatureUsageBarProps {
  feature: FeatureType;
  used: number;
  limit: number;
  unlimited: boolean;
}

const FeatureUsageBar = memo(function FeatureUsageBar({ 
  feature, 
  used, 
  limit, 
  unlimited 
}: FeatureUsageBarProps) {
  const config = FEATURE_CONFIG[feature];
  const colors = FeatureColors[feature];
  const Icon = FeatureIcons[feature];
  
  const percentage = unlimited ? 100 : limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const remaining = unlimited ? Infinity : Math.max(0, limit - used);
  const isAtLimit = !unlimited && remaining === 0;
  
  const getBarColor = () => {
    if (unlimited) return colors.bar;
    if (isAtLimit) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return colors.bar;
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('w-5 h-5 rounded flex items-center justify-center', colors.bg)}>
            <Icon className={cn('w-3 h-3', colors.text)} />
          </div>
          <div>
            <span className="text-xs font-medium text-text-primary">{config.label}</span>
          </div>
        </div>
        <span className="text-xs font-medium text-text-primary">
          {unlimited ? (
            <span className="flex items-center gap-1">
              {used} <InfinityIcon className="w-3 h-3 text-accent-400" />
            </span>
          ) : (
            <span className={isAtLimit ? 'text-red-400' : ''}>
              {used} / {limit}
            </span>
          )}
        </span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getBarColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
});

FeatureUsageBar.displayName = 'FeatureUsageBar';

interface CompactFeatureProps {
  feature: FeatureType;
  used: number;
  limit: number;
  unlimited: boolean;
}

const CompactFeature = memo(function CompactFeature({ 
  feature, 
  used, 
  limit, 
  unlimited 
}: CompactFeatureProps) {
  const colors = FeatureColors[feature];
  const Icon = FeatureIcons[feature];
  const remaining = unlimited ? Infinity : Math.max(0, limit - used);
  const isAtLimit = !unlimited && remaining === 0;

  return (
    <div className="flex items-center gap-1">
      <div className={cn('w-4 h-4 rounded flex items-center justify-center', colors.bg)}>
        <Icon className={cn('w-2.5 h-2.5', colors.text)} />
      </div>
      <span className={cn('text-[10px] font-medium', isAtLimit ? 'text-red-400' : 'text-text-primary')}>
        {unlimited ? (
          <InfinityIcon className="w-2.5 h-2.5 inline text-accent-400" />
        ) : (
          remaining
        )}
      </span>
    </div>
  );
});

CompactFeature.displayName = 'CompactFeature';

// ============================================================================
// Loading Skeleton
// ============================================================================

const UsageSkeleton = memo(function UsageSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 w-20 bg-white/10 rounded-full" />
        <div className="h-4 w-32 bg-white/10 rounded" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <div className="flex justify-between">
            <div className="h-4 w-24 bg-white/10 rounded" />
            <div className="h-4 w-12 bg-white/10 rounded" />
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full" />
        </div>
      ))}
    </div>
  );
});

UsageSkeleton.displayName = 'UsageSkeleton';

// ============================================================================
// Main Component
// ============================================================================

/**
 * UsageDisplay shows the user's current usage statistics
 * for all 4 features in a clean, enterprise-grade design.
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
  const { data, isLoading, canCreate, isPro } = useUsageLimits();

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

  const canUpgrade = data.tier === 'free';
  const anyAtLimit = !canCreate || 
    (!data.vibeBranding.unlimited && data.vibeBranding.remaining === 0) ||
    (!data.auraLab.unlimited && data.auraLab.remaining === 0) ||
    (!data.coach.unlimited && data.coach.remaining === 0);

  // Minimal variant - just icons with remaining counts
  if (variant === 'minimal') {
    return (
      <div data-testid={testId} className={cn('flex items-center gap-3', className)}>
        <CompactFeature feature="vibeBranding" {...data.vibeBranding} />
        <CompactFeature feature="auraLab" {...data.auraLab} />
        <CompactFeature feature="coach" {...data.coach} />
        <CompactFeature feature="creations" {...data.creations} />
      </div>
    );
  }

  // Compact variant - horizontal layout with tier badge
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
          <TierBadge tier={data.tier} />
          <div className="h-4 w-px bg-border-default" />
          <div className="flex items-center gap-2">
            <CompactFeature feature="vibeBranding" {...data.vibeBranding} />
            <CompactFeature feature="auraLab" {...data.auraLab} />
            <CompactFeature feature="coach" {...data.coach} />
            <CompactFeature feature="creations" {...data.creations} />
          </div>
        </div>
        {showUpgrade && canUpgrade && (
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

  // Full variant - detailed card with all features
  return (
    <div 
      data-testid={testId}
      className={cn(
        'p-4 rounded-xl',
        'bg-background-surface border border-border-default',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <TierBadge tier={data.tier} />
          {data.resetsAt && (
            <p className="text-[10px] text-text-tertiary mt-1.5">
              Resets {new Date(data.resetsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
        {isPro && (
          <span className="text-[10px] text-accent-400 font-medium">
            ✨ Pro Active
          </span>
        )}
      </div>

      {/* Feature Usage Bars */}
      <div className="space-y-3">
        <FeatureUsageBar feature="vibeBranding" {...data.vibeBranding} />
        <FeatureUsageBar feature="auraLab" {...data.auraLab} />
        <FeatureUsageBar feature="coach" {...data.coach} />
        <FeatureUsageBar feature="creations" {...data.creations} />
      </div>

      {/* Warning Banner */}
      {anyAtLimit && (
        <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-xs font-medium text-red-400">
            You've reached a limit
          </p>
          <p className="text-[10px] text-text-tertiary mt-0.5">
            {canUpgrade 
              ? 'Upgrade to Pro for more usage'
              : 'Resets at start of next month'
            }
          </p>
        </div>
      )}

      {/* Upgrade CTA */}
      {showUpgrade && canUpgrade && (
        <button
          onClick={onUpgrade}
          className={cn(
            'w-full mt-3 py-2 px-3 rounded-lg',
            'bg-accent-600 hover:bg-accent-500',
            'text-white text-xs font-medium',
            'flex items-center justify-center gap-1.5',
            'transition-colors',
            !prefersReducedMotion && 'transition-transform hover:scale-[1.02]'
          )}
        >
          <ArrowUpIcon className="w-3 h-3" />
          Upgrade to Pro
        </button>
      )}

      {/* Pro Benefits */}
      {showUpgrade && canUpgrade && (
        <div className="mt-3 pt-3 border-t border-border-default">
          <p className="text-[10px] font-medium text-text-secondary mb-1.5">
            Pro includes:
          </p>
          <ul className="grid grid-cols-2 gap-1 text-[10px] text-text-tertiary">
            <li className="flex items-center gap-1">
              <PaletteIcon className="w-2.5 h-2.5 text-purple-400" />
              10 Vibe Branding
            </li>
            <li className="flex items-center gap-1">
              <FlaskIcon className="w-2.5 h-2.5 text-cyan-400" />
              25 Aura Lab
            </li>
            <li className="flex items-center gap-1">
              <ChatIcon className="w-2.5 h-2.5 text-amber-400" />
              Unlimited Coach
            </li>
            <li className="flex items-center gap-1">
              <ImageIcon className="w-2.5 h-2.5 text-green-400" />
              50 Creations
            </li>
          </ul>
        </div>
      )}
    </div>
  );
});

UsageDisplay.displayName = 'UsageDisplay';

export default UsageDisplay;
