/**
 * Trend Intelligence React Query Hooks
 * 
 * Provides hooks for fetching and managing trend data including:
 * - Daily Brief with AI insights
 * - YouTube trending videos
 * - Twitch live streams and games
 * - Thumbnail analysis
 * - Velocity alerts (Studio tier)
 * - Timing recommendations (Pro+ tier)
 * 
 * @see docs/TREND_INTELLIGENCE_MASTER_SCHEMA.md
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  DailyBrief,
  ThumbnailOfDay,
  YouTubeHighlight,
  TwitchHighlight,
  TwitchClip,
  TwitchClipsResponse,
  HotGame,
  Insight,
  ThumbnailAnalysis,
  VelocityAlert,
  TimingRecommendation,
  TitlePatterns,
  ThumbnailPatterns,
  TrendHistoryResponse,
  TrendCategory,
  TrendingKeyword,
  TrendingKeywordsResponse,
  YouTubeGameTrendingRequest,
  YouTubeGameTrendingResponse,
  AvailableGame,
  AvailableGamesResponse,
  GameFilter,
  SortBy,
  SortOrder,
  DurationType,
} from '../types/trends';

// ============================================================================
// API Configuration
// ============================================================================

// Get the base URL from apiClient's configuration (uses NEXT_PUBLIC_API_URL or localhost:8000)
const API_BASE = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : 'http://localhost:8000') + '/api/v1';

// Get token from apiClient (in-memory) for authenticated requests
const getToken = () => apiClient.getAccessToken();
const authHeaders = (token: string | null): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

// ============================================================================
// Query Keys
// ============================================================================

export const trendsKeys = {
  all: ['trends'] as const,
  dailyBrief: () => [...trendsKeys.all, 'daily-brief'] as const,
  youtube: () => [...trendsKeys.all, 'youtube'] as const,
  youtubeTrending: (category: string) => [...trendsKeys.youtube(), 'trending', category] as const,
  youtubeSearch: (query: string) => [...trendsKeys.youtube(), 'search', query] as const,
  youtubeGames: (params: YouTubeGameTrendingRequest) => [...trendsKeys.youtube(), 'games', params] as const,
  youtubeAvailableGames: () => [...trendsKeys.youtube(), 'available-games'] as const,
  twitch: () => [...trendsKeys.all, 'twitch'] as const,
  twitchLive: (gameId?: string) => [...trendsKeys.twitch(), 'live', gameId] as const,
  twitchGames: () => [...trendsKeys.twitch(), 'games'] as const,
  twitchClips: (gameId?: string, period?: string) => [...trendsKeys.twitch(), 'clips', gameId, period] as const,
  thumbnail: (videoId: string) => [...trendsKeys.all, 'thumbnail', videoId] as const,
  velocity: () => [...trendsKeys.all, 'velocity'] as const,
  velocityAlerts: () => [...trendsKeys.velocity(), 'alerts'] as const,
  timing: (category: string) => [...trendsKeys.all, 'timing', category] as const,
  history: (days: number) => [...trendsKeys.all, 'history', days] as const,
  keywords: (category: string) => [...trendsKeys.all, 'keywords', category] as const,
};

// ============================================================================
// Transform Functions (snake_case to camelCase)
// ============================================================================

export function transformThumbnailOfDay(data: any): ThumbnailOfDay {
  return {
    videoId: data.video_id,
    title: data.title,
    thumbnail: data.thumbnail,
    channelTitle: data.channel_title,
    views: data.views,
    viralScore: data.viral_score,
    whyItWorks: data.why_it_works,
  };
}

export function transformYouTubeHighlight(data: any): YouTubeHighlight {
  return {
    videoId: data.video_id,
    title: data.title,
    thumbnail: data.thumbnail,
    channelId: data.channel_id,
    channelTitle: data.channel_title,
    category: data.category,
    publishedAt: data.published_at,
    views: data.views ?? data.view_count ?? 0,
    likes: data.likes ?? data.like_count ?? 0,
    commentCount: data.comment_count,
    engagementRate: data.engagement_rate,
    viralScore: data.viral_score,
    velocity: data.velocity,
    insight: data.insight,
    durationSeconds: data.duration_seconds,
    isLive: data.is_live ?? false,
    isShort: data.is_short ?? false,
    tags: data.tags || [],
    // New fields
    description: data.description,
    defaultAudioLanguage: data.default_audio_language,
    hasCaptions: data.has_captions ?? false,
    topicCategories: data.topic_categories || [],
    isLicensed: data.is_licensed ?? false,
    isMadeForKids: data.is_made_for_kids ?? false,
    subscriberCount: data.subscriber_count,
  };
}

export function transformTwitchHighlight(data: any): TwitchHighlight {
  return {
    streamerId: data.streamer_id ?? data.user_id,
    streamerName: data.streamer_name ?? data.user_name,
    gameId: data.game_id,
    gameName: data.game_name,
    viewerCount: data.viewer_count,
    peakViewers: data.peak_viewers,
    thumbnail: data.thumbnail,
    title: data.title,
    startedAt: data.started_at,
    durationMinutes: data.duration_minutes,
    language: data.language,
    tags: data.tags || [],
    isMature: data.is_mature ?? false,
    velocity: data.velocity,
    insight: data.insight,
    // New fields
    followerCount: data.follower_count,
    broadcasterType: data.broadcaster_type,
    profileImageUrl: data.profile_image_url,
  };
}

export function transformTwitchClip(data: any): TwitchClip {
  return {
    id: data.id,
    url: data.url,
    embedUrl: data.embed_url,
    broadcasterId: data.broadcaster_id,
    broadcasterName: data.broadcaster_name,
    creatorId: data.creator_id,
    creatorName: data.creator_name,
    videoId: data.video_id,
    gameId: data.game_id,
    language: data.language,
    title: data.title,
    viewCount: data.view_count ?? 0,
    createdAt: data.created_at,
    thumbnailUrl: data.thumbnail_url,
    duration: data.duration ?? 0,
  };
}

export function transformTrendingKeyword(data: any): TrendingKeyword {
  return {
    keyword: data.keyword,
    count: data.count ?? 0,
    avgViews: data.avg_views,
    avgEngagement: data.avg_engagement,
    source: data.source,
  };
}

export function transformTrendingKeywords(data: any): TrendingKeywordsResponse {
  return {
    titleKeywords: (data.title_keywords || []).map(transformTrendingKeyword),
    tagKeywords: (data.tag_keywords || []).map(transformTrendingKeyword),
    topicKeywords: (data.topic_keywords || []).map(transformTrendingKeyword),
    captionKeywords: (data.caption_keywords || []).map(transformTrendingKeyword),
    hashtags: data.hashtags || [],
    category: data.category,
    generatedAt: data.generated_at,
  };
}

export function transformHotGame(data: any): HotGame {
  return {
    gameId: data.game_id,
    name: data.name,
    twitchViewers: data.twitch_viewers ?? 0,
    twitchStreams: data.twitch_streams ?? 0,
    youtubeVideos: data.youtube_videos,
    youtubeTotalViews: data.youtube_total_views,
    trend: data.trend,
    boxArtUrl: data.box_art_url,
    topTags: data.top_tags || [],
    avgViewersPerStream: data.avg_viewers_per_stream,
    topLanguages: data.top_languages || [],
  };
}

export function transformInsight(data: any): Insight {
  return {
    category: data.category,
    insight: data.insight,
    confidence: data.confidence,
    dataPoints: data.data_points ?? 0,
  };
}

export function transformThumbnailAnalysis(data: any): ThumbnailAnalysis {
  return {
    sourceType: data.source_type,
    sourceId: data.source_id,
    thumbnailUrl: data.thumbnail_url,
    hasFace: data.has_face ?? false,
    faceCount: data.face_count ?? 0,
    faceEmotions: (data.face_emotions || []).map((e: any) => ({
      emotion: e.emotion,
      confidence: e.confidence,
    })),
    hasText: data.has_text ?? false,
    detectedText: data.detected_text || [],
    dominantColors: (data.dominant_colors || []).map((c: any) => ({
      hex: c.hex,
      percentage: c.percentage,
    })),
    colorMood: data.color_mood,
    composition: data.composition,
    complexityScore: data.complexity_score,
    thumbnailScore: data.thumbnail_score,
    analyzedAt: data.analyzed_at,
  };
}

export function transformVelocityAlert(data: any): VelocityAlert {
  return {
    id: data.id,
    alertType: data.alert_type,
    platform: data.platform,
    subjectId: data.subject_id,
    subjectName: data.subject_name,
    subjectThumbnail: data.subject_thumbnail,
    currentValue: data.current_value,
    previousValue: data.previous_value,
    changePercent: data.change_percent,
    velocityScore: data.velocity_score,
    severity: data.severity,
    insight: data.insight,
    isActive: data.is_active,
    detectedAt: data.detected_at,
  };
}

export function transformTimingRecommendation(data: any): TimingRecommendation {
  return {
    bestDay: data.best_day,
    bestHour: data.best_hour,
    bestHourLocal: data.best_hour_local,
    timezone: data.timezone ?? 'UTC',
    confidence: data.confidence,
    dataPoints: data.data_points ?? 0,
  };
}

export function transformTitlePatterns(data: any): TitlePatterns {
  return {
    topWords: (data.top_words || []).map((w: any) => ({
      word: w.word,
      count: w.count,
      avgViews: w.avg_views,
    })),
    avgLength: data.avg_length ?? 0,
    numberUsage: data.number_usage ?? 0,
    emojiUsage: data.emoji_usage ?? 0,
    questionUsage: data.question_usage ?? 0,
  };
}

export function transformThumbnailPatterns(data: any): ThumbnailPatterns {
  return {
    facePercentage: data.face_percentage ?? 0,
    avgColorCount: data.avg_color_count ?? 0,
    textUsage: data.text_usage ?? 0,
    avgComplexity: data.avg_complexity ?? 0,
  };
}

export function transformDailyBrief(data: any): DailyBrief {
  return {
    date: data.brief_date,
    thumbnailOfDay: data.thumbnail_of_day
      ? transformThumbnailOfDay(data.thumbnail_of_day)
      : null,
    youtubeHighlights: (data.youtube_highlights || []).map(transformYouTubeHighlight),
    twitchHighlights: (data.twitch_highlights || []).map(transformTwitchHighlight),
    hotGames: (data.hot_games || []).map(transformHotGame),
    insights: (data.insights || []).map(transformInsight),
    bestUploadTimes: data.best_upload_times
      ? transformTimingRecommendation(data.best_upload_times)
      : null,
    bestStreamTimes: data.best_stream_times
      ? transformTimingRecommendation(data.best_stream_times)
      : null,
    titlePatterns: data.title_patterns
      ? transformTitlePatterns(data.title_patterns)
      : null,
    thumbnailPatterns: data.thumbnail_patterns
      ? transformThumbnailPatterns(data.thumbnail_patterns)
      : null,
  };
}

export function transformTrendHistory(data: any): TrendHistoryResponse {
  return {
    days: data.days,
    youtubeSnapshots: data.youtube_snapshots || [],
    twitchHourly: data.twitch_hourly || [],
    velocityAlerts: (data.velocity_alerts || []).map(transformVelocityAlert),
  };
}

export function transformYouTubeGameTrending(data: any): YouTubeGameTrendingResponse {
  return {
    videos: (data.videos || []).map(transformYouTubeHighlight),
    game: data.game,
    gameDisplayName: data.game_display_name,
    sortBy: data.sort_by || 'views',
    sortOrder: data.sort_order || 'desc',
    filtersApplied: data.filters_applied || {},
    total: data.total || 0,
    page: data.page || 1,
    perPage: data.per_page || 20,
    totalPages: data.total_pages || 1,
    hasMore: data.has_more || false,
    fetchedAt: data.fetched_at,
  };
}

export function transformAvailableGames(data: any): AvailableGamesResponse {
  return {
    games: (data.games || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      query: g.query,
    })),
  };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch today's compiled daily brief with AI insights.
 * Available to all tiers.
 */
export function useDailyBrief(enabled = true) {
  return useQuery({
    queryKey: trendsKeys.dailyBrief(),
    queryFn: async (): Promise<DailyBrief> => {
      const res = await fetch(`${API_BASE}/trends/daily-brief`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch daily brief');
      }
      return transformDailyBrief(await res.json());
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled,
  });
}

/**
 * Fetch YouTube trending videos for a specific category.
 * Available to all tiers.
 */
export function useYouTubeTrending(
  category: TrendCategory = 'gaming',
  limit = 20,
  enabled = true
) {
  return useQuery({
    queryKey: trendsKeys.youtubeTrending(category),
    queryFn: async (): Promise<YouTubeHighlight[]> => {
      const params = new URLSearchParams({
        category,
        limit: String(limit),
      });
      const res = await fetch(`${API_BASE}/trends/youtube/trending?${params}`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch YouTube trending');
      }
      const data = await res.json();
      return (data.videos || []).map(transformYouTubeHighlight);
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled,
  });
}

/**
 * Fetch current top Twitch streams.
 * Available to all tiers. Auto-refreshes every 2 minutes.
 */
export function useTwitchLive(limit = 20, gameId?: string, enabled = true) {
  return useQuery({
    queryKey: trendsKeys.twitchLive(gameId),
    queryFn: async (): Promise<TwitchHighlight[]> => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (gameId) params.set('game_id', gameId);
      const res = await fetch(`${API_BASE}/trends/twitch/live?${params}`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch Twitch live');
      }
      const data = await res.json();
      return (data.streams || []).map(transformTwitchHighlight);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 2, // Auto-refresh every 2 minutes
    enabled,
  });
}

/**
 * Fetch current top games on Twitch.
 * Available to all tiers.
 */
export function useTwitchGames(limit = 20, enabled = true) {
  return useQuery({
    queryKey: trendsKeys.twitchGames(),
    queryFn: async (): Promise<HotGame[]> => {
      const params = new URLSearchParams({ limit: String(limit) });
      const res = await fetch(`${API_BASE}/trends/twitch/games?${params}`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch Twitch games');
      }
      const data = await res.json();
      return (data.games || []).map(transformHotGame);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 2, // Auto-refresh every 2 minutes
    enabled,
  });
}

/**
 * Fetch top Twitch clips for a game.
 * Available to all tiers.
 */
export function useTwitchClips(
  gameId?: string,
  period: 'day' | 'week' | 'month' | 'all' = 'day',
  limit = 20,
  enabled = true
) {
  return useQuery({
    queryKey: trendsKeys.twitchClips(gameId, period),
    queryFn: async (): Promise<TwitchClip[]> => {
      const params = new URLSearchParams({ period, limit: String(limit) });
      if (gameId) params.set('game_id', gameId);
      const res = await fetch(`${API_BASE}/trends/twitch/clips?${params}`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch Twitch clips');
      }
      const data = await res.json();
      return (data.clips || []).map(transformTwitchClip);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}

/**
 * Fetch trending keywords for a category.
 * Available to all tiers.
 */
export function useTrendingKeywords(
  category: TrendCategory = 'gaming',
  enabled = true
) {
  return useQuery({
    queryKey: trendsKeys.keywords(category),
    queryFn: async (): Promise<TrendingKeywordsResponse> => {
      const res = await fetch(`${API_BASE}/trends/keywords/${category}`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch trending keywords');
      }
      return transformTrendingKeywords(await res.json());
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled,
  });
}

/**
 * Fetch AI analysis of a specific thumbnail.
 * Rate limited by tier: Free (3/day), Pro (20/day), Studio (unlimited).
 */
export function useThumbnailAnalysis(videoId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: trendsKeys.thumbnail(videoId ?? ''),
    queryFn: async (): Promise<ThumbnailAnalysis> => {
      const res = await fetch(`${API_BASE}/trends/thumbnail/${videoId}/analysis`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch thumbnail analysis');
      }
      return transformThumbnailAnalysis(await res.json());
    },
    enabled: !!videoId && enabled,
  });
}

/**
 * Fetch active velocity alerts.
 * Studio tier only.
 */
export function useVelocityAlerts(enabled = true) {
  return useQuery({
    queryKey: trendsKeys.velocityAlerts(),
    queryFn: async (): Promise<VelocityAlert[]> => {
      const res = await fetch(`${API_BASE}/trends/velocity/alerts`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch velocity alerts');
      }
      const data = await res.json();
      return (data.alerts || []).map(transformVelocityAlert);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
    enabled,
  });
}

/**
 * Fetch optimal posting/streaming times for a category.
 * Pro+ tier only.
 */
export function useTiming(category: string, enabled = true) {
  return useQuery({
    queryKey: trendsKeys.timing(category),
    queryFn: async (): Promise<TimingRecommendation> => {
      const res = await fetch(`${API_BASE}/trends/timing/${encodeURIComponent(category)}`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch timing recommendation');
      }
      return transformTimingRecommendation(await res.json());
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    enabled,
  });
}

/**
 * Fetch historical trend data.
 * Pro (7 days), Studio (30 days).
 */
export function useTrendHistory(days = 7, enabled = true) {
  return useQuery({
    queryKey: trendsKeys.history(days),
    queryFn: async (): Promise<TrendHistoryResponse> => {
      const params = new URLSearchParams({ days: String(days) });
      const res = await fetch(`${API_BASE}/trends/history?${params}`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch trend history');
      }
      return transformTrendHistory(await res.json());
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled,
  });
}

/**
 * Fetch available games for YouTube filtering.
 * Available to all tiers.
 */
export function useAvailableGames(enabled = true) {
  return useQuery({
    queryKey: trendsKeys.youtubeAvailableGames(),
    queryFn: async (): Promise<AvailableGame[]> => {
      const res = await fetch(`${API_BASE}/trends/youtube/games/available`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch available games');
      }
      const data = transformAvailableGames(await res.json());
      return data.games;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours (games list rarely changes)
    enabled,
  });
}

/**
 * Fetch YouTube gaming videos filtered by game with enterprise pagination.
 * Available to all tiers.
 */
export function useYouTubeGameTrending(
  params: YouTubeGameTrendingRequest = {},
  enabled = true
) {
  return useQuery({
    queryKey: trendsKeys.youtubeGames(params),
    queryFn: async (): Promise<YouTubeGameTrendingResponse> => {
      const searchParams = new URLSearchParams();
      
      if (params.game) searchParams.set('game', params.game);
      if (params.sortBy) searchParams.set('sort_by', params.sortBy);
      if (params.sortOrder) searchParams.set('sort_order', params.sortOrder);
      if (params.durationType) searchParams.set('duration_type', params.durationType);
      if (params.isLive !== undefined) searchParams.set('is_live', String(params.isLive));
      if (params.isShort !== undefined) searchParams.set('is_short', String(params.isShort));
      if (params.hasCaptions !== undefined) searchParams.set('has_captions', String(params.hasCaptions));
      if (params.minViews !== undefined) searchParams.set('min_views', String(params.minViews));
      if (params.maxViews !== undefined) searchParams.set('max_views', String(params.maxViews));
      if (params.minEngagement !== undefined) searchParams.set('min_engagement', String(params.minEngagement));
      if (params.language) searchParams.set('language', params.language);
      if (params.page) searchParams.set('page', String(params.page));
      if (params.perPage) searchParams.set('per_page', String(params.perPage));
      
      const res = await fetch(`${API_BASE}/trends/youtube/games?${searchParams}`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch YouTube game trending');
      }
      return transformYouTubeGameTrending(await res.json());
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Search YouTube for specific niche content.
 * Pro+ tier only. Rate limited: Pro (10/day), Studio (50/day).
 */
export function useYouTubeSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      query,
      category,
      maxResults = 20,
    }: {
      query: string;
      category?: TrendCategory;
      maxResults?: number;
    }): Promise<{ videos: YouTubeHighlight[]; rateLimitRemaining?: number }> => {
      const res = await fetch(`${API_BASE}/trends/youtube/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(getToken()),
        },
        body: JSON.stringify({
          query,
          category,
          max_results: maxResults,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to search YouTube');
      }
      const data = await res.json();
      return {
        videos: (data.videos || []).map(transformYouTubeHighlight),
        rateLimitRemaining: data.rate_limit_remaining,
      };
    },
    onSuccess: (data, { query }) => {
      // Cache the search results
      qc.setQueryData(trendsKeys.youtubeSearch(query), data.videos);
    },
  });
}

// ============================================================================
// Cross-Platform Types & Hook (Studio tier)
// ============================================================================

export interface CrossPlatformData {
  hotGames: HotGame[];
  risingCreators: RisingCreator[];
  message?: string;
}

export interface RisingCreator {
  creatorId: string;
  creatorName: string;
  platform: 'twitch' | 'youtube';
  profileUrl: string;
  thumbnailUrl?: string;
  currentViewers?: number;
  subscriberCount?: number;
  growthPercent: number;
  category?: string;
}

function transformRisingCreator(data: any): RisingCreator {
  return {
    creatorId: data.creator_id,
    creatorName: data.creator_name,
    platform: data.platform,
    profileUrl: data.profile_url,
    thumbnailUrl: data.thumbnail_url,
    currentViewers: data.current_viewers,
    subscriberCount: data.subscriber_count,
    growthPercent: data.growth_percent,
    category: data.category,
  };
}

function transformCrossPlatformData(data: any): CrossPlatformData {
  return {
    hotGames: (data.hot_games || []).map(transformHotGame),
    risingCreators: (data.rising_creators || []).map(transformRisingCreator),
    message: data.message,
  };
}

/**
 * Fetch cross-platform correlation data.
 * Studio tier only. Returns unified trending data correlating YouTube and Twitch.
 */
export function useCrossPlatformTrends(enabled = true) {
  return useQuery({
    queryKey: [...trendsKeys.all, 'cross-platform'] as const,
    queryFn: async (): Promise<CrossPlatformData> => {
      const res = await fetch(`${API_BASE}/trends/cross-platform`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch cross-platform data');
      }
      return transformCrossPlatformData(await res.json());
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}
