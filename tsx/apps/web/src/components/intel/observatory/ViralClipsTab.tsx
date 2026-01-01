'use client';

/**
 * Viral Clips Tab
 * 
 * Shows all viral clips across all categories.
 * Falls back to fresh clips when no viral clips are available.
 */

import { Eye, TrendingUp, Clock, ExternalLink, Play, Zap } from 'lucide-react';
import { useFreshClips, type ViralClip, type FreshClip } from '@aurastream/api-client';

interface ViralClipsTabProps {
  clips?: ViralClip[];
  isLoading: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatTimeAgo(date: string): string {
  const now = new Date();
  const clipDate = new Date(date);
  const diffMs = now.getTime() - clipDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function VelocityBadge({ velocity }: { velocity: number }) {
  if (velocity >= 80) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-status-error/20 text-status-error text-xs font-medium rounded-full">
        <TrendingUp className="w-3 h-3" />
        VIRAL
      </span>
    );
  }
  if (velocity >= 50) {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-status-warning/20 text-status-warning text-xs font-medium rounded-full">
        <TrendingUp className="w-3 h-3" />
        RISING
      </span>
    );
  }
  return null;
}

export function ViralClipsTab({ clips, isLoading }: ViralClipsTabProps) {
  // Fetch fresh clips as fallback when no viral clips
  const { data: freshClipsData, isLoading: freshLoading } = useFreshClips(
    undefined, // all games
    120, // max age 2 hours
    20, // limit
    !clips?.length && !isLoading // only fetch if no viral clips
  );

  const hasViralClips = clips && clips.length > 0;
  const freshClips = freshClipsData?.clips || [];
  const showFreshClips = !hasViralClips && freshClips.length > 0;

  if (isLoading || (freshLoading && !hasViralClips)) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="aspect-video bg-white/5 rounded-xl" />
        ))}
      </div>
    );
  }

  // Convert fresh clips to display format
  const displayClips = hasViralClips 
    ? clips 
    : freshClips.map(fc => ({
        ...fc,
        id: fc.clipId,
        totalGained: fc.viewCount, // Fresh clips don't track gains
        alertReason: fc.velocity >= 5 ? '📈 Trending' : fc.velocity >= 2 ? '🔥 Rising' : '✨ Fresh',
      }));

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-text-tertiary">
        {hasViralClips ? (
          <>
            <span className="flex items-center gap-1 text-status-error">
              <Zap className="w-4 h-4" />
              {clips.length} viral clips
            </span>
            <span>•</span>
            <span>{clips.filter(c => c.velocity >= 80).length} exploding</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1 text-text-secondary">
              <TrendingUp className="w-4 h-4" />
              {freshClips.length} fresh clips
            </span>
            <span>•</span>
            <span className="text-text-tertiary">No viral clips right now</span>
          </>
        )}
      </div>

      {showFreshClips && (
        <div className="bg-interactive-600/10 border border-interactive-600/20 rounded-lg p-3 text-sm text-text-secondary">
          <span className="text-interactive-400 font-medium">No viral clips detected.</span>{' '}
          Showing fresh clips from the last 2 hours instead. Viral clips appear when content gains 5+ views/minute.
        </div>
      )}

      {/* Clips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayClips.map((clip) => (
          <div 
            key={clip.clipId}
            className="bg-background-secondary border border-border-primary rounded-xl overflow-hidden group hover:border-interactive-600/30 transition-colors"
          >
            <div className="relative aspect-video">
              <img 
                src={clip.thumbnailUrl} 
                alt={clip.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={clip.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Watch
                </a>
              </div>
              <div className="absolute top-2 right-2">
                <VelocityBadge velocity={clip.velocity} />
              </div>
              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-xs rounded">
                {clip.duration}s
              </div>
            </div>
            
            <div className="p-3">
              <p className="text-sm font-medium text-text-primary line-clamp-2 mb-2">
                {clip.title}
              </p>
              
              <div className="flex items-center justify-between text-xs text-text-tertiary mb-2">
                <span>{clip.broadcasterName}</span>
                <span className="text-purple-400">{clip.gameName}</span>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-text-tertiary">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {formatNumber(clip.viewCount)}
                </span>
                {hasViralClips && 'totalGained' in clip && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +{formatNumber(clip.totalGained)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(clip.createdAt)}
                </span>
              </div>
              
              {clip.alertReason && (
                <div className="mt-2 pt-2 border-t border-border-primary">
                  <p className="text-xs text-text-secondary">
                    <span className="text-interactive-400">Why: </span>
                    {clip.alertReason}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {displayClips.length === 0 && (
        <div className="text-center py-12 text-text-secondary">
          No clips found. Check back later for fresh content.
        </div>
      )}
    </div>
  );
}
