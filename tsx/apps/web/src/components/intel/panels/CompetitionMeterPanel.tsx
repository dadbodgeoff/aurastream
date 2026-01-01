'use client';

import { Gauge, Users, Radio, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTwitchGames } from '@aurastream/api-client';
import { useIntelStore } from '@/stores/intelStore';
import { PanelCard } from './PanelCard';

// =============================================================================
// Competition Level
// =============================================================================

type CompetitionLevel = 'low' | 'medium' | 'high' | 'extreme';

function getCompetitionLevel(streamCount: number, avgViewers: number): CompetitionLevel {
  const ratio = avgViewers / Math.max(streamCount, 1);
  
  if (streamCount < 200 && ratio > 50) return 'low';
  if (streamCount < 500 && ratio > 30) return 'medium';
  if (streamCount < 1500) return 'high';
  return 'extreme';
}

function getCompetitionConfig(level: CompetitionLevel) {
  switch (level) {
    case 'low':
      return {
        color: 'text-success-main',
        bgColor: 'bg-success-main/20',
        borderColor: 'border-success-main/30',
        icon: TrendingDown,
        label: 'Low Competition',
        description: 'Great opportunity!',
      };
    case 'medium':
      return {
        color: 'text-warning-main',
        bgColor: 'bg-warning-main/20',
        borderColor: 'border-warning-main/30',
        icon: Minus,
        label: 'Medium Competition',
        description: 'Moderate saturation',
      };
    case 'high':
      return {
        color: 'text-accent-400',
        bgColor: 'bg-accent-500/20',
        borderColor: 'border-accent-500/30',
        icon: TrendingUp,
        label: 'High Competition',
        description: 'Crowded space',
      };
    case 'extreme':
      return {
        color: 'text-error-main',
        bgColor: 'bg-error-main/20',
        borderColor: 'border-error-main/30',
        icon: TrendingUp,
        label: 'Extreme Competition',
        description: 'Very saturated',
      };
  }
}

// =============================================================================
// Competition Bar
// =============================================================================

function CompetitionBar({ 
  name, 
  streamCount, 
  viewers,
  avgViewers,
}: { 
  name: string;
  streamCount: number;
  viewers: number;
  avgViewers: number;
}) {
  const level = getCompetitionLevel(streamCount, avgViewers);
  const config = getCompetitionConfig(level);
  const Icon = config.icon;
  
  // Calculate fill percentage (capped at 100)
  const fillPercent = Math.min((streamCount / 2000) * 100, 100);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary truncate max-w-[120px]">
          {name}
        </span>
        <div className="flex items-center gap-1">
          <Icon className={cn('w-3 h-3', config.color)} />
          <span className={cn('text-xs font-medium', config.color)}>
            {config.label.split(' ')[0]}
          </span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={cn('h-full rounded-full transition-all duration-500', config.bgColor)}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
      
      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-1">
          <Radio className="w-3 h-3" />
          <span>{streamCount.toLocaleString()} streams</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>{(viewers / 1000).toFixed(0)}K viewers</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Competition Meter Panel
// =============================================================================

export function CompetitionMeterPanel() {
  const activeFilter = useIntelStore(state => state.activeFilter);
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);
  
  const { data: games, isLoading, isError, refetch, dataUpdatedAt } = useTwitchGames(10);
  
  // Check if user has subscriptions
  const hasSubscriptions = subscribedCategories.length > 0;
  
  // Filter games based on subscribed categories
  const filteredGames = games?.filter(game => {
    if (!hasSubscriptions) return false; // No subscriptions = no data
    
    if (activeFilter === 'all') {
      // Show games that match any subscribed category
      return subscribedCategories.some(cat => 
        cat.twitchId === game.gameId || 
        cat.name.toLowerCase() === game.name.toLowerCase()
      );
    }
    // Show specific filtered category
    const category = subscribedCategories.find(c => c.key === activeFilter);
    return category && (
      category.twitchId === game.gameId || 
      category.name.toLowerCase() === game.name.toLowerCase()
    );
  }) || [];
  
  // Only show filtered games - no fallback to unsubscribed content
  const displayGames = filteredGames.slice(0, 4);
  
  return (
    <PanelCard
      title="Competition Meter"
      icon={<Gauge className="w-4 h-4" />}
      isLoading={isLoading}
      isError={isError}
      errorMessage="Couldn't load competition data"
      lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
      onRefresh={() => refetch()}
      size="small"
    >
      {displayGames.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <Gauge className="w-8 h-8 text-text-muted/50 mb-2" />
          <p className="text-sm text-text-muted">
            {hasSubscriptions ? 'No competition data' : 'Subscribe to categories'}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {hasSubscriptions ? 'for your categories' : 'to see competition data'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayGames.map((game) => (
            <CompetitionBar
              key={game.gameId}
              name={game.name}
              streamCount={game.twitchStreams}
              viewers={game.twitchViewers}
              avgViewers={game.avgViewersPerStream || 0}
            />
          ))}
        </div>
      )}
    </PanelCard>
  );
}
