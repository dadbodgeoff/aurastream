'use client';

/**
 * Twitch Overview Tab
 * 
 * Shows all Twitch games and top streams.
 */

import { Users, Eye, TrendingUp } from 'lucide-react';
import type { HotGame, TwitchHighlight } from '@aurastream/api-client';

interface TwitchOverviewTabProps {
  games?: HotGame[];
  streams?: TwitchHighlight[];
  isLoading: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function TwitchOverviewTab({ games, streams, isLoading }: TwitchOverviewTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const totalViewers = games?.reduce((sum, g) => sum + (g.twitchViewers || 0), 0) || 0;
  const totalStreams = games?.reduce((sum, g) => sum + (g.twitchStreams || 0), 0) || 0;

  return (
    <div className="space-y-8">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-background-secondary border border-border-primary rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-tertiary mb-2">
            <Eye className="w-4 h-4" />
            <span className="text-sm">Total Viewers</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(totalViewers)}</p>
        </div>
        <div className="bg-background-secondary border border-border-primary rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-tertiary mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">Total Streams</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{formatNumber(totalStreams)}</p>
        </div>
        <div className="bg-background-secondary border border-border-primary rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-tertiary mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Categories</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{games?.length || 0}</p>
        </div>
        <div className="bg-background-secondary border border-border-primary rounded-xl p-4">
          <div className="flex items-center gap-2 text-text-tertiary mb-2">
            <Eye className="w-4 h-4" />
            <span className="text-sm">Avg/Stream</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {totalStreams > 0 ? formatNumber(Math.round(totalViewers / totalStreams)) : '0'}
          </p>
        </div>
      </div>

      {/* Top Games */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Top Games</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {games?.slice(0, 20).map((game, i) => (
            <div 
              key={game.gameId}
              className="bg-background-secondary border border-border-primary rounded-xl overflow-hidden hover:border-interactive-600/30 transition-colors"
            >
              <div className="flex gap-3 p-3">
                <div className="w-16 h-20 flex-shrink-0">
                  <img 
                    src={game.boxArtUrl} 
                    alt={game.name}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-interactive-400 font-bold">#{i + 1}</span>
                    <p className="text-sm font-medium text-text-primary truncate">{game.name}</p>
                  </div>
                  <div className="space-y-1 text-xs text-text-tertiary">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{formatNumber(game.twitchViewers || 0)} viewers</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{formatNumber(game.twitchStreams || 0)} streams</span>
                    </div>
                  </div>
                  {game.topTags && game.topTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {game.topTags.slice(0, 2).map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 bg-white/5 text-text-tertiary text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Streams */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Top Streams</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {streams?.slice(0, 10).map((stream, i) => (
            <div 
              key={stream.streamerId}
              className="bg-background-secondary border border-border-primary rounded-xl overflow-hidden hover:border-interactive-600/30 transition-colors"
            >
              <div className="flex gap-4 p-4">
                <div className="w-32 h-20 flex-shrink-0">
                  <img 
                    src={stream.thumbnail} 
                    alt={stream.title}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-interactive-400 font-bold">#{i + 1}</span>
                    <p className="text-sm font-medium text-text-primary truncate">{stream.streamerName}</p>
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-1 mb-2">{stream.title}</p>
                  <div className="flex items-center gap-3 text-xs text-text-tertiary">
                    <span className="text-status-error font-medium">
                      🔴 {formatNumber(stream.viewerCount)} viewers
                    </span>
                    <span>{stream.gameName}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
