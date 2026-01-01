'use client';

import { useState } from 'react';
import { Youtube, Eye, ThumbsUp, Clock, RefreshCw, ExternalLink, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useYouTubeGameTrending, useAvailableGames } from '@aurastream/api-client';
import type { GameFilter, SortBy, SortOrder } from '@aurastream/api-client';

// =============================================================================
// Types (imported from api-client)
// =============================================================================

// =============================================================================
// Video Card
// =============================================================================

interface VideoCardProps {
  video: {
    videoId: string;
    title: string;
    thumbnail: string;
    channelTitle: string;
    views: number;
    likes: number;
    engagementRate?: number;
    publishedAt?: string;
    durationSeconds?: number;
    isShort?: boolean;
    tags?: string[];
  };
  rank: number;
}

function VideoCard({ video, rank }: VideoCardProps) {
  const formatNumber = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <a
      href={`https://youtube.com/watch?v=${video.videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-4 p-4 bg-background-surface/50 border border-border-subtle rounded-xl hover:border-interactive-500/30 transition-all group"
    >
      {/* Rank */}
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[#FF0000]/20 text-[#FF0000] font-bold text-sm">
        {rank}
      </div>

      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-40 h-24 rounded-lg overflow-hidden bg-white/5">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Youtube className="w-6 h-6 text-text-muted" />
          </div>
        )}
        {video.durationSeconds && (
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 rounded text-xs text-white font-medium">
            {formatDuration(video.durationSeconds)}
          </div>
        )}
        {video.isShort && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#FF0000] rounded text-xs text-white font-medium">
            Short
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-text-primary line-clamp-2 group-hover:text-interactive-300 transition-colors">
          {video.title}
        </h3>
        <p className="text-sm text-text-secondary mt-1">
          {video.channelTitle}
        </p>
        <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
          <div className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            <span>{formatNumber(video.views)} views</span>
          </div>
          <div className="flex items-center gap-1">
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{formatNumber(video.likes)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{video.publishedAt ? formatDate(video.publishedAt) : 'Unknown'}</span>
          </div>
        </div>
        {video.tags && video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {video.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 bg-white/5 rounded text-xs text-text-muted">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <ExternalLink className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

// =============================================================================
// YouTube View
// =============================================================================

export function YouTubeView() {
  const [game, setGame] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('views');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const perPage = 20;

  const { data: availableGames } = useAvailableGames();
  const { data, isLoading, refetch, dataUpdatedAt } = useYouTubeGameTrending({
    game: (game || undefined) as GameFilter | undefined,
    sortBy,
    sortOrder,
    page,
    perPage,
  });

  const videos = data?.videos || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Youtube className="w-5 h-5 text-[#FF0000]" />
            YouTube Trending
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Top gaming videos on YouTube
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
              showFilters
                ? 'bg-interactive-600 border-interactive-600 text-white'
                : 'bg-background-surface/50 border-border-subtle text-text-muted hover:text-text-primary'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 rounded-lg bg-background-surface/50 border border-border-subtle hover:border-interactive-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4 text-text-muted', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-4 p-4 bg-background-surface/30 rounded-xl border border-border-subtle">
          {/* Game Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Game</label>
            <select
              value={game}
              onChange={(e) => { setGame(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-background-surface border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-interactive-500"
            >
              <option value="">All Games</option>
              {availableGames?.map((g) => (
                <option key={g.id} value={g.query}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as SortBy); setPage(1); }}
              className="px-3 py-2 bg-background-surface border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-interactive-500"
            >
              <option value="views">Views</option>
              <option value="likes">Likes</option>
              <option value="engagement_rate">Engagement</option>
              <option value="published_at">Date</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Order</label>
            <select
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value as SortOrder); setPage(1); }}
              className="px-3 py-2 bg-background-surface border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-interactive-500"
            >
              <option value="desc">Highest First</option>
              <option value="asc">Lowest First</option>
            </select>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex items-center gap-6 p-4 bg-background-surface/30 rounded-xl border border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#FF0000]/20">
            <Youtube className="w-4 h-4 text-[#FF0000]" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Total Videos</p>
            <p className="text-lg font-semibold text-text-primary">{total.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-interactive-600/20">
            <Eye className="w-4 h-4 text-interactive-400" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Total Views</p>
            <p className="text-lg font-semibold text-text-primary">
              {videos.reduce((sum, v) => sum + v.views, 0).toLocaleString()}
            </p>
          </div>
        </div>
        {dataUpdatedAt && (
          <div className="ml-auto text-xs text-text-muted">
            Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-32 bg-background-surface/30 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((video, index) => (
            <VideoCard key={video.videoId} video={video} rank={(page - 1) * perPage + index + 1} />
          ))}
          {videos.length === 0 && (
            <div className="text-center py-12 text-text-muted">
              No videos found
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg bg-background-surface/50 border border-border-subtle hover:border-interactive-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-text-secondary px-4">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg bg-background-surface/50 border border-border-subtle hover:border-interactive-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
