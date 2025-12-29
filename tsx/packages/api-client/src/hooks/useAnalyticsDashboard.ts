/**
 * Analytics Dashboard Hooks
 * 
 * React Query hooks for fetching analytics dashboard data.
 */

import { useQuery } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// =============================================================================
// Types
// =============================================================================

export interface DashboardSummary {
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

export interface TrendDataPoint {
  date: string;
  visitors: number;
  signups: number;
  generations: number;
}

export interface TopPage {
  page: string;
  views: number;
}

export interface RecentSignup {
  userId: string;
  email: string;
  displayName: string;
  createdAt: string;
  source?: string;
}

export interface AssetTypeStats {
  assetType: string;
  completed: number;
  failed: number;
  successRate: number;
}

export interface GenerationStats {
  byAssetType: AssetTypeStats[];
  totalCompleted: number;
  totalFailed: number;
}

// =============================================================================
// API Functions
// =============================================================================

async function fetchDashboardSummary(days: number): Promise<DashboardSummary> {
  const response = await fetch(`${API_BASE}/api/v1/simple-analytics/dashboard/summary?days=${days}`);
  if (!response.ok) throw new Error('Failed to fetch dashboard summary');
  return response.json();
}

async function fetchTrendData(days: number): Promise<TrendDataPoint[]> {
  const response = await fetch(`${API_BASE}/api/v1/simple-analytics/dashboard/trend?days=${days}`);
  if (!response.ok) throw new Error('Failed to fetch trend data');
  return response.json();
}

async function fetchTopPages(days: number, limit: number): Promise<TopPage[]> {
  const response = await fetch(`${API_BASE}/api/v1/simple-analytics/dashboard/top-pages?days=${days}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch top pages');
  const data = await response.json();
  return data.pages;
}

async function fetchRecentSignups(limit: number): Promise<RecentSignup[]> {
  const response = await fetch(`${API_BASE}/api/v1/simple-analytics/dashboard/recent-signups?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch recent signups');
  const data = await response.json();
  return data.signups;
}

async function fetchGenerationStats(days: number): Promise<GenerationStats> {
  const response = await fetch(`${API_BASE}/api/v1/simple-analytics/dashboard/generations?days=${days}`);
  if (!response.ok) throw new Error('Failed to fetch generation stats');
  return response.json();
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Fetch dashboard summary statistics
 */
export function useAnalyticsSummary(days: number = 30) {
  return useQuery({
    queryKey: ['analytics', 'summary', days],
    queryFn: () => fetchDashboardSummary(days),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

/**
 * Fetch trend data for charts
 */
export function useAnalyticsTrend(days: number = 30) {
  return useQuery({
    queryKey: ['analytics', 'trend', days],
    queryFn: () => fetchTrendData(days),
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

/**
 * Fetch top pages
 */
export function useTopPages(days: number = 30, limit: number = 10) {
  return useQuery({
    queryKey: ['analytics', 'top-pages', days, limit],
    queryFn: () => fetchTopPages(days, limit),
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch recent signups
 */
export function useRecentSignups(limit: number = 10) {
  return useQuery({
    queryKey: ['analytics', 'recent-signups', limit],
    queryFn: () => fetchRecentSignups(limit),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

/**
 * Fetch generation statistics
 */
export function useGenerationStats(days: number = 30) {
  return useQuery({
    queryKey: ['analytics', 'generations', days],
    queryFn: () => fetchGenerationStats(days),
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

/**
 * Combined hook for full dashboard data
 */
export function useAnalyticsDashboard(days: number = 30) {
  const summary = useAnalyticsSummary(days);
  const trend = useAnalyticsTrend(days);
  const topPages = useTopPages(days);
  const recentSignups = useRecentSignups();
  const generations = useGenerationStats(days);
  
  return {
    summary: summary.data,
    trend: trend.data,
    topPages: topPages.data,
    recentSignups: recentSignups.data,
    generations: generations.data,
    isLoading: summary.isLoading || trend.isLoading,
    error: summary.error || trend.error,
    refetch: () => {
      summary.refetch();
      trend.refetch();
      topPages.refetch();
      recentSignups.refetch();
      generations.refetch();
    },
  };
}
