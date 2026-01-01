'use client';

/**
 * Analytics Dashboard Page
 * 
 * Clean, focused analytics display showing what matters:
 * - Visitors & page views
 * - Signups & conversions
 * - Generation success/failure rates
 * - Trends over time
 */

import { useState } from 'react';
import {
  useAnalyticsDashboard,
  type DashboardSummary,
  type TrendDataPoint,
  type TopPage,
  type RecentSignup,
  type GenerationStats,
} from '@aurastream/api-client';

// =============================================================================
// Stat Card Component
// =============================================================================

function StatCard({
  label,
  value,
  subValue,
  trend,
  icon,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <span className="text-text-tertiary text-sm font-medium">{label}</span>
        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-text-primary">{value}</span>
        {subValue && (
          <span className={`text-sm mb-1 ${
            trend === 'up' ? 'text-green-500' : 
            trend === 'down' ? 'text-red-500' : 
            'text-text-tertiary'
          }`}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Mini Chart Component (Simple bar chart)
// =============================================================================

function MiniChart({ data, dataKey }: { data: TrendDataPoint[]; dataKey: keyof TrendDataPoint }) {
  if (!data || data.length === 0) return null;
  
  const values = data.map(d => d[dataKey] as number);
  const max = Math.max(...values, 1);
  
  return (
    <div className="flex items-end gap-1 h-16">
      {data.slice(-14).map((point, i) => (
        <div
          key={i}
          className="flex-1 bg-purple-500 dark:bg-purple-400 rounded-t opacity-70 hover:opacity-100 transition-opacity"
          style={{ height: `${(point[dataKey] as number / max) * 100}%`, minHeight: '2px' }}
          title={`${point.date}: ${point[dataKey]}`}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Top Pages Table
// =============================================================================

function TopPagesTable({ pages }: { pages?: TopPage[] }) {
  if (!pages || pages.length === 0) {
    return <p className="text-text-tertiary text-sm">No page data yet</p>;
  }
  
  const maxViews = Math.max(...pages.map(p => p.views), 1);
  
  return (
    <div className="space-y-3">
      {pages.map((page, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-text-muted text-sm w-6">{i + 1}.</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-text-primary truncate">{page.page}</div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mt-1">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${(page.views / maxViews) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-medium text-text-secondary">{page.views}</span>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Recent Signups List
// =============================================================================

function RecentSignupsList({ signups }: { signups?: RecentSignup[] }) {
  if (!signups || signups.length === 0) {
    return <p className="text-text-tertiary text-sm">No signups yet</p>;
  }
  
  return (
    <div className="space-y-3">
      {signups.map((signup, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-interactive-500 flex items-center justify-center text-white text-sm font-medium">
            {signup.displayName?.charAt(0) || signup.email?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-primary truncate">
              {signup.displayName || 'Unknown'}
            </div>
            <div className="text-xs text-text-tertiary truncate">{signup.email}</div>
          </div>
          <span className="text-xs text-text-muted">
            {new Date(signup.createdAt).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Generation Stats Table
// =============================================================================

function GenerationStatsTable({ stats }: { stats?: GenerationStats }) {
  if (!stats || stats.byAssetType.length === 0) {
    return <p className="text-text-tertiary text-sm">No generation data yet</p>;
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-tertiary border-b border-gray-100 dark:border-gray-700">
            <th className="pb-2 font-medium">Asset Type</th>
            <th className="pb-2 font-medium text-right">Completed</th>
            <th className="pb-2 font-medium text-right">Failed</th>
            <th className="pb-2 font-medium text-right">Success Rate</th>
          </tr>
        </thead>
        <tbody>
          {stats.byAssetType.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
              <td className="py-2 text-text-primary">{row.assetType}</td>
              <td className="py-2 text-right text-green-600">{row.completed}</td>
              <td className="py-2 text-right text-red-500">{row.failed}</td>
              <td className="py-2 text-right">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  row.successRate >= 90 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  row.successRate >= 70 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {row.successRate}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-medium">
            <td className="pt-3 text-text-primary">Total</td>
            <td className="pt-3 text-right text-green-600">{stats.totalCompleted}</td>
            <td className="pt-3 text-right text-red-500">{stats.totalFailed}</td>
            <td className="pt-3 text-right">
              {stats.totalCompleted + stats.totalFailed > 0
                ? `${Math.round((stats.totalCompleted / (stats.totalCompleted + stats.totalFailed)) * 100)}%`
                : '-'}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// =============================================================================
// Icons
// =============================================================================

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const UserPlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// =============================================================================
// Main Page Component
// =============================================================================

export default function AnalyticsDashboardPage() {
  const [days, setDays] = useState(30);
  const { summary, trend, topPages, recentSignups, generations, isLoading, refetch } = useAnalyticsDashboard(days);
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
            <p className="text-text-tertiary mt-1">
              Track your site performance and user engagement
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
        
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        )}
        
        {/* Stats Grid */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard
              label="Unique Visitors"
              value={summary.totalVisitors.toLocaleString()}
              icon={<UsersIcon />}
            />
            <StatCard
              label="Page Views"
              value={summary.totalPageViews.toLocaleString()}
              icon={<EyeIcon />}
            />
            <StatCard
              label="Signups"
              value={summary.totalSignups.toLocaleString()}
              subValue={`${summary.conversionRate}% conv.`}
              trend={summary.conversionRate > 2 ? 'up' : 'neutral'}
              icon={<UserPlusIcon />}
            />
            <StatCard
              label="Generations"
              value={summary.totalGenerations.toLocaleString()}
              subValue={`${summary.successRate}% success`}
              trend={summary.successRate > 90 ? 'up' : summary.successRate > 70 ? 'neutral' : 'down'}
              icon={<SparklesIcon />}
            />
            <StatCard
              label="Avg. Session"
              value={`${summary.avgSessionMinutes.toFixed(1)}m`}
              icon={<ClockIcon />}
            />
            <StatCard
              label="Logins"
              value={summary.totalLogins.toLocaleString()}
              icon={<ChartIcon />}
            />
          </div>
        )}
        
        {/* Charts Row */}
        {trend && trend.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-text-tertiary mb-4">Visitors Trend</h3>
              <MiniChart data={trend} dataKey="visitors" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-text-tertiary mb-4">Signups Trend</h3>
              <MiniChart data={trend} dataKey="signups" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-text-tertiary mb-4">Generations Trend</h3>
              <MiniChart data={trend} dataKey="generations" />
            </div>
          </div>
        )}
        
        {/* Details Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Pages */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Top Pages</h3>
            <TopPagesTable pages={topPages} />
          </div>
          
          {/* Recent Signups */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Signups</h3>
            <RecentSignupsList signups={recentSignups} />
          </div>
          
          {/* Generation Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Generation Stats</h3>
            <GenerationStatsTable stats={generations} />
          </div>
        </div>
      </div>
    </div>
  );
}
