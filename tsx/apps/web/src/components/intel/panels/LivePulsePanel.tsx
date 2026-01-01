'use client';

import { Activity, Users, Radio, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTwitchLive, useTwitchGames } from '@aurastream/api-client';
import { useIntelStore } from '@/stores/intelStore';
import { PanelCard } from './PanelCard';

// =============================================================================
// Competition Level
// =============================================================================

function getCompetitionLevel(streamCount: number): { level: 'low' | 'medium' | 'high'; color: string; icon: string } {
  if (streamCount < 500) return { level: 'low', color: 'text-success-main', icon: '🟢' };
  if (streamCount < 2000) return { level: 'medium', color: 'text-warning-main', icon: '🟡' };
  return { level: 'high', color: 'text-error-main', icon: '🔴' };
}

function formatViewers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

// =============================================================================
// Category Stat Card
// =============================================================================

function CategoryStatCard({ 
  name, 
  viewers, 
  streams,
  isTotal = false,
}: { 
  name: string; 
  viewers: number; 
  streams?: number;
  isTotal?: boolean;
}) {
  const competition = streams ? getCompetitionLevel(streams) : null;
  
  return (
    <div className={cn(
      'p-3 rounded-lg border',
      isTotal 
        ? 'bg-interactive-600/10 border-interactive-500/20'
        : 'bg-background-surface/50 border-border-subtle'
    )}>
      <p className="text-xs text-text-muted font-medium truncate mb-1">
        {name}
      </p>
      <p className={cn(
        'text-lg font-bold',
        isTotal ? 'text-interactive-300' : 'text-text-primary'
      )}>
        {formatViewers(viewers)}
      </p>
      <p className="text-xs text-text-muted">viewers</p>
      
      {competition && (
        <div className="flex items-center gap-1 mt-2">
          <span className="text-xs">{competition.icon}</span>
          <span className={cn('text-xs font-medium capitalize', competition.color)}>
            {competition.level}
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Top Stream Item
// =============================================================================

function TopStreamItem({ 
  rank, 
  name, 
  game, 
  viewers 
}: { 
  rank: number; 
  name: string; 
  game: string; 
  viewers: number;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-xs font-bold text-text-muted w-4">{rank}.</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary font-medium truncate">
          @{name}
        </p>
        <p className="text-xs text-text-muted truncate">
          {game}
        </p>
      </div>
      <div className="flex items-center gap-1 text-text-secondary">
        <Users className="w-3 h-3" />
        <span className="text-xs font-medium">{formatViewers(viewers)}</span>
      </div>
    </div>
  );
}

// =============================================================================
// Live Pulse Panel
// =============================================================================

export function LivePulsePanel() {
  const activeFilter = useIntelStore(state => state.activeFilter);
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);
  
  // Get game ID for filter - if specific category selected, use that
  // Otherwise, we'll filter by ALL subscribed categories
  const gameId = activeFilter !== 'all' 
    ? subscribedCategories.find(c => c.key === activeFilter)?.twitchId 
    : undefined;
  
  const { data: streams, isLoading: isLoadingStreams, isError: isErrorStreams, refetch: refetchStreams, dataUpdatedAt } = useTwitchLive(10, gameId);
  const { data: games, isLoading: isLoadingGames, isError: isErrorGames } = useTwitchGames(20); // Fetch more to filter
  
  const isLoading = isLoadingStreams || isLoadingGames;
  const isError = isErrorStreams || isErrorGames;
  
  // Filter games to only show subscribed categories
  const subscribedGameIds = new Set(subscribedCategories.map(c => c.twitchId));
  const filteredGames = (games || []).filter(game => 
    subscribedCategories.length === 0 || subscribedGameIds.has(game.gameId)
  );
  
  // Calculate totals from filtered games
  const totalViewers = filteredGames.reduce((sum, g) => sum + g.twitchViewers, 0);
  
  // Filter streams to only show subscribed categories
  const filteredStreams = (streams || []).filter(stream =>
    subscribedCategories.length === 0 || subscribedGameIds.has(stream.gameId)
  );
  
  // Get top 3 streams from filtered
  const topStreams = filteredStreams.slice(0, 3);
  
  // Get category stats (top 3 games from filtered)
  const categoryStats = filteredGames.slice(0, 3);
  
  return (
    <PanelCard
      title="Live Pulse"
      icon={<Activity className="w-4 h-4" />}
      isLoading={isLoading}
      isError={isError}
      errorMessage="Couldn't load live data"
      lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
      onRefresh={() => refetchStreams()}
      size="wide"
      headerActions={
        <div className="flex items-center gap-1.5 px-2 py-1 bg-success-main/10 rounded-full">
          <Radio className="w-3 h-3 text-success-main animate-pulse" />
          <span className="text-xs font-medium text-success-main">Live</span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Category Stats Grid */}
        <div className="grid grid-cols-4 gap-2">
          {categoryStats.map((game) => (
            <CategoryStatCard
              key={game.gameId}
              name={game.name}
              viewers={game.twitchViewers}
              streams={game.twitchStreams}
            />
          ))}
          <CategoryStatCard
            name="Total"
            viewers={totalViewers}
            isTotal
          />
        </div>
        
        {/* Divider */}
        <div className="border-t border-border-subtle" />
        
        {/* Top Streams */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Top Streams
            </span>
          </div>
          
          {topStreams.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">
              No streams found
            </p>
          ) : (
            <div className="divide-y divide-border-subtle/50">
              {topStreams.map((stream, index) => (
                <TopStreamItem
                  key={stream.streamerId}
                  rank={index + 1}
                  name={stream.streamerName}
                  game={stream.gameName}
                  viewers={stream.viewerCount}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PanelCard>
  );
}
