'use client';

import { useState } from 'react';
import type { VideoIdea } from '@aurastream/api-client';
import { cn } from '@/lib/utils';

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function getDifficultyColor(diff: string) {
  switch (diff) {
    case 'beginner': return 'bg-green-500/20 text-green-400';
    case 'intermediate': return 'bg-yellow-500/20 text-yellow-400';
    case 'advanced': return 'bg-red-500/20 text-red-400';
    default: return 'bg-white/10 text-text-muted';
  }
}

interface VideoIdeaCardProps {
  idea: VideoIdea;
  index: number;
}

function VideoIdeaCard({ idea, index }: VideoIdeaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="bg-white/5 border border-border-subtle rounded-xl overflow-hidden hover:border-pink-500/30 transition-all">
      {/* Header with thumbnail preview */}
      <div 
        className="relative p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Thumbnail Preview */}
        <div 
          className="absolute top-0 right-0 w-24 h-16 rounded-bl-lg flex items-center justify-center text-xs font-bold"
          style={{
            background: `linear-gradient(135deg, ${idea.thumbnailColors[0] || '#9333EA'}, ${idea.thumbnailColors[1] || '#EC4899'})`,
          }}
        >
          <span className="text-white text-center px-1 drop-shadow-lg">
            {idea.thumbnailText}
          </span>
        </div>

        <div className="pr-28">
          {/* Game/Category Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded text-xs font-medium">
              🎮 {idea.gameOrCategory}
            </span>
            <span className={cn("px-2 py-0.5 rounded text-xs font-medium", getDifficultyColor(idea.difficulty))}>
              {idea.difficulty}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-text-primary text-lg leading-tight mb-2">
            {idea.title}
          </h3>

          {/* Quick Stats */}
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span>⏱️ {idea.estimatedLength}</span>
            {idea.inspiredByViews > 0 && (
              <span>📈 Inspired by {formatNumber(idea.inspiredByViews)} view video</span>
            )}
          </div>
        </div>

        {/* Expand indicator */}
        <svg
          className={cn(
            "absolute bottom-4 right-4 w-5 h-5 text-text-muted transition-transform",
            expanded && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border-subtle pt-4">
          {/* Why This Works - Strategic Reasoning */}
          {idea.whyThisWorks && (
            <div className="p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
              <span className="text-xs font-medium text-green-400 block mb-1">🧠 Why This Works</span>
              <p className="text-sm text-text-primary">{idea.whyThisWorks}</p>
            </div>
          )}

          {/* Title with Reasoning */}
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-text-muted">📝 Title Strategy</span>
              <button
                onClick={(e) => { e.stopPropagation(); copyToClipboard(idea.title, 'title'); }}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                {copiedField === 'title' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-sm text-text-primary font-medium mb-1">"{idea.title}"</p>
            {idea.titleReasoning && (
              <p className="text-xs text-text-secondary italic">💡 {idea.titleReasoning}</p>
            )}
          </div>

          {/* Hook */}
          <div className="p-3 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-pink-400">🎣 Opening Hook</span>
              <button
                onClick={(e) => { e.stopPropagation(); copyToClipboard(idea.hook, 'hook'); }}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                {copiedField === 'hook' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-sm text-text-primary">{idea.hook}</p>
          </div>

          {/* Description */}
          <div>
            <span className="text-xs font-medium text-text-muted block mb-1">📝 Content Description</span>
            <p className="text-sm text-text-secondary">{idea.description}</p>
          </div>

          {/* Thumbnail Concept */}
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-muted">🖼️ Thumbnail Concept</span>
            </div>
            <p className="text-sm text-text-secondary mb-2">{idea.thumbnailConcept}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Colors:</span>
              {idea.thumbnailColors.map((color, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded border border-white/20"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Tags with Reasoning */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-muted">🏷️ Recommended Tags</span>
              <button
                onClick={(e) => { e.stopPropagation(); copyToClipboard(idea.tags.join(', '), 'tags'); }}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                {copiedField === 'tags' ? '✓ Copied' : 'Copy All'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {idea.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs cursor-pointer hover:bg-cyan-500/30"
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(tag, tag); }}
                >
                  #{tag}
                </span>
              ))}
            </div>
            {idea.tagsReasoning && (
              <p className="text-xs text-text-secondary italic">💡 {idea.tagsReasoning}</p>
            )}
          </div>

          {/* Inspired By */}
          {idea.inspiredBy && (
            <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <span className="text-xs font-medium text-yellow-400 block mb-1">💡 Inspired By</span>
              <p className="text-sm text-text-secondary">"{idea.inspiredBy}"</p>
              {idea.inspiredByViews > 0 && (
                <span className="text-xs text-text-muted mt-1 block">
                  {formatNumber(idea.inspiredByViews)} views - proving this format works
                </span>
              )}
            </div>
          )}

          {/* Copy Title Button */}
          <button
            onClick={(e) => { e.stopPropagation(); copyToClipboard(idea.title, 'title-btn'); }}
            className={cn(
              "w-full py-2 rounded-lg text-sm font-medium transition-colors",
              copiedField === 'title-btn'
                ? "bg-green-500/20 text-green-400"
                : "bg-interactive-500/20 text-interactive-400 hover:bg-interactive-500/30"
            )}
          >
            {copiedField === 'title-btn' ? '✓ Title Copied!' : '📋 Copy Title'}
          </button>
        </div>
      )}
    </div>
  );
}

interface VideoIdeasSectionProps {
  ideas: VideoIdea[];
}

export function VideoIdeasSection({ ideas }: VideoIdeasSectionProps) {
  if (!ideas.length) return null;

  return (
    <div className="bg-background-surface border border-border-subtle rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
          <span className="text-xl">💡</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text-primary">AI Video Ideas</h2>
          <p className="text-xs text-text-muted">Ready-to-use concepts with strategic reasoning</p>
        </div>
        <span className="ml-auto px-2 py-1 bg-pink-500/20 text-pink-400 rounded-full text-xs font-medium">
          ✨ AI Generated
        </span>
      </div>

      <div className="space-y-4">
        {ideas.map((idea, index) => (
          <VideoIdeaCard key={idea.ideaId} idea={idea} index={index} />
        ))}
      </div>
    </div>
  );
}
