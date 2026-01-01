'use client';

import { Type, Copy, Check, Eye, TrendingUp, Sparkles, Zap, Hash } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTitleIntel } from '@aurastream/api-client';
import type { TitlePattern, GameTitleIntel } from '@aurastream/api-client';
import { useIntelStore } from '@/stores/intelStore';
import { PanelCard } from './PanelCard';

// =============================================================================
// Title Suggestion Item (NEW - uses velocity scoring)
// =============================================================================

interface TitleSuggestionData {
  title: string;
  hook: string;
  views: number;
  velocity: number;
  engagement_rate: number;
  power_words: string[];
  structure_type: string;
  why_it_works: string;
  template: string;
}

function TitleSuggestionItem({ suggestion }: { suggestion: TitleSuggestionData }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(suggestion.template);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
    return views.toString();
  };
  
  const getVelocityColor = (velocity: number) => {
    if (velocity >= 100) return 'text-success-main';
    if (velocity >= 50) return 'text-warning-main';
    return 'text-text-muted';
  };
  
  return (
    <div className="p-3 rounded-lg bg-background-surface/50 border border-border-subtle hover:border-interactive-500/20 transition-colors group">
      {/* Header with structure type and copy */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-interactive-400 uppercase tracking-wider">
          {suggestion.structure_type}
        </span>
        <button
          onClick={handleCopy}
          className={cn(
            'p-1 rounded transition-all',
            copied
              ? 'text-success-main'
              : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-text-primary'
          )}
          aria-label="Copy template"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      
      {/* Template */}
      <p className="text-sm text-text-primary font-medium mb-1 line-clamp-2">
        {suggestion.template}
      </p>
      
      {/* Hook */}
      {suggestion.hook && (
        <p className="text-xs text-text-muted italic mb-2 line-clamp-1">
          Hook: &quot;{suggestion.hook}&quot;
        </p>
      )}
      
      {/* Stats Row */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1 text-text-muted">
          <Eye className="w-3 h-3" />
          <span>{formatViews(suggestion.views)}</span>
        </div>
        <div className={cn('flex items-center gap-1', getVelocityColor(suggestion.velocity))}>
          <Zap className="w-3 h-3" />
          <span>{suggestion.velocity.toFixed(0)} velocity</span>
        </div>
        {suggestion.engagement_rate > 0 && (
          <div className="flex items-center gap-1 text-text-muted">
            <TrendingUp className="w-3 h-3" />
            <span>{(suggestion.engagement_rate * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      {/* Power Words */}
      {suggestion.power_words.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {suggestion.power_words.slice(0, 3).map((word, i) => (
            <span 
              key={i}
              className="px-1.5 py-0.5 text-xs bg-interactive-600/20 text-interactive-300 rounded"
            >
              {word}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Trending Phrase Item (NEW - n-gram phrases)
// =============================================================================

function TrendingPhraseItem({ phrase, rank }: { phrase: string; rank: number }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(phrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex items-center gap-2 px-2.5 py-1.5 rounded-lg w-full',
        'bg-background-surface/50 border border-border-subtle',
        'hover:border-interactive-500/30 hover:bg-interactive-600/5',
        'transition-all group text-left'
      )}
    >
      <span className="text-xs font-bold text-text-muted w-4">{rank}</span>
      <Hash className="w-3 h-3 text-interactive-400" />
      <span className="text-sm text-text-primary font-medium flex-1 truncate">
        {phrase}
      </span>
      {copied ? (
        <Check className="w-3 h-3 text-success-main" />
      ) : (
        <Copy className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}

// =============================================================================
// Legacy Pattern Item (fallback)
// =============================================================================

function PatternItem({ pattern }: { pattern: TitlePattern }) {
  return (
    <div className="p-3 rounded-lg bg-background-surface/50 border border-border-subtle">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-interactive-400">
          {pattern.name}
        </span>
        <span className="text-xs text-text-muted">
          {pattern.frequency} videos
        </span>
      </div>
      <p className="text-xs text-text-muted mb-2">
        {pattern.description}
      </p>
      {pattern.examples.length > 0 && (
        <p className="text-xs text-text-primary italic line-clamp-1">
          &quot;{pattern.examples[0]}&quot;
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Title Formulas Panel
// =============================================================================

export function TitleFormulasPanel() {
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);
  const [activeGame, setActiveGame] = useState(subscribedCategories[0]?.key || 'fortnite');
  
  // Fetch game-specific title intelligence
  const { data: titleIntel, isLoading, isError, refetch, dataUpdatedAt } = useTitleIntel(activeGame);
  
  // Only show if user has subscribed categories
  const hasSubscriptions = subscribedCategories.length > 0;
  const showGameTabs = subscribedCategories.length > 1;
  
  // Check if we have new algorithm data (title_suggestions) or legacy data
  const hasNewData = titleIntel?.title_suggestions && titleIntel.title_suggestions.length > 0;
  const hasTrendingPhrases = titleIntel?.trending_hooks && titleIntel.trending_hooks.length > 0;
  
  return (
    <PanelCard
      title="Title Formulas"
      icon={<Type className="w-4 h-4" />}
      isLoading={isLoading}
      isError={isError}
      errorMessage="Couldn't load title formulas"
      lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
      onRefresh={() => refetch()}
      size="small"
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
          <Type className="w-8 h-8 text-text-muted/50 mb-2" />
          <p className="text-sm text-text-muted">Subscribe to categories</p>
          <p className="text-xs text-text-muted mt-1">to see title formulas</p>
        </div>
      ) : !titleIntel ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <Sparkles className="w-8 h-8 text-text-muted/50 mb-2" />
          <p className="text-sm text-text-muted">Analyzing titles...</p>
          <p className="text-xs text-text-muted mt-1">Data refreshes daily</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* NEW: Title Suggestions with Velocity */}
          {hasNewData && (
            <div className="space-y-2">
              {titleIntel.title_suggestions.slice(0, 3).map((suggestion, index) => (
                <TitleSuggestionItem key={index} suggestion={suggestion} />
              ))}
            </div>
          )}
          
          {/* NEW: Trending Phrases (n-grams) */}
          {hasTrendingPhrases && (
            <div>
              <h4 className="text-xs font-medium text-text-muted mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Trending Phrases
              </h4>
              <div className="space-y-1">
                {titleIntel.trending_hooks.slice(0, 4).map((phrase, index) => (
                  <TrendingPhraseItem key={index} phrase={phrase} rank={index + 1} />
                ))}
              </div>
            </div>
          )}
          
          {/* Fallback: Legacy Patterns (if no new data) */}
          {!hasNewData && titleIntel.patterns.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-text-muted mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Top Patterns
              </h4>
              <div className="space-y-2">
                {titleIntel.patterns.slice(0, 3).map((pattern, index) => (
                  <PatternItem key={index} pattern={pattern} />
                ))}
              </div>
            </div>
          )}
          
          {/* Footer */}
          <p className="text-xs text-text-muted text-center pt-2 border-t border-border-subtle">
            Based on {titleIntel.videoCount} top {titleIntel.gameName} videos
          </p>
        </div>
      )}
    </PanelCard>
  );
}
