'use client';

/**
 * Today's Play Section - Data-Driven Daily Insight
 * 
 * Shows ONE specific, actionable insight based on real data.
 * Not generic fluff - actual numbers and specific recommendations.
 */

import { Target, TrendingUp, Zap, BarChart3, Users, Flame } from 'lucide-react';
import Link from 'next/link';
import { useDailyInsight } from '@aurastream/api-client';

// Type icons for different insight types
const INSIGHT_ICONS = {
  trending_phrase: TrendingUp,
  viral_spike: Flame,
  keyword_surge: BarChart3,
  low_competition: Users,
};

// Colors for different insight types
const INSIGHT_COLORS = {
  trending_phrase: 'bg-purple-600/20 border-purple-500/30',
  viral_spike: 'bg-red-600/20 border-red-500/30',
  keyword_surge: 'bg-blue-600/20 border-blue-500/30',
  low_competition: 'bg-green-600/20 border-green-500/30',
};

const METRIC_COLORS = {
  trending_phrase: 'text-purple-400 bg-purple-500/20',
  viral_spike: 'text-red-400 bg-red-500/20',
  keyword_surge: 'text-blue-400 bg-blue-500/20',
  low_competition: 'text-green-400 bg-green-500/20',
};

function ConfidenceBar({ confidence }: { confidence: number }) {
  const width = Math.min(100, Math.max(0, confidence));
  const color = confidence >= 70 ? 'bg-green-500' : confidence >= 50 ? 'bg-yellow-500' : 'bg-orange-500';
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-xs text-text-tertiary">{confidence}% confidence</span>
    </div>
  );
}

export function TodaysPlay() {
  const { data: insight, isLoading, error } = useDailyInsight();

  if (isLoading) {
    return (
      <section className="bg-background-secondary border border-border-primary rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-interactive-500" />
          <h2 className="text-lg font-semibold text-text-primary">Today's Insight</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded-lg w-3/4" />
          <div className="h-4 bg-white/5 rounded w-full" />
          <div className="h-16 bg-white/5 rounded-lg" />
        </div>
      </section>
    );
  }

  if (!insight || error) {
    return (
      <section className="bg-background-secondary border border-border-primary rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-interactive-500" />
          <h2 className="text-lg font-semibold text-text-primary">Today's Insight</h2>
        </div>
        <div className="text-center py-8 text-text-tertiary">
          <p>No insights available yet.</p>
          <p className="text-sm mt-1">Subscribe to categories to get personalized insights.</p>
        </div>
      </section>
    );
  }

  const InsightIcon = INSIGHT_ICONS[insight.insightType] || Target;
  const gradientClass = INSIGHT_COLORS[insight.insightType] || 'bg-interactive-600/20 border-interactive-500/30';
  const metricClass = METRIC_COLORS[insight.insightType] || 'text-interactive-400 bg-interactive-500/20';

  return (
    <section className={`${gradientClass} border rounded-2xl p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <InsightIcon className="w-5 h-5 text-interactive-500" />
          <h2 className="text-lg font-semibold text-text-primary">Today's Insight</h2>
          <span className="px-2 py-0.5 bg-white/10 text-text-tertiary text-xs rounded-full">
            {insight.categoryName}
          </span>
        </div>
        <ConfidenceBar confidence={insight.confidence} />
      </div>

      {/* Main Insight */}
      <div className="space-y-4">
        {/* Headline with metric */}
        <div className="flex items-start gap-3">
          <div className={`px-3 py-1.5 rounded-lg font-bold text-lg ${metricClass}`}>
            {insight.metricValue}
          </div>
          <div>
            <p className="text-xl font-semibold text-text-primary leading-tight">
              {insight.headline}
            </p>
            <p className="text-sm text-text-tertiary mt-1">
              {insight.metricLabel}
            </p>
          </div>
        </div>

        {/* Detail */}
        <div className="bg-white/5 rounded-lg p-4">
          <p className="text-sm text-text-secondary">
            {insight.detail}
          </p>
        </div>

        {/* Action */}
        <div className="flex items-start gap-3 p-4 bg-interactive-600/10 border border-interactive-500/20 rounded-lg">
          <Zap className="w-5 h-5 text-interactive-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-interactive-300">Recommended Action</p>
            <p className="text-sm text-text-secondary mt-1">{insight.action}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-4 pt-2">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-interactive-600 hover:bg-interactive-500 text-white font-medium rounded-xl shadow-lg shadow-interactive-600/20 transition-colors"
          >
            <Zap className="w-5 h-5" />
            Start Creating
          </Link>
          
          <span className="text-xs text-text-tertiary">
            Data from {insight.dataSource.replace('_', ' ')}
          </span>
        </div>
      </div>
    </section>
  );
}
