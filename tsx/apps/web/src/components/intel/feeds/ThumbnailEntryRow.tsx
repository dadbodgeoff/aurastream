'use client';

/**
 * Thumbnail Entry Row
 * 
 * Row-based layout for thumbnail entries in the Intel feed.
 * Shows thumbnail with aspect ratio badge, title, hashtags, stats, AI analysis, and actions.
 */

import { Eye, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ThumbnailAnalysis {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  viewCount: number;
  layoutType: string;
  colorMood: string;
  whyItWorks: string;
  aspectRatio?: string | null;
  hashtags?: string[];
  formatType?: string | null;
  channelName?: string | null;
  hasFace?: boolean;
  hasText?: boolean;
  dominantColors?: string[];
  textContent?: string | null;
}

interface ThumbnailEntryRowProps {
  thumbnail: ThumbnailAnalysis;
  onAnalyze?: (videoId: string) => void;
  className?: string;
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
  return views.toString();
}

export function ThumbnailEntryRow({ 
  thumbnail, 
  onAnalyze,
  className 
}: ThumbnailEntryRowProps) {
  const hashtags = thumbnail.hashtags || [];
  const aspectRatio = thumbnail.aspectRatio || '16:9';
  const formatType = thumbnail.formatType || thumbnail.layoutType || 'standard';

  // Build recreate URL with analysis data
  const recreateUrl = `/intel/recreate?analysis=${encodeURIComponent(JSON.stringify({
    videoId: thumbnail.videoId,
    title: thumbnail.title,
    thumbnailUrl: thumbnail.thumbnailUrl,
    layoutType: thumbnail.layoutType,
    colorMood: thumbnail.colorMood,
    whyItWorks: thumbnail.whyItWorks,
    hasFace: thumbnail.hasFace,
    hasText: thumbnail.hasText,
    textContent: thumbnail.textContent,
    dominantColors: thumbnail.dominantColors,
  }))}`;

  return (
    <div 
      className={cn(
        'flex items-center gap-4 py-3 px-2',
        'border-b border-white/5 last:border-b-0',
        'hover:bg-white/[0.02] transition-colors',
        className
      )}
    >
      {/* Thumbnail with aspect ratio badge */}
      <Link 
        href={recreateUrl}
        className="relative flex-shrink-0 w-24 group"
      >
        <img 
          src={thumbnail.thumbnailUrl} 
          alt={thumbnail.title}
          className="w-full aspect-video object-cover rounded-lg border border-white/10 group-hover:border-interactive-500/50 transition-colors"
        />
        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] font-medium bg-teal-500 text-white rounded">
          {aspectRatio}
        </span>
      </Link>

      {/* Title + Hashtags */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary line-clamp-1 mb-1">
          {thumbnail.title}
        </p>
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hashtags.slice(0, 3).map((tag, i) => (
              <span 
                key={i}
                className="text-xs text-teal-400"
              >
                #{tag}
              </span>
            ))}
            {hashtags.length > 3 && (
              <span className="text-xs text-text-tertiary">
                +{hashtags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 w-28 text-right">
        <div className="flex items-center justify-end gap-1 text-sm text-text-secondary">
          <Eye className="w-3.5 h-3.5 text-text-tertiary" />
          <span>{formatViews(thumbnail.viewCount)} views</span>
        </div>
        <div className="text-xs text-text-tertiary mt-0.5">
          {formatType}
        </div>
      </div>

      {/* AI Analysis */}
      <div className="hidden lg:block flex-shrink-0 w-48">
        <p className="text-xs text-text-tertiary line-clamp-2">
          {thumbnail.whyItWorks}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onAnalyze?.(thumbnail.videoId)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-lg',
            'bg-white/10 hover:bg-white/15',
            'text-text-primary transition-colors'
          )}
        >
          Analyze
        </button>
        <button
          className="p-1.5 text-text-tertiary hover:text-text-secondary transition-colors"
          aria-label="More options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
