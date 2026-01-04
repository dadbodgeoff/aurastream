'use client';

/**
 * Comprehensive Analytics Dashboard
 * Full-featured analytics with pagination, sorting, filtering
 * Admin access: dadbodgeoff@gmail.com only
 */

import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@aurastream/shared';
import { apiClient } from '@aurastream/api-client';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { 
  ArrowLeft, RefreshCw, Users, Eye, UserPlus, LogIn, Zap, TrendingUp, 
  Clock, Target, ChevronDown, ChevronUp, Search, Filter, Download,
  Calendar, ArrowUpDown, ChevronLeft, ChevronRight, Activity, Globe,
  Smartphone, Monitor, Tablet, ExternalLink, AlertCircle, CheckCircle
} from 'lucide-react';

// =============================================================================
// Constants
// =============================================================================

const ADMIN_EMAIL = 'dadbodgeoff@gmail.com';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type TabId = 'overview' | 'visits' | 'events' | 'sessions' | 'pages';
type SortDirection = 'asc' | 'desc';

// =============================================================================
// Types
// =============================================================================

interface DashboardSummary {
  totalVisitors: number;
  totalPageViews: number;
  totalSignups: number;
  totalLogins: number;
  totalGenerations: number;
  successRate: number;
  avgSessionMinutes: number;
  conversionRate: number;
  period: string;
}

interface TrendDataPoint {
  date: string;
  visitors: number;
  signups: number;
  generations: number;
}

interface TopPage {
  page: string;
  views: number;
}

interface RecentSignup {
  userId: string;
  email: string;
  displayName: string;
  createdAt: string;
  source: string | null;
}

interface GenerationStats {
  byAssetType: Array<{
    assetType: string;
    completed: number;
    failed: number;
    successRate: number;
  }>;
  totalCompleted: number;
  totalFailed: number;
}

interface Visit {
  id: string;
  visitor_id: string;
  user_id: string | null;
  page_path: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_type: string | null;
  browser: string | null;
  session_id: string | null;
  created_at: string;
}

interface UserEvent {
  id: string;
  user_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface Session {
  id: string;
  session_id: string;
  visitor_id: string;
  user_id: string | null;
  started_at: string;
  last_activity_at: string;
  page_count: number;
  converted: boolean;
}

// =============================================================================
// API Helpers
// =============================================================================

async function fetchWithAuth(path: string) {
  const token = apiClient.getAccessToken();
  if (!token) throw new Error('Not authenticated');
  
  const response = await fetch(`${API_BASE}/api/v1/simple-analytics${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

async function fetchSupabaseTable(table: string, params: {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: SortDirection;
  filters?: Record<string, string>;
}) {
  const token = apiClient.getAccessToken();
  if (!token) throw new Error('Not authenticated');
  
  // Build query params
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.pageSize) queryParams.set('page_size', params.pageSize.toString());
  if (params.sortBy) queryParams.set('sort_by', params.sortBy);
  if (params.sortDir) queryParams.set('sort_dir', params.sortDir);
  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (value) queryParams.set(`filter_${key}`, value);
    });
  }
  
  const response = await fetch(`${API_BASE}/api/v1/simple-analytics/table/${table}?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

// =============================================================================
// Hooks
// =============================================================================

function useDashboardSummary(days: number) {
  return useQuery<DashboardSummary>({
    queryKey: ['simple-analytics', 'summary', days],
    queryFn: () => fetchWithAuth(`/dashboard/summary?days=${days}`),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

function useTrendData(days: number) {
  return useQuery<TrendDataPoint[]>({
    queryKey: ['simple-analytics', 'trend', days],
    queryFn: () => fetchWithAuth(`/dashboard/trend?days=${days}`),
    staleTime: 60 * 1000,
  });
}

function useTopPages(days: number, limit: number = 20) {
  return useQuery<{ pages: TopPage[] }>({
    queryKey: ['simple-analytics', 'top-pages', days, limit],
    queryFn: () => fetchWithAuth(`/dashboard/top-pages?days=${days}&limit=${limit}`),
    staleTime: 60 * 1000,
  });
}

function useRecentSignups(limit: number = 20) {
  return useQuery<{ signups: RecentSignup[] }>({
    queryKey: ['simple-analytics', 'recent-signups', limit],
    queryFn: () => fetchWithAuth(`/dashboard/recent-signups?limit=${limit}`),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

function useGenerationStats(days: number) {
  return useQuery<GenerationStats>({
    queryKey: ['simple-analytics', 'generations', days],
    queryFn: () => fetchWithAuth(`/dashboard/generations?days=${days}`),
    staleTime: 60 * 1000,
  });
}

interface RealUsersStats {
  totalRealUsers: number;
  byTier: { free: number; pro: number; studio: number };
  recentSignups: number;
  users: Array<{
    email: string;
    displayName: string;
    tier: string;
    createdAt: string;
  }>;
}

function useRealUsersStats() {
  return useQuery<RealUsersStats>({
    queryKey: ['simple-analytics', 'real-users'],
    queryFn: () => fetchWithAuth('/dashboard/real-users'),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// =============================================================================
// Main Component
// =============================================================================

export default function AnalyticsDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Redirect non-admins
  if (!authLoading && (!user || user.email !== ADMIN_EMAIL)) {
    router.push('/intel');
    return null;
  }

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useDashboardSummary(days);
  const { data: trend } = useTrendData(days);
  const { data: topPagesData } = useTopPages(days, 50);
  const { data: signupsData } = useRecentSignups(50);
  const { data: generationStats } = useGenerationStats(days);
  const { data: realUsersStats } = useRealUsersStats();

  const refreshMutation = useMutation({
    mutationFn: () => fetchWithAuth('/refresh-stats'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simple-analytics'] });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return null;
  }

  const topPages = topPagesData?.pages || [];
  const recentSignups = signupsData?.signups || [];
  const trendData = trend || [];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/intel" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  📊 Analytics Dashboard
                </h1>
                <p className="text-sm text-gray-400 mt-1">Site traffic & user tracking</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
              <button
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm flex items-center gap-2 transition-colors"
                title="Refresh daily stats"
              >
                <RefreshCw className={`w-4 h-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh Stats
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-px">
            {[
              { id: 'overview' as TabId, label: 'Overview', icon: Activity },
              { id: 'visits' as TabId, label: 'Visits', icon: Eye },
              { id: 'events' as TabId, label: 'Events', icon: Zap },
              { id: 'sessions' as TabId, label: 'Sessions', icon: Clock },
              { id: 'pages' as TabId, label: 'Pages', icon: Globe },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewTab
            summary={summary}
            summaryLoading={summaryLoading}
            trendData={trendData}
            topPages={topPages}
            recentSignups={recentSignups}
            generationStats={generationStats}
            realUsersStats={realUsersStats}
            days={days}
          />
        )}
        {activeTab === 'visits' && <VisitsTab days={days} />}
        {activeTab === 'events' && <EventsTab days={days} />}
        {activeTab === 'sessions' && <SessionsTab days={days} />}
        {activeTab === 'pages' && <PagesTab topPages={topPages} days={days} />}
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
  trendData,
  topPages,
  recentSignups,
  generationStats,
  realUsersStats,
  days,
}: {
  summary?: DashboardSummary;
  summaryLoading: boolean;
  trendData: TrendDataPoint[];
  topPages: TopPage[];
  recentSignups: RecentSignup[];
  generationStats?: GenerationStats;
  realUsersStats?: RealUsersStats;
  days: number;
}) {
  return (
    <div className="space-y-8">
      {/* Real Users (excluding test emails) */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          🎯 Real Users
          <span className="text-sm font-normal text-gray-400">(excluding test emails)</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-4">
            <div className="text-sm text-emerald-400 mb-1">Total Real Users</div>
            <div className="text-3xl font-bold text-white">{realUsersStats?.totalRealUsers ?? 0}</div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Free Tier</div>
            <div className="text-2xl font-bold">{realUsersStats?.byTier?.free ?? 0}</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="text-sm text-blue-400 mb-1">Pro Tier</div>
            <div className="text-2xl font-bold">{realUsersStats?.byTier?.pro ?? 0}</div>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
            <div className="text-sm text-purple-400 mb-1">Studio Tier</div>
            <div className="text-2xl font-bold">{realUsersStats?.byTier?.studio ?? 0}</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="text-sm text-green-400 mb-1">Last 7 Days</div>
            <div className="text-2xl font-bold">{realUsersStats?.recentSignups ?? 0}</div>
          </div>
        </div>
        
        {/* Recent Real Users Table */}
        {realUsersStats?.users && realUsersStats.users.length > 0 && (
          <div className="mt-4 bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700 text-sm font-medium text-gray-400">
              Recent Real Signups
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Tier</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {realUsersStats.users.map((user, i) => (
                    <tr key={i} className="hover:bg-gray-800/50">
                      <td className="px-4 py-2 text-sm">{user.email}</td>
                      <td className="px-4 py-2 text-sm text-gray-400">{user.displayName || '-'}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          user.tier === 'studio' ? 'bg-purple-500/20 text-purple-400' :
                          user.tier === 'pro' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {user.tier}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-400 text-right">
                        {formatTimeAgo(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Key Metrics */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Key Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Unique Visitors"
            value={summary?.totalVisitors ?? 0}
            icon={<Users className="w-5 h-5" />}
            loading={summaryLoading}
            color="blue"
          />
          <MetricCard
            label="Page Views"
            value={summary?.totalPageViews ?? 0}
            icon={<Eye className="w-5 h-5" />}
            loading={summaryLoading}
            color="purple"
          />
          <MetricCard
            label="Signups"
            value={summary?.totalSignups ?? 0}
            icon={<UserPlus className="w-5 h-5" />}
            loading={summaryLoading}
            color="green"
          />
          <MetricCard
            label="Logins"
            value={summary?.totalLogins ?? 0}
            icon={<LogIn className="w-5 h-5" />}
            loading={summaryLoading}
            color="cyan"
          />
        </div>
      </section>

      {/* Generation & Conversion Metrics */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Generation & Conversion</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Generations"
            value={summary?.totalGenerations ?? 0}
            icon={<Zap className="w-5 h-5" />}
            loading={summaryLoading}
            color="yellow"
          />
          <MetricCard
            label="Success Rate"
            value={`${summary?.successRate ?? 0}%`}
            icon={<TrendingUp className="w-5 h-5" />}
            loading={summaryLoading}
            color={summary?.successRate && summary.successRate >= 80 ? 'green' : 'orange'}
          />
          <MetricCard
            label="Avg Session"
            value={`${summary?.avgSessionMinutes?.toFixed(1) ?? 0} min`}
            icon={<Clock className="w-5 h-5" />}
            loading={summaryLoading}
            color="indigo"
          />
          <MetricCard
            label="Conversion Rate"
            value={`${summary?.conversionRate ?? 0}%`}
            icon={<Target className="w-5 h-5" />}
            loading={summaryLoading}
            color={summary?.conversionRate && summary.conversionRate >= 5 ? 'green' : 'orange'}
          />
        </div>
      </section>

      {/* Trend Chart */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Visitors Over Time</h2>
        <TrendChart data={trendData} />
      </section>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Top Pages */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Top Pages</h2>
          <TopPagesTable data={topPages.slice(0, 10)} />
        </section>

        {/* Recent Signups */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Recent Signups</h2>
          <RecentSignupsTable data={recentSignups.slice(0, 10)} />
        </section>
      </div>

      {/* Generation Stats by Asset Type */}
      {generationStats && generationStats.byAssetType.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Generations by Asset Type</h2>
          <GenerationStatsTable data={generationStats} />
        </section>
      )}
    </div>
  );
}

// =============================================================================
// Visits Tab with Pagination, Sorting, Filtering
// =============================================================================

function VisitsTab({ days }: { days: number }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics-visits', page, pageSize, sortBy, sortDir, filters, days],
    queryFn: async () => {
      const token = apiClient.getAccessToken();
      if (!token) throw new Error('Not authenticated');
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      // Direct Supabase query via API
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        sort_dir: sortDir,
        days: days.toString(),
      });
      
      if (searchTerm) params.set('search', searchTerm);
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(`filter_${k}`, v);
      });
      
      const response = await fetch(`${API_BASE}/api/v1/simple-analytics/visits?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch visits');
      return response.json();
    },
    staleTime: 30 * 1000,
  });

  const visits: Visit[] = data?.visits || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search pages, referrers..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <select
          value={filters.device_type || ''}
          onChange={(e) => { setFilters({ ...filters, device_type: e.target.value }); setPage(1); }}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
        >
          <option value="">All Devices</option>
          <option value="desktop">Desktop</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
        </select>
        
        <select
          value={filters.browser || ''}
          onChange={(e) => { setFilters({ ...filters, browser: e.target.value }); setPage(1); }}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
        >
          <option value="">All Browsers</option>
          <option value="Chrome">Chrome</option>
          <option value="Firefox">Firefox</option>
          <option value="Safari">Safari</option>
          <option value="Edge">Edge</option>
        </select>
        
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
        >
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            Failed to load visits
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <SortableHeader column="created_at" label="Time" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortableHeader column="page_path" label="Page" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Device</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Browser</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Referrer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">UTM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {visits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                        {formatDateTime(visit.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono truncate max-w-[200px]" title={visit.page_path}>
                        {visit.page_path}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <DeviceIcon type={visit.device_type} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {visit.browser || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 truncate max-w-[150px]" title={visit.referrer || ''}>
                        {visit.referrer ? new URL(visit.referrer).hostname : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {visit.utm_source && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                            {visit.utm_source}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}


// =============================================================================
// Events Tab with Pagination, Sorting, Filtering
// =============================================================================

function EventsTab({ days }: { days: number }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [eventTypeFilter, setEventTypeFilter] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics-events', page, pageSize, sortBy, sortDir, eventTypeFilter, days],
    queryFn: async () => {
      const token = apiClient.getAccessToken();
      if (!token) throw new Error('Not authenticated');
      
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        sort_dir: sortDir,
        days: days.toString(),
      });
      
      if (eventTypeFilter) params.set('event_type', eventTypeFilter);
      
      const response = await fetch(`${API_BASE}/api/v1/simple-analytics/events?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    },
    staleTime: 30 * 1000,
  });

  const events: UserEvent[] = data?.events || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const eventTypes = data?.event_types || [];

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
    setPage(1);
  };

  const getEventColor = (type: string) => {
    const colors: Record<string, string> = {
      signup: 'bg-green-500/20 text-green-400',
      login: 'bg-blue-500/20 text-blue-400',
      logout: 'bg-gray-500/20 text-gray-400',
      generation_started: 'bg-yellow-500/20 text-yellow-400',
      generation_completed: 'bg-emerald-500/20 text-emerald-400',
      generation_failed: 'bg-red-500/20 text-red-400',
      brand_kit_created: 'bg-purple-500/20 text-purple-400',
      asset_downloaded: 'bg-cyan-500/20 text-cyan-400',
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <select
          value={eventTypeFilter}
          onChange={(e) => { setEventTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
        >
          <option value="">All Event Types</option>
          <option value="signup">Signup</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="generation_started">Generation Started</option>
          <option value="generation_completed">Generation Completed</option>
          <option value="generation_failed">Generation Failed</option>
          <option value="brand_kit_created">Brand Kit Created</option>
          <option value="asset_downloaded">Asset Downloaded</option>
        </select>
        
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
        >
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
        
        {/* Event type summary */}
        <div className="flex-1 flex justify-end gap-2 flex-wrap">
          {eventTypes.slice(0, 5).map((et: { type: string; count: number }) => (
            <button
              key={et.type}
              onClick={() => { setEventTypeFilter(et.type); setPage(1); }}
              className={`px-2 py-1 rounded text-xs ${getEventColor(et.type)} hover:opacity-80`}
            >
              {et.type}: {et.count}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            Failed to load events
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <SortableHeader column="created_at" label="Time" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <SortableHeader column="event_type" label="Event Type" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                        {formatDateTime(event.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getEventColor(event.event_type)}`}>
                          {event.event_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-400">
                        {event.user_id ? event.user_id.slice(0, 8) + '...' : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {event.metadata && Object.keys(event.metadata).length > 0 ? (
                          <MetadataDisplay data={event.metadata} />
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Sessions Tab with Pagination, Sorting, Filtering
// =============================================================================

function SessionsTab({ days }: { days: number }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('started_at');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [convertedFilter, setConvertedFilter] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics-sessions', page, pageSize, sortBy, sortDir, convertedFilter, days],
    queryFn: async () => {
      const token = apiClient.getAccessToken();
      if (!token) throw new Error('Not authenticated');
      
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        sort_dir: sortDir,
        days: days.toString(),
      });
      
      if (convertedFilter) params.set('converted', convertedFilter);
      
      const response = await fetch(`${API_BASE}/api/v1/simple-analytics/sessions?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
    staleTime: 30 * 1000,
  });

  const sessions: Session[] = data?.sessions || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const stats = data?.stats || { total: 0, converted: 0, avgPages: 0, avgDuration: 0 };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
    setPage(1);
  };

  const calculateDuration = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total Sessions</div>
          <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Converted</div>
          <div className="text-2xl font-bold text-green-400">{stats.converted.toLocaleString()}</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Avg Pages/Session</div>
          <div className="text-2xl font-bold">{stats.avgPages?.toFixed(1) || 0}</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Avg Duration</div>
          <div className="text-2xl font-bold">{stats.avgDuration?.toFixed(1) || 0} min</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <select
          value={convertedFilter}
          onChange={(e) => { setConvertedFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
        >
          <option value="">All Sessions</option>
          <option value="true">Converted Only</option>
          <option value="false">Not Converted</option>
        </select>
        
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
        >
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            Failed to load sessions
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <SortableHeader column="started_at" label="Started" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Session ID</th>
                    <SortableHeader column="page_count" label="Pages" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Converted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                        {formatDateTime(session.started_at)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-400">
                        {session.session_id.slice(0, 12)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                          {session.page_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {calculateDuration(session.started_at, session.last_activity_at)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-400">
                        {session.user_id ? session.user_id.slice(0, 8) + '...' : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {session.converted ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}


// =============================================================================
// Pages Tab with Sorting and Filtering
// =============================================================================

function PagesTab({ topPages, days }: { topPages: TopPage[]; days: number }) {
  const [sortBy, setSortBy] = useState<'page' | 'views'>('views');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const filteredAndSorted = useMemo(() => {
    let result = [...topPages];
    
    // Filter
    if (searchTerm) {
      result = result.filter(p => p.page.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    // Sort
    result.sort((a, b) => {
      const aVal = sortBy === 'page' ? a.page : a.views;
      const bVal = sortBy === 'page' ? b.page : b.views;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    
    return result;
  }, [topPages, searchTerm, sortBy, sortDir]);

  const paginatedPages = filteredAndSorted.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredAndSorted.length / pageSize);
  const totalViews = topPages.reduce((sum, p) => sum + p.views, 0);

  const handleSort = (column: 'page' | 'views') => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir(column === 'views' ? 'desc' : 'asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total Pages</div>
          <div className="text-2xl font-bold">{topPages.length.toLocaleString()}</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total Views</div>
          <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Avg Views/Page</div>
          <div className="text-2xl font-bold">
            {topPages.length > 0 ? Math.round(totalViews / topPages.length).toLocaleString() : 0}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search pages..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-sm text-gray-400">
          {filteredAndSorted.length} pages
        </span>
      </div>

      {/* Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase w-12">#</th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort('page')}
                >
                  <div className="flex items-center gap-1">
                    Page
                    {sortBy === 'page' && (sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort('views')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Views
                    {sortBy === 'views' && (sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">% of Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase w-48">Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {paginatedPages.map((pageData, i) => {
                const percentage = totalViews > 0 ? (pageData.views / totalViews) * 100 : 0;
                const rank = (page - 1) * pageSize + i + 1;
                
                return (
                  <tr key={pageData.page} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm text-gray-500">{rank}</td>
                    <td className="px-4 py-3 text-sm font-mono truncate max-w-[300px]" title={pageData.page}>
                      {pageData.page}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {pageData.views.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-400">
                      {percentage.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(percentage * 2, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalCount={filteredAndSorted.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Shared Components
// =============================================================================

function MetricCard({
  label,
  value,
  icon,
  loading,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  loading: boolean;
  color: 'blue' | 'purple' | 'green' | 'cyan' | 'yellow' | 'orange' | 'indigo';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
    cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    indigo: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
  };

  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      {loading ? (
        <div className="h-8 w-20 bg-gray-700 animate-pulse rounded" />
      ) : (
        <p className="text-2xl font-bold text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      )}
    </div>
  );
}

function TrendChart({ data }: { data: TrendDataPoint[] }) {
  if (!data.length) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center text-gray-400">
        No trend data yet. Data will appear as visitors are tracked.
      </div>
    );
  }

  const maxVisitors = Math.max(...data.map(d => d.visitors), 1);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      <div className="flex items-end gap-1 h-48">
        {data.map((day, i) => {
          const height = (day.visitors / maxVisitors) * 100;
          return (
            <div key={i} className="flex-1 group relative">
              <div
                className="bg-blue-500/80 hover:bg-blue-500 rounded-t transition-all duration-200 cursor-pointer"
                style={{ height: `${Math.max(height, 2)}%` }}
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                <div className="font-medium">{day.visitors} visitors</div>
                <div className="text-gray-400">{day.signups} signups</div>
                <div className="text-gray-400">{day.generations} generations</div>
                <div className="text-gray-500">{day.date}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function TopPagesTable({ data }: { data: TopPage[] }) {
  if (!data.length) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center text-gray-400">
        No page data yet
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Page</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Views</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {data.map((page, i) => (
            <tr key={i} className="hover:bg-gray-800/50">
              <td className="px-4 py-3 text-sm font-mono truncate max-w-[250px]">
                {page.page}
              </td>
              <td className="px-4 py-3 text-sm text-gray-400 text-right">
                {page.views.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentSignupsTable({ data }: { data: RecentSignup[] }) {
  if (!data.length) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center text-gray-400">
        No signups yet
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">When</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {data.map((signup, i) => (
            <tr key={i} className="hover:bg-gray-800/50">
              <td className="px-4 py-3">
                <div className="text-sm font-medium">{signup.displayName}</div>
                <div className="text-xs text-gray-500">{signup.email}</div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-400 text-right">
                {formatTimeAgo(signup.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GenerationStatsTable({ data }: { data: GenerationStats }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <span className="text-sm text-gray-400">
          Total: {data.totalCompleted.toLocaleString()} completed, {data.totalFailed.toLocaleString()} failed
        </span>
        <span className={`text-sm font-medium ${
          data.totalCompleted + data.totalFailed > 0
            ? (data.totalCompleted / (data.totalCompleted + data.totalFailed) * 100 >= 80 ? 'text-green-400' : 'text-orange-400')
            : 'text-gray-400'
        }`}>
          {data.totalCompleted + data.totalFailed > 0
            ? `${((data.totalCompleted / (data.totalCompleted + data.totalFailed)) * 100).toFixed(1)}% success`
            : 'No data'}
        </span>
      </div>
      <table className="w-full">
        <thead className="bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Asset Type</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Completed</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Failed</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Success Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {data.byAssetType.map((row, i) => (
            <tr key={i} className="hover:bg-gray-800/50">
              <td className="px-4 py-3 text-sm capitalize">
                {row.assetType.replace(/_/g, ' ')}
              </td>
              <td className="px-4 py-3 text-sm text-green-400 text-right">
                {row.completed.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-red-400 text-right">
                {row.failed.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right">
                <span className={`text-sm font-medium ${
                  row.successRate >= 80 ? 'text-green-400' : 
                  row.successRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {row.successRate}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function SortableHeader({
  column,
  label,
  sortBy,
  sortDir,
  onSort,
}: {
  column: string;
  label: string;
  sortBy: string;
  sortDir: SortDirection;
  onSort: (column: string) => void;
}) {
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase cursor-pointer hover:text-white transition-colors"
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortBy === column ? (
          sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-50" />
        )}
      </div>
    </th>
  );
}

function Pagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
      <span className="text-sm text-gray-400">
        Showing {start}-{end} of {totalCount.toLocaleString()}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function DeviceIcon({ type }: { type: string | null }) {
  switch (type?.toLowerCase()) {
    case 'mobile':
      return (
        <span title="Mobile">
          <Smartphone className="w-4 h-4 text-blue-400" />
        </span>
      );
    case 'tablet':
      return (
        <span title="Tablet">
          <Tablet className="w-4 h-4 text-purple-400" />
        </span>
      );
    case 'desktop':
    default:
      return (
        <span title="Desktop">
          <Monitor className="w-4 h-4 text-gray-400" />
        </span>
      );
  }
}

function MetadataDisplay({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).slice(0, 3);
  
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([key, value]) => (
        <span key={key} className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">
          {key}: {String(value).slice(0, 20)}
        </span>
      ))}
      {Object.keys(data).length > 3 && (
        <span className="text-xs text-gray-500">+{Object.keys(data).length - 3} more</span>
      )}
    </div>
  );
}

// =============================================================================
// Utilities
// =============================================================================

function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${Math.floor(diffMins / 1440)}d ago`;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
