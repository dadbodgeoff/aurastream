/**
 * Creator Intel React Query Hooks
 * 
 * Hooks for the unified intelligence dashboard.
 * These are ADDITIVE - do not modify any existing hooks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  UserIntelPreferences,
  UpdatePreferencesRequest,
  AvailableCategory,
  CategorySubscription,
  SubscribeCategoryRequest,
  SubscribeCategoryResponse,
  UnsubscribeCategoryResponse,
  TodaysMission,
  IntelDashboardData,
  TrackActivityRequest,
  PanelType,
} from '../types/intel';

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

export const intelKeys = {
  all: ['intel'] as const,
  preferences: () => [...intelKeys.all, 'preferences'] as const,
  categories: () => [...intelKeys.all, 'categories'] as const,
  mission: () => [...intelKeys.all, 'mission'] as const,
  dashboard: (filter: string, panels: PanelType[]) => 
    [...intelKeys.all, 'dashboard', filter, panels.join(',')] as const,
};

// ============================================================================
// Transform Functions (snake_case to camelCase)
// ============================================================================

function transformCategorySubscription(data: any): CategorySubscription {
  return {
    key: data.key,
    name: data.name,
    twitchId: data.twitch_id,
    youtubeQuery: data.youtube_query,
    platform: data.platform,
    notifications: data.notifications,
    addedAt: data.added_at,
  };
}

function transformPreferences(data: any): UserIntelPreferences {
  return {
    subscribedCategories: (data.subscribed_categories || []).map(transformCategorySubscription),
    dashboardLayout: (data.dashboard_layout || []).map((p: any) => ({
      panelType: p.panel_type,
      position: p.position,
      size: p.size,
    })),
    timezone: data.timezone || 'America/New_York',
  };
}

function transformAvailableCategory(data: any): AvailableCategory {
  return {
    key: data.key,
    name: data.name,
    twitchId: data.twitch_id,
    youtubeQuery: data.youtube_query,
    platform: data.platform,
    icon: data.icon,
    color: data.color,
    subscriberCount: data.subscriber_count,
  };
}

function transformMission(data: any): TodaysMission {
  return {
    recommendation: data.recommendation,
    confidence: data.confidence,
    category: data.category,
    categoryName: data.category_name,
    suggestedTitle: data.suggested_title,
    reasoning: data.reasoning,
    factors: {
      competition: data.factors?.competition || 'medium',
      viralOpportunity: data.factors?.viral_opportunity || false,
      timing: data.factors?.timing || false,
      historyMatch: data.factors?.history_match || false,
    },
    expiresAt: data.expires_at,
  };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch user's intel preferences (categories, layout, timezone)
 */
export function useIntelPreferences(enabled = true) {
  return useQuery({
    queryKey: intelKeys.preferences(),
    queryFn: async (): Promise<UserIntelPreferences> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/preferences`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        if (res.status === 404) {
          // Return defaults for new users
          return {
            subscribedCategories: [],
            dashboardLayout: [],
            timezone: 'America/New_York',
          };
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch preferences');
      }
      return transformPreferences(await res.json());
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}

/**
 * Fetch available categories for subscription
 */
export function useAvailableCategories(enabled = true) {
  return useQuery({
    queryKey: intelKeys.categories(),
    queryFn: async (): Promise<AvailableCategory[]> => {
      const res = await fetch(`${API_BASE}/intel/categories/available`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch categories');
      }
      const data = await res.json();
      return data.map(transformAvailableCategory);
    },
    staleTime: 1000 * 60 * 60, // 1 hour (categories don't change often)
    enabled,
  });
}

/**
 * Fetch Today's Mission recommendation
 */
export function useIntelMission(enabled = true) {
  return useQuery({
    queryKey: intelKeys.mission(),
    queryFn: async (): Promise<TodaysMission | null> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/mission`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch mission');
      }
      return transformMission(await res.json());
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
    enabled,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Update user's intel preferences (layout, timezone)
 */
export function useUpdateIntelPreferences() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UpdatePreferencesRequest): Promise<UserIntelPreferences> => {
      const token = getToken();
      const body: any = {};
      
      if (data.dashboardLayout) {
        body.dashboard_layout = data.dashboardLayout.map(p => ({
          panel_type: p.panelType,
          position: p.position,
          size: p.size,
        }));
      }
      if (data.timezone) {
        body.timezone = data.timezone;
      }
      
      const res = await fetch(`${API_BASE}/intel/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update preferences');
      }
      return transformPreferences(await res.json());
    },
    onSuccess: (data) => {
      queryClient.setQueryData(intelKeys.preferences(), data);
    },
  });
}

/**
 * Subscribe to a category
 */
export function useSubscribeCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: SubscribeCategoryRequest): Promise<SubscribeCategoryResponse> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/categories/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify({
          key: data.key,
          name: data.name,
          twitch_id: data.twitchId,
          youtube_query: data.youtubeQuery,
          platform: data.platform,
          notifications: data.notifications ?? true,
        }),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to subscribe to category');
      }
      
      const result = await res.json();
      return {
        success: true,
        subscription: transformCategorySubscription(result.subscription),
        totalSubscriptions: result.total_subscriptions,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intelKeys.preferences() });
      queryClient.invalidateQueries({ queryKey: intelKeys.mission() });
    },
  });
}

/**
 * Unsubscribe from a category
 */
export function useUnsubscribeCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (categoryKey: string): Promise<UnsubscribeCategoryResponse> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/categories/${categoryKey}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to unsubscribe from category');
      }
      
      const result = await res.json();
      return {
        success: true,
        remainingSubscriptions: result.remaining_subscriptions,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intelKeys.preferences() });
      queryClient.invalidateQueries({ queryKey: intelKeys.mission() });
    },
  });
}

/**
 * Track user activity for personalization
 */
export function useTrackActivity() {
  return useMutation({
    mutationFn: async (data: TrackActivityRequest): Promise<void> => {
      const token = getToken();
      await fetch(`${API_BASE}/intel/activity/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify({
          event_type: data.eventType,
          category_key: data.categoryKey,
          panel_type: data.panelType,
          metadata: data.metadata,
        }),
      });
      // Fire and forget - don't throw on error
    },
  });
}

/**
 * Mark that user acted on Today's Mission
 */
export function useMissionActed() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const token = getToken();
      await fetch(`${API_BASE}/intel/mission/acted`, {
        method: 'POST',
        headers: authHeaders(token),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: intelKeys.mission() });
    },
  });
}

// ============================================================================
// Activity Summary Types & Hook (Studio tier)
// ============================================================================

export interface ActivitySummary {
  categoryEngagement: Record<string, number>;
  activeHours: number[];
  contentPreferences: string[];
  avgViewsByCategory: Record<string, number>;
  bestPerformingTimes: string[];
  panelEngagement: Record<string, number>;
  missionsShown: number;
  missionsActed: number;
  totalEvents: number;
  periodDays: number;
}

function transformActivitySummary(data: any): ActivitySummary {
  return {
    categoryEngagement: data.category_engagement || {},
    activeHours: data.active_hours || [],
    contentPreferences: data.content_preferences || [],
    avgViewsByCategory: data.avg_views_by_category || {},
    bestPerformingTimes: data.best_performing_times || [],
    panelEngagement: data.panel_engagement || {},
    missionsShown: data.missions_shown || 0,
    missionsActed: data.missions_acted || 0,
    totalEvents: data.total_events || 0,
    periodDays: data.period_days || 30,
  };
}

/**
 * Fetch user's activity summary for personalization insights.
 * Studio tier only.
 */
export function useActivitySummary(days = 30, enabled = true) {
  return useQuery({
    queryKey: [...intelKeys.all, 'activity-summary', days] as const,
    queryFn: async (): Promise<ActivitySummary> => {
      const token = getToken();
      const params = new URLSearchParams({ days: String(days) });
      const res = await fetch(`${API_BASE}/intel/activity/summary?${params}`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch activity summary');
      }
      return transformActivitySummary(await res.json());
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    enabled,
  });
}

// ============================================================================
// Title Intelligence Types & Hooks
// ============================================================================

export interface TitlePattern {
  name: string;
  description: string;
  frequency: number;
  avgViews: number;
  avgEngagement: number;
  examples: string[];
}

export interface TitleKeyword {
  keyword: string;
  frequency: number;
  avgViews: number;
  avgEngagement: number;
  velocityScore: number;
  powerCategory: string | null;
  isTrending: boolean;
  topVideoTitle: string;
}

export interface TitleFormula {
  name: string;
  formula: string;
  template: string;
  example: string;
  avgViews: string;
  whyItWorks?: string;
}

// NEW: Title suggestion with velocity scoring
export interface TitleSuggestion {
  title: string;
  hook: string;
  views: number;
  velocity: number;
  engagementRate: number;
  powerWords: string[];
  structureType: string;
  whyItWorks: string;
  template: string;
}

// NEW: Tag cluster (related tags that work together)
export interface TagCluster {
  primaryTag: string;
  relatedTags: string[];
  avgViews: number;
  videoCount: number;
  exampleTitle: string;
}

export interface GameTitleIntel {
  gameKey: string;
  gameName: string;
  analyzedAt: string;
  videoCount: number;
  
  // NEW: Title suggestions with velocity (the main value)
  title_suggestions: Array<{
    title: string;
    hook: string;
    views: number;
    velocity: number;
    engagement_rate: number;
    power_words: string[];
    structure_type: string;
    why_it_works: string;
    template: string;
  }>;
  
  // NEW: Tag clusters
  tag_clusters: Array<{
    primary_tag: string;
    related_tags: string[];
    avg_views: number;
    video_count: number;
    example_title: string;
  }>;
  
  // NEW: Trending elements
  trending_hooks: string[];
  trending_power_words: string[];
  
  // Legacy fields
  patterns: TitlePattern[];
  keywords: TitleKeyword[];
  formulas: TitleFormula[];
  stats: {
    avgTitleLength: number;
    avgWordCount: number;
    avgViews: number;
  };
}

export interface TagIntel {
  tag: string;
  frequency: number;
  avgViews: number;
  videosUsing: number;
  topVideoTitle: string;
}

export interface GameTagIntel {
  gameKey: string;
  gameName: string;
  analyzedAt: string;
  videoCount: number;
  tags: TagIntel[];
}

export interface AllGamesIntelSummary {
  games: Array<{
    gameKey: string;
    gameName: string;
    analyzedAt: string;
    videoCount: number;
    topPattern: string | null;
    topKeywords: string[];
    avgViews: number;
  }>;
  totalGames: number;
}

function transformTitleIntel(data: any): GameTitleIntel {
  return {
    gameKey: data.game_key,
    gameName: data.game_name,
    analyzedAt: data.analyzed_at,
    videoCount: data.video_count,
    
    // NEW: Title suggestions (pass through as-is, snake_case)
    title_suggestions: data.title_suggestions || [],
    
    // NEW: Tag clusters (pass through as-is)
    tag_clusters: data.tag_clusters || [],
    
    // NEW: Trending elements
    trending_hooks: data.trending_hooks || [],
    trending_power_words: data.trending_power_words || [],
    
    // Legacy fields
    patterns: (data.patterns || []).map((p: any) => ({
      name: p.name,
      description: p.description,
      frequency: p.frequency,
      avgViews: p.avg_views,
      avgEngagement: p.avg_engagement,
      examples: p.examples || [],
    })),
    keywords: (data.keywords || []).map((k: any) => ({
      keyword: k.keyword,
      frequency: k.frequency,
      avgViews: k.avg_views,
      avgEngagement: k.avg_engagement,
      velocityScore: k.velocity_score || 0,
      powerCategory: k.power_category || null,
      isTrending: k.is_trending || false,
      topVideoTitle: k.top_video_title,
    })),
    formulas: (data.formulas || []).map((f: any) => ({
      name: f.name,
      formula: f.formula,
      template: f.template,
      example: f.example,
      avgViews: f.avg_views,
      whyItWorks: f.why_it_works,
    })),
    stats: {
      avgTitleLength: data.stats?.avg_title_length || 0,
      avgWordCount: data.stats?.avg_word_count || 0,
      avgViews: data.stats?.avg_views || 0,
    },
  };
}

function transformTagIntel(data: any): GameTagIntel {
  return {
    gameKey: data.game_key,
    gameName: data.game_name,
    analyzedAt: data.analyzed_at,
    videoCount: data.video_count,
    tags: (data.tags || []).map((t: any) => ({
      tag: t.tag,
      frequency: t.frequency,
      avgViews: t.avg_views,
      videosUsing: t.videos_using,
      topVideoTitle: t.top_video_title || '',
    })),
  };
}

function transformAllGamesIntel(data: any): AllGamesIntelSummary {
  return {
    games: (data.games || []).map((g: any) => ({
      gameKey: g.game_key,
      gameName: g.game_name,
      analyzedAt: g.analyzed_at,
      videoCount: g.video_count,
      topPattern: g.top_pattern,
      topKeywords: g.top_keywords || [],
      avgViews: g.avg_views,
    })),
    totalGames: data.total_games || 0,
  };
}

/**
 * Fetch title intelligence for a specific game.
 * Returns patterns, keywords, and formulas based on top-performing videos.
 */
export function useTitleIntel(gameKey: string, enabled = true) {
  return useQuery({
    queryKey: [...intelKeys.all, 'titles', gameKey] as const,
    queryFn: async (): Promise<GameTitleIntel> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/titles/${gameKey}`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch title intelligence');
      }
      return transformTitleIntel(await res.json());
    },
    staleTime: 1000 * 60 * 60, // 1 hour (data refreshes daily)
    enabled: enabled && !!gameKey,
  });
}

/**
 * Fetch tag recommendations for a specific game.
 * Returns top tags used by high-performing videos.
 */
export function useTagIntel(gameKey: string, enabled = true) {
  return useQuery({
    queryKey: [...intelKeys.all, 'tags', gameKey] as const,
    queryFn: async (): Promise<GameTagIntel> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/tags/${gameKey}`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch tag intelligence');
      }
      return transformTagIntel(await res.json());
    },
    staleTime: 1000 * 60 * 60, // 1 hour (data refreshes daily)
    enabled: enabled && !!gameKey,
  });
}

/**
 * Fetch title intelligence summary for all tracked games.
 */
export function useAllTitlesIntel(enabled = true) {
  return useQuery({
    queryKey: [...intelKeys.all, 'titles-all'] as const,
    queryFn: async (): Promise<AllGamesIntelSummary> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/titles`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch all titles intelligence');
      }
      return transformAllGamesIntel(await res.json());
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled,
  });
}


// ============================================================================
// Video Ideas Types & Hook
// ============================================================================

/**
 * A synthesized video concept recommendation.
 * Unlike title_suggestions (which are existing viral titles),
 * these are ORIGINAL concepts based on trending data.
 */
export interface VideoIdea {
  concept: string;  // The main video idea/concept
  hook: string;  // Suggested hook/angle
  whyNow: string;  // Why this is timely
  formatSuggestion: string;  // Tutorial, reaction, gameplay, etc.
  trendingElements: string[];  // Keywords/topics to include
  suggestedTags: string[];  // Tags to use
  difficulty: 'easy' | 'medium' | 'hard';  // Based on competition
  opportunityScore: number;  // 0-100 score
  confidence: number;  // 0-100 confidence
}

export interface VideoIdeasResponse {
  gameKey: string;
  gameName: string;
  ideas: VideoIdea[];
  analyzedAt: string;
  dataFreshnessHours: number;
  overallOpportunity: 'hot' | 'warm' | 'cool';
}

function transformVideoIdea(data: any): VideoIdea {
  return {
    concept: data.concept,
    hook: data.hook,
    whyNow: data.why_now,
    formatSuggestion: data.format_suggestion,
    trendingElements: data.trending_elements || [],
    suggestedTags: data.suggested_tags || [],
    difficulty: data.difficulty || 'medium',
    opportunityScore: data.opportunity_score || 50,
    confidence: data.confidence || 50,
  };
}

function transformVideoIdeasResponse(data: any): VideoIdeasResponse {
  return {
    gameKey: data.game_key,
    gameName: data.game_name,
    ideas: (data.ideas || []).map(transformVideoIdea),
    analyzedAt: data.analyzed_at,
    dataFreshnessHours: data.data_freshness_hours || 24,
    overallOpportunity: data.overall_opportunity || 'warm',
  };
}

/**
 * Fetch synthesized video ideas for a specific game.
 * 
 * Unlike useTitleIntel (which returns existing viral titles),
 * this returns ORIGINAL video concepts based on:
 * - Trending topics from viral detector
 * - Trending keywords/phrases from title intel
 * - Tag clusters that work together
 * - Competition levels
 */
export function useVideoIdeas(gameKey: string, enabled = true) {
  return useQuery({
    queryKey: [...intelKeys.all, 'video-ideas', gameKey] as const,
    queryFn: async (): Promise<VideoIdeasResponse> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/video-ideas/${gameKey}`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch video ideas');
      }
      return transformVideoIdeasResponse(await res.json());
    },
    staleTime: 1000 * 60 * 30, // 30 minutes (ideas are synthesized from cached data)
    enabled: enabled && !!gameKey,
  });
}


// ============================================================================
// Daily Insight Types & Hook
// ============================================================================

/**
 * A specific, actionable insight based on real data.
 * Not generic fluff - actual data-driven insights.
 */
export interface DailyInsight {
  insightType: 'trending_phrase' | 'viral_spike' | 'keyword_surge' | 'low_competition';
  headline: string;  // The main insight (specific, data-driven)
  detail: string;  // Supporting data
  action: string;  // What to do about it
  category: string;
  categoryName: string;
  metricValue: string;  // The specific number (e.g., "3.2x", "40%")
  metricLabel: string;  // What the metric means
  confidence: number;
  dataSource: string;
  generatedAt: string;
}

function transformDailyInsight(data: any): DailyInsight {
  return {
    insightType: data.insight_type,
    headline: data.headline,
    detail: data.detail,
    action: data.action,
    category: data.category,
    categoryName: data.category_name,
    metricValue: data.metric_value,
    metricLabel: data.metric_label,
    confidence: data.confidence,
    dataSource: data.data_source,
    generatedAt: data.generated_at,
  };
}

/**
 * Fetch the daily insight - ONE specific, actionable recommendation.
 * 
 * Returns data-driven insights like:
 * - "'zero build' videos are outperforming by 3.2x"
 * - "Only 847 streamers live in Valorant right now"
 */
export function useDailyInsight(enabled = true) {
  return useQuery({
    queryKey: [...intelKeys.all, 'daily-insight'] as const,
    queryFn: async (): Promise<DailyInsight | null> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/daily-insight`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        if (res.status === 404) return null;
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch daily insight');
      }
      const data = await res.json();
      if (!data) return null;
      return transformDailyInsight(data);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}
