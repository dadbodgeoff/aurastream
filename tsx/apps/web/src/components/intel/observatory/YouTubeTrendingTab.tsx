'use client';

/**
 * YouTube Trending Tab
 * 
 * Shows all YouTube gaming videos with filtering by game,
 * defaulting to user's subscribed categories.
 */

import { useState, useEffect } from 'react';
import { Eye, ThumbsUp, MessageCircle, ExternalLink, ChevronLeft, ChevronRight, Filter, Gamepad2, Clock } from 'lucide-react';
import { 
  useYouTubeGameTrending, 
  useAvailableGames,
  useIntelPreferences,
  type YouTubeHighlight,
  type GameFilter,
  type SortBy,
} from '@aurastream/api-client';

// Available game filters
const GAME_OPTIONS: { value: GameFilter | 'all'; label: string }[] = [
  { value: 'all', label: 'All Games' },
  { value: 'fortnite', label: 'Fortnite' },
  { value: 'warzone', label: 'Warzone' },
  { value: 'apex_legends', label: 'Apex Legends' },
  { value: 'valorant', label: 'Valorant' },
  { value: 'minecraft', label: 'Minecraft' },
  { value: 'gta', label: 'GTA V' },
  { value: 'roblox', label: 'Roblox' },
  { value: 'league_of_legends', label: 'League of Legends' },
  { value: 'call_of_duty', label: 'Call of Duty' },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'views', label: 'Views' },
  { value: 'likes', label: 'Likes' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'date', label: 'Recent' },
];

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

export function YouTubeTrendingTab() {
  const [selectedGame, setSelectedGame] = useState<GameFilter | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('views');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  // Get user's subscribed categories
  const { data: prefsData } = useIntelPreferences();
  const subscribedCategories = prefsData?.subscribedCategories || [];
  
  // Set default game filter based on user subscriptions
  useEffect(() => {
    if (subscribedCategories.length > 0 && selectedGame === 'all') {
      // Map category keys to game filters
      const categoryToGame: Record<string, GameFilter> = {
        'fortnite': 'fortnite',
        'warzone': 'warzone',
        'apex_legends': 'apex_legends',
        'valorant': 'valorant',
        'minecraft': 'minecraft',
        'gta': 'gta',
        'roblox': 'roblox',
        'league_of_legends': 'league_of_legends',
        'call_of_duty': 'call_of_duty',
      };
      
      const firstSubscribed = subscribedCategories.find(sub => categoryToGame[sub.key]);
      if (firstSubscribed && categoryToGame[firstSubscribed.key]) {
        setSelectedGame(categoryToGame[firstSubscribed.key]);
      }
    }
  }, [subscribedCategories]);
  
  // Fetch videos
  const { data, isLoading, error } = useYouTubeGameTrending({
    game: selectedGame === 'all' ? undefined : selectedGame,
    sortBy,
    page,
    perPage: 24,
  });
  
  const videos = data?.videos || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Game Filter */}
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-text-tertiary" />
          <select
            value={selectedGame}
            onChange={(e) => {
              setSelectedGame(e.target.value as GameFilter | 'all');
              setPage(1);
            }}
            className="bg-background-secondary border border-border-primary rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-interactive-600"
          >
            {GAME_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
                {subscribedCategories.some(sub => 
                  sub.key.includes(opt.value) || opt.value.includes(sub.key.replace('_', ''))
                ) && ' ⭐'}
              </option>
            ))}
          </select>
        </div>
        
        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-tertiary">Sort:</span>
          <div className="flex gap-1">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  setSortBy(opt.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  sortBy === opt.value
                    ? 'bg-interactive-600 text-white'
                    : 'bg-white/5 text-text-secondary hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Results count */}
        <div className="ml-auto text-sm text-text-tertiary">
          {total > 0 ? `${total} videos` : ''}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-video bg-white/5 rounded-xl" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12 text-status-error">
          Failed to load videos. Please try again.
        </div>
      )}

      {/* Video Grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => (
            <VideoCard key={video.videoId} video={video} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && videos.length === 0 && (
        <div className="text-center py-12">
          <Gamepad2 className="w-12 h-12 mx-auto text-text-tertiary mb-4" />
          <p className="text-text-secondary">No videos found</p>
          <p className="text-sm text-text-tertiary mt-1">
            Try selecting a different game or adjusting filters
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-2 bg-white/5 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          
          <span className="text-sm text-text-secondary">
            Page {page} of {totalPages}
          </span>
          
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-2 bg-white/5 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// Video Card Component
function VideoCard({ video }: { video: YouTubeHighlight }) {
  return (
    <div className="bg-background-secondary border border-border-primary rounded-xl overflow-hidden group hover:border-interactive-600/30 transition-colors">
      <div className="relative aspect-video">
        <img 
          src={video.thumbnail} 
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-xs rounded">
          {formatDuration(video.durationSeconds)}
        </div>
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={`https://youtube.com/watch?v=${video.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Watch
          </a>
        </div>
        {video.isLive && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white text-xs font-medium rounded">
            LIVE
          </div>
        )}
        {video.isShort && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-pink-600 text-white text-xs font-medium rounded">
            SHORT
          </div>
        )}
      </div>
      
      <div className="p-3">
        <p className="text-sm font-medium text-text-primary line-clamp-2 mb-2">
          {video.title}
        </p>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-text-tertiary truncate flex-1">{video.channelTitle}</p>
          {video.publishedAt && (
            <span className="text-xs text-text-tertiary flex items-center gap-1 ml-2">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(video.publishedAt)}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {formatNumber(video.views || 0)}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="w-3 h-3" />
            {formatNumber(video.likes || 0)}
          </span>
          {video.commentCount && (
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {formatNumber(video.commentCount)}
            </span>
          )}
        </div>
        
        {video.engagementRate && video.engagementRate > 0 && (
          <div className="mt-2 pt-2 border-t border-border-primary">
            <span className="text-xs text-interactive-400">
              {video.engagementRate.toFixed(1)}% engagement
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
