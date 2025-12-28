'use client';

/**
 * Enterprise Analytics Dashboard
 * Comprehensive analytics for AuraStream
 * Admin access: dadbodgeoff@gmail.com only
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@aurastream/shared';
import { apiClient } from '@aurastream/api-client';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

// =============================================================================
// Constants
// =============================================================================

const ADMIN_EMAIL = 'dadbodgeoff@gmail.com';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// =============================================================================
// API Helpers
// =============================================================================

async function fetchWithAuth(path: string) {
  const token = apiClient.getAccessToken();
  if (!token) throw new Error('Not authenticated');
  
  const response = await fetch(`${API_BASE}/api/v1/enterprise-analytics${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    if (response.status === 403) throw new Error('Access denied - admin only');
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

// =============================================================================
// Hooks
// =============================================================================

function useDashboardSummary(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['enterprise-analytics', 'summary', startDate, endDate],
    queryFn: () => fetchWithAuth(`/dashboard/summary?start_date=${startDate}&end_date=${endDate}`),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

function useRealtimeActive() {
  return useQuery({
    queryKey: ['enterprise-analytics', 'realtime'],
    queryFn: () => fetchWithAuth('/dashboard/realtime'),
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000,
  });
}

function useDailyVisitors(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['enterprise-analytics', 'daily-visitors', startDate, endDate],
    queryFn: () => fetchWithAuth(`/dashboard/daily-visitors?start_date=${startDate}&end_date=${endDate}`),
    staleTime: 60 * 1000,
  });
}

function useFunnelData(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['enterprise-analytics', 'funnel', startDate, endDate],
    queryFn: () => fetchWithAuth(`/dashboard/funnel?start_date=${startDate}&end_date=${endDate}`),
    staleTime: 60 * 1000,
  });
}

function useTopJourneys(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['enterprise-analytics', 'journeys', startDate, endDate],
    queryFn: () => fetchWithAuth(`/dashboard/journeys?start_date=${startDate}&end_date=${endDate}&limit=10`),
    staleTime: 60 * 1000,
  });
}

function useAbandonmentData(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['enterprise-analytics', 'abandonment', startDate, endDate],
    queryFn: () => fetchWithAuth(`/dashboard/abandonment?start_date=${startDate}&end_date=${endDate}`),
    staleTime: 60 * 1000,
  });
}

function useGeoBreakdown(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['enterprise-analytics', 'geo', startDate, endDate],
    queryFn: () => fetchWithAuth(`/dashboard/geo?start_date=${startDate}&end_date=${endDate}`),
    staleTime: 60 * 1000,
  });
}

function useDeviceBreakdown(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['enterprise-analytics', 'devices', startDate, endDate],
    queryFn: () => fetchWithAuth(`/dashboard/devices?start_date=${startDate}&end_date=${endDate}`),
    staleTime: 60 * 1000,
  });
}

function usePageFlow(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['enterprise-analytics', 'flow', startDate, endDate],
    queryFn: () => fetchWithAuth(`/dashboard/flow?start_date=${startDate}&end_date=${endDate}&limit=20`),
    staleTime: 60 * 1000,
  });
}

function useTopPages(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['enterprise-analytics', 'pages', startDate, endDate],
    queryFn: () => fetchWithAuth(`/dashboard/pages?start_date=${startDate}&end_date=${endDate}`),
    staleTime: 60 * 1000,
  });
}

function useRecentSessions() {
  return useQuery({
    queryKey: ['enterprise-analytics', 'sessions'],
    queryFn: () => fetchWithAuth('/dashboard/sessions?limit=30'),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

// =============================================================================
// Main Component
// =============================================================================

export default function EnterpriseAnalyticsDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'behavior' | 'acquisition' | 'sessions'>('overview');

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!user || user.email !== ADMIN_EMAIL)) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const end = new Date().toISOString().split('T')[0];
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { startDate: start, endDate: end };
  }, [dateRange]);

  // Fetch all data
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary(startDate, endDate);
  const { data: realtime } = useRealtimeActive();
  const { data: dailyVisitors } = useDailyVisitors(startDate, endDate);
  const { data: funnel } = useFunnelData(startDate, endDate);
  const { data: journeys } = useTopJourneys(startDate, endDate);
  const { data: abandonment } = useAbandonmentData(startDate, endDate);
  const { data: geo } = useGeoBreakdown(startDate, endDate);
  const { data: devices } = useDeviceBreakdown(startDate, endDate);
  const { data: flow } = usePageFlow(startDate, endDate);
  const { data: topPages } = useTopPages(startDate, endDate);
  const { data: sessions } = useRecentSessions();

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
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                  <span className="text-interactive-500">📊</span> Enterprise Analytics
                </h1>
                <p className="text-sm text-text-secondary mt-1">Real-time insights for AuraStream</p>
              </div>
              
              {/* Real-time indicator */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-success-main/10 border border-success-main/30 rounded-full">
                <span className="w-2 h-2 bg-success-main rounded-full animate-pulse" />
                <span className="text-sm text-success-light font-medium">
                  {realtime?.total_active || 0} active now
                </span>
              </div>
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
          
          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-px">
            {(['overview', 'behavior', 'acquisition', 'sessions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab
                    ? 'bg-background-surface text-text-primary border-t border-x border-border-subtle'
                    : 'text-text-secondary hover:text-text-primary hover:bg-background-elevated/50'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewTab
            summary={summary}
            summaryLoading={summaryLoading}
            realtime={realtime}
            dailyVisitors={dailyVisitors?.daily || []}
            funnel={funnel?.funnel || []}
            topPages={topPages?.pages || []}
          />
        )}
        
        {activeTab === 'behavior' && (
          <BehaviorTab
            journeys={journeys?.journeys || []}
            abandonment={abandonment?.abandonment || []}
            flow={flow?.flows || []}
          />
        )}
        
        {activeTab === 'acquisition' && (
          <AcquisitionTab
            geo={geo?.geo || []}
            devices={devices?.devices || []}
            summary={summary}
          />
        )}
        
        {activeTab === 'sessions' && (
          <SessionsTab sessions={sessions?.sessions || []} />
        )}
      </main>
    </div>
  );
}


// =============================================================================
// Overview Tab
// =============================================================================

function OverviewTab({
  summary,
  summaryLoading,
  realtime,
  dailyVisitors,
  funnel,
  topPages,
}: {
  summary: any;
  summaryLoading: boolean;
  realtime: any;
  dailyVisitors: any[];
  funnel: any[];
  topPages: any[];
}) {
  return (
    <div className="space-y-8">
      {/* Real-time Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <RealtimeCard
          label="Active Now"
          value={realtime?.total_active || 0}
          icon="👥"
          pulse
        />
        <RealtimeCard
          label="Authenticated"
          value={realtime?.authenticated_count || 0}
          icon="🔐"
        />
        <RealtimeCard
          label="Anonymous"
          value={realtime?.anonymous_count || 0}
          icon="👤"
        />
        <RealtimeCard
          label="Top Page"
          value={realtime?.pages?.[0]?.page || '-'}
          icon="📄"
          isText
        />
      </section>

      {/* Key Metrics */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Key Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <MetricCard
            label="Unique Visitors"
            value={summary?.totals?.unique_visitors ?? 0}
            loading={summaryLoading}
            icon="👁️"
          />
          <MetricCard
            label="Total Sessions"
            value={summary?.totals?.total_sessions ?? 0}
            loading={summaryLoading}
            icon="🔄"
          />
          <MetricCard
            label="Page Views"
            value={summary?.totals?.total_page_views ?? 0}
            loading={summaryLoading}
            icon="📊"
          />
          <MetricCard
            label="Signups"
            value={summary?.totals?.total_signups ?? 0}
            loading={summaryLoading}
            icon="✨"
            highlight="positive"
          />
          <MetricCard
            label="Bounce Rate"
            value={`${summary?.bounce_rate ?? 0}%`}
            loading={summaryLoading}
            icon="↩️"
            highlight={summary?.bounce_rate > 60 ? 'negative' : 'neutral'}
          />
          <MetricCard
            label="Return Rate"
            value={`${summary?.return_rate ?? 0}%`}
            loading={summaryLoading}
            icon="🔁"
            highlight={summary?.return_rate > 20 ? 'positive' : 'neutral'}
          />
        </div>
      </section>

      {/* Visitors Chart */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Visitors Over Time</h2>
        <VisitorsChart data={dailyVisitors} />
      </section>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Conversion Funnel */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Conversion Funnel</h2>
          <FunnelChart data={funnel} />
        </section>

        {/* Top Pages */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Top Pages</h2>
          <TopPagesTable data={topPages} />
        </section>
      </div>
    </div>
  );
}

// =============================================================================
// Behavior Tab
// =============================================================================

function BehaviorTab({
  journeys,
  abandonment,
  flow,
}: {
  journeys: any[];
  abandonment: any[];
  flow: any[];
}) {
  return (
    <div className="space-y-8">
      {/* User Journeys */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Top User Journeys</h2>
        <JourneysTable data={journeys} />
      </section>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Abandonment Analysis */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Abandonment Analysis</h2>
          <AbandonmentTable data={abandonment} />
        </section>

        {/* Page Flow */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Page Flow</h2>
          <PageFlowList data={flow} />
        </section>
      </div>
    </div>
  );
}

// =============================================================================
// Acquisition Tab
// =============================================================================

function AcquisitionTab({
  geo,
  devices,
  summary,
}: {
  geo: any[];
  devices: any[];
  summary: any;
}) {
  return (
    <div className="space-y-8">
      {/* Device Breakdown Summary */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Device Distribution</h2>
        <div className="grid grid-cols-3 gap-4">
          <DeviceCard
            type="Desktop"
            count={summary?.totals?.desktop_sessions || 0}
            total={summary?.totals?.total_sessions || 1}
            icon="🖥️"
          />
          <DeviceCard
            type="Mobile"
            count={summary?.totals?.mobile_sessions || 0}
            total={summary?.totals?.total_sessions || 1}
            icon="📱"
          />
          <DeviceCard
            type="Tablet"
            count={summary?.totals?.tablet_sessions || 0}
            total={summary?.totals?.total_sessions || 1}
            icon="📲"
          />
        </div>
      </section>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Geographic Breakdown */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Geographic Breakdown</h2>
          <GeoTable data={geo} />
        </section>

        {/* Browser/Device Details */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Browser & Device Details</h2>
          <DevicesTable data={devices} />
        </section>
      </div>
    </div>
  );
}

// =============================================================================
// Sessions Tab
// =============================================================================

function SessionsTab({ sessions }: { sessions: any[] }) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Sessions</h2>
        <SessionsTable data={sessions} />
      </section>
    </div>
  );
}

// =============================================================================
// Components
// =============================================================================

function RealtimeCard({
  label,
  value,
  icon,
  pulse,
  isText,
}: {
  label: string;
  value: string | number;
  icon: string;
  pulse?: boolean;
  isText?: boolean;
}) {
  return (
    <div className="bg-gradient-to-br from-interactive-600/20 to-interactive-500/10 border border-interactive-500/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm text-text-secondary">{label}</span>
        {pulse && <span className="w-2 h-2 bg-success-main rounded-full animate-pulse" />}
      </div>
      <p className={`font-bold text-text-primary ${isText ? 'text-sm truncate' : 'text-2xl'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  loading,
  icon,
  highlight,
}: {
  label: string;
  value: string | number;
  loading: boolean;
  icon: string;
  highlight?: 'positive' | 'negative' | 'neutral';
}) {
  return (
    <div className="bg-background-surface border border-border-subtle rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
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

function DeviceCard({
  type,
  count,
  total,
  icon,
}: {
  type: string;
  count: number;
  total: number;
  icon: string;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  
  return (
    <div className="bg-background-surface border border-border-subtle rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-text-secondary">{percentage}%</span>
      </div>
      <p className="text-lg font-bold text-text-primary">{count.toLocaleString()}</p>
      <p className="text-sm text-text-secondary">{type}</p>
      <div className="mt-2 h-1.5 bg-background-elevated rounded-full overflow-hidden">
        <div
          className="h-full bg-interactive-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function VisitorsChart({ data }: { data: any[] }) {
  if (!data.length) {
    return (
      <div className="bg-background-surface border border-border-subtle rounded-xl p-8 text-center text-text-secondary">
        No visitor data yet. Data will appear as visitors are tracked.
      </div>
    );
  }

  const maxVisitors = Math.max(...data.map(d => d.unique_visitors || 0), 1);
  
  return (
    <div className="bg-background-surface border border-border-subtle rounded-xl p-6">
      <div className="flex items-end gap-1 h-48">
        {data.map((day, i) => {
          const height = (day.unique_visitors / maxVisitors) * 100;
          return (
            <div
              key={i}
              className="flex-1 group relative"
            >
              <div
                className="bg-interactive-500/80 hover:bg-interactive-500 rounded-t transition-all duration-200 cursor-pointer"
                style={{ height: `${Math.max(height, 2)}%` }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-background-elevated border border-border-default rounded text-xs text-text-primary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                <div className="font-medium">{day.unique_visitors} visitors</div>
                <div className="text-text-secondary">{day.date}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-xs text-text-muted">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function FunnelChart({ data }: { data: any[] }) {
  if (!data.length) {
    return (
      <div className="bg-background-surface border border-border-subtle rounded-xl p-6 text-center text-text-secondary">
        No funnel data yet. Track funnel events to see conversion rates.
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
              {step.step?.replace(/_/g, ' ')}
            </span>
            <span className="text-text-secondary">
              {step.total_count?.toLocaleString() ?? 0}
              {step.conversion_rate && ` (${step.conversion_rate}%)`}
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


function TopPagesTable({ data }: { data: any[] }) {
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

function JourneysTable({ data }: { data: any[] }) {
  if (!data.length) {
    return (
      <div className="bg-background-surface border border-border-subtle rounded-xl p-6 text-center text-text-secondary">
        No journey data yet. Journeys are recorded when sessions end.
      </div>
    );
  }

  return (
    <div className="bg-background-surface border border-border-subtle rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-background-elevated/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Journey Path</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Count</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Avg Duration</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Conv. Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {data.map((journey, i) => (
            <tr key={i} className="hover:bg-background-elevated/30">
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 text-sm overflow-x-auto max-w-[400px]">
                  {journey.page_sequence?.slice(0, 5).map((page: string, j: number) => (
                    <span key={j} className="flex items-center gap-1">
                      <span className="px-2 py-0.5 bg-background-elevated rounded text-text-primary font-mono text-xs truncate max-w-[100px]">
                        {page}
                      </span>
                      {j < Math.min(journey.page_sequence.length - 1, 4) && (
                        <span className="text-text-muted">→</span>
                      )}
                    </span>
                  ))}
                  {journey.page_sequence?.length > 5 && (
                    <span className="text-text-muted text-xs">+{journey.page_sequence.length - 5}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary text-right">
                {journey.journey_count?.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary text-right">
                {journey.avg_duration_ms ? `${Math.round(journey.avg_duration_ms / 1000)}s` : '-'}
              </td>
              <td className="px-4 py-3 text-right">
                <span className={`text-sm font-medium ${
                  journey.conversion_rate > 10 ? 'text-success-main' :
                  journey.conversion_rate > 0 ? 'text-warning-main' :
                  'text-text-secondary'
                }`}>
                  {journey.conversion_rate || 0}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AbandonmentTable({ data }: { data: any[] }) {
  if (!data.length) {
    return (
      <div className="bg-background-surface border border-border-subtle rounded-xl p-6 text-center text-text-secondary">
        No abandonment data yet. Track form/flow abandonments to see insights.
      </div>
    );
  }

  return (
    <div className="bg-background-surface border border-border-subtle rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
      <table className="w-full">
        <thead className="bg-background-elevated/50 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Page</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Count</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Avg Step</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {data.map((item, i) => (
            <tr key={i} className="hover:bg-background-elevated/30">
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  item.abandonment_type === 'signup' ? 'bg-error-main/20 text-error-light' :
                  item.abandonment_type === 'form' ? 'bg-warning-main/20 text-warning-light' :
                  'bg-background-elevated text-text-secondary'
                }`}>
                  {item.abandonment_type}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-text-primary font-mono truncate max-w-[150px]">
                {item.page_path}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary text-right">
                {item.abandonment_count?.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary text-right">
                {item.avg_step_reached?.toFixed(1) || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PageFlowList({ data }: { data: any[] }) {
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

function GeoTable({ data }: { data: any[] }) {
  if (!data.length) {
    return (
      <div className="bg-background-surface border border-border-subtle rounded-xl p-6 text-center text-text-secondary">
        No geographic data yet. Country data is collected from visitors.
      </div>
    );
  }

  // Country code to flag emoji
  const getFlag = (code: string) => {
    if (!code || code === 'XX') return '🌍';
    const codePoints = code
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  return (
    <div className="bg-background-surface border border-border-subtle rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
      <table className="w-full">
        <thead className="bg-background-elevated/50 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Country</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Visitors</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Sessions</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Conv.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {data.map((item, i) => (
            <tr key={i} className="hover:bg-background-elevated/30">
              <td className="px-4 py-3 text-sm text-text-primary">
                <span className="mr-2">{getFlag(item.country)}</span>
                {item.country || 'Unknown'}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary text-right">
                {item.visitor_count?.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary text-right">
                {item.session_count?.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                <span className={item.conversion_rate > 0 ? 'text-success-main' : 'text-text-secondary'}>
                  {item.conversion_rate || 0}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DevicesTable({ data }: { data: any[] }) {
  if (!data.length) {
    return (
      <div className="bg-background-surface border border-border-subtle rounded-xl p-6 text-center text-text-secondary">
        No device data yet
      </div>
    );
  }

  return (
    <div className="bg-background-surface border border-border-subtle rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
      <table className="w-full">
        <thead className="bg-background-elevated/50 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Device</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Browser</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Sessions</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Bounce</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {data.map((item, i) => (
            <tr key={i} className="hover:bg-background-elevated/30">
              <td className="px-4 py-3 text-sm text-text-primary capitalize">
                {item.device_type || 'unknown'}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">
                {item.browser || 'unknown'}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary text-right">
                {item.session_count?.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                <span className={item.bounce_rate > 60 ? 'text-error-main' : 'text-text-secondary'}>
                  {item.bounce_rate || 0}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SessionsTable({ data }: { data: any[] }) {
  if (!data.length) {
    return (
      <div className="bg-background-surface border border-border-subtle rounded-xl p-6 text-center text-text-secondary">
        No sessions yet
      </div>
    );
  }

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="bg-background-surface border border-border-subtle rounded-xl overflow-x-auto">
      <table className="w-full">
        <thead className="bg-background-elevated/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Session</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Started</th>
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
              <td className="px-4 py-3 text-sm text-text-secondary">
                {formatTime(session.started_at)}
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
                    ✓ Converted
                  </span>
                ) : session.is_bounce ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-error-main/20 text-error-light">
                    ↩ Bounced
                  </span>
                ) : session.ended_at ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-background-elevated text-text-secondary">
                    Ended
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-interactive-500/20 text-interactive-400">
                    <span className="w-1.5 h-1.5 bg-interactive-500 rounded-full mr-1 animate-pulse" />
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
