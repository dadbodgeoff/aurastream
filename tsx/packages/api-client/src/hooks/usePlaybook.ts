/**
 * Playbook React Query Hooks
 * 
 * Provides hooks for fetching and managing playbook reports.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  TodaysPlaybook,
  PlaybookReportSummary,
  GoldenHourWindow,
  NicheOpportunity,
  ViralHook,
  TitleFormula,
  ThumbnailRecipe,
  ContentStrategy,
  InsightCard,
  WeeklySchedule,
  WeeklyTimeSlot,
  VideoIdea,
} from '../types/playbook';

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

export const playbookKeys = {
  all: ['playbook'] as const,
  latest: () => [...playbookKeys.all, 'latest'] as const,
  reports: () => [...playbookKeys.all, 'reports'] as const,
  report: (id: string) => [...playbookKeys.all, 'report', id] as const,
  unviewedCount: () => [...playbookKeys.all, 'unviewed'] as const,
};

// ============================================================================
// Transform Functions (snake_case to camelCase)
// ============================================================================

function transformGoldenHour(data: any): GoldenHourWindow {
  return {
    day: data.day,
    startHour: data.start_hour,
    endHour: data.end_hour,
    timezone: data.timezone || 'UTC',
    competitionLevel: data.competition_level,
    viewerAvailability: data.viewer_availability,
    opportunityScore: data.opportunity_score,
    reasoning: data.reasoning,
  };
}

function transformNicheOpportunity(data: any): NicheOpportunity {
  return {
    gameOrNiche: data.game_or_niche,
    currentViewers: data.current_viewers || 0,
    streamCount: data.stream_count || 0,
    avgViewersPerStream: data.avg_viewers_per_stream || 0,
    saturationScore: data.saturation_score,
    growthPotential: data.growth_potential,
    whyNow: data.why_now,
    suggestedAngle: data.suggested_angle,
    thumbnailUrl: data.thumbnail_url,
  };
}

function transformViralHook(data: any): ViralHook {
  return {
    hookType: data.hook_type,
    hook: data.hook,
    examples: data.examples || [],
    viralityScore: data.virality_score,
    timeSensitivity: data.time_sensitivity,
    usageTip: data.usage_tip,
  };
}

function transformTitleFormula(data: any): TitleFormula {
  return {
    formula: data.formula,
    template: data.template,
    example: data.example,
    avgViews: data.avg_views || 0,
    bestFor: data.best_for || [],
  };
}

function transformThumbnailRecipe(data: any): ThumbnailRecipe {
  return {
    recipeName: data.recipe_name,
    elements: data.elements || [],
    colorPalette: data.color_palette || [],
    textStyle: data.text_style,
    emotion: data.emotion,
    exampleUrl: data.example_url,
    successRate: data.success_rate,
  };
}

function transformStrategy(data: any): ContentStrategy {
  return {
    strategyId: data.strategy_id,
    title: data.title,
    description: data.description,
    whyItWorks: data.why_it_works,
    difficulty: data.difficulty,
    timeInvestment: data.time_investment,
    expectedImpact: data.expected_impact,
    steps: data.steps || [],
    proTip: data.pro_tip,
    toolsNeeded: data.tools_needed || [],
  };
}

function transformInsightCard(data: any): InsightCard {
  return {
    cardId: data.card_id,
    cardType: data.card_type,
    icon: data.icon,
    headline: data.headline,
    body: data.body,
    metric: data.metric,
    metricLabel: data.metric_label,
    actionText: data.action_text,
    actionLink: data.action_link,
    colorTheme: data.color_theme || 'purple',
  };
}

function transformVideoIdea(data: any): VideoIdea {
  return {
    ideaId: data.idea_id,
    gameOrCategory: data.game_or_category,
    title: data.title,
    titleReasoning: data.title_reasoning || '',
    hook: data.hook,
    description: data.description,
    tags: data.tags || [],
    tagsReasoning: data.tags_reasoning || '',
    thumbnailConcept: data.thumbnail_concept,
    thumbnailText: data.thumbnail_text,
    thumbnailColors: data.thumbnail_colors || [],
    inspiredBy: data.inspired_by,
    inspiredByViews: data.inspired_by_views || 0,
    whyThisWorks: data.why_this_works || '',
    difficulty: data.difficulty,
    estimatedLength: data.estimated_length,
  };
}

function transformWeeklyTimeSlot(data: any): WeeklyTimeSlot {
  return {
    hour: data.hour,
    score: data.score,
    competition: data.competition,
    viewers: data.viewers,
  };
}

function transformWeeklySchedule(data: any): WeeklySchedule | undefined {
  if (!data) return undefined;
  return {
    monday: (data.monday || []).map(transformWeeklyTimeSlot),
    tuesday: (data.tuesday || []).map(transformWeeklyTimeSlot),
    wednesday: (data.wednesday || []).map(transformWeeklyTimeSlot),
    thursday: (data.thursday || []).map(transformWeeklyTimeSlot),
    friday: (data.friday || []).map(transformWeeklyTimeSlot),
    saturday: (data.saturday || []).map(transformWeeklyTimeSlot),
    sunday: (data.sunday || []).map(transformWeeklyTimeSlot),
    timezone: data.timezone || 'UTC',
    bestSlot: data.best_slot,
    aiInsight: data.ai_insight,
  };
}

function transformPlaybook(data: any): TodaysPlaybook {
  return {
    playbookDate: data.playbook_date,
    generatedAt: data.generated_at,
    headline: data.headline,
    subheadline: data.subheadline,
    mood: data.mood,
    totalTwitchViewers: data.total_twitch_viewers || 0,
    totalYoutubeGamingViews: data.total_youtube_gaming_views || 0,
    trendingGame: data.trending_game || '',
    viralVideoCount: data.viral_video_count || 0,
    goldenHours: (data.golden_hours || []).map(transformGoldenHour),
    weeklySchedule: transformWeeklySchedule(data.weekly_schedule),
    nicheOpportunities: (data.niche_opportunities || []).map(transformNicheOpportunity),
    viralHooks: (data.viral_hooks || []).map(transformViralHook),
    titleFormulas: (data.title_formulas || []).map(transformTitleFormula),
    thumbnailRecipes: (data.thumbnail_recipes || []).map(transformThumbnailRecipe),
    videoIdeas: (data.video_ideas || []).map(transformVideoIdea),
    strategies: (data.strategies || []).map(transformStrategy),
    insightCards: (data.insight_cards || []).map(transformInsightCard),
    trendingHashtags: data.trending_hashtags || [],
    titleKeywords: data.title_keywords || [],
    dailyMantra: data.daily_mantra || '',
    successStory: data.success_story,
  };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch the latest playbook report.
 */
export function useLatestPlaybook(enabled = true) {
  return useQuery({
    queryKey: playbookKeys.latest(),
    queryFn: async (): Promise<TodaysPlaybook> => {
      const res = await fetch(`${API_BASE}/playbook/latest`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch playbook');
      }
      return transformPlaybook(await res.json());
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}

/**
 * Fetch list of recent playbook reports.
 */
export function usePlaybookReports(limit = 20, enabled = true) {
  return useQuery({
    queryKey: playbookKeys.reports(),
    queryFn: async (): Promise<PlaybookReportSummary[]> => {
      const params = new URLSearchParams({ limit: String(limit) });
      const res = await fetch(`${API_BASE}/playbook/reports?${params}`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch reports');
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}

/**
 * Fetch a specific playbook report by ID.
 */
export function usePlaybookReport(reportId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: playbookKeys.report(reportId ?? ''),
    queryFn: async (): Promise<TodaysPlaybook> => {
      const res = await fetch(`${API_BASE}/playbook/reports/${reportId}`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch report');
      }
      return transformPlaybook(await res.json());
    },
    staleTime: 1000 * 60 * 60, // 1 hour (historical reports don't change)
    enabled: !!reportId && enabled,
  });
}

/**
 * Fetch unviewed report count for badge display.
 */
export function useUnviewedPlaybookCount(enabled = true) {
  return useQuery({
    queryKey: playbookKeys.unviewedCount(),
    queryFn: async (): Promise<number> => {
      const res = await fetch(`${API_BASE}/playbook/unviewed-count`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        return 0;
      }
      const data = await res.json();
      return data.unviewedCount || 0;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}
