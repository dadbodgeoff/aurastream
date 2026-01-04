'use client';

/**
 * Video Ideas Feed Component
 * 
 * Social feed style scrollable list of synthesized video concepts from the last 24 hours.
 * Newest ideas appear at top, older items scroll down.
 * Shows concept, hook, why now, format, difficulty, and trending elements.
 * 
 * UNIFIED STYLING - Consistent with TitleFeed and KeywordsFeed
 */

import { useVideoIdeas } from '@aurastream/api-client';
import { Lightbulb, Flame, TrendingUp, Clock, RefreshCw, Tag as TagIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface VideoIdeasFeedProps {
  categoryKey: string;
  categoryName: string;
}

function getDifficultyStyle(difficulty: string) {
  switch (difficulty) {
    case 'easy': return 'bg-emerald-500/15 text-emerald-400';
    case 'medium': return 'bg-amber-500/15 text-amber-400';
    case 'hard': return 'bg-red-500/15 text-red-400';
    default: return 'bg-white/10 text-text-tertiary';
  }
}

function getOpportunityStyle(opportunity: string) {
  switch (opportunity) {
    case 'hot': return 'bg-red-500/10 border-red-500/20 text-red-400';
    case 'warm': return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    case 'cool': return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    default: return 'bg-white/5 border-white/10 text-text-tertiary';
  }
}

export function VideoIdeasFeed({ categoryKey, categoryName }: VideoIdeasFeedProps) {
  const { data: videoIdeas, isLoading, dataUpdatedAt } = useVideoIdeas(categoryKey);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const ideas = videoIdeas?.ideas || [];
  const overallOpportunity = videoIdeas?.overallOpportunity || 'warm';
  const dataFreshness = videoIdeas?.dataFreshnessHours || 24;

  if (ideas.length === 0) {
    return (
      <p className="text-sm text-text-tertiary text-center py-8">
        No video ideas yet for {categoryName}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Feed Header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-xs font-medium text-text-secondary">Last 24 hours</span>
        </div>
        {dataUpdatedAt && (
          <span className="text-[10px] text-text-tertiary flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Updated {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Overall Opportunity - Pinned */}
      <div className={cn(
        'p-2.5 rounded-lg border sticky top-0 z-10 backdrop-blur-sm',
        getOpportunityStyle(overallOpportunity)
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">
              {overallOpportunity === 'hot' ? '🔥 Hot Opportunity Window' : 
               overallOpportunity === 'warm' ? '⚡ Good Timing' : 
               '❄️ Competitive Space'}
            </span>
          </div>
          <span className="text-[10px] opacity-70 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {dataFreshness}h fresh
          </span>
        </div>
      </div>

      {/* Scrollable Feed */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {ideas.map((idea, i) => (
          <article 
            key={i} 
            className="group p-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.10] rounded-lg transition-all duration-150"
          >
            {/* Header: Format + Difficulty + Scores */}
            <div className="flex items-center gap-1.5 mb-2">
              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', getDifficultyStyle(idea.difficulty))}>
                {idea.difficulty}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-400">
                {idea.formatSuggestion}
              </span>
              <div className="flex-1" />
              <span className="text-[10px] text-text-tertiary">{idea.confidence}% conf</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-interactive-500/15 text-interactive-400">
                {idea.opportunityScore} score
              </span>
            </div>

            {/* Concept */}
            <h3 className="text-sm font-medium text-text-primary leading-snug mb-2 group-hover:text-yellow-400 transition-colors">
              {idea.concept}
            </h3>

            {/* Hook */}
            {idea.hook && (
              <p className="text-xs text-text-secondary mb-2 leading-relaxed">
                <span className="text-purple-400">🎣 Hook:</span> {idea.hook}
              </p>
            )}

            {/* Why Now */}
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-md mb-2">
              <p className="text-xs text-emerald-300 leading-relaxed">
                <span className="font-medium">⏰ Why now:</span> {idea.whyNow}
              </p>
            </div>

            {/* Trending Elements */}
            {idea.trendingElements && idea.trendingElements.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] text-text-tertiary mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Include these:
                </p>
                <div className="flex flex-wrap gap-1">
                  {idea.trendingElements.map((el, j) => (
                    <span key={j} className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/15 text-purple-400">
                      {el}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Tags */}
            {idea.suggestedTags && idea.suggestedTags.length > 0 && (
              <div>
                <p className="text-[10px] text-text-tertiary mb-1 flex items-center gap-1">
                  <TagIcon className="w-3 h-3" /> Tags:
                </p>
                <div className="flex flex-wrap gap-1">
                  {idea.suggestedTags.slice(0, 5).map((tag, j) => (
                    <span key={j} className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-text-tertiary border border-white/10">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}

        {/* End of Feed */}
        <p className="text-[10px] text-text-tertiary text-center py-3">
          <Clock className="w-3 h-3 inline mr-1" />
          Showing last 24 hours of video ideas
        </p>
      </div>
    </div>
  );
}
