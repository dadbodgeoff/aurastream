'use client';

import { motion } from 'framer-motion';
import { Zap, ArrowRight, TrendingUp, Lightbulb, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDailyInsight } from '@aurastream/api-client';

// =============================================================================
// Insight Type Icons
// =============================================================================

const INSIGHT_ICONS: Record<string, React.ElementType> = {
  trending_phrase: TrendingUp,
  viral_spike: Zap,
  keyword_surge: BarChart3,
  low_competition: Lightbulb,
};

// =============================================================================
// Today's Mission Panel (Now uses Daily Insight)
// =============================================================================

export function TodaysMissionPanel() {
  const router = useRouter();
  const { data: insight, isLoading, isError, refetch } = useDailyInsight();
  
  const handleTakeAction = () => {
    router.push('/intel');
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-interactive-600/10 border border-interactive-500/20 p-6 md:p-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-interactive-400 uppercase tracking-wider mb-4">
          <Zap className="w-4 h-4" />
          <span>Today&apos;s Insight</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-white/5 animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-3/4 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (isError || !insight) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-interactive-600/10 border border-interactive-500/20 p-6 md:p-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-interactive-400 uppercase tracking-wider mb-4">
          <Zap className="w-4 h-4" />
          <span>Today&apos;s Insight</span>
        </div>
        <div className="text-center py-8">
          <p className="text-text-muted mb-4">
            {insight === null 
              ? "Subscribe to categories to get data-driven insights"
              : "Couldn't load your insight"
            }
          </p>
          {insight !== null && (
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-interactive-600/20 hover:bg-interactive-600/30 text-interactive-300 rounded-lg text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }
  
  const InsightIcon = INSIGHT_ICONS[insight.insightType] || Zap;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl bg-interactive-600/12 border border-interactive-500/20 p-6 md:p-8"
    >
      {/* Decorative gradient orbs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-interactive-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-interactive-400 uppercase tracking-wider">
            <Zap className="w-4 h-4" />
            <span>Today&apos;s Insight</span>
          </div>
          {insight.categoryName && (
            <span className="inline-flex items-center px-2.5 py-1 bg-interactive-600/15 border border-interactive-500/25 rounded-full text-xs font-medium text-interactive-300">
              {insight.categoryName}
            </span>
          )}
        </div>
        
        {/* Main Content */}
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Metric Display */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 rounded-xl bg-interactive-600/20 border border-interactive-500/30 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-interactive-300">
                {insight.metricValue}
              </span>
              <span className="text-xs text-text-muted mt-0.5">
                {insight.metricLabel}
              </span>
            </div>
          </div>
          
          {/* Insight Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <InsightIcon className="w-5 h-5 text-interactive-400" />
              <h2 className="text-xl md:text-2xl font-semibold text-text-primary">
                {insight.headline}
              </h2>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed mb-3">
              {insight.detail}
            </p>
            
            {/* Action */}
            <div className="p-3 rounded-lg bg-success-main/10 border border-success-main/20">
              <p className="text-sm text-success-main font-medium">
                💡 {insight.action}
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handleTakeAction}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg',
              'bg-interactive-600 hover:bg-interactive-500',
              'text-white font-medium text-sm',
              'transition-colors'
            )}
          >
            View Full Brief
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span>{insight.confidence}% confidence</span>
            <span>•</span>
            <span>Source: {insight.dataSource}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
