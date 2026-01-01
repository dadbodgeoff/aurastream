'use client';

/**
 * Keywords & Tags Feed Component
 * 
 * Social feed style scrollable list of trending keywords and tag clusters from the last 24 hours.
 * Newest items appear at top, older items scroll down.
 * Shows keywords with velocity scores, effect sizes, power word categories, and tag clusters.
 * 
 * Updated: Uses new Typography and Badge component system
 */

import { useTitleIntel, useTagIntel } from '@aurastream/api-client';
import { Hash, TrendingUp, BarChart3, Tag as TagIcon, Zap, Clock, RefreshCw, Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { Text, Label, Micro, Caption } from '@/components/ui/Typography';
import { Badge, Tag } from '@/components/ui/Badge';

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
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-text-tertiary" />}
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
          <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
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
      <Text variant="bodySmall" color="tertiary" align="center" className="py-8">
        No keyword data yet for {categoryName}
      </Text>
    );
  }

  return (
    <div className="space-y-2">
      {/* Feed Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <Hash className="w-3.5 h-3.5 text-green-400" />
          <Label color="secondary">Last 24 hours</Label>
        </div>
        {dataUpdatedAt && (
          <Micro className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Updated {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}
          </Micro>
        )}
      </div>

      {/* Power Words - Pinned */}
      {trendingPowerWords.length > 0 && (
        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <Label className="text-purple-400">Power Words</Label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {trendingPowerWords.map((word, i) => (
              <Tag key={i} variant="default" className="bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30">
                {word}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable Social Feed */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        
        {/* Trending Keywords Section */}
        {keywords.length > 0 && (
          <>
            <div className="flex items-center gap-2 px-1 pt-2">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              <Label>Trending Keywords</Label>
            </div>
            
            {keywords.slice(0, 10).map((kw, i) => {
              const effectPct = Math.round((kw.avgViews / avgViews - 1) * 100);
              const isPositive = effectPct > 0;
              
              return (
                <article 
                  key={i} 
                  className="group card-interactive p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <Text variant="bodySmall" weight="medium" className="group-hover:text-blue-400 transition-colors">
                        "{kw.keyword}"
                      </Text>
                      {kw.isTrending && (
                        <Badge variant="success" size="xs" className="animate-pulse">
                          TRENDING
                        </Badge>
                      )}
                    </div>
                    {kw.powerCategory && (
                      <Badge size="xs" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                        {kw.powerCategory}
                      </Badge>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="info" size="xs" icon={<TrendingUp className="w-2.5 h-2.5" />}>
                      {kw.velocityScore.toLocaleString()} v/hr
                    </Badge>
                    <Micro>in {kw.frequency} videos</Micro>
                    <Badge 
                      variant={isPositive ? 'success' : 'error'} 
                      size="xs"
                    >
                      {isPositive ? '+' : ''}{effectPct}% vs baseline
                    </Badge>
                  </div>

                  {/* Top Video */}
                  {kw.topVideoTitle && (
                    <Micro lineClamp={1}>
                      📺 Top: "{kw.topVideoTitle}"
                    </Micro>
                  )}
                </article>
              );
            })}
          </>
        )}

        {/* Tag Clusters Section */}
        {tagClusters.length > 0 && (
          <>
            <div className="flex items-center gap-2 px-1 pt-4">
              <TagIcon className="w-3.5 h-3.5 text-green-400" />
              <Label>Tag Clusters</Label>
              <Micro>(tags that work together)</Micro>
            </div>
            
            {tagClusters.map((cluster, i) => (
              <article 
                key={i} 
                className="group p-3 bg-green-500/5 hover:bg-green-500/10 border border-green-500/20 hover:border-green-500/30 rounded-xl transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <Text variant="bodySmall" weight="medium" className="text-green-400 group-hover:text-green-300 transition-colors">
                    #{cluster.primary_tag}
                  </Text>
                  <Micro>
                    {cluster.avg_views >= 1000000 
                      ? `${(cluster.avg_views / 1000000).toFixed(1)}M avg`
                      : `${(cluster.avg_views / 1000).toFixed(0)}K avg`}
                  </Micro>
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  {cluster.related_tags.map((tag, j) => (
                    <Tag key={j} variant="outline">
                      #{tag}
                    </Tag>
                  ))}
                </div>

                <Micro>
                  {cluster.video_count} videos • "{cluster.example_title?.slice(0, 50)}..."
                </Micro>
              </article>
            ))}
          </>
        )}

        {/* Top Tags Section */}
        {tags.length > 0 && (
          <>
            <div className="flex items-center gap-2 px-1 pt-4">
              <BarChart3 className="w-3.5 h-3.5 text-orange-400" />
              <Label>Top Performing Tags</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {tags.slice(0, 8).map((tag, i) => (
                <article 
                  key={i} 
                  className="group card-interactive p-2.5"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Label className="group-hover:text-orange-400 transition-colors">#{tag.tag}</Label>
                    <CopyTagButton tag={tag.tag} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Micro>
                      {tag.avgViews >= 1000000 
                        ? `${(tag.avgViews / 1000000).toFixed(1)}M avg`
                        : `${(tag.avgViews / 1000).toFixed(0)}K avg`}
                    </Micro>
                    <Micro>{tag.videosUsing} videos</Micro>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {/* End of Feed */}
        <Micro align="center" className="py-4">
          <Clock className="w-3 h-3 inline mr-1" />
          Showing last 24 hours of keyword & tag data
        </Micro>
      </div>
    </div>
  );
}
