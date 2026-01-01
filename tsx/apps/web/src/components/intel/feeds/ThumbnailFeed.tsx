'use client';

/**
 * Thumbnail Feed Component
 * 
 * Social feed style scrollable list of trending thumbnails from the last 24 hours.
 * Newest items appear at top, older items scroll down.
 * Shows rich metadata: layout type, color mood, why it works, timestamps.
 * 
 * Updated: Uses new Typography and Badge component system
 */

import { useCategoryInsight } from '@aurastream/api-client';
import { Eye, Palette, Layout, Sparkles, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Text, Label, Micro, Caption } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';

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
      <Text variant="bodySmall" color="tertiary" align="center" className="py-8">
        No thumbnail data yet for {categoryName}
      </Text>
    );
  }

  return (
    <div className="space-y-2">
      {/* Feed Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-interactive-400" />
          <Label color="secondary">Last 24 hours</Label>
        </div>
        {dataUpdatedAt && (
          <Micro className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Updated {formatTimeAgo(new Date(dataUpdatedAt).toISOString())}
          </Micro>
        )}
      </div>

      {/* Category Style Summary - Pinned at top */}
      {insight?.categoryStyleSummary && (
        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <Label className="text-purple-400">Style Insight</Label>
          </div>
          <Caption color="secondary">{insight.categoryStyleSummary}</Caption>
        </div>
      )}

      {/* Scrollable Social Feed */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {thumbnails.map((thumb, i) => (
          <article 
            key={thumb.videoId || i} 
            className="group card-interactive p-3"
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
                  <Label className="text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-2 py-1 rounded">
                    Recreate
                  </Label>
                </div>
              </Link>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title */}
                <Text 
                  variant="bodySmall" 
                  weight="medium" 
                  lineClamp={2} 
                  className="mb-1.5 group-hover:text-interactive-400 transition-colors"
                >
                  {thumb.title}
                </Text>

                {/* Stats Row */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {thumb.viewCount && (
                    <Badge variant="success" size="xs" icon={<Eye className="w-3 h-3" />}>
                      {thumb.viewCount >= 1000000 
                        ? `${(thumb.viewCount / 1000000).toFixed(1)}M` 
                        : `${(thumb.viewCount / 1000).toFixed(0)}K`} views
                    </Badge>
                  )}
                  {thumb.layoutType && (
                    <Badge variant="info" size="xs" icon={<Layout className="w-2.5 h-2.5" />}>
                      {thumb.layoutType}
                    </Badge>
                  )}
                  {thumb.colorMood && (
                    <Badge size="xs" icon={<Palette className="w-2.5 h-2.5" />} className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                      {thumb.colorMood}
                    </Badge>
                  )}
                </div>

                {/* Why It Works */}
                {thumb.whyItWorks && (
                  <Caption color="tertiary" lineClamp={2}>
                    💡 {thumb.whyItWorks}
                  </Caption>
                )}

                {/* Element Tags */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {thumb.hasFace && (
                    <Badge variant="secondary" size="xs">face</Badge>
                  )}
                  {thumb.hasText && (
                    <Badge variant="secondary" size="xs">text</Badge>
                  )}
                  {thumb.hasBorder && (
                    <Badge variant="secondary" size="xs">border</Badge>
                  )}
                  {thumb.hasGlowEffects && (
                    <Badge variant="secondary" size="xs">glow</Badge>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}

        {/* End of Feed Indicator */}
        <Micro align="center" className="py-4">
          <Clock className="w-3 h-3 inline mr-1" />
          Showing last 24 hours of trending thumbnails
        </Micro>
      </div>

      {/* Pro Tips - Sticky at bottom */}
      {insight?.proTips && insight.proTips.length > 0 && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl mt-2">
          <Label className="text-green-400 mb-1.5">💡 Pro Tips for {categoryName}</Label>
          <ul className="space-y-1">
            {insight.proTips.slice(0, 3).map((tip, i) => (
              <li key={i}>
                <Caption color="secondary">• {tip}</Caption>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
