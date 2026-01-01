'use client';

import { Clock, Trophy, Users, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLatestPlaybook } from '@aurastream/api-client';
import { useIntelStore } from '@/stores/intelStore';
import { PanelCard } from './PanelCard';
import type { GoldenHourWindow } from '@aurastream/api-client';

// =============================================================================
// Golden Hour Item
// =============================================================================

function GoldenHourItem({ 
  hour, 
  rank,
  isBest = false,
}: { 
  hour: GoldenHourWindow; 
  rank: number;
  isBest?: boolean;
}) {
  const formatTime = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}${period}`;
  };
  
  return (
    <div className={cn(
      'relative p-3 rounded-lg border transition-colors',
      isBest 
        ? 'bg-interactive-600/15 border-interactive-500/30'
        : 'bg-background-surface/50 border-border-subtle'
    )}>
      {/* Best Badge */}
      {isBest && (
        <div className="absolute -top-2 -right-2">
          <div className="flex items-center gap-1 px-2 py-0.5 bg-interactive-600 rounded-full">
            <Trophy className="w-3 h-3 text-white" />
            <span className="text-xs font-bold text-white">BEST</span>
          </div>
        </div>
      )}
      
      {/* Time */}
      <div className="flex items-center gap-2 mb-2">
        <Clock className={cn(
          'w-4 h-4',
          isBest ? 'text-interactive-400' : 'text-text-muted'
        )} />
        <span className={cn(
          'font-semibold',
          isBest ? 'text-interactive-300' : 'text-text-primary'
        )}>
          {hour.day} {formatTime(hour.startHour)}-{formatTime(hour.endHour)}
        </span>
      </div>
      
      {/* Stats */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 text-text-muted" />
          <span className="text-text-secondary capitalize">
            {hour.viewerAvailability} viewers
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Swords className="w-3 h-3 text-text-muted" />
          <span className="text-text-secondary capitalize">
            {hour.competitionLevel} competition
          </span>
        </div>
      </div>
      
      {/* Opportunity Score */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={cn(
              'h-full rounded-full',
              isBest ? 'bg-interactive-500' : 'bg-interactive-600/50'
            )}
            style={{ width: `${hour.opportunityScore}%` }}
          />
        </div>
        <span className={cn(
          'text-xs font-medium',
          isBest ? 'text-interactive-300' : 'text-text-muted'
        )}>
          {hour.opportunityScore}%
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Golden Hours Panel
// =============================================================================

export function GoldenHoursPanel() {
  const { data: playbook, isLoading, isError, refetch, dataUpdatedAt } = useLatestPlaybook();
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);
  
  // Only show golden hours if user has subscribed categories
  const hasSubscriptions = subscribedCategories.length > 0;
  const goldenHours = hasSubscriptions ? (playbook?.goldenHours?.slice(0, 3) || []) : [];
  
  return (
    <PanelCard
      title="Golden Hours"
      icon={<Clock className="w-4 h-4" />}
      isLoading={isLoading}
      isError={isError}
      errorMessage="Couldn't load golden hours"
      lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
      onRefresh={() => refetch()}
      size="small"
    >
      {goldenHours.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <Clock className="w-8 h-8 text-text-muted/50 mb-2" />
          <p className="text-sm text-text-muted">
            {hasSubscriptions ? 'No golden hours found' : 'Subscribe to categories'}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {hasSubscriptions ? 'Check back tomorrow' : 'to see optimal streaming times'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {goldenHours.map((hour, index) => (
            <GoldenHourItem
              key={`${hour.day}-${hour.startHour}`}
              hour={hour}
              rank={index + 1}
              isBest={index === 0}
            />
          ))}
        </div>
      )}
    </PanelCard>
  );
}
