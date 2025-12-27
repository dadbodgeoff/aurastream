'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@aurastream/shared';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

// Admin email check
const ADMIN_EMAIL = 'dadbodgeoff@gmail.com';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// =============================================================================
// Data Fetching
// =============================================================================

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

async function fetchWithAuth(path: string) {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');
  
  const response = await fetch(`${API_BASE}/api/v1/site-analytics${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Access denied - admin only');
    }
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

function useDashboardSummary(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['analytics', 'summary', startDate, endDate],
    queryFn: () => fetchWithAuth(`/dashboard/summary?start_date=${startDate}&end_date=${endDate}`),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

function useFunnelData(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['analytics', 'funnel', startDate, endDate],
    queryFn: () => fetchWithAuth(`/dashboard/funnel?start_date=${startDate}&end_date=${endDate}`),
    staleTime: 60 * 1000,
  });
}

function usePageFlow(startDate: string, endDate: string, limit: number = 20) {
  return useQuery({
    queryKey: ['analytics', 'flow', startDate, endDate, limit],
    queryFn: () => fetchWithAuth(`/dashboard/flow?start_date=${startDate}&end_date=${endDate}&limit=${limit}`),
    staleTime: 60 * 1000,
  });
}

function useRecentSessions(limit: number = 50) {
  return useQuery({
    queryKey: ['analytics', 'sessions', limit],
    queryFn: () => fetchWithAuth(`/dashboard/sessions?limit=${limit}`),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

function useTopPages(startDate: string, endDate: string, limit: number = 20) {
  return useQuery({
    queryKey: ['analytics', 'pages', startDate, endDate, limit],
    queryFn: () => fetchWithAuth(`/dashboard/pages?start_date=${startDate}&end_date=${endDate}&limit=${limit}`),
    staleTime: 60 * 1000,
  });
}

export default function AnalyticsDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || user.email !== ADMIN_EMAIL)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Calculate date range
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(
    Date.now() - (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90) * 24 * 60 * 60 * 1000
  ).toISOString().split('T')[0];

  const { data: summary, isLoading: summaryLoading } = useDashboardSummary(startDate, endDate);
  const { data: funnel, isLoading: funnelLoading } = useFunnelData(startDate, endDate);
  const { data: flow, isLoading: flowLoading } = usePageFlow(startDate, endDate);
  const { data: sessions, isLoading: sessionsLoading } = useRecentSessions(20);
  const { data: topPages, isLoading: pagesLoading } = useTopPages(startDate, endDate);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-base flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-interactive-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background-base">
      {/* Header */}
      <header className="border-b border-border-subtle bg-background-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Analytics Dashboard</h1>
              <p className="text-sm text-text-secondary mt-1">Site-wide visitor and conversion tracking</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d')}
                className="px-3 py-2 bg-background-elevated border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-interactive-600"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Key Metrics */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Key Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Unique Visitors"
              value={summary?.totals?.unique_visitors ?? 0}
              loading={summaryLoading}
            />
            <MetricCard
              label="Total Sessions"
              value={summary?.totals?.total_sessions ?? 0}
              loading={summaryLoading}
            />
            <MetricCard
              label="Bounce Rate"
              value={`${summary?.bounce_rate ?? 0}%`}
              loading={summaryLoading}
              highlight={summary?.bounce_rate > 60 ? 'negative' : 'positive'}
            />
            <MetricCard
              label="Return Rate"
              value={`${summary?.return_rate ?? 0}%`}
              loading={summaryLoading}
              highlight={summary?.return_rate > 20 ? 'positive' : 'neutral'}
            />
          </div>
        </section>

        {/* Secondary Metrics */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Page Views"
              value={summary?.totals?.total_page_views ?? 0}
              loading={summaryLoading}
            />
            <MetricCard
              label="Signups"
              value={summary?.totals?.total_signups ?? 0}
              loading={summaryLoading}
              highlight="positive"
            />
            <MetricCard
              label="New Visitors"
              value={summary?.totals?.new_visitors ?? 0}
              loading={summaryLoading}
            />
            <MetricCard
              label="Returning Visitors"
              value={summary?.totals?.returning_visitors ?? 0}
              loading={summaryLoading}
            />
          </div>
        </section>

        {/* Conversion Funnel */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Conversion Funnel</h2>
          <FunnelChart data={funnel?.funnel ?? []} loading={funnelLoading} />
        </section>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Top Pages */}
          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-4">Top Pages</h2>
            <TopPagesTable data={topPages?.pages ?? []} loading={pagesLoading} />
          </section>

          {/* Page Flow */}
          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-4">User Flow</h2>
            <PageFlowList data={flow?.flows ?? []} loading={flowLoading} />
          </section>
        </div>

        {/* Recent Sessions */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Sessions</h2>
          <SessionsTable data={sessions?.sessions ?? []} loading={sessionsLoading} />
        </section>
      </main>
    </div>
  );
}

// =============================================================================
// Components
// =============================================================================

function MetricCard({ 
  label, 
  value, 
  loading, 
  highlight 
}: { 
  label: string; 
  value: string | number; 
  loading: boolean;
  highlight?: 'positive' | 'negative' | 'neutral';
}) {
  return (
    <div className="bg-background-surface border border-border-subtle rounded-xl p-4">
      <p className="text-sm text-text-secondary mb-1">{label}</p>
      {loading ? (
        <div className="h-8 w-20 bg-background-elevated animate-pulse rounded" />
      ) : (
        <p className={`text-2xl font-bold ${
          highlight === 'positive' ? 'text-success-main' :
          highlight === 'negative' ? 'text-error-main' :
          'text-text-primary'
        }`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      )}
    </div>
  );
}

function FunnelChart({ data, loading }: { data: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="bg-background-surface border border-border-subtle rounded-xl p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-background-elevated animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-background-surface border border-border-subtle rounded-xl p-6 text-center text-text-secondary">
        No funnel data yet
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.total_count || 0), 1);

  return (
    <div className="bg-background-surface border border-border-subtle rounded-xl p-6 space-y-3">
      {data.map((step, index) => (
        <div key={step.step} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-primary font-medium capitalize">
              {step.step.replace(/_/g, ' ')}
            </span>
            <span className="text-text-secondary">
              {step.total_count?.toLocaleString() ?? 0} ({step.conversion_rate ?? 0}%)
            </span>
          </div>
          <div className="h-8 bg-background-elevated rounded-lg overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-interactive-600 to-interactive-500 rounded-lg transition-all duration-500"
              style={{ width: `${(step.total_count / maxCount) * 100}%` }}
            />
          </div>
          {index < data.length - 1 && (
            <div className="flex justify-center py-1">
              <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TopPagesTable({ data, loading }: { data: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="bg-background-surface border border-border-subtle rounded-xl overflow-hidden">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-background-elevated animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-background-surface border border-border-subtle rounded-xl p-6 text-center text-text-secondary">
        No page data yet
      </div>
    );
  }

  return (
    <div className="bg-background-surface border border-border-subtle rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-background-elevated/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Page</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Views</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Visitors</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {data.slice(0, 10).map((page, i) => (
            <tr key={i} className="hover:bg-background-elevated/30">
              <td className="px-4 py-3 text-sm text-text-primary font-mono truncate max-w-[200px]">
                {page.page_path}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary text-right">
                {page.view_count?.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary text-right">
                {page.unique_visitors?.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PageFlowList({ data, loading }: { data: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="bg-background-surface border border-border-subtle rounded-xl p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-background-elevated animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-background-surface border border-border-subtle rounded-xl p-6 text-center text-text-secondary">
        No flow data yet
      </div>
    );
  }

  return (
    <div className="bg-background-surface border border-border-subtle rounded-xl p-4 space-y-2 max-h-[400px] overflow-y-auto">
      {data.slice(0, 15).map((flow, i) => (
        <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-background-elevated/50">
          <span className="text-text-primary font-mono truncate flex-1">{flow.from_page}</span>
          <svg className="w-4 h-4 text-interactive-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span className="text-text-primary font-mono truncate flex-1">{flow.to_page}</span>
          <span className="text-text-secondary text-xs bg-background-elevated px-2 py-1 rounded flex-shrink-0">
            {flow.transition_count}
          </span>
        </div>
      ))}
    </div>
  );
}

function SessionsTable({ data, loading }: { data: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="bg-background-surface border border-border-subtle rounded-xl overflow-hidden">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-background-elevated animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-background-surface border border-border-subtle rounded-xl p-6 text-center text-text-secondary">
        No sessions yet
      </div>
    );
  }

  return (
    <div className="bg-background-surface border border-border-subtle rounded-xl overflow-x-auto">
      <table className="w-full">
        <thead className="bg-background-elevated/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Session</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Entry</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Pages</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Duration</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Device</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {data.map((session, i) => (
            <tr key={i} className="hover:bg-background-elevated/30">
              <td className="px-4 py-3 text-sm text-text-secondary font-mono">
                {session.session_id?.slice(0, 12)}...
              </td>
              <td className="px-4 py-3 text-sm text-text-primary truncate max-w-[150px]">
                {session.entry_page}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary text-center">
                {session.pages_viewed}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary text-center">
                {session.duration_ms ? `${Math.round(session.duration_ms / 1000)}s` : '-'}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary text-center capitalize">
                {session.device_type || '-'}
              </td>
              <td className="px-4 py-3 text-center">
                {session.converted ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-main/20 text-success-light">
                    Converted
                  </span>
                ) : session.is_bounce ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-error-main/20 text-error-light">
                    Bounced
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-background-elevated text-text-secondary">
                    Active
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
