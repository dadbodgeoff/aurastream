'use client';

/**
 * Title Feed Component
 * 
 * Social feed style scrollable list of viral titles from the last 24 hours.
 * Newest items appear at top, older items scroll down.
 * Shows velocity scores, power words, why it works, and templates.
 * 
 * UNIFIED STYLING - Consistent with VideoIdeasFeed and KeywordsFeed
 */

import { useState } from 'react';
import { useTitleIntel } from '@aurastream/api-client';
import { TrendingUp, Copy, Check, Zap, Clock, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface TitleFeedProps {
  categoryKey: string;
  categoryName: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button 
      onClick={handleCopy} 
      className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
      title="Copy title"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-text-tertiary" />}
    </button>
  );
}

export function TitleFeed({ categoryKey, categoryName }: TitleFeedProps) {
  const { data: titleIntel, isLoading, dataUpdatedAt } = useTitleIntel(categoryKey);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-24 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const titles = titleIntel?.title_suggestions || [];
  const trendingHooks = titleIntel?.trending_hooks || [];

  if (titles.length === 0) {
    return (
      <p className="text-sm text-text-tertiary text-center py-8">
        No title data yet for {categoryName}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Feed Header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-xs font-medium text-text-secondary">Last 24 hours</span>
        </div>
        {dataUpdatedAt && (
          <span className="text-[10px] text-text-tertiary flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Updated {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Trending Hooks - Pinned */}
      {trendingHooks.length > 0 && (
        <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-lg sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs font-medium text-orange-400">Trending Hooks</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {trendingHooks.slice(0, 6).map((hook, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-orange-500/15 text-orange-300 cursor-pointer hover:bg-orange-500/25 transition-colors">
                {hook}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable Feed */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {titles.map((title, i) => (
          <article 
            key={i} 
            className="group p-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.10] rounded-lg transition-all duration-150"
          >
            {/* Title with Copy */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-sm font-medium text-text-primary leading-snug flex-1 group-hover:text-orange-400 transition-colors">
                {title.title}
              </h3>
              <CopyButton text={title.title} />
            </div>

            {/* Metrics Row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400">
                <TrendingUp className="w-2.5 h-2.5" />
                {title.velocity.toLocaleString()} v/hr
              </span>
              <span className="text-[10px] text-text-tertiary">
                {title.views >= 1000000 
                  ? `${(title.views / 1000000).toFixed(1)}M views`
                  : `${(title.views / 1000).toFixed(0)}K views`}
              </span>
              {title.engagement_rate > 0 && (
                <span className="text-[10px] text-interactive-400">
                  {(title.engagement_rate * 100).toFixed(1)}% eng
                </span>
              )}
            </div>

            {/* Power Words */}
            {title.power_words && title.power_words.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {title.power_words.map((word, j) => (
                  <span key={j} className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/15 text-purple-400">
                    {word}
                  </span>
                ))}
              </div>
            )}

            {/* Why It Works */}
            {title.why_it_works && (
              <p className="text-[10px] text-text-tertiary leading-relaxed">
                💡 {title.why_it_works}
              </p>
            )}

            {/* Structure & Template */}
            {(title.structure_type || title.template) && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                {title.structure_type && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-text-tertiary">
                    {title.structure_type}
                  </span>
                )}
                {title.template && (
                  <span className="text-[10px] text-text-tertiary truncate flex-1">
                    {title.template}
                  </span>
                )}
              </div>
            )}
          </article>
        ))}

        {/* End of Feed */}
        <p className="text-[10px] text-text-tertiary text-center py-3">
          <Clock className="w-3 h-3 inline mr-1" />
          Showing last 24 hours of viral titles
        </p>
      </div>

      {/* Stats Summary */}
      {titleIntel?.stats && (
        <div className="p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-lg mt-2">
          <p className="text-[10px] text-text-tertiary mb-1.5">Category Averages</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-sm font-medium text-text-primary">{titleIntel.stats.avgTitleLength}</p>
              <p className="text-[10px] text-text-tertiary">chars</p>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{titleIntel.stats.avgWordCount}</p>
              <p className="text-[10px] text-text-tertiary">words</p>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{(titleIntel.stats.avgViews / 1000).toFixed(0)}K</p>
              <p className="text-[10px] text-text-tertiary">avg views</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
