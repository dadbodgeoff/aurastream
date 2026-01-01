'use client';

/**
 * Historical Data Tab
 * 
 * Shows historical trend data (Pro: 7 days, Studio: 30 days).
 */

import { Lock, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import Link from 'next/link';
import type { TrendHistoryResponse } from '@aurastream/api-client';

interface HistoricalDataTabProps {
  history?: TrendHistoryResponse;
  isLoading: boolean;
  tier: string;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function HistoricalDataTab({ history, isLoading, tier }: HistoricalDataTabProps) {
  const isPro = tier === 'pro' || tier === 'studio';
  const isStudio = tier === 'studio';

  if (!isPro) {
    return (
      <div className="text-center py-16 bg-background-secondary border border-border-primary rounded-2xl">
        <Lock className="w-16 h-16 mx-auto mb-4 text-text-tertiary opacity-50" />
        <h3 className="text-xl font-semibold text-text-primary mb-2">Historical Data</h3>
        <p className="text-text-secondary mb-6 max-w-md mx-auto">
          Access historical trend data to identify patterns and optimize your content strategy.
        </p>
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-interactive-400">7 days</p>
            <p className="text-sm text-text-tertiary">Pro tier</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-interactive-400">30 days</p>
            <p className="text-sm text-text-tertiary">Studio tier</p>
          </div>
        </div>
        <Link
          href="/intel/settings?tab=billing"
          className="inline-flex items-center gap-2 px-6 py-3 bg-interactive-600 hover:bg-interactive-500 text-white font-medium rounded-xl transition-colors"
        >
          Upgrade to Pro
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-white/5 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const days = history?.days || 0;
  const velocityAlerts = history?.velocityAlerts || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Calendar className="w-5 h-5 text-interactive-500" />
            Last {days} Days
          </h2>
          <p className="text-sm text-text-tertiary">
            {isStudio ? 'Full 30-day history' : 'Upgrade to Studio for 30-day history'}
          </p>
        </div>
      </div>

      {/* Velocity Alerts History */}
      <div className="bg-background-secondary border border-border-primary rounded-xl p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-status-warning" />
          Velocity Alerts ({velocityAlerts.length})
        </h3>
        
        {velocityAlerts.length > 0 ? (
          <div className="space-y-3">
            {velocityAlerts.map((alert, i) => (
              <div 
                key={alert.id || i}
                className={`p-4 rounded-lg border ${
                  alert.severity === 'high' 
                    ? 'bg-status-error/10 border-status-error/30' 
                    : alert.severity === 'medium'
                    ? 'bg-status-warning/10 border-status-warning/30'
                    : 'bg-white/5 border-border-primary'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        alert.severity === 'high' 
                          ? 'bg-status-error/20 text-status-error' 
                          : alert.severity === 'medium'
                          ? 'bg-status-warning/20 text-status-warning'
                          : 'bg-white/10 text-text-tertiary'
                      }`}>
                        {alert.severity?.toUpperCase() || 'INFO'}
                      </span>
                      <span className="text-sm font-medium text-text-primary">
                        {alert.subjectName}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary">{alert.insight}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-interactive-400">
                      +{alert.changePercent?.toFixed(0)}%
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {formatNumber(alert.previousValue || 0)} → {formatNumber(alert.currentValue || 0)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-text-secondary">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No velocity alerts in this period</p>
          </div>
        )}
      </div>

      {/* Placeholder for charts */}
      <div className="bg-background-secondary border border-border-primary rounded-xl p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Trend Charts</h3>
        <div className="text-center py-12 text-text-secondary">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Historical charts coming soon</p>
          <p className="text-sm text-text-tertiary mt-1">
            Visualize viewer trends, category shifts, and more
          </p>
        </div>
      </div>
    </div>
  );
}
