/**
 * Clip Radar React Query Hooks
 * 
 * Provides hooks for fetching viral clip data including:
 * - Live viral clips with velocity tracking
 * - Fresh clips from recent polls
 * - Historical daily recaps
 * - Category-specific recaps
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  ViralClip,
  FreshClip,
  ViralClipsResponse,
  FreshClipsResponse,
  RadarStatus,
  DailyRecap,
  CategoryRecap,
  RecapListResponse,
  PollResult,
  TrackedCategory,
} from '../types/clipRadar';

// ============================================================================
// API Configuration
// ============================================================================

const API_BASE = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : 'http://localhost:8000') + '/api/v1';

const getToken = () => apiClient.getAccessToken();
const authHeaders = (token: string | null): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

// ============================================================================
// Query Keys
// ============================================================================

export const clipRadarKeys = {
  all: ['clip-radar'] as const,
  viral: (gameId?: string) => [...clipRadarKeys.all, 'viral', gameId] as const,
  fresh: (gameId?: string, maxAge?: number) => [...clipRadarKeys.all, 'fresh', gameId, maxAge] as const,
  status: () => [...clipRadarKeys.all, 'status'] as const,
  categories: () => [...clipRadarKeys.all, 'categories'] as const,
  recaps: (days?: number) => [...clipRadarKeys.all, 'recaps', days] as const,
  recap: (date: string) => [...clipRadarKeys.all, 'recap', date] as const,
  categoryRecap: (date: string, gameId: string) => [...clipRadarKeys.all, 'category-recap', date, gameId] as const,
};

// ============================================================================
// Transform Functions (snake_case to camelCase)
// ============================================================================

function transformViralClip(data: any): ViralClip {
  const velocity = data.velocity ?? 0;
  // Normalize velocity to a 0-100 score for UI display
  // Velocity of 5+ views/min is considered "viral" (50+), 10+ is "high" (80+)
  const velocityScore = Math.min(100, Math.round(velocity * 10));
  
  return {
    // id is an alias for clipId for React key compatibility
    id: data.clip_id,
    clipId: data.clip_id,
    title: data.title,
    url: data.url,
    thumbnailUrl: data.thumbnail_url,
    broadcasterName: data.broadcaster_name,
    creatorName: data.creator_name,
    gameId: data.game_id,
    gameName: data.game_name,
    language: data.language,
    duration: data.duration,
    viewCount: data.view_count,
    velocity: velocity,
    velocityScore: velocityScore,
    totalGained: data.total_gained,
    ageMinutes: data.age_minutes,
    alertReason: data.alert_reason,
    createdAt: data.created_at,
  };
}

function transformFreshClip(data: any): FreshClip {
  return {
    clipId: data.clip_id,
    title: data.title,
    url: data.url,
    thumbnailUrl: data.thumbnail_url,
    broadcasterName: data.broadcaster_name,
    creatorName: data.creator_name,
    gameId: data.game_id,
    gameName: data.game_name,
    language: data.language,
    duration: data.duration,
    viewCount: data.view_count,
    velocity: data.velocity,
    ageMinutes: data.age_minutes,
    createdAt: data.created_at,
  };
}

function transformRecapClip(data: any): any {
  return {
    clipId: data.clip_id,
    title: data.title,
    url: data.url,
    thumbnailUrl: data.thumbnail_url,
    broadcasterName: data.broadcaster_name,
    gameId: data.game_id,
    gameName: data.game_name,
    viewCount: data.view_count,
    velocity: data.velocity,
    alertReason: data.alert_reason,
  };
}

function transformDailyRecap(data: any): DailyRecap {
  return {
    recapDate: data.recap_date,
    totalClipsTracked: data.total_clips_tracked,
    totalViralClips: data.total_viral_clips,
    totalViewsTracked: data.total_views_tracked,
    peakVelocity: data.peak_velocity,
    topClips: (data.top_clips || []).map(transformRecapClip),
    categoryStats: Object.fromEntries(
      Object.entries(data.category_stats || {}).map(([k, v]: [string, any]) => [
        k,
        {
          gameName: v.game_name,
          totalClips: v.total_clips,
          viralCount: v.viral_count,
        },
      ])
    ),
    pollsCount: data.polls_count,
    firstPollAt: data.first_poll_at,
    lastPollAt: data.last_poll_at,
  };
}

function transformCategoryRecap(data: any): CategoryRecap {
  return {
    gameId: data.game_id,
    gameName: data.game_name,
    totalClips: data.total_clips,
    totalViews: data.total_views,
    viralClipsCount: data.viral_clips_count,
    avgVelocity: data.avg_velocity,
    peakVelocity: data.peak_velocity,
    topClips: (data.top_clips || []).map(transformRecapClip),
    hourlyActivity: data.hourly_activity || [],
  };
}

function transformRadarStatus(data: any): RadarStatus {
  return {
    isActive: data.is_active,
    lastPoll: data.last_poll,
    categoriesTracked: data.categories_tracked,
    categoryList: (data.category_list || []).map((c: any) => ({
      gameId: c.game_id,
      gameName: c.game_name,
    })),
  };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch current viral clips sorted by velocity.
 * Auto-refreshes every 30 seconds.
 */
export function useViralClips(gameId?: string, limit = 20, enabled = true) {
  return useQuery({
    queryKey: clipRadarKeys.viral(gameId),
    queryFn: async (): Promise<ViralClipsResponse> => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (gameId) params.set('game_id', gameId);
      
      const res = await fetch(`${API_BASE}/clip-radar/viral?${params}`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch viral clips');
      }
      const data = await res.json();
      return {
        clips: (data.clips || []).map(transformViralClip),
        total: data.total,
        lastPoll: data.last_poll,
        categoriesTracked: data.categories_tracked,
      };
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 30, // Auto-refresh every 30 seconds
    enabled,
  });
}

/**
 * Fetch fresh clips from recent polls.
 */
export function useFreshClips(gameId?: string, maxAge = 60, limit = 20, enabled = true) {
  return useQuery({
    queryKey: clipRadarKeys.fresh(gameId, maxAge),
    queryFn: async (): Promise<FreshClipsResponse> => {
      const params = new URLSearchParams({
        limit: String(limit),
        max_age: String(maxAge),
      });
      if (gameId) params.set('game_id', gameId);
      
      const res = await fetch(`${API_BASE}/clip-radar/fresh?${params}`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch fresh clips');
      }
      const data = await res.json();
      return {
        clips: (data.clips || []).map(transformFreshClip),
        total: data.total,
        maxAgeMinutes: data.max_age_minutes,
      };
    },
    staleTime: 1000 * 60, // 1 minute
    enabled,
  });
}

/**
 * Fetch clip radar status.
 */
export function useRadarStatus(enabled = true) {
  return useQuery({
    queryKey: clipRadarKeys.status(),
    queryFn: async (): Promise<RadarStatus> => {
      const res = await fetch(`${API_BASE}/clip-radar/status`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch radar status');
      }
      return transformRadarStatus(await res.json());
    },
    staleTime: 1000 * 60, // 1 minute
    enabled,
  });
}

/**
 * Fetch tracked categories.
 */
export function useTrackedCategories(enabled = true) {
  return useQuery({
    queryKey: clipRadarKeys.categories(),
    queryFn: async (): Promise<TrackedCategory[]> => {
      const res = await fetch(`${API_BASE}/clip-radar/categories`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch categories');
      }
      const data = await res.json();
      return (data.categories || []).map((c: any) => ({
        gameId: c.game_id,
        gameName: c.game_name,
      }));
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled,
  });
}

/**
 * Fetch recent daily recaps.
 */
export function useRecentRecaps(days = 7, enabled = true) {
  return useQuery({
    queryKey: clipRadarKeys.recaps(days),
    queryFn: async (): Promise<RecapListResponse> => {
      const params = new URLSearchParams({ days: String(days) });
      const res = await fetch(`${API_BASE}/clip-radar/recaps?${params}`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch recaps');
      }
      const data = await res.json();
      return {
        recaps: (data.recaps || []).map(transformDailyRecap),
        total: data.total,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}

/**
 * Fetch a specific daily recap.
 */
export function useDailyRecap(date: string, enabled = true) {
  return useQuery({
    queryKey: clipRadarKeys.recap(date),
    queryFn: async (): Promise<DailyRecap> => {
      const res = await fetch(`${API_BASE}/clip-radar/recaps/${date}`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch recap');
      }
      return transformDailyRecap(await res.json());
    },
    staleTime: 1000 * 60 * 60, // 1 hour (historical data doesn't change)
    enabled: !!date && enabled,
  });
}

/**
 * Fetch category-specific recap for a date.
 */
export function useCategoryRecap(date: string, gameId: string, enabled = true) {
  return useQuery({
    queryKey: clipRadarKeys.categoryRecap(date, gameId),
    queryFn: async (): Promise<CategoryRecap> => {
      const res = await fetch(`${API_BASE}/clip-radar/recaps/${date}/category/${gameId}`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch category recap');
      }
      return transformCategoryRecap(await res.json());
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled: !!date && !!gameId && enabled,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Manually trigger a clip radar poll.
 */
export function useTriggerPoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<PollResult> => {
      const res = await fetch(`${API_BASE}/clip-radar/poll`, {
        method: 'POST',
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to trigger poll');
      }
      const data = await res.json();
      return {
        success: data.success,
        message: data.message,
        categories: data.categories,
        totalClips: data.total_clips,
        viralClips: data.viral_clips,
        byCategory: (data.by_category || []).map((c: any) => ({
          gameId: c.game_id,
          gameName: c.game_name,
          clips: c.clips,
          viral: c.viral,
          avgVelocity: c.avg_velocity,
        })),
      };
    },
    onSuccess: () => {
      // Invalidate all clip radar queries
      qc.invalidateQueries({ queryKey: clipRadarKeys.all });
    },
  });
}

/**
 * Manually trigger recap creation.
 */
export function useCreateRecap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (date?: string): Promise<{ success: boolean; message: string; recapDate: string }> => {
      const params = date ? `?recap_date=${date}` : '';
      const res = await fetch(`${API_BASE}/clip-radar/recaps/create${params}`, {
        method: 'POST',
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create recap');
      }
      const data = await res.json();
      return {
        success: data.success,
        message: data.message,
        recapDate: data.recap_date,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clipRadarKeys.recaps() });
    },
  });
}
