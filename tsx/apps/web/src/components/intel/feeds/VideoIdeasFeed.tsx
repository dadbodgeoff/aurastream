'use client';

/**
 * Video Ideas Feed Component
 * 
 * Social feed style scrollable list of synthesized video concepts from the last 24 hours.
 * Newest ideas appear at top, older items scroll down.
 * Shows concept, hook, why now, format, difficulty, and trending elements.
 * 
 * Updated: Uses new Typography and Badge component system
 */

import { useVideoIdeas } from '@aurastream/api-client';
import { Lightbulb, Flame, TrendingUp, Clock, RefreshCw, Tag as TagIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Text, Label, Micro } from '@/components/ui/Typography';
import { Badge, Tag } from '@/components/ui/Badge';

interface VideoIdeasFeedProps {
  categoryKey: string;
  categoryName: string;
}

function getDifficultyVariant(difficulty: string): 'success' | 'warning' | 'error' | 'default' {
  switch (difficulty) {
    case 'easy': return 'success';
    case 'medium': return 'warning';
    case 'hard': return 'error';
    default: return 'default';
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
      <Text variant="bodySmall" color="tertiary" align="center" className="py-8">
        No video ideas yet for {categoryName}
      </Text>
    );
  }

  return (
    <div className="space-y-2">
      {/* Feed Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
          <Label color="secondary">Last 24 hours</Label>
        </div>
        {dataUpdatedAt && (
          <Micro className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Updated {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}
          </Micro>
        )}
      </div>

      {/* Overall Opportunity - Pinned */}
      <div className={`p-3 rounded-xl border sticky top-0 z-10 backdrop-blur-sm ${getOpportunityColor(overallOpportunity)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-3.5 h-3.5" />
            <Label>
              {overallOpportunity === 'hot' ? '🔥 Hot Opportunity Window' : 
               overallOpportunity === 'warm' ? '⚡ Good Timing' : 
               '❄️ Competitive Space'}
            </Label>
          </div>
          <Micro className="opacity-70 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {dataFreshness}h fresh
          </Micro>
        </div>
      </div>

      {/* Scrollable Social Feed */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {ideas.map((idea, i) => (
          <article 
            key={i} 
            className="group card-interactive p-4"
          >
            {/* Header: Format + Difficulty + Scores */}
            <div className="flex items-center gap-2 mb-3">
              <Badge variant={getDifficultyVariant(idea.difficulty)} size="xs">
                {idea.difficulty}
              </Badge>
              <Badge variant="warning" size="xs">
                {idea.formatSuggestion}
              </Badge>
              <div className="flex-1" />
              <Micro>{idea.confidence}% conf</Micro>
              <Badge variant="primary" size="xs">
                {idea.opportunityScore} score
              </Badge>
            </div>

            {/* Concept */}
            <Text 
              variant="bodySmall" 
              weight="semibold" 
              className="mb-2 leading-snug group-hover:text-yellow-400 transition-colors"
            >
              {idea.concept}
            </Text>

            {/* Hook */}
            {idea.hook && (
              <Text variant="caption" color="secondary" className="mb-2 leading-relaxed">
                <span className="text-purple-400">🎣 Hook:</span> {idea.hook}
              </Text>
            )}

            {/* Why Now - The key reasoning */}
            <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg mb-3">
              <Text variant="caption" className="text-green-300 leading-relaxed">
                <span className="font-medium">⏰ Why now:</span> {idea.whyNow}
              </Text>
            </div>

            {/* Trending Elements */}
            {idea.trendingElements && idea.trendingElements.length > 0 && (
              <div className="mb-2">
                <Micro className="mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Include these:
                </Micro>
                <div className="flex flex-wrap gap-1">
                  {idea.trendingElements.map((el, j) => (
                    <Badge key={j} variant="info" size="xs" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                      {el}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Tags */}
            {idea.suggestedTags && idea.suggestedTags.length > 0 && (
              <div>
                <Micro className="mb-1 flex items-center gap-1">
                  <TagIcon className="w-3 h-3" /> Tags:
                </Micro>
                <div className="flex flex-wrap gap-1">
                  {idea.suggestedTags.slice(0, 5).map((tag, j) => (
                    <Tag key={j} variant="outline">
                      #{tag}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}

        {/* End of Feed */}
        <Micro align="center" className="py-4">
          <Clock className="w-3 h-3 inline mr-1" />
          Showing last 24 hours of video ideas
        </Micro>
      </div>
    </div>
  );
}
