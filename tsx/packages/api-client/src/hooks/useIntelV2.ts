/**
 * Creator Intel V2 React Query Hooks
 * 
 * Hooks for the V2 intelligence system with new analyzers:
 * - Content Format (duration, shorts vs longform)
 * - Description (hashtags, timestamps, sponsors)
 * - Semantic (topics, tags, clusters)
 * - Regional (language competition, opportunities)
 * - Live Stream (premieres, scheduling)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

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

export const intelV2Keys = {
  all: ['intel-v2'] as const,
  format: (categoryKey: string) => [...intelV2Keys.all, 'format', categoryKey] as const,
  description: (categoryKey: string) => [...intelV2Keys.all, 'description', categoryKey] as const,
  semantic: (categoryKey: string) => [...intelV2Keys.all, 'semantic', categoryKey] as const,
  regional: (categoryKey: string) => [...intelV2Keys.all, 'regional', categoryKey] as const,
  livestream: (categoryKey: string) => [...intelV2Keys.all, 'livestream', categoryKey] as const,
  combined: (categoryKey: string) => [...intelV2Keys.all, 'combined', categoryKey] as const,
  health: () => [...intelV2Keys.all, 'health'] as const,
  orchestrator: () => [...intelV2Keys.all, 'orchestrator'] as const,
  categories: () => [...intelV2Keys.all, 'categories'] as const,
};


// ============================================================================
// Common Types
// ============================================================================

export interface IntelConfidence {
  score: number;
  label: 'Fresh' | 'Recent' | 'Stale' | 'Old' | 'Expired';
  fetchedAt: string | null;
  hoursOld: number | null;
}

// ============================================================================
// Content Format Types
// ============================================================================

export interface DurationBucket {
  minSeconds: number;
  maxSeconds: number;
  label: string;
  videoCount: number;
  avgViews: number;
  avgEngagement: number;
  totalViews: number;
  performanceIndex: number;
}

export interface FormatComparison {
  formatA: string;
  formatB: string;
  formatACount: number;
  formatBCount: number;
  formatAAvgViews: number;
  formatBAvgViews: number;
  performanceRatio: number;
  recommendation: string;
  confidence: number;
}

export interface ContentFormatIntel {
  categoryKey: string;
  categoryName: string;
  durationBuckets: DurationBucket[];
  optimalDurationRange: string;
  optimalDurationMinSeconds: number;
  optimalDurationMaxSeconds: number;
  shortsVsLongform: FormatComparison;
  liveVsVod: FormatComparison;
  hdVsSd: FormatComparison;
  insights: string[];
  videoCount: number;
  confidence: number;
  analyzedAt: string;
}


// ============================================================================
// Description Types
// ============================================================================

export interface HashtagAnalysis {
  hashtag: string;
  frequency: number;
  avgViews: number;
  appearsInTitle: boolean;
  isTrending: boolean;
}

export interface TimestampPattern {
  patternType: string;
  avgPositionPercent: number;
  frequency: number;
}

export interface SponsorPattern {
  sponsorType: string;
  frequency: number;
  avgViewsWithSponsor: number;
  avgViewsWithoutSponsor: number;
}

export interface DescriptionIntel {
  categoryKey: string;
  categoryName: string;
  topHashtags: HashtagAnalysis[];
  hashtagCountAvg: number;
  hasTimestampsPercent: number;
  commonChapterPatterns: TimestampPattern[];
  hasSponsorPercent: number;
  sponsorPatterns: SponsorPattern[];
  hasSocialLinksPercent: number;
  commonPlatforms: string[];
  insights: string[];
  videoCount: number;
  confidence: number;
  analyzedAt: string;
}


// ============================================================================
// Semantic Types
// ============================================================================

export interface TopicCluster {
  primaryTopic: string;
  relatedTopics: string[];
  videoCount: number;
  avgViews: number;
  performanceIndex: number;
}

export interface TagCluster {
  anchorTag: string;
  coOccurringTags: string[];
  frequency: number;
  avgViews: number;
}

export interface SemanticIntel {
  categoryKey: string;
  categoryName: string;
  topTopics: string[];
  topicClusters: TopicCluster[];
  topicViewCorrelation: Record<string, number>;
  topTagsFull: string[];
  tagClusters: TagCluster[];
  optimalTagCount: number;
  insights: string[];
  videoCount: number;
  confidence: number;
  analyzedAt: string;
}


// ============================================================================
// Regional Types
// ============================================================================

export interface LanguageMetrics {
  languageCode: string;
  languageName: string;
  youtubeVideoCount: number;
  youtubeAvgViews: number;
  youtubeTotalViews: number;
  twitchStreamCount: number;
  twitchAvgViewers: number;
  twitchTotalViewers: number;
  competitionScore: number;
  opportunityScore: number;
  marketSharePercent: number;
}

export interface RegionalIntel {
  categoryKey: string;
  categoryName: string;
  languages: LanguageMetrics[];
  dominantLanguage: string;
  underservedLanguages: string[];
  bestOpportunityLanguage: string;
  opportunityReason: string;
  insights: string[];
  youtubeVideoCount: number;
  twitchStreamCount: number;
  confidence: number;
  analyzedAt: string;
}


// ============================================================================
// Live Stream Types
// ============================================================================

export interface PremiereAnalysis {
  premiereCount: number;
  instantCount: number;
  premiereAvgViews: number;
  instantAvgViews: number;
  performanceRatio: number;
  recommendation: string;
}

export interface ScheduleTimeSlot {
  hourUtc: number;
  dayOfWeek: string;
  premiereCount: number;
  avgViews: number;
  performanceIndex: number;
}

export interface DurationComparison {
  avgStreamDurationMinutes: number;
  avgVideoDurationMinutes: number;
  trimRatio: number;
  optimalTrimRatio: number;
}

export interface LiveStreamIntel {
  categoryKey: string;
  categoryName: string;
  premiereAnalysis: PremiereAnalysis;
  bestPremiereTimes: ScheduleTimeSlot[];
  worstPremiereTimes: ScheduleTimeSlot[];
  durationComparison: DurationComparison | null;
  avgDelaySeconds: number;
  onTimePercent: number;
  insights: string[];
  videoCount: number;
  liveVideoCount: number;
  confidence: number;
  analyzedAt: string;
}


// ============================================================================
// Combined Intel Types
// ============================================================================

export interface CombinedIntel {
  categoryKey: string;
  categoryName: string;
  contentFormat: ContentFormatIntel | null;
  description: DescriptionIntel | null;
  semantic: SemanticIntel | null;
  regional: RegionalIntel | null;
  liveStream: LiveStreamIntel | null;
  confidence: IntelConfidence;
  analyzersAvailable: string[];
  fetchedAt: string;
}

// ============================================================================
// Health Types
// ============================================================================

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  message: string | null;
  lastCheck: string | null;
  details: Record<string, unknown>;
}

export interface IntelHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  timestamp: string;
  components: ComponentHealth[];
}


// ============================================================================
// Orchestrator Types
// ============================================================================

export interface TaskStatus {
  name: string;
  intervalSeconds: number;
  priority: string;
  lastRun: string | null;
  lastSuccess: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  isRunning: boolean;
  nextRun: string | null;
}

export interface QuotaStatus {
  unitsUsed: number;
  unitsRemaining: number;
  unitsLimit: number;
  percentUsed: number;
  windowStart: string | null;
  circuitOpen: boolean;
  circuitOpenUntil: string | null;
}

export interface OrchestratorMetrics {
  tasksExecuted: number;
  tasksSucceeded: number;
  tasksFailed: number;
  successRate: number;
  avgDuration: number;
  lastHealthCheck: string | null;
  startedAt: string | null;
  uptimeSeconds: number;
}

export interface OrchestratorStatus {
  running: boolean;
  metrics: OrchestratorMetrics;
  tasks: Record<string, TaskStatus>;
  quota: QuotaStatus;
}

export interface IntelCategory {
  key: string;
  name: string;
  priority: number;
  refreshHours: number;
}


// ============================================================================
// Transform Functions (snake_case → camelCase)
// ============================================================================

function transformDurationBucket(data: any): DurationBucket {
  return {
    minSeconds: data.min_seconds,
    maxSeconds: data.max_seconds,
    label: data.label,
    videoCount: data.video_count,
    avgViews: data.avg_views,
    avgEngagement: data.avg_engagement,
    totalViews: data.total_views,
    performanceIndex: data.performance_index,
  };
}

function transformFormatComparison(data: any): FormatComparison {
  return {
    formatA: data.format_a,
    formatB: data.format_b,
    formatACount: data.format_a_count,
    formatBCount: data.format_b_count,
    formatAAvgViews: data.format_a_avg_views,
    formatBAvgViews: data.format_b_avg_views,
    performanceRatio: data.performance_ratio,
    recommendation: data.recommendation,
    confidence: data.confidence,
  };
}

function transformContentFormat(data: any): ContentFormatIntel {
  return {
    categoryKey: data.category_key,
    categoryName: data.category_name,
    durationBuckets: (data.duration_buckets || []).map(transformDurationBucket),
    optimalDurationRange: data.optimal_duration_range,
    optimalDurationMinSeconds: data.optimal_duration_min_seconds,
    optimalDurationMaxSeconds: data.optimal_duration_max_seconds,
    shortsVsLongform: transformFormatComparison(data.shorts_vs_longform),
    liveVsVod: transformFormatComparison(data.live_vs_vod),
    hdVsSd: transformFormatComparison(data.hd_vs_sd),
    insights: data.insights || [],
    videoCount: data.video_count,
    confidence: data.confidence,
    analyzedAt: data.analyzed_at,
  };
}


function transformDescription(data: any): DescriptionIntel {
  return {
    categoryKey: data.category_key,
    categoryName: data.category_name,
    topHashtags: (data.top_hashtags || []).map((h: any) => ({
      hashtag: h.hashtag,
      frequency: h.frequency,
      avgViews: h.avg_views,
      appearsInTitle: h.appears_in_title,
      isTrending: h.is_trending,
    })),
    hashtagCountAvg: data.hashtag_count_avg,
    hasTimestampsPercent: data.has_timestamps_percent,
    commonChapterPatterns: (data.common_chapter_patterns || []).map((p: any) => ({
      patternType: p.pattern_type,
      avgPositionPercent: p.avg_position_percent,
      frequency: p.frequency,
    })),
    hasSponsorPercent: data.has_sponsor_percent,
    sponsorPatterns: (data.sponsor_patterns || []).map((s: any) => ({
      sponsorType: s.sponsor_type,
      frequency: s.frequency,
      avgViewsWithSponsor: s.avg_views_with_sponsor,
      avgViewsWithoutSponsor: s.avg_views_without_sponsor,
    })),
    hasSocialLinksPercent: data.has_social_links_percent,
    commonPlatforms: data.common_platforms || [],
    insights: data.insights || [],
    videoCount: data.video_count,
    confidence: data.confidence,
    analyzedAt: data.analyzed_at,
  };
}

function transformSemantic(data: any): SemanticIntel {
  return {
    categoryKey: data.category_key,
    categoryName: data.category_name,
    topTopics: data.top_topics || [],
    topicClusters: (data.topic_clusters || []).map((c: any) => ({
      primaryTopic: c.primary_topic,
      relatedTopics: c.related_topics || [],
      videoCount: c.video_count,
      avgViews: c.avg_views,
      performanceIndex: c.performance_index,
    })),
    topicViewCorrelation: data.topic_view_correlation || {},
    topTagsFull: data.top_tags_full || [],
    tagClusters: (data.tag_clusters || []).map((c: any) => ({
      anchorTag: c.anchor_tag,
      coOccurringTags: c.co_occurring_tags || [],
      frequency: c.frequency,
      avgViews: c.avg_views,
    })),
    optimalTagCount: data.optimal_tag_count,
    insights: data.insights || [],
    videoCount: data.video_count,
    confidence: data.confidence,
    analyzedAt: data.analyzed_at,
  };
}


function transformRegional(data: any): RegionalIntel {
  return {
    categoryKey: data.category_key,
    categoryName: data.category_name,
    languages: (data.languages || []).map((l: any) => ({
      languageCode: l.language_code,
      languageName: l.language_name,
      youtubeVideoCount: l.youtube_video_count,
      youtubeAvgViews: l.youtube_avg_views,
      youtubeTotalViews: l.youtube_total_views,
      twitchStreamCount: l.twitch_stream_count,
      twitchAvgViewers: l.twitch_avg_viewers,
      twitchTotalViewers: l.twitch_total_viewers,
      competitionScore: l.competition_score,
      opportunityScore: l.opportunity_score,
      marketSharePercent: l.market_share_percent,
    })),
    dominantLanguage: data.dominant_language,
    underservedLanguages: data.underserved_languages || [],
    bestOpportunityLanguage: data.best_opportunity_language,
    opportunityReason: data.opportunity_reason,
    insights: data.insights || [],
    youtubeVideoCount: data.youtube_video_count,
    twitchStreamCount: data.twitch_stream_count,
    confidence: data.confidence,
    analyzedAt: data.analyzed_at,
  };
}

function transformLiveStream(data: any): LiveStreamIntel {
  return {
    categoryKey: data.category_key,
    categoryName: data.category_name,
    premiereAnalysis: {
      premiereCount: data.premiere_analysis?.premiere_count || 0,
      instantCount: data.premiere_analysis?.instant_count || 0,
      premiereAvgViews: data.premiere_analysis?.premiere_avg_views || 0,
      instantAvgViews: data.premiere_analysis?.instant_avg_views || 0,
      performanceRatio: data.premiere_analysis?.performance_ratio || 0,
      recommendation: data.premiere_analysis?.recommendation || '',
    },
    bestPremiereTimes: (data.best_premiere_times || []).map((t: any) => ({
      hourUtc: t.hour_utc,
      dayOfWeek: t.day_of_week,
      premiereCount: t.premiere_count,
      avgViews: t.avg_views,
      performanceIndex: t.performance_index,
    })),
    worstPremiereTimes: (data.worst_premiere_times || []).map((t: any) => ({
      hourUtc: t.hour_utc,
      dayOfWeek: t.day_of_week,
      premiereCount: t.premiere_count,
      avgViews: t.avg_views,
      performanceIndex: t.performance_index,
    })),
    durationComparison: data.duration_comparison ? {
      avgStreamDurationMinutes: data.duration_comparison.avg_stream_duration_minutes,
      avgVideoDurationMinutes: data.duration_comparison.avg_video_duration_minutes,
      trimRatio: data.duration_comparison.trim_ratio,
      optimalTrimRatio: data.duration_comparison.optimal_trim_ratio,
    } : null,
    avgDelaySeconds: data.avg_delay_seconds,
    onTimePercent: data.on_time_percent,
    insights: data.insights || [],
    videoCount: data.video_count,
    liveVideoCount: data.live_video_count,
    confidence: data.confidence,
    analyzedAt: data.analyzed_at,
  };
}


function transformCombined(data: any): CombinedIntel {
  return {
    categoryKey: data.category_key,
    categoryName: data.category_name,
    contentFormat: data.content_format ? transformContentFormat(data.content_format) : null,
    description: data.description ? transformDescription(data.description) : null,
    semantic: data.semantic ? transformSemantic(data.semantic) : null,
    regional: data.regional ? transformRegional(data.regional) : null,
    liveStream: data.live_stream ? transformLiveStream(data.live_stream) : null,
    confidence: {
      score: data.confidence?.score || 0,
      label: data.confidence?.label || 'Unknown',
      fetchedAt: data.confidence?.fetched_at || null,
      hoursOld: data.confidence?.hours_old || null,
    },
    analyzersAvailable: data.analyzers_available || [],
    fetchedAt: data.fetched_at,
  };
}

function transformHealth(data: any): IntelHealth {
  return {
    status: data.status,
    timestamp: data.timestamp,
    components: (data.components || []).map((c: any) => ({
      name: c.name,
      status: c.status,
      message: c.message || null,
      lastCheck: c.last_check || null,
      details: c.details || {},
    })),
  };
}

function transformOrchestratorStatus(data: any): OrchestratorStatus {
  const tasks: Record<string, TaskStatus> = {};
  for (const [key, value] of Object.entries(data.tasks || {})) {
    const t = value as any;
    tasks[key] = {
      name: t.name,
      intervalSeconds: t.interval_seconds,
      priority: t.priority,
      lastRun: t.last_run || null,
      lastSuccess: t.last_success || null,
      lastError: t.last_error || null,
      consecutiveFailures: t.consecutive_failures || 0,
      isRunning: t.is_running || false,
      nextRun: t.next_run || null,
    };
  }
  return {
    running: data.running,
    metrics: {
      tasksExecuted: data.metrics?.tasks_executed || 0,
      tasksSucceeded: data.metrics?.tasks_succeeded || 0,
      tasksFailed: data.metrics?.tasks_failed || 0,
      successRate: data.metrics?.success_rate || 0,
      avgDuration: data.metrics?.avg_duration || 0,
      lastHealthCheck: data.metrics?.last_health_check || null,
      startedAt: data.metrics?.started_at || null,
      uptimeSeconds: data.metrics?.uptime_seconds || 0,
    },
    tasks,
    quota: {
      unitsUsed: data.quota?.units_used || 0,
      unitsRemaining: data.quota?.units_remaining || 10000,
      unitsLimit: data.quota?.units_limit || 10000,
      percentUsed: data.quota?.percent_used || 0,
      windowStart: data.quota?.window_start || null,
      circuitOpen: data.quota?.circuit_open || false,
      circuitOpenUntil: data.quota?.circuit_open_until || null,
    },
  };
}


// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch content format analysis for a category.
 * Returns optimal duration, shorts vs long-form comparison, and format insights.
 */
export function useContentFormatIntel(categoryKey: string, enabled = true) {
  return useQuery({
    queryKey: intelV2Keys.format(categoryKey),
    queryFn: async (): Promise<ContentFormatIntel> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/${categoryKey}/format`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch content format intel');
      }
      return transformContentFormat(await res.json());
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled: enabled && !!categoryKey,
  });
}

/**
 * Fetch description analysis for a category.
 * Returns hashtag analysis, timestamp patterns, and sponsor insights.
 */
export function useDescriptionIntel(categoryKey: string, enabled = true) {
  return useQuery({
    queryKey: intelV2Keys.description(categoryKey),
    queryFn: async (): Promise<DescriptionIntel> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/${categoryKey}/description`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch description intel');
      }
      return transformDescription(await res.json());
    },
    staleTime: 1000 * 60 * 30,
    enabled: enabled && !!categoryKey,
  });
}


/**
 * Fetch semantic analysis for a category.
 * Returns topic clusters, tag analysis, and optimal tag count.
 */
export function useSemanticIntel(categoryKey: string, enabled = true) {
  return useQuery({
    queryKey: intelV2Keys.semantic(categoryKey),
    queryFn: async (): Promise<SemanticIntel> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/${categoryKey}/semantic`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch semantic intel');
      }
      return transformSemantic(await res.json());
    },
    staleTime: 1000 * 60 * 30,
    enabled: enabled && !!categoryKey,
  });
}

/**
 * Fetch regional analysis for a category.
 * Returns language breakdown, competition scores, and opportunity analysis.
 */
export function useRegionalIntel(categoryKey: string, enabled = true) {
  return useQuery({
    queryKey: intelV2Keys.regional(categoryKey),
    queryFn: async (): Promise<RegionalIntel> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/${categoryKey}/regional`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch regional intel');
      }
      return transformRegional(await res.json());
    },
    staleTime: 1000 * 60 * 30,
    enabled: enabled && !!categoryKey,
  });
}


/**
 * Fetch live stream analysis for a category.
 * Returns premiere analysis, scheduling insights, and duration comparison.
 */
export function useLiveStreamIntel(categoryKey: string, enabled = true) {
  return useQuery({
    queryKey: intelV2Keys.livestream(categoryKey),
    queryFn: async (): Promise<LiveStreamIntel> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/${categoryKey}/livestream`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch live stream intel');
      }
      return transformLiveStream(await res.json());
    },
    staleTime: 1000 * 60 * 30,
    enabled: enabled && !!categoryKey,
  });
}

/**
 * Fetch all intel for a category in one request.
 * Returns all available analysis types combined.
 */
export function useCombinedIntel(categoryKey: string, enabled = true) {
  return useQuery({
    queryKey: intelV2Keys.combined(categoryKey),
    queryFn: async (): Promise<CombinedIntel> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/${categoryKey}/combined`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch combined intel');
      }
      return transformCombined(await res.json());
    },
    staleTime: 1000 * 60 * 15, // 15 minutes for combined
    enabled: enabled && !!categoryKey,
  });
}


/**
 * Fetch system health status.
 * Returns health status for all components.
 */
export function useIntelHealth(enabled = true) {
  return useQuery({
    queryKey: intelV2Keys.health(),
    queryFn: async (): Promise<IntelHealth> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/health`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch intel health');
      }
      return transformHealth(await res.json());
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Auto-refresh every minute
    enabled,
  });
}

/**
 * Fetch orchestrator status.
 * Returns task status, metrics, and quota information.
 */
export function useOrchestratorStatus(enabled = true) {
  return useQuery({
    queryKey: intelV2Keys.orchestrator(),
    queryFn: async (): Promise<OrchestratorStatus> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/orchestrator/status`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch orchestrator status');
      }
      return transformOrchestratorStatus(await res.json());
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
    enabled,
  });
}

/**
 * Fetch list of tracked categories.
 * Returns all categories with intel data available.
 */
export function useIntelCategories(enabled = true) {
  return useQuery({
    queryKey: intelV2Keys.categories(),
    queryFn: async (): Promise<IntelCategory[]> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/categories`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch intel categories');
      }
      const data = await res.json();
      return data.map((c: any) => ({
        key: c.key,
        name: c.name,
        priority: c.priority,
        refreshHours: c.refresh_hours,
      }));
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled,
  });
}


// ============================================================================
// Mutation Types
// ============================================================================

export interface TriggerAnalysisRequest {
  categoryKey: string;
  analyzers?: string[];
  forceRefresh?: boolean;
}

export interface TriggerAnalysisResponse {
  categoryKey: string;
  analyzersRun: string[];
  analyzersSucceeded: string[];
  analyzersFailed: string[];
  successRate: number;
  durationSeconds: number;
  timestamp: string;
  errors: Record<string, string>;
}


// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Trigger analysis for a category.
 * Runs specified analyzers (or all) and returns results.
 */
export function useTriggerAnalysis() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: TriggerAnalysisRequest): Promise<TriggerAnalysisResponse> => {
      const token = getToken();
      const res = await fetch(`${API_BASE}/intel/${request.categoryKey}/analyze`, {
        method: 'POST',
        headers: {
          ...authHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_key: request.categoryKey,
          analyzers: request.analyzers || null,
          force_refresh: request.forceRefresh || false,
        }),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to trigger analysis');
      }
      
      const data = await res.json();
      return {
        categoryKey: data.category_key,
        analyzersRun: data.analyzers_run || [],
        analyzersSucceeded: data.analyzers_succeeded || [],
        analyzersFailed: data.analyzers_failed || [],
        successRate: data.success_rate || 0,
        durationSeconds: data.duration_seconds || 0,
        timestamp: data.timestamp,
        errors: data.errors || {},
      };
    },
    onSuccess: (data) => {
      // Invalidate all intel queries for this category to refetch fresh data
      queryClient.invalidateQueries({ queryKey: intelV2Keys.format(data.categoryKey) });
      queryClient.invalidateQueries({ queryKey: intelV2Keys.description(data.categoryKey) });
      queryClient.invalidateQueries({ queryKey: intelV2Keys.semantic(data.categoryKey) });
      queryClient.invalidateQueries({ queryKey: intelV2Keys.regional(data.categoryKey) });
      queryClient.invalidateQueries({ queryKey: intelV2Keys.livestream(data.categoryKey) });
      queryClient.invalidateQueries({ queryKey: intelV2Keys.combined(data.categoryKey) });
    },
  });
}

/**
 * Prefetch intel data for a category.
 * Useful for preloading data before navigation.
 */
export function usePrefetchIntel() {
  const queryClient = useQueryClient();
  
  return async (categoryKey: string) => {
    await queryClient.prefetchQuery({
      queryKey: intelV2Keys.combined(categoryKey),
      queryFn: async (): Promise<CombinedIntel> => {
        const token = getToken();
        const res = await fetch(`${API_BASE}/intel/${categoryKey}/combined`, {
          headers: authHeaders(token),
        });
        if (!res.ok) throw new Error('Failed to prefetch');
        return transformCombined(await res.json());
      },
      staleTime: 1000 * 60 * 15,
    });
  };
}
