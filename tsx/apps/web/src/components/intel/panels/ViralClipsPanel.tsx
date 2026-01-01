'use client';

import { Flame, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useViralClips } from '@aurastream/api-client';
import { useIntelStore } from '@/stores/intelStore';
import { PanelCard } from './PanelCard';
import type { ViralClip } from '@aurastream/api-client';

// =============================================================================
// Clip Item
// =============================================================================

function ClipItem({ clip }: { clip: ViralClip }) {
  const velocityBadge = clip.velocity >= 10 
    ? { icon: '🔥', label: 'Viral' }
    : clip.velocity >= 5 
      ? { icon: '📈', label: 'Rising' }
      : null;
  
  return (
    <a
      href={clip.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors group"
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-20 h-11 rounded-md overflow-hidden bg-white/5">
        {clip.thumbnailUrl && (
          <img
            src={clip.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary font-medium line-clamp-1 group-hover:text-interactive-300 transition-colors">
          {clip.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-muted">
            @{clip.broadcasterName}
          </span>
          <span className="text-xs text-text-muted">•</span>
          <span className="text-xs text-text-muted">
            {(clip.viewCount / 1000).toFixed(1)}K views
          </span>
        </div>
        
        {/* Velocity Badge */}
        {velocityBadge && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs">{velocityBadge.icon}</span>
            <span className="text-xs text-accent-400 font-medium">
              {clip.velocity.toFixed(1)} views/min
            </span>
          </div>
        )}
      </div>
      
      {/* External Link Icon */}
      <ExternalLink className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
    </a>
  );
}

// =============================================================================
// Viral Clips Panel
// =============================================================================

export function ViralClipsPanel() {
  const activeFilter = useIntelStore(state => state.activeFilter);
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);
  
  // Get game ID for filter - if specific category selected, use that
  // If "all" is selected, we fetch without filter but will filter results client-side
  const gameId = activeFilter !== 'all' 
    ? subscribedCategories.find(c => c.key === activeFilter)?.twitchId 
    : undefined;
  
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useViralClips(gameId, 20); // Fetch more to filter
  
  // Filter clips to only show subscribed categories when "all" is selected
  const subscribedGameIds = new Set(subscribedCategories.map(c => c.twitchId));
  const hasSubscriptions = subscribedCategories.length > 0;
  
  const filteredClips = hasSubscriptions && activeFilter === 'all'
    ? (data?.clips || []).filter(clip => subscribedGameIds.has(clip.gameId))
    : (data?.clips || []);
  
  const clips = filteredClips.slice(0, 5);
  
  return (
    <PanelCard
      title="Viral Clips"
      icon={<Flame className="w-4 h-4" />}
      isLoading={isLoading}
      isError={isError}
      errorMessage="Couldn't load viral clips"
      lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
      onRefresh={() => refetch()}
      size="small"
    >
      {clips.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <Flame className="w-8 h-8 text-text-muted/50 mb-2" />
          <p className="text-sm text-text-muted">
            {hasSubscriptions ? 'No viral clips right now' : 'Subscribe to categories'}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {hasSubscriptions ? 'Check back soon' : 'to see viral clips'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {clips.map((clip) => (
            <ClipItem key={clip.clipId} clip={clip} />
          ))}
          
          {/* View All Link */}
          <Link
            href="/dashboard/intel?tab=clips"
            className={cn(
              'flex items-center justify-center gap-1 mt-3 py-2',
              'text-xs font-medium text-interactive-400 hover:text-interactive-300',
              'transition-colors'
            )}
          >
            View all clips
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}
    </PanelCard>
  );
}
