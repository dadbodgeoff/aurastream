'use client';

import { useState } from 'react';
import { BarChart3, Users, Eye, TrendingUp, RefreshCw, Calendar, ArrowUp, ArrowDown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnalyticsDashboard } from '@aurastream/api-client';
import { useAuth } from '@aurastream/shared';

const ADMIN_EMAIL = 'dadbodgeoff@gmail.com';

// =============================================================================
// Stat Card
// =============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  color?: string;
}

function StatCard({ label, value, icon, trend, color = 'bg-interactive-600/20' }: StatCardProps) {
  return (
    <div className="p-4 bg-background-surface/50 border border-border-subtle rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div className={cn('p-2 rounded-lg', color)}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium',
            trend >= 0 ? 'text-success-main' : 'text-error-main'
          )}>
            {trend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-sm text-text-muted mt-1">{label}</p>
    </div>
  );
}

// =============================================================================
// Analytics View
// =============================================================================

export function AnalyticsView() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const { summary, trend, topPages, generations, isLoading, refetch } = useAnalyticsDashboard(days);

  // Only show to admin
  if (user?.email !== ADMIN_EMAIL) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-background-surface/50 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-text-muted" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">Admin Access Required</h2>
        <p className="text-sm text-text-muted max-w-sm">
          Analytics dashboard is only available to administrators.
        </p>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-interactive-400" />
            Analytics
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Your content performance insights
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range */}
          <div className="flex items-center gap-1 p-1 bg-background-surface/50 rounded-lg border border-border-subtle">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  days === d
                    ? 'bg-interactive-600 text-white'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                {d}d
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 rounded-lg bg-background-surface/50 border border-border-subtle hover:border-interactive-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4 text-text-muted', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-background-surface/30 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Visitors"
            value={formatNumber(summary?.totalVisitors || 0)}
            icon={<Users className="w-4 h-4 text-interactive-400" />}
          />
          <StatCard
            label="Page Views"
            value={formatNumber(summary?.totalPageViews || 0)}
            icon={<Eye className="w-4 h-4 text-[#FF0000]" />}
            color="bg-[#FF0000]/20"
          />
          <StatCard
            label="Generations"
            value={formatNumber(summary?.totalGenerations || 0)}
            icon={<TrendingUp className="w-4 h-4 text-success-main" />}
            color="bg-success-main/20"
          />
          <StatCard
            label="Success Rate"
            value={`${(summary?.successRate || 0).toFixed(1)}%`}
            icon={<BarChart3 className="w-4 h-4 text-accent-400" />}
            color="bg-accent-500/20"
          />
        </div>
      )}

      {/* Top Pages */}
      <div className="p-4 bg-background-surface/50 border border-border-subtle rounded-xl">
        <h3 className="text-sm font-medium text-text-primary mb-4">Top Pages</h3>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-background-surface/30 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {topPages?.slice(0, 10).map((page, index) => (
              <div key={page.page} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted w-6">{index + 1}</span>
                  <span className="text-sm text-text-primary truncate max-w-[300px]">{page.page}</span>
                </div>
                <span className="text-sm font-medium text-text-secondary">{formatNumber(page.views)}</span>
              </div>
            ))}
            {(!topPages || topPages.length === 0) && (
              <p className="text-sm text-text-muted text-center py-4">No page data available</p>
            )}
          </div>
        )}
      </div>

      {/* Generation Stats */}
      <div className="p-4 bg-background-surface/50 border border-border-subtle rounded-xl">
        <h3 className="text-sm font-medium text-text-primary mb-4">Generation Stats by Asset Type</h3>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-background-surface/30 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {generations?.byAssetType?.map((stat) => (
              <div key={stat.assetType} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
                <span className="text-sm text-text-primary capitalize">{stat.assetType.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-success-main">{stat.completed} completed</span>
                  <span className="text-sm text-error-main">{stat.failed} failed</span>
                  <span className="text-sm font-medium text-text-secondary">{stat.successRate.toFixed(0)}%</span>
                </div>
              </div>
            ))}
            {(!generations?.byAssetType || generations.byAssetType.length === 0) && (
              <p className="text-sm text-text-muted text-center py-4">No generation data available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
