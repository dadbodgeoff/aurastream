'use client';

/**
 * Thumbnail Feed Component
 * 
 * Social feed style scrollable list of trending thumbnails from the last 24 hours.
 * Newest items appear at top, older items scroll down.
 * Shows rich metadata: layout type, color mood, why it works, timestamps.
 */

import { useCategoryInsight } from '@aurastream/api-client';
import { Image, Eye, Palette, Layout, Sparkles, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface ThumbnailFeedProps {
  categoryKey: string;
  categoryName: string;
}

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return 'recently';
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return 'recently';
  }
}

export function ThumbnailFeed({ categoryKey, categoryName }: ThumbnailFeedProps) {
  const { data: insight, isLoading, dataUpdatedAt } = useCategoryInsight(categoryKey);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const thumbnails = insight?.thumbnails || [];

  if (thumbnails.length === 0) {
    return (
      <div className="text-center py-8 text-text-tertiary text-sm">
        No thumbnail data yet for {categoryName}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Feed Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-interactive-400" />
          <span className="text-xs font-medium text-text-secondary">Last 24 hours</span>
        </div>
        {dataUpdatedAt && (
          <div className="flex items-center gap-1 text-[10px] text-text-tertiary">
            <RefreshCw className="w-3 h-3" />
            Updated {formatTimeAgo(new Date(dataUpdatedAt).toISOString())}
          </div>
        )}
      </div>

      {/* Category Style Summary - Pinned at top */}
      {insight?.categoryStyleSummary && (
        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-medium text-purple-400">Style Insight</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">{insight.categoryStyleSummary}</p>
        </div>
      )}

      {/* Scrollable Social Feed */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {thumbnails.map((thumb, i) => (
          <article 
            key={thumb.videoId || i} 
            className="group p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.12] rounded-xl transition-all duration-200"
          >
            <div className="flex gap-3">
              {/* Thumbnail Image */}
              <Link 
                href={`/intel/recreate?analysis=${encodeURIComponent(JSON.stringify({
                  videoId: thumb.videoId,
                  title: thumb.title,
                  thumbnailUrl: thumb.thumbnailUrl || thumb.url,
                  layoutType: thumb.layoutType,
                  colorMood: thumb.colorMood,
                  whyItWorks: thumb.whyItWorks,
                  hasFace: thumb.hasFace,
                  hasText: thumb.hasText,
                  textContent: thumb.textContent,
                  dominantColors: thumb.dominantColors,
                }))}`}
                className="flex-shrink-0 w-28 aspect-video rounded-lg overflow-hidden border border-white/10 group-hover:border-interactive-500/50 transition-colors relative"
              >
                <img 
                  src={thumb.thumbnailUrl || thumb.url} 
                  alt={thumb.title || ''} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-interactive-500/0 group-hover:bg-interactive-500/20 transition-colors flex items-center justify-center">
                  <span className="text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-2 py-1 rounded">
                    Recreate
                  </span>
                </div>
              </Link>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title */}
                <h3 className="text-sm font-medium text-text-primary line-clamp-2 mb-1.5 group-hover:text-interactive-400 transition-colors">
                  {thumb.title}
                </h3>

                {/* Stats Row */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {thumb.viewCount && (
                    <span className="flex items-center gap-1 text-[10px] text-green-400">
                      <Eye className="w-3 h-3" />
                      {thumb.viewCount >= 1000000 
                        ? `${(thumb.viewCount / 1000000).toFixed(1)}M` 
                        : `${(thumb.viewCount / 1000).toFixed(0)}K`} views
                    </span>
                  )}
                  {thumb.layoutType && (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                      <Layout className="w-2.5 h-2.5" />
                      {thumb.layoutType}
                    </span>
                  )}
                  {thumb.colorMood && (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded">
                      <Palette className="w-2.5 h-2.5" />
                      {thumb.colorMood}
                    </span>
                  )}
                </div>

                {/* Why It Works */}
                {thumb.whyItWorks && (
                  <p className="text-[11px] text-text-tertiary line-clamp-2 leading-relaxed">
                    💡 {thumb.whyItWorks}
                  </p>
                )}

                {/* Element Tags */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {thumb.hasFace && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-white/5 text-text-tertiary rounded">face</span>
                  )}
                  {thumb.hasText && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-white/5 text-text-tertiary rounded">text</span>
                  )}
                  {thumb.hasBorder && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-white/5 text-text-tertiary rounded">border</span>
                  )}
                  {thumb.hasGlowEffects && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-white/5 text-text-tertiary rounded">glow</span>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}

        {/* End of Feed Indicator */}
        <div className="text-center py-4 text-[10px] text-text-tertiary">
          <Clock className="w-3 h-3 inline mr-1" />
          Showing last 24 hours of trending thumbnails
        </div>
      </div>

      {/* Pro Tips - Sticky at bottom */}
      {insight?.proTips && insight.proTips.length > 0 && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl mt-2">
          <p className="text-[10px] font-medium text-green-400 mb-1.5">💡 Pro Tips for {categoryName}</p>
          <ul className="space-y-1">
            {insight.proTips.slice(0, 3).map((tip, i) => (
              <li key={i} className="text-[11px] text-text-secondary leading-relaxed">• {tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
