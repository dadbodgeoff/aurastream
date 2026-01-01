'use client';

/**
 * Clip Carousel Component
 * 
 * A clean, horizontal scrolling carousel for clips (YouTube or Twitch).
 * Shows thumbnail, title, views, and velocity/duration.
 */

import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Eye, TrendingUp, ExternalLink } from 'lucide-react';

interface ClipItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  url: string;
  viewCount: number;
  broadcasterName?: string;
  creatorName?: string;
  gameName?: string;
  duration?: number;
  velocity?: number;
  ageMinutes?: number;
}

interface ClipCarouselProps {
  title: string;
  icon: React.ReactNode;
  clips: ClipItem[];
  isLoading?: boolean;
  emptyMessage?: string;
  accentColor?: string;
  compact?: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
  return views.toString();
}

export function ClipCarousel({ 
  title, 
  icon, 
  clips, 
  isLoading, 
  emptyMessage = 'No clips available',
  accentColor = 'interactive',
  compact = false
}: ClipCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const cardWidth = compact ? 200 : 280;
  
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = cardWidth + 12; // Card width + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (isLoading) {
    return (
      <div className={compact ? "space-y-2" : "space-y-3"}>
        <div className="flex items-center gap-2">
          {icon}
          <span className={`font-medium text-text-primary ${compact ? 'text-xs' : 'text-sm'}`}>{title}</span>
        </div>
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`flex-shrink-0 ${compact ? 'w-48 h-28' : 'w-64 h-36'} bg-white/5 rounded-lg animate-pulse`} />
          ))}
        </div>
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className={compact ? "space-y-2" : "space-y-3"}>
        <div className="flex items-center gap-2">
          {icon}
          <span className={`font-medium text-text-primary ${compact ? 'text-xs' : 'text-sm'}`}>{title}</span>
        </div>
        <div className={`text-center ${compact ? 'py-4' : 'py-6'} text-text-tertiary text-xs bg-white/[0.02] rounded-lg border border-white/[0.06]`}>
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className={`font-medium text-text-primary ${compact ? 'text-xs' : 'text-sm'}`}>{title}</span>
          <span className="text-[10px] text-text-tertiary">({clips.length})</span>
        </div>
        
        {/* Scroll Controls */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => scroll('left')}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <ChevronLeft className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-text-tertiary`} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <ChevronRight className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-text-tertiary`} />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div 
        ref={scrollRef}
        className={`flex ${compact ? 'gap-2' : 'gap-3'} overflow-x-auto scrollbar-hide pb-1`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {clips.map((clip) => (
          <a
            key={clip.id}
            href={clip.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-shrink-0 ${compact ? 'w-48' : 'w-64'} group`}
          >
            {/* Thumbnail */}
            <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 group-hover:border-interactive-500/50 transition-colors">
              <img 
                src={clip.thumbnailUrl} 
                alt={clip.title}
                className="w-full h-full object-cover"
              />
              
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className={`${compact ? 'p-1.5' : 'p-2'} bg-white/20 rounded-full backdrop-blur-sm`}>
                  <Play className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} text-white fill-white`} />
                </div>
              </div>

              {/* Duration badge */}
              {clip.duration && (
                <span className="absolute bottom-1.5 right-1.5 px-1 py-0.5 bg-black/80 text-white text-[9px] rounded">
                  {formatDuration(clip.duration)}
                </span>
              )}

              {/* Velocity badge (if available) */}
              {clip.velocity && clip.velocity > 0 && (
                <span className="absolute top-1.5 left-1.5 px-1 py-0.5 bg-green-500/90 text-white text-[9px] rounded flex items-center gap-0.5">
                  <TrendingUp className="w-2.5 h-2.5" />
                  {clip.velocity.toFixed(1)}/min
                </span>
              )}
            </div>

            {/* Info */}
            <div className={compact ? "mt-1.5" : "mt-2"}>
              <p className={`text-text-primary line-clamp-2 leading-snug group-hover:text-interactive-400 transition-colors ${compact ? 'text-[11px]' : 'text-sm'}`}>
                {clip.title}
              </p>
              <div className={`flex items-center gap-1.5 ${compact ? 'mt-0.5' : 'mt-1'} text-[9px] text-text-tertiary`}>
                {clip.broadcasterName && (
                  <span className="truncate max-w-[80px]">{clip.broadcasterName}</span>
                )}
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Eye className="w-2.5 h-2.5" />
                  {formatViews(clip.viewCount)}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
