'use client';

/**
 * Video Ideas Feed Component
 * 
 * Social feed style scrollable list of synthesized video concepts from the last 24 hours.
 * Newest ideas appear at top, older items scroll down.
 * Shows concept, hook, why now, format, difficulty, and trending elements.
 */

import { useVideoIdeas } from '@aurastream/api-client';
import { Lightbulb, Flame, Target, Tag, TrendingUp, Clock, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VideoIdeasFeedProps {
  categoryKey: string;
  categoryName: string;
}

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case 'easy': return 'bg-green-500/20 text-green-400';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400';
    case 'hard': return 'bg-red-500/20 text-red-400';
    default: return 'bg-white/10 text-text-tertiary';
  }
}

function getOpportunityColor(opportunity: string) {
  switch (opportunity) {
    case 'hot': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'warm': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'cool': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default: return 'bg-white/10 text-text-tertiary border-white/10';
  }
}

export function VideoIdeasFeed({ categoryKey, categoryName }: VideoIdeasFeedProps) {
  const { data: videoIdeas, isLoading, dataUpdatedAt } = useVideoIdeas(categoryKey);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-36 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const ideas = videoIdeas?.ideas || [];
  const overallOpportunity = videoIdeas?.overallOpportunity || 'warm';
  const dataFreshness = videoIdeas?.dataFreshnessHours || 24;

  if (ideas.length === 0) {
    return (
      <div className="text-center py-8 text-text-tertiary text-sm">
        No video ideas yet for {categoryName}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Feed Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-xs font-medium text-text-secondary">Last 24 hours</span>
        </div>
        {dataUpdatedAt && (
          <div className="flex items-center gap-1 text-[10px] text-text-tertiary">
            <RefreshCw className="w-3 h-3" />
            Updated {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}
          </div>
        )}
      </div>

      {/* Overall Opportunity - Pinned */}
      <div className={`p-3 rounded-xl border sticky top-0 z-10 backdrop-blur-sm ${getOpportunityColor(overallOpportunity)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
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

      {/* Scrollable Social Feed */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {ideas.map((idea, i) => (
          <article 
            key={i} 
            className="group p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.12] rounded-xl transition-all duration-200"
          >
            {/* Header: Format + Difficulty + Scores */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${getDifficultyColor(idea.difficulty)}`}>
                {idea.difficulty}
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded font-medium">
                {idea.formatSuggestion}
              </span>
              <div className="flex-1" />
              <span className="text-[10px] text-text-tertiary">
                {idea.confidence}% conf
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-interactive-500/20 text-interactive-400 rounded font-medium">
                {idea.opportunityScore} score
              </span>
            </div>

            {/* Concept */}
            <h3 className="text-sm font-semibold text-text-primary mb-2 leading-snug group-hover:text-yellow-400 transition-colors">
              {idea.concept}
            </h3>

            {/* Hook */}
            {idea.hook && (
              <p className="text-[11px] text-text-secondary mb-2 leading-relaxed">
                <span className="text-purple-400">🎣 Hook:</span> {idea.hook}
              </p>
            )}

            {/* Why Now - The key reasoning */}
            <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg mb-3">
              <p className="text-[11px] text-green-300 leading-relaxed">
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
                    <span key={j} className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
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
                  <Tag className="w-3 h-3" /> Tags:
                </p>
                <div className="flex flex-wrap gap-1">
                  {idea.suggestedTags.slice(0, 5).map((tag, j) => (
                    <span key={j} className="text-[10px] px-1.5 py-0.5 bg-white/5 text-text-tertiary rounded hover:bg-white/10 cursor-pointer transition-colors">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}

        {/* End of Feed */}
        <div className="text-center py-4 text-[10px] text-text-tertiary">
          <Clock className="w-3 h-3 inline mr-1" />
          Showing last 24 hours of video ideas
        </div>
      </div>
    </div>
  );
}
