'use client';

import { useState } from 'react';
import { Flame, Clock, RefreshCw, ExternalLink, TrendingUp, Calendar, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFreshClips, useRadarStatus, useRecentRecaps } from '@aurastream/api-client';
import { useIntelStore } from '@/stores/intelStore';

// =============================================================================
// Types
// =============================================================================

type ViewMode = 'fresh' | 'recaps';

// =============================================================================
// Clip Card
// =============================================================================

interface ClipCardProps {
  clip: {
    clipId: string;
    title: string;
    url: string;
    thumbnailUrl?: string;
    broadcasterName: string;
    creatorName?: string;
    gameName: string;
    gameId: string;
    viewCount: number;
    velocity: number;
    ageMinutes?: number;
    duration?: number;
    language?: string;
  };
  rank: number;
}

function ClipCard({ clip, rank }: ClipCardProps) {
  const formatNumber = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatAge = (minutes?: number) => {
    if (!minutes) return '';
    if (minutes < 60) return `${Math.round(minutes)}m ago`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
    return `${Math.round(minutes / 1440)}d ago`;
  };

  const velocityBadge = clip.velocity >= 10
    ? { color: 'bg-error-main', label: '🔥 Viral' }
    : clip.velocity >= 5
      ? { color: 'bg-warning-main', label: '📈 Rising' }
      : clip.velocity >= 2
        ? { color: 'bg-success-main', label: '✨ Hot' }
        : null;

  return (
    <a
      href={clip.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-4 p-4 bg-background-surface/50 border border-border-subtle rounded-xl hover:border-interactive-500/30 transition-all group"
    >
      {/* Rank */}
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-accent-500/20 text-accent-400 font-bold text-sm">
        {rank}
      </div>

      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-40 h-24 rounded-lg overflow-hidden bg-white/5">
        {clip.thumbnailUrl ? (
          <img
            src={clip.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Flame className="w-6 h-6 text-text-muted" />
          </div>
        )}
        {clip.duration && (
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 rounded text-xs text-white font-medium">
            {Math.round(clip.duration)}s
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-text-primary line-clamp-2 group-hover:text-interactive-300 transition-colors">
          {clip.title}
        </h3>
        <p className="text-sm text-text-secondary mt-1">
          @{clip.broadcasterName}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-interactive-400 font-medium">{clip.gameName}</span>
          {clip.language && (
            <>
              <span className="text-xs text-text-muted">•</span>
              <span className="text-xs text-text-muted uppercase">{clip.language}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
          <div className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            <span>{formatNumber(clip.viewCount)} views</span>
          </div>
          {clip.ageMinutes && (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatAge(clip.ageMinutes)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Velocity */}
      <div className="flex-shrink-0 flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 text-accent-400">
          <TrendingUp className="w-4 h-4" />
          <span className="font-semibold">{clip.velocity.toFixed(1)}</span>
          <span className="text-xs text-text-muted">v/min</span>
        </div>
        {velocityBadge && (
          <span className={cn('px-2 py-0.5 rounded text-xs text-white font-medium', velocityBadge.color)}>
            {velocityBadge.label}
          </span>
        )}
      </div>

      <ExternalLink className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

// =============================================================================
// Recap Card
// =============================================================================

interface RecapCardProps {
  recap: {
    recapDate: string;
    totalClipsTracked: number;
    totalViralClips: number;
    totalViewsTracked: number;
    peakVelocity: number;
  };
}

function RecapCard({ recap }: RecapCardProps) {
  const formatNumber = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-4 bg-background-surface/50 border border-border-subtle rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-interactive-400" />
          <span className="font-medium text-text-primary">{formatDate(recap.recapDate)}</span>
        </div>
        <span className="text-xs text-text-muted">{recap.recapDate}</span>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-text-muted">Clips Tracked</p>
          <p className="text-lg font-semibold text-text-primary">{formatNumber(recap.totalClipsTracked)}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Viral Clips</p>
          <p className="text-lg font-semibold text-accent-400">{formatNumber(recap.totalViralClips)}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Total Views</p>
          <p className="text-lg font-semibold text-text-primary">{formatNumber(recap.totalViewsTracked)}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Peak Velocity</p>
          <p className="text-lg font-semibold text-text-primary">{recap.peakVelocity.toFixed(1)}</p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Clips View
// =============================================================================

export function ClipsView() {
  const [viewMode, setViewMode] = useState<ViewMode>('fresh');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);
  
  // Fetch fresh clips - pass category filter if selected
  const { 
    data: freshData, 
    isLoading: isLoadingFresh, 
    refetch: refetchFresh, 
    dataUpdatedAt: freshUpdatedAt 
  } = useFreshClips(selectedCategory || undefined, 60, 50);
  
  const { data: recapsData, isLoading: isLoadingRecaps, refetch: refetchRecaps } = useRecentRecaps(7);
  const { data: status } = useRadarStatus();
  
  const isLoading = viewMode === 'fresh' ? isLoadingFresh : isLoadingRecaps;
  const dataUpdatedAt = viewMode === 'fresh' ? freshUpdatedAt : undefined;
  
  // Filter clips by subscribed categories if no specific category selected
  const subscribedGameIds = new Set(subscribedCategories.map(c => c.twitchId));
  const hasSubscriptions = subscribedCategories.length > 0;
  
  const freshClips = selectedCategory 
    ? (freshData?.clips || [])
    : hasSubscriptions
      ? (freshData?.clips || []).filter(c => subscribedGameIds.has(c.gameId))
      : (freshData?.clips || []);
  
  const handleRefresh = () => {
    if (viewMode === 'fresh') refetchFresh();
    else refetchRecaps();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Flame className="w-5 h-5 text-accent-400" />
            Clip Radar
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Fresh clips from the last hour - catch viral moments early
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-background-surface/50 rounded-lg border border-border-subtle">
            <button
              onClick={() => setViewMode('fresh')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === 'fresh'
                  ? 'bg-interactive-600 text-white'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              Fresh Clips
            </button>
            <button
              onClick={() => setViewMode('recaps')}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === 'recaps'
                  ? 'bg-interactive-600 text-white'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              Daily Recaps
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-background-surface/50 border border-border-subtle hover:border-interactive-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4 text-text-muted', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Category Filter */}
      {viewMode === 'fresh' && hasSubscriptions && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-text-muted">Filter:</span>
          <button
            onClick={() => setSelectedCategory('')}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              !selectedCategory
                ? 'bg-interactive-600 text-white'
                : 'bg-background-surface/50 text-text-muted hover:text-text-primary border border-border-subtle'
            )}
          >
            All Subscribed
          </button>
          {subscribedCategories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.twitchId || '')}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                selectedCategory === cat.twitchId
                  ? 'bg-interactive-600 text-white'
                  : 'bg-background-surface/50 text-text-muted hover:text-text-primary border border-border-subtle'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex items-center gap-6 p-4 bg-background-surface/30 rounded-xl border border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-accent-500/20">
            <Flame className="w-4 h-4 text-accent-400" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Fresh Clips</p>
            <p className="text-lg font-semibold text-text-primary">{freshClips.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-interactive-600/20">
            <TrendingUp className="w-4 h-4 text-interactive-400" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Categories Tracked</p>
            <p className="text-lg font-semibold text-text-primary">{status?.categoriesTracked || 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            status?.isActive ? 'bg-success-main animate-pulse' : 'bg-text-muted'
          )} />
          <span className="text-sm text-text-muted">
            {status?.isActive ? 'Radar Active' : 'Radar Inactive'}
          </span>
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
      ) : viewMode === 'recaps' ? (
        <div className="space-y-3">
          {recapsData?.recaps.map((recap) => (
            <RecapCard key={recap.recapDate} recap={recap} />
          ))}
          {(!recapsData?.recaps || recapsData.recaps.length === 0) && (
            <div className="text-center py-12 text-text-muted">
              No recaps available yet
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {freshClips.map((clip, index) => (
            <ClipCard key={clip.clipId} clip={clip} rank={index + 1} />
          ))}
          {freshClips.length === 0 && (
            <div className="text-center py-12 text-text-muted">
              {hasSubscriptions 
                ? 'No fresh clips found for your subscribed categories. Try refreshing or check back soon.'
                : 'Subscribe to categories to see clips'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
