'use client';

import { useState } from 'react';
import { Video, Users, Radio, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTwitchLive, useTwitchGames } from '@aurastream/api-client';

type ViewMode = 'streams' | 'games';

interface StreamCardProps {
  stream: {
    streamerId: string;
    streamerName: string;
    gameId: string;
    gameName: string;
    viewerCount: number;
    title: string;
    thumbnail?: string;
    tags?: string[];
    language?: string;
  };
  rank: number;
}

function StreamCard({ stream, rank }: StreamCardProps) {
  const formatViewers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <a
      href={`https://twitch.tv/${stream.streamerName}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-4 p-4 bg-background-surface/50 border border-border-subtle rounded-xl hover:border-interactive-500/30 transition-all group"
    >
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-interactive-600/20 text-interactive-400 font-bold text-sm">
        {rank}
      </div>
      <div className="relative flex-shrink-0 w-32 h-18 rounded-lg overflow-hidden bg-white/5">
        {stream.thumbnail ? (
          <img src={stream.thumbnail.replace('{width}', '320').replace('{height}', '180')} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Video className="w-6 h-6 text-text-muted" /></div>
        )}
        <div className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 bg-error-main rounded text-xs text-white font-medium">
          <Radio className="w-2.5 h-2.5 animate-pulse" />LIVE
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-text-primary truncate group-hover:text-interactive-300 transition-colors">{stream.title}</h3>
        <p className="text-sm text-text-secondary mt-0.5">@{stream.streamerName}</p>
        <p className="text-xs text-text-muted mt-1">{stream.gameName}</p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-1.5 text-text-secondary">
        <Users className="w-4 h-4" /><span className="font-medium">{formatViewers(stream.viewerCount)}</span>
      </div>
      <ExternalLink className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}


interface GameCardProps {
  game: { gameId: string; name: string; twitchViewers: number; twitchStreams: number; boxArtUrl?: string; topTags?: string[]; };
  rank: number;
}

function GameCard({ game, rank }: GameCardProps) {
  const formatNumber = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <a href={`https://twitch.tv/directory/game/${encodeURIComponent(game.name)}`} target="_blank" rel="noopener noreferrer"
      className="flex gap-4 p-4 bg-background-surface/50 border border-border-subtle rounded-xl hover:border-interactive-500/30 transition-all group">
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-interactive-600/20 text-interactive-400 font-bold text-sm">{rank}</div>
      <div className="relative flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden bg-white/5">
        {game.boxArtUrl ? (
          <img src={game.boxArtUrl.replace('{width}', '144').replace('{height}', '192')} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Video className="w-6 h-6 text-text-muted" /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-text-primary truncate group-hover:text-interactive-300 transition-colors">{game.name}</h3>
        <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
          <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /><span>{formatNumber(game.twitchViewers)} viewers</span></div>
          <div className="flex items-center gap-1"><Radio className="w-3.5 h-3.5" /><span>{formatNumber(game.twitchStreams)} streams</span></div>
        </div>
        {game.topTags && game.topTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {game.topTags.slice(0, 4).map((tag) => (<span key={tag} className="px-1.5 py-0.5 bg-white/5 rounded text-xs text-text-muted">{tag}</span>))}
          </div>
        )}
      </div>
      <ExternalLink className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

export function TwitchLiveView() {
  const [viewMode, setViewMode] = useState<ViewMode>('streams');
  const [limit, setLimit] = useState(50);
  const { data: streams, isLoading: isLoadingStreams, refetch: refetchStreams, dataUpdatedAt: streamsUpdatedAt } = useTwitchLive(limit);
  const { data: games, isLoading: isLoadingGames, refetch: refetchGames, dataUpdatedAt: gamesUpdatedAt } = useTwitchGames(limit);
  const isLoading = viewMode === 'streams' ? isLoadingStreams : isLoadingGames;
  const dataUpdatedAt = viewMode === 'streams' ? streamsUpdatedAt : gamesUpdatedAt;
  const handleRefresh = () => { viewMode === 'streams' ? refetchStreams() : refetchGames(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2"><Video className="w-5 h-5 text-[#9146FF]" />Twitch Live</h2>
          <p className="text-sm text-text-muted mt-1">Real-time streams and games on Twitch</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-background-surface/50 rounded-lg border border-border-subtle">
            <button onClick={() => setViewMode('streams')} className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors', viewMode === 'streams' ? 'bg-interactive-600 text-white' : 'text-text-muted hover:text-text-primary')}>Streams</button>
            <button onClick={() => setViewMode('games')} className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors', viewMode === 'games' ? 'bg-interactive-600 text-white' : 'text-text-muted hover:text-text-primary')}>Games</button>
          </div>
          <button onClick={handleRefresh} disabled={isLoading} className="p-2 rounded-lg bg-background-surface/50 border border-border-subtle hover:border-interactive-500/30 transition-colors disabled:opacity-50">
            <RefreshCw className={cn('w-4 h-4 text-text-muted', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-6 p-4 bg-background-surface/30 rounded-xl border border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#9146FF]/20"><Radio className="w-4 h-4 text-[#9146FF]" /></div>
          <div><p className="text-xs text-text-muted">Total Streams</p><p className="text-lg font-semibold text-text-primary">{games?.reduce((sum, g) => sum + g.twitchStreams, 0).toLocaleString() || '—'}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-interactive-600/20"><Users className="w-4 h-4 text-interactive-400" /></div>
          <div><p className="text-xs text-text-muted">Total Viewers</p><p className="text-lg font-semibold text-text-primary">{games?.reduce((sum, g) => sum + g.twitchViewers, 0).toLocaleString() || '—'}</p></div>
        </div>
        {dataUpdatedAt && <div className="ml-auto text-xs text-text-muted">Updated {new Date(dataUpdatedAt).toLocaleTimeString()}</div>}
      </div>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 10 }).map((_, i) => (<div key={i} className="h-24 bg-background-surface/30 rounded-xl animate-pulse" />))}</div>
      ) : viewMode === 'streams' ? (
        <div className="space-y-3">
          {streams?.map((stream, index) => (<StreamCard key={stream.streamerId} stream={stream} rank={index + 1} />))}
          {(!streams || streams.length === 0) && <div className="text-center py-12 text-text-muted">No streams found</div>}
        </div>
      ) : (
        <div className="space-y-3">
          {games?.map((game, index) => (<GameCard key={game.gameId} game={game} rank={index + 1} />))}
          {(!games || games.length === 0) && <div className="text-center py-12 text-text-muted">No games found</div>}
        </div>
      )}
      {((viewMode === 'streams' && streams && streams.length >= limit) || (viewMode === 'games' && games && games.length >= limit)) && (
        <button onClick={() => setLimit(l => l + 50)} className="w-full py-3 text-sm font-medium text-interactive-400 hover:text-interactive-300 transition-colors">Load more</button>
      )}
    </div>
  );
}
