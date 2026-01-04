'use client';

/**
 * Keywords & Tags Feed Component
 * 
 * Social feed style scrollable list of trending keywords and tag clusters from the last 24 hours.
 * Newest items appear at top, older items scroll down.
 * Shows keywords with velocity scores, effect sizes, power word categories, and tag clusters.
 * 
 * UNIFIED STYLING - Consistent with VideoIdeasFeed and TitleFeed
 */

import { useTitleIntel, useTagIntel } from '@aurastream/api-client';
import { Hash, TrendingUp, BarChart3, Tag as TagIcon, Zap, Clock, RefreshCw, Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface KeywordsFeedProps {
  categoryKey: string;
  categoryName: string;
}

function CopyTagButton({ tag }: { tag: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(`#${tag}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button 
      onClick={handleCopy} 
      className="p-1 hover:bg-white/10 rounded transition-colors opacity-0 group-hover:opacity-100"
      title="Copy tag"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-text-tertiary" />}
    </button>
  );
}

export function KeywordsFeed({ categoryKey, categoryName }: KeywordsFeedProps) {
  const { data: titleIntel, isLoading: titleLoading, dataUpdatedAt } = useTitleIntel(categoryKey);
  const { data: tagIntel, isLoading: tagLoading } = useTagIntel(categoryKey);

  const isLoading = titleLoading || tagLoading;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const keywords = titleIntel?.keywords || [];
  const tagClusters = titleIntel?.tag_clusters || [];
  const tags = tagIntel?.tags || [];
  const avgViews = titleIntel?.stats?.avgViews || 1;
  const trendingPowerWords = titleIntel?.trending_power_words || [];

  const hasData = keywords.length > 0 || tagClusters.length > 0 || tags.length > 0;

  if (!hasData) {
    return (
      <p className="text-sm text-text-tertiary text-center py-8">
        No keyword data yet for {categoryName}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Feed Header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-1.5">
          <Hash className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-text-secondary">Last 24 hours</span>
        </div>
        {dataUpdatedAt && (
          <span className="text-[10px] text-text-tertiary flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Updated {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Power Words - Pinned */}
      {trendingPowerWords.length > 0 && (
        <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-medium text-purple-400">Power Words</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {trendingPowerWords.map((word, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 transition-colors cursor-pointer">
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable Feed */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        
        {/* Trending Keywords Section */}
        {keywords.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 px-1 pt-2 pb-1">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-medium text-text-secondary">Trending Keywords</span>
            </div>
            
            {keywords.slice(0, 10).map((kw, i) => {
              const effectPct = Math.round((kw.avgViews / avgViews - 1) * 100);
              const isPositive = effectPct > 0;
              
              return (
                <article 
                  key={i} 
                  className="group p-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.10] rounded-lg transition-all duration-150"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm font-medium text-text-primary group-hover:text-blue-400 transition-colors">
                        "{kw.keyword}"
                      </span>
                      {kw.isTrending && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 animate-pulse">
                          TRENDING
                        </span>
                      )}
                    </div>
                    {kw.powerCategory && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/15 text-purple-400">
                        {kw.powerCategory}
                      </span>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-interactive-500/15 text-interactive-400">
                      <TrendingUp className="w-2.5 h-2.5" />
                      {kw.velocityScore.toLocaleString()} v/hr
                    </span>
                    <span className="text-[10px] text-text-tertiary">in {kw.frequency} videos</span>
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-medium',
                      isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    )}>
                      {isPositive ? '+' : ''}{effectPct}% vs baseline
                    </span>
                  </div>

                  {/* Top Video */}
                  {kw.topVideoTitle && (
                    <p className="text-[10px] text-text-tertiary truncate">
                      📺 Top: "{kw.topVideoTitle}"
                    </p>
                  )}
                </article>
              );
            })}
          </>
        )}

        {/* Tag Clusters Section */}
        {tagClusters.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 px-1 pt-3 pb-1">
              <TagIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-text-secondary">Tag Clusters</span>
              <span className="text-[10px] text-text-tertiary">(tags that work together)</span>
            </div>
            
            {tagClusters.map((cluster, i) => (
              <article 
                key={i} 
                className="group p-3 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06] border border-emerald-500/20 hover:border-emerald-500/30 rounded-lg transition-all duration-150"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
                    #{cluster.primary_tag}
                  </span>
                  <span className="text-[10px] text-text-tertiary">
                    {cluster.avg_views >= 1000000 
                      ? `${(cluster.avg_views / 1000000).toFixed(1)}M avg`
                      : `${(cluster.avg_views / 1000).toFixed(0)}K avg`}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  {cluster.related_tags.map((tag, j) => (
                    <span key={j} className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-text-tertiary border border-white/10">
                      #{tag}
                    </span>
                  ))}
                </div>

                <p className="text-[10px] text-text-tertiary truncate">
                  {cluster.video_count} videos • "{cluster.example_title?.slice(0, 50)}..."
                </p>
              </article>
            ))}
          </>
        )}

        {/* Top Tags Section */}
        {tags.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 px-1 pt-3 pb-1">
              <BarChart3 className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-medium text-text-secondary">Top Performing Tags</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {tags.slice(0, 8).map((tag, i) => (
                <article 
                  key={i} 
                  className="group p-2.5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.10] rounded-lg transition-all duration-150"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-text-primary group-hover:text-orange-400 transition-colors">#{tag.tag}</span>
                    <CopyTagButton tag={tag.tag} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-tertiary">
                      {tag.avgViews >= 1000000 
                        ? `${(tag.avgViews / 1000000).toFixed(1)}M avg`
                        : `${(tag.avgViews / 1000).toFixed(0)}K avg`}
                    </span>
                    <span className="text-[10px] text-text-tertiary">{tag.videosUsing} videos</span>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {/* End of Feed */}
        <p className="text-[10px] text-text-tertiary text-center py-3">
          <Clock className="w-3 h-3 inline mr-1" />
          Showing last 24 hours of keyword & tag data
        </p>
      </div>
    </div>
  );
}
