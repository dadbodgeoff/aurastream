'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, analytics } from '@aurastream/shared';

// Admin email whitelist
const ADMIN_EMAILS = ['dadbodgeoff@gmail.com'];

// API base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types for analytics data
interface EventSummary {
  name: string;
  count: number;
  lastSeen: string;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
}

interface SessionData {
  sessionId: string;
  userId?: string | null;
  eventCount: number;
  startTime: string;
  lastActivity: string;
}

interface AnalyticsSummary {
  totalEvents: number;
  activeSessions: number;
  errorRate: number;
  eventBreakdown: EventSummary[];
  categoryDistribution: CategoryBreakdown[];
  recentSessions: SessionData[];
  timeRange: string;
  generatedAt: string;
}

// Icons
const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const ActivityIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const RefreshIcon = ({ spinning }: { spinning?: boolean }) => (
  <svg className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default function AnalyticsDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Data state
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // UI state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Check admin access
  const isAdmin = useMemo(() => {
    return user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
  }, [user?.email]);

  // Fetch analytics data
  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/v1/analytics/summary?time_range=${timeRange}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }
      
      const summary: AnalyticsSummary = await response.json();
      setData(summary);
      setLastUpdated(new Date());
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
      setIsLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [timeRange]);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && isAuthenticated && !isAdmin) {
      router.push('/dashboard');
    }
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  // Initial data fetch
  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!isAdmin || !autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchData(false);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [isAdmin, autoRefresh, fetchData]);

  // Refetch when time range changes
  useEffect(() => {
    if (isAdmin && !isLoading) {
      fetchData(true);
    }
  }, [timeRange]);

  const handleRefresh = () => {
    fetchData(true);
  };

  // Get tracker state for live queue info
  const trackerState = analytics.getState();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-base flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-interactive-600" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background-base flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h1>
          <p className="text-text-secondary mb-6">You don't have permission to view this page.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-interactive-600 text-white rounded-lg hover:bg-interactive-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-base">
      {/* Header */}
      <header className="bg-background-surface border-b border-border-default sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-background-elevated rounded-lg transition-colors"
              >
                <BackIcon />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                  <ChartIcon />
                  Analytics Dashboard
                </h1>
                <p className="text-sm text-text-secondary">
                  Real-time analytics for Aurastream
                  {lastUpdated && (
                    <span className="ml-2 text-text-tertiary">
                      • Updated {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Auto-refresh toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  autoRefresh 
                    ? 'bg-success-dark/20 text-success-light' 
                    : 'bg-background-elevated text-text-secondary'
                }`}
              >
                {autoRefresh ? <CheckIcon /> : null}
                Auto-refresh
              </button>
              
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
                className="px-3 py-2 bg-background-elevated border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-interactive-600"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-interactive-600 text-white rounded-lg hover:bg-interactive-700 disabled:opacity-50 transition-colors"
              >
                <RefreshIcon spinning={isRefreshing} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-error-dark/10 border border-error-main/20 rounded-xl flex items-center gap-3">
            <AlertIcon />
            <div>
              <p className="text-sm font-medium text-error-light">Failed to load analytics</p>
              <p className="text-xs text-text-secondary">{error}</p>
            </div>
            <button
              onClick={handleRefresh}
              className="ml-auto px-3 py-1 text-sm bg-error-dark/20 text-error-light rounded-lg hover:bg-error-dark/30 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !data ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-interactive-600 mx-auto mb-4" />
              <p className="text-text-secondary">Loading analytics data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Events"
                value={data?.totalEvents.toLocaleString() || '0'}
                icon={<ActivityIcon />}
              />
              <StatCard
                title="Active Sessions"
                value={data?.activeSessions.toString() || '0'}
                icon={<UsersIcon />}
              />
              <StatCard
                title="Queue Size"
                value={trackerState.queue.length.toString()}
                subtitle="pending events"
                icon={<ChartIcon />}
              />
              <StatCard
                title="Error Rate"
                value={`${data?.errorRate || 0}%`}
                icon={<AlertIcon />}
                highlight={data?.errorRate !== undefined && data.errorRate > 1}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Event Breakdown */}
              <div className="bg-background-surface border border-border-default rounded-xl p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Event Breakdown</h2>
                {data?.eventBreakdown && data.eventBreakdown.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {data.eventBreakdown.map((event) => (
                      <div key={event.name} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
                        <div>
                          <p className="text-sm font-medium text-text-primary font-mono">{event.name}</p>
                          <p className="text-xs text-text-tertiary">{event.lastSeen}</p>
                        </div>
                        <span className="text-sm font-semibold text-text-primary">{event.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No events recorded yet" />
                )}
              </div>

              {/* Category Distribution */}
              <div className="bg-background-surface border border-border-default rounded-xl p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Category Distribution</h2>
                {data?.categoryDistribution && data.categoryDistribution.length > 0 ? (
                  <div className="space-y-4">
                    {data.categoryDistribution.map((cat) => (
                      <div key={cat.category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-text-primary">{cat.category}</span>
                          <span className="text-sm text-text-secondary">{cat.percentage}%</span>
                        </div>
                        <div className="h-2 bg-background-elevated rounded-full overflow-hidden">
                          <div
                            className="h-full bg-interactive-600 rounded-full transition-all duration-500"
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No category data yet" />
                )}
              </div>

              {/* Active Sessions */}
              <div className="bg-background-surface border border-border-default rounded-xl p-6 lg:col-span-2">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Sessions</h2>
                {data?.recentSessions && data.recentSessions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                          <th className="pb-3 pr-4">Session ID</th>
                          <th className="pb-3 pr-4">User</th>
                          <th className="pb-3 pr-4">Events</th>
                          <th className="pb-3 pr-4">Started</th>
                          <th className="pb-3">Last Activity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {data.recentSessions.map((session) => (
                          <tr key={session.sessionId} className="text-sm">
                            <td className="py-3 pr-4 font-mono text-text-primary">{session.sessionId}</td>
                            <td className="py-3 pr-4 text-text-secondary">{session.userId || 'Anonymous'}</td>
                            <td className="py-3 pr-4 text-text-primary font-medium">{session.eventCount}</td>
                            <td className="py-3 pr-4 text-text-secondary">{session.startTime}</td>
                            <td className="py-3 text-text-tertiary">{session.lastActivity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState message="No active sessions" />
                )}
              </div>

              {/* Tracker State (Debug) */}
              <div className="bg-background-surface border border-border-default rounded-xl p-6 lg:col-span-2">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Local Tracker State</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-background-elevated rounded-lg p-4">
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Session ID</p>
                    <p className="text-sm font-mono text-text-primary truncate">{trackerState.sessionId || 'N/A'}</p>
                  </div>
                  <div className="bg-background-elevated rounded-lg p-4">
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Device ID</p>
                    <p className="text-sm font-mono text-text-primary truncate">{trackerState.deviceId || 'N/A'}</p>
                  </div>
                  <div className="bg-background-elevated rounded-lg p-4">
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Events Sent</p>
                    <p className="text-sm font-mono text-text-primary">{trackerState.totalEventsSent}</p>
                  </div>
                  <div className="bg-background-elevated rounded-lg p-4">
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">Events Dropped</p>
                    <p className="text-sm font-mono text-text-primary">{trackerState.totalEventsDropped}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon,
  highlight,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-background-surface border rounded-xl p-6 ${
      highlight ? 'border-error-main/50' : 'border-border-default'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text-secondary">{title}</span>
        <span className={highlight ? 'text-error-light' : 'text-text-tertiary'}>{icon}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-3xl font-bold ${highlight ? 'text-error-light' : 'text-text-primary'}`}>
          {value}
        </span>
        {subtitle && (
          <span className="text-sm text-text-tertiary mb-1">{subtitle}</span>
        )}
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 bg-background-elevated rounded-full flex items-center justify-center mb-3">
        <ChartIcon />
      </div>
      <p className="text-text-secondary">{message}</p>
      <p className="text-xs text-text-tertiary mt-1">Data will appear as events are tracked</p>
    </div>
  );
}
