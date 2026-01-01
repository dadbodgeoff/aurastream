'use client';

/**
 * Title + Tags Section
 * 
 * Game-specific title suggestions, optimized tags, and keywords.
 * Uses algorithmic analysis of top-performing videos per game.
 */

import { useState } from 'react';
import { Type, Tag, Hash, Copy, Check, TrendingUp, Sparkles } from 'lucide-react';
import { useTitleIntel, useTagIntel } from '@aurastream/api-client';
import type { TrendingKeywordsResponse, YouTubeHighlight } from '@aurastream/api-client';

interface TitleTagsProps {
  keywords?: TrendingKeywordsResponse;
  youtubeVideos?: YouTubeHighlight[];
  selectedGame?: string; // Game key to show intel for
  subscribedCategories?: string[]; // User's subscribed game keys
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-xs text-text-tertiary hover:text-interactive-400 hover:bg-white/5 rounded transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-status-success" />
          <span className="text-status-success">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>{label || 'Copy'}</span>
        </>
      )}
    </button>
  );
}

function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(0)}K`;
  return views.toString();
}

export function TitleTags({ 
  keywords, 
  youtubeVideos, 
  selectedGame,
  subscribedCategories = [] 
}: TitleTagsProps) {
  // Use first subscribed category if no specific game selected
  const gameKey = selectedGame || subscribedCategories[0] || 'fortnite';
  const [activeGame, setActiveGame] = useState(gameKey);
  
  // Fetch game-specific title and tag intelligence
  const { data: titleIntel, isLoading: titleLoading } = useTitleIntel(activeGame);
  const { data: tagIntel, isLoading: tagLoading } = useTagIntel(activeGame);
  
  const isLoading = titleLoading || tagLoading;

  // Game selector tabs (only show if multiple subscribed categories)
  const showGameTabs = subscribedCategories.length > 1;

  return (
    <section className="bg-background-secondary border border-border-primary rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Type className="w-5 h-5 text-interactive-500" />
          <h2 className="text-lg font-semibold text-text-primary">Title + Tags</h2>
          {titleIntel && (
            <span className="text-xs text-text-tertiary bg-white/5 px-2 py-0.5 rounded">
              {titleIntel.gameName}
            </span>
          )}
        </div>
        {titleIntel && (
          <span className="text-xs text-text-tertiary">
            Based on {titleIntel.videoCount} top videos
          </span>
        )}
      </div>

      {/* Game Tabs */}
      {showGameTabs && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {subscribedCategories.map((key) => (
            <button
              key={key}
              onClick={() => setActiveGame(key)}
              className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
                activeGame === key
                  ? 'bg-interactive-600 text-white'
                  : 'bg-white/5 text-text-secondary hover:bg-white/10'
              }`}
            >
              {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-32 bg-white/5 rounded-lg" />
          <div className="h-24 bg-white/5 rounded-lg" />
          <div className="h-20 bg-white/5 rounded-lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Title Formulas */}
          {titleIntel?.formulas && titleIntel.formulas.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Title Formulas That Work
              </h3>
              <div className="space-y-2">
                {titleIntel.formulas.slice(0, 4).map((formula, i) => (
                  <div 
                    key={i}
                    className="bg-white/5 rounded-lg p-3 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-interactive-400">
                            {formula.name}
                          </span>
                          {formula.avgViews && (
                            <span className="text-xs text-text-tertiary flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {formula.avgViews} avg views
                            </span>
                          )}
                        </div>
                        <p className="text-text-primary font-medium text-sm">
                          {formula.template}
                        </p>
                        {formula.example && (
                          <p className="text-xs text-text-tertiary mt-1 truncate">
                            Example: "{formula.example}"
                          </p>
                        )}
                      </div>
                      <CopyButton text={formula.template} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Keywords */}
          {titleIntel?.keywords && titleIntel.keywords.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  High-Performing Keywords
                </h3>
                <CopyButton 
                  text={titleIntel.keywords.slice(0, 10).map(k => k.keyword).join(', ')} 
                  label="Copy All" 
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {titleIntel.keywords.slice(0, 12).map((kw, i) => (
                  <button
                    key={i}
                    onClick={() => navigator.clipboard.writeText(kw.keyword)}
                    className="group px-3 py-1.5 bg-white/5 text-text-secondary text-sm rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2"
                  >
                    <span>{kw.keyword}</span>
                    <span className="text-xs text-text-tertiary group-hover:text-interactive-400">
                      {formatViews(kw.avgViews)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optimized Tags */}
          {tagIntel?.tags && tagIntel.tags.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Recommended Tags
                </h3>
                <CopyButton 
                  text={tagIntel.tags.slice(0, 15).map(t => t.tag).join(', ')} 
                  label="Copy All" 
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {tagIntel.tags.slice(0, 15).map((tag, i) => (
                  <span 
                    key={i}
                    onClick={() => navigator.clipboard.writeText(tag.tag)}
                    className="px-3 py-1 bg-interactive-600/20 text-interactive-400 text-sm rounded-full hover:bg-interactive-600/30 transition-colors cursor-pointer"
                    title={`Used by ${tag.videosUsing} videos, ${formatViews(tag.avgViews)} avg views`}
                  >
                    {tag.tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Fallback to generic keywords if no game-specific data */}
          {!titleIntel && keywords && (
            <>
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Trending Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {keywords.titleKeywords?.slice(0, 10).map((kw, i) => (
                    <span 
                      key={i}
                      className="px-3 py-1 bg-white/5 text-text-secondary text-sm rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                      onClick={() => navigator.clipboard.writeText(kw.keyword)}
                    >
                      {kw.keyword}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Hashtags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {keywords.hashtags?.slice(0, 8).map((tag, i) => (
                    <span 
                      key={i}
                      className="px-3 py-1 bg-interactive-600/20 text-interactive-400 text-sm rounded-full hover:bg-interactive-600/30 transition-colors cursor-pointer"
                      onClick={() => navigator.clipboard.writeText(tag)}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Stats footer */}
          {titleIntel?.stats && (
            <div className="pt-4 border-t border-border-primary">
              <div className="flex items-center gap-6 text-xs text-text-tertiary">
                <span>Avg title: {titleIntel.stats.avgWordCount} words</span>
                <span>Avg views: {formatViews(titleIntel.stats.avgViews)}</span>
                <span>Updated: {new Date(titleIntel.analyzedAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
