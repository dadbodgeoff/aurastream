'use client';

import { Hash, Copy, Check, TrendingUp, Tag } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTagIntel, type TagIntel } from '@aurastream/api-client';
import { useIntelStore } from '@/stores/intelStore';
import { PanelCard } from './PanelCard';

// =============================================================================
// Tag Item
// =============================================================================

function TagItem({ 
  tag, 
  rank,
  onCopy,
}: { 
  tag: TagIntel; 
  rank: number;
  onCopy: (tag: string) => void;
}) {
  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
    return views.toString();
  };

  return (
    <button
      onClick={() => onCopy(tag.tag)}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg w-full',
        'bg-background-surface/50 border border-border-subtle',
        'hover:border-interactive-500/30 hover:bg-interactive-600/5',
        'transition-all group'
      )}
    >
      <span className="text-xs font-bold text-text-muted w-4">
        {rank}
      </span>
      <Tag className="w-3.5 h-3.5 text-interactive-400" />
      <span className="text-sm text-text-primary font-medium flex-1 text-left truncate">
        {tag.tag}
      </span>
      <span className="text-xs text-text-muted">
        {formatViews(tag.avgViews)}
      </span>
      <Copy className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// =============================================================================
// Trending Hashtags Panel (now uses game-specific tags)
// =============================================================================

export function TrendingHashtagsPanel() {
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);
  const [activeGame, setActiveGame] = useState(subscribedCategories[0]?.key || 'fortnite');
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  
  // Fetch game-specific tag intelligence
  const { data: tagIntel, isLoading, isError, refetch, dataUpdatedAt } = useTagIntel(activeGame);
  
  // Only show tags if user has subscribed categories
  const hasSubscriptions = subscribedCategories.length > 0;
  const showGameTabs = subscribedCategories.length > 1;
  const tags = tagIntel?.tags?.slice(0, 8) || [];
  
  const handleCopy = async (tag: string) => {
    try {
      await navigator.clipboard.writeText(tag);
      setCopiedTag(tag);
      setTimeout(() => setCopiedTag(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const handleCopyAll = async () => {
    try {
      const allTags = tags.map(t => t.tag).join(', ');
      await navigator.clipboard.writeText(allTags);
      setCopiedTag('all');
      setTimeout(() => setCopiedTag(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  return (
    <PanelCard
      title="Recommended Tags"
      icon={<Hash className="w-4 h-4" />}
      isLoading={isLoading}
      isError={isError}
      errorMessage="Couldn't load tags"
      lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
      onRefresh={() => refetch()}
      size="small"
      headerActions={
        tags.length > 0 && (
          <button
            onClick={handleCopyAll}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs',
              'text-text-muted hover:text-text-primary',
              'hover:bg-white/5 transition-colors',
              copiedTag === 'all' && 'text-success-main'
            )}
          >
            {copiedTag === 'all' ? (
              <>
                <Check className="w-3 h-3" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy all
              </>
            )}
          </button>
        )
      }
    >
      {/* Game Tabs */}
      {showGameTabs && (
        <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
          {subscribedCategories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveGame(cat.key)}
              className={cn(
                'px-2 py-1 text-xs rounded whitespace-nowrap transition-colors',
                activeGame === cat.key
                  ? 'bg-interactive-600 text-white'
                  : 'bg-white/5 text-text-muted hover:bg-white/10'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {!hasSubscriptions ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <Hash className="w-8 h-8 text-text-muted/50 mb-2" />
          <p className="text-sm text-text-muted">Subscribe to categories</p>
          <p className="text-xs text-text-muted mt-1">to see recommended tags</p>
        </div>
      ) : tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <Tag className="w-8 h-8 text-text-muted/50 mb-2" />
          <p className="text-sm text-text-muted">Analyzing tags...</p>
          <p className="text-xs text-text-muted mt-1">Data refreshes daily</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {tags.map((tag, index) => (
            <TagItem
              key={tag.tag}
              tag={tag}
              rank={index + 1}
              onCopy={handleCopy}
            />
          ))}
          
          {/* Footer */}
          <div className="flex items-center justify-center gap-1 pt-2 text-xs text-text-muted">
            <TrendingUp className="w-3 h-3" />
            <span>From top {tagIntel?.gameName} videos</span>
          </div>
        </div>
      )}
    </PanelCard>
  );
}
