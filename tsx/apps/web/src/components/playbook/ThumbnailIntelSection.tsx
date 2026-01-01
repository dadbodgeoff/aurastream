'use client';

import { useState } from 'react';
import { useThumbnailIntelOverview, useCategoryInsight } from '@aurastream/api-client';
import type { CategoryInsight, ThumbnailAnalysis } from '@aurastream/api-client';
import { cn } from '@/lib/utils';

// ============================================================================
// Helper Functions
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

function getDifficultyColor(diff: string) {
  switch (diff) {
    case 'easy': return 'bg-green-500/20 text-green-400';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400';
    case 'hard': return 'bg-red-500/20 text-red-400';
    default: return 'bg-white/10 text-text-muted';
  }
}

// ============================================================================
// Thumbnail Card Component
// ============================================================================

interface ThumbnailCardProps {
  thumbnail: ThumbnailAnalysis;
}

function ThumbnailCard({ thumbnail }: ThumbnailCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white/5 border border-border-subtle rounded-lg overflow-hidden">
      {/* Thumbnail Image */}
      <div className="relative aspect-video">
        <img
          src={thumbnail.thumbnailUrl}
          alt={thumbnail.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
          {formatNumber(thumbnail.viewCount)} views
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="text-sm font-medium text-text-primary line-clamp-2 mb-2">
          {thumbnail.title}
        </h4>

        {/* Quick Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-micro">
            {thumbnail.layoutType}
          </span>
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-micro">
            {thumbnail.colorMood}
          </span>
          <span className={cn("px-2 py-0.5 rounded text-micro", getDifficultyColor(thumbnail.difficulty))}>
            {thumbnail.difficulty}
          </span>
        </div>

        {/* Expand Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-interactive-400 hover:text-interactive-300"
        >
          {expanded ? 'Show less' : 'Show analysis →'}
        </button>

        {/* Expanded Analysis */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-border-subtle space-y-3">
            {/* Colors */}
            <div>
              <span className="text-micro text-text-muted block mb-1">Dominant Colors</span>
              <div className="flex gap-1">
                {thumbnail.dominantColors.map((color, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded border border-white/20"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Layout Recipe */}
            <div className="p-2 bg-purple-500/10 rounded">
              <span className="text-micro text-purple-400 block mb-1">📐 Layout Recipe</span>
              <p className="text-xs text-text-primary">{thumbnail.layoutRecipe}</p>
            </div>

            {/* Color Recipe */}
            <div className="p-2 bg-blue-500/10 rounded">
              <span className="text-micro text-blue-400 block mb-1">🎨 Color Recipe</span>
              <p className="text-xs text-text-primary">{thumbnail.colorRecipe}</p>
            </div>

            {/* Why It Works */}
            <div className="p-2 bg-green-500/10 rounded">
              <span className="text-micro text-green-400 block mb-1">✨ Why It Works</span>
              <p className="text-xs text-text-primary">{thumbnail.whyItWorks}</p>
            </div>

            {/* Design Elements */}
            <div className="flex flex-wrap gap-2 text-micro">
              {thumbnail.hasFace && <span className="px-2 py-1 bg-white/5 rounded">👤 Face</span>}
              {thumbnail.hasText && <span className="px-2 py-1 bg-white/5 rounded">📝 Text</span>}
              {thumbnail.hasGlowEffects && <span className="px-2 py-1 bg-white/5 rounded">✨ Glow</span>}
              {thumbnail.hasBorder && <span className="px-2 py-1 bg-white/5 rounded">🔲 Border</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Category Section Component
// ============================================================================

interface CategorySectionProps {
  insight: CategoryInsight;
  isExpanded: boolean;
  onToggle: () => void;
}

function CategorySection({ insight, isExpanded, onToggle }: CategorySectionProps) {
  return (
    <div className="bg-background-surface border border-border-subtle rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎮</span>
          <div className="text-left">
            <h3 className="font-semibold text-text-primary">{insight.categoryName}</h3>
            <p className="text-xs text-text-muted">
              {insight.thumbnails.length} thumbnails analyzed • {insight.analysisDate}
            </p>
          </div>
        </div>
        <svg
          className={cn("w-5 h-5 text-text-muted transition-transform", isExpanded && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {/* Style Summary */}
          <div className="p-3 bg-purple-500/10 rounded-lg">
            <p className="text-sm text-text-primary">{insight.categoryStyleSummary}</p>
          </div>

          {/* Ideal Layout & Colors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-white/5 rounded-lg">
              <span className="text-xs font-medium text-text-muted block mb-2">📐 Ideal Layout</span>
              <p className="text-sm text-text-primary">{insight.idealLayout}</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <span className="text-xs font-medium text-text-muted block mb-2">🎨 Ideal Colors</span>
              <div className="flex gap-2">
                {insight.idealColorPalette.map((color, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded border border-white/20"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Must Have / Avoid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <span className="text-xs font-medium text-green-400 block mb-2">✅ Must Have</span>
              <ul className="space-y-1">
                {insight.mustHaveElements.map((el, i) => (
                  <li key={i} className="text-xs text-text-primary">• {el}</li>
                ))}
              </ul>
            </div>
            <div className="p-3 bg-red-500/10 rounded-lg">
              <span className="text-xs font-medium text-red-400 block mb-2">❌ Avoid</span>
              <ul className="space-y-1">
                {insight.avoidElements.map((el, i) => (
                  <li key={i} className="text-xs text-text-primary">• {el}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Pro Tips */}
          {insight.proTips.length > 0 && (
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <span className="text-xs font-medium text-yellow-400 block mb-2">💡 Pro Tips</span>
              <ul className="space-y-1">
                {insight.proTips.map((tip, i) => (
                  <li key={i} className="text-xs text-text-primary">• {tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Thumbnail Grid */}
          <div>
            <span className="text-xs font-medium text-text-muted block mb-3">
              Top Performing Thumbnails
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {insight.thumbnails.map((thumb) => (
                <ThumbnailCard key={thumb.videoId} thumbnail={thumb} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ThumbnailIntelSection() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const { data: overview, isLoading, error } = useThumbnailIntelOverview();

  if (isLoading) {
    return (
      <div className="bg-background-surface border border-border-subtle rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-white/10 rounded" />
          <div className="h-4 w-64 bg-white/5 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-white/5 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !overview || overview.categories.length === 0) {
    return (
      <div className="bg-background-surface border border-border-subtle rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-warning-main/20 flex items-center justify-center">
            <span className="text-xl">🖼️</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Thumbnail Intelligence</h2>
            <p className="text-xs text-text-muted">AI-powered thumbnail analysis coming soon</p>
          </div>
        </div>
        <p className="text-sm text-text-secondary">
          Thumbnail analysis runs daily at 6 AM EST. Check back tomorrow for insights!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-background-surface border border-border-subtle rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-warning-main/20 flex items-center justify-center">
            <span className="text-xl">🖼️</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Thumbnail Intelligence</h2>
            <p className="text-xs text-text-muted">
              {overview.totalThumbnailsAnalyzed} thumbnails analyzed • Updated {overview.analysisDate}
            </p>
          </div>
          <span className="ml-auto px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-medium">
            🤖 Gemini Vision
          </span>
        </div>
        <p className="text-sm text-text-secondary">
          Learn from top-performing gaming thumbnails. See what layouts, colors, and elements work best for each game.
        </p>
      </div>

      {/* Category Sections */}
      {overview.categories.map((insight) => (
        <CategorySection
          key={insight.categoryKey}
          insight={insight}
          isExpanded={expandedCategory === insight.categoryKey}
          onToggle={() => setExpandedCategory(
            expandedCategory === insight.categoryKey ? null : insight.categoryKey
          )}
        />
      ))}
    </div>
  );
}
