'use client';

import { TrendingUp, ExternalLink, Eye, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useYouTubeGameTrending } from '@aurastream/api-client';
import { useIntelStore } from '@/stores/intelStore';
import { PanelCard } from './PanelCard';
import type { YouTubeHighlight, GameFilter } from '@aurastream/api-client';

// =============================================================================
// Video Item
// =============================================================================

// Valid game filters that match the GameFilter type
const VALID_GAME_FILTERS: GameFilter[] = [
  'fortnite', 'warzone', 'valorant', 'minecraft', 'arc_raiders',
  'league_of_legends', 'apex_legends', 'gta', 'roblox', 'call_of_duty'
];

function VideoItem({ video }: { video: YouTubeHighlight }) {
  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
    return views.toString();
  };
  
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return `${Math.floor(diffDays / 7)}w ago`;
    } catch {
      return '';
    }
  };
  
  return (
    <a
      href={`https://youtube.com/watch?v=${video.videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors group"
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-24 h-14 rounded-md overflow-hidden bg-white/5">
        {video.thumbnail && (
          <img
            src={video.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
        
        {/* Duration badge */}
        {video.durationSeconds && (
          <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 rounded text-xs text-white">
            {Math.floor(video.durationSeconds / 60)}:{String(video.durationSeconds % 60).padStart(2, '0')}
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary font-medium line-clamp-2 group-hover:text-interactive-300 transition-colors">
          {video.title}
        </p>
        <p className="text-xs text-text-muted mt-0.5 truncate">
          {video.channelTitle}
        </p>
        
        {/* Stats */}
        <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{formatViews(video.views)} views</span>
          </div>
          {video.publishedAt && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDate(video.publishedAt)}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* External Link Icon */}
      <ExternalLink className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
    </a>
  );
}

// =============================================================================
// YouTube Trending Panel
// =============================================================================

export function YouTubeTrendingPanel() {
  const activeFilter = useIntelStore(state => state.activeFilter);
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);
  
  // Check if user has subscriptions
  const hasSubscriptions = subscribedCategories.length > 0;
  
  // Get game filter - must be a valid GameFilter type
  const categoryKey = activeFilter !== 'all' 
    ? subscribedCategories.find(c => c.key === activeFilter)?.key 
    : undefined;
  
  // Only use as game filter if it's a valid GameFilter
  const gameFilter = categoryKey && VALID_GAME_FILTERS.includes(categoryKey as GameFilter)
    ? categoryKey as GameFilter
    : undefined;
  
  // Fetch more videos when "all" is selected so we can filter client-side
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useYouTubeGameTrending(
    gameFilter ? { game: gameFilter, perPage: 5 } : { perPage: 20 }
  );
  
  // Get valid game filters from subscribed categories
  const subscribedGameFilters = new Set(
    subscribedCategories
      .map(c => c.key)
      .filter(key => VALID_GAME_FILTERS.includes(key as GameFilter))
  );
  
  // Filter videos to only show subscribed categories when "all" is selected
  const filteredVideos = hasSubscriptions && activeFilter === 'all' && subscribedGameFilters.size > 0
    ? (data?.videos || []).filter(video => {
        // Match by game name in title or category
        const videoGame = video.category?.toLowerCase() || '';
        return subscribedCategories.some(cat => 
          videoGame.includes(cat.name.toLowerCase()) ||
          cat.youtubeQuery?.toLowerCase().split(' ').some(q => 
            video.title.toLowerCase().includes(q)
          )
        );
      })
    : (data?.videos || []);
  
  const videos = filteredVideos.slice(0, 5);
  
  return (
    <PanelCard
      title="YouTube Trending"
      icon={<TrendingUp className="w-4 h-4" />}
      isLoading={isLoading}
      isError={isError}
      errorMessage="Couldn't load trending videos"
      lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
      onRefresh={() => refetch()}
      size="small"
    >
      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <TrendingUp className="w-8 h-8 text-text-muted/50 mb-2" />
          <p className="text-sm text-text-muted">
            {hasSubscriptions ? 'No trending videos' : 'Subscribe to categories'}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {hasSubscriptions ? 'Check back soon' : 'to see trending videos'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {videos.map((video) => (
            <VideoItem key={video.videoId} video={video} />
          ))}
        </div>
      )}
    </PanelCard>
  );
}
