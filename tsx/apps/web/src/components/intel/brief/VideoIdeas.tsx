'use client';

/**
 * Video Ideas Section
 * 
 * Shows SYNTHESIZED video concepts based on trending data.
 * Unlike title suggestions (which are existing viral titles),
 * these are original ideas combining:
 * - Trending topics from viral detector
 * - Trending keywords/phrases from title intel
 * - Tag clusters that work together
 * - Competition levels
 */

import { useState } from 'react';
import { Lightbulb, TrendingUp, Zap, Tag, Sparkles, Target, Clock } from 'lucide-react';
import { useVideoIdeas } from '@aurastream/api-client';

// Import the VideoIdea type directly from the hook to avoid collision with playbook's VideoIdea
type VideoIdea = {
  concept: string;
  hook: string;
  whyNow: string;
  formatSuggestion: string;
  trendingElements: string[];
  suggestedTags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  opportunityScore: number;
  confidence: number;
};

interface VideoIdeasProps {
  subscribedCategories: string[];
}

// Game display names
const GAME_NAMES: Record<string, string> = {
  fortnite: 'Fortnite',
  warzone: 'Warzone',
  valorant: 'Valorant',
  apex_legends: 'Apex',
  minecraft: 'Minecraft',
  gta: 'GTA',
  roblox: 'Roblox',
  arc_raiders: 'Arc Raiders',
};

// Opportunity badge colors
const OPPORTUNITY_COLORS = {
  hot: 'bg-red-500/20 text-red-400 border-red-500/30',
  warm: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  cool: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

// Difficulty badge colors
const DIFFICULTY_COLORS = {
  easy: 'bg-green-500/20 text-green-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  hard: 'bg-red-500/20 text-red-400',
};

function OpportunityBadge({ level }: { level: 'hot' | 'warm' | 'cool' }) {
  const labels = { hot: '🔥 Hot', warm: '🌡️ Warm', cool: '❄️ Cool' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${OPPORTUNITY_COLORS[level]}`}>
      {labels[level]}
    </span>
  );
}

function DifficultyBadge({ level }: { level: 'easy' | 'medium' | 'hard' }) {
  const labels = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${DIFFICULTY_COLORS[level]}`}>
      {labels[level]}
    </span>
  );
}

function ConfidenceMeter({ score }: { score: number }) {
  const width = Math.min(100, Math.max(0, score));
  const color = score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-orange-500';
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-xs text-text-tertiary">{score}%</span>
    </div>
  );
}

function VideoIdeaCard({ idea, rank }: { idea: VideoIdea; rank: number }) {
  return (
    <div className="bg-white/5 border border-border-primary rounded-xl p-4 hover:border-interactive-600/30 transition-colors">
      {/* Header: Rank + Format + Difficulty */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-interactive-400">#{rank}</span>
          <span className="px-2 py-0.5 bg-interactive-600/20 text-interactive-400 text-xs rounded font-medium">
            {idea.formatSuggestion}
          </span>
          <DifficultyBadge level={idea.difficulty} />
        </div>
        <ConfidenceMeter score={idea.confidence} />
      </div>
      
      {/* Main Concept */}
      <h3 className="text-text-primary font-semibold text-base mb-2 leading-snug">
        {idea.concept}
      </h3>
      
      {/* Hook */}
      <div className="mb-3">
        <span className="text-xs text-text-tertiary">Hook: </span>
        <span className="text-sm text-text-secondary italic">"{idea.hook}"</span>
      </div>
      
      {/* Why Now */}
      <div className="flex items-start gap-2 mb-3 p-2 bg-green-500/10 rounded-lg">
        <Clock className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-green-300">{idea.whyNow}</p>
      </div>
      
      {/* Trending Elements */}
      {idea.trendingElements.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1 mb-1.5">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span className="text-xs text-text-tertiary">Include these trending elements:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {idea.trendingElements.map((element, i) => (
              <span key={i} className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                {element}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Suggested Tags */}
      {idea.suggestedTags.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <Tag className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-text-tertiary">Suggested tags:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {idea.suggestedTags.slice(0, 5).map((tag, i) => (
              <span key={i} className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Opportunity Score */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-primary">
        <div className="flex items-center gap-1">
          <Target className="w-3 h-3 text-text-tertiary" />
          <span className="text-xs text-text-tertiary">Opportunity Score</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-interactive-500 rounded-full" 
              style={{ width: `${idea.opportunityScore}%` }} 
            />
          </div>
          <span className="text-sm font-medium text-interactive-400">{idea.opportunityScore}</span>
        </div>
      </div>
    </div>
  );
}

function GameTab({ 
  gameKey, 
  isActive, 
  onClick 
}: { 
  gameKey: string; 
  isActive: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
        isActive
          ? 'bg-interactive-600 text-white'
          : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary'
      }`}
    >
      {GAME_NAMES[gameKey] || gameKey}
    </button>
  );
}

export function VideoIdeas({ subscribedCategories }: VideoIdeasProps) {
  // Default to first subscribed category or fortnite
  const [selectedGame, setSelectedGame] = useState(
    subscribedCategories[0] || 'fortnite'
  );
  
  const { data: videoIdeas, isLoading, error } = useVideoIdeas(selectedGame);

  // Get available games (subscribed or default set)
  const availableGames = subscribedCategories.length > 0 
    ? subscribedCategories 
    : ['fortnite', 'warzone', 'valorant'];

  return (
    <section className="bg-background-secondary border border-border-primary rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-interactive-500" />
          <h2 className="text-lg font-semibold text-text-primary">Video Ideas</h2>
          {videoIdeas && (
            <OpportunityBadge level={videoIdeas.overallOpportunity} />
          )}
        </div>
        
        {/* Game tabs */}
        <div className="flex items-center gap-2">
          {availableGames.slice(0, 4).map(game => (
            <GameTab
              key={game}
              gameKey={game}
              isActive={selectedGame === game}
              onClick={() => setSelectedGame(game)}
            />
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/5 rounded-xl p-4 animate-pulse">
              <div className="h-5 bg-white/10 rounded w-3/4 mb-3" />
              <div className="h-4 bg-white/10 rounded w-1/2 mb-2" />
              <div className="h-4 bg-white/10 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-8 text-text-tertiary">
          <p>Unable to load video ideas. Data refreshes daily.</p>
        </div>
      )}

      {/* Video ideas */}
      {videoIdeas && videoIdeas.ideas.length > 0 && (
        <div className="space-y-4">
          {videoIdeas.ideas.map((idea, i) => (
            <VideoIdeaCard key={i} idea={idea} rank={i + 1} />
          ))}
          
          {/* Footer stats */}
          <div className="flex items-center justify-between pt-4 border-t border-border-primary">
            <p className="text-xs text-text-tertiary">
              Ideas synthesized from trending {GAME_NAMES[selectedGame] || selectedGame} data
            </p>
            <p className="text-xs text-text-tertiary">
              Data freshness: {videoIdeas.dataFreshnessHours.toFixed(1)}h ago
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && (!videoIdeas || videoIdeas.ideas.length === 0) && (
        <div className="text-center py-8 text-text-tertiary">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No video ideas available for {GAME_NAMES[selectedGame] || selectedGame}.</p>
          <p className="text-xs mt-1">Data refreshes daily from YouTube.</p>
        </div>
      )}
    </section>
  );
}
