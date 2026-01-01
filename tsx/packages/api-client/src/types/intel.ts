/**
 * Creator Intel Types
 * 
 * Types for the unified intelligence dashboard.
 * These are ADDITIVE - do not modify any existing types.
 */

// ============================================================================
// Category Types
// ============================================================================

export interface CategorySubscription {
  key: string;
  name: string;
  twitchId?: string;
  youtubeQuery?: string;
  platform: 'twitch' | 'youtube' | 'both';
  notifications: boolean;
  addedAt: string;
}

export interface AvailableCategory {
  key: string;
  name: string;
  twitchId?: string;
  youtubeQuery?: string;
  platform: 'twitch' | 'youtube' | 'both';
  icon?: string;
  color?: string;
  subscriberCount?: number;
}

// ============================================================================
// Panel Types
// ============================================================================

export type PanelSize = 'tiny' | 'small' | 'wide' | 'large';

export type PanelType = 
  | 'todays_mission'
  | 'viral_clips'
  | 'live_pulse'
  | 'youtube_trending'
  | 'golden_hours'
  | 'niche_opportunities'
  | 'viral_hooks'
  | 'title_formulas'
  | 'thumbnail_patterns'
  | 'competition_meter'
  | 'weekly_heatmap'
  | 'trending_hashtags';

export interface PanelPosition {
  x: number;
  y: number;
}

export interface PanelConfig {
  panelType: PanelType;
  position: PanelPosition;
  size: PanelSize;
}

// ============================================================================
// Preferences Types
// ============================================================================

export interface UserIntelPreferences {
  subscribedCategories: CategorySubscription[];
  dashboardLayout: PanelConfig[];
  timezone: string;
}

export interface UpdatePreferencesRequest {
  dashboardLayout?: PanelConfig[];
  timezone?: string;
}

// ============================================================================
// Activity Types
// ============================================================================

export interface UserIntelActivity {
  categoryEngagement: Record<string, number>;
  activeHours: Record<string, number[]>;
  contentPreferences: Record<string, number>;
  lastMissionShownAt?: string;
  lastMissionActedOn: boolean;
  missionsShownCount: number;
  missionsActedCount: number;
}

export interface TrackActivityRequest {
  eventType: 'category_view' | 'panel_interaction' | 'mission_shown' | 'mission_acted';
  categoryKey?: string;
  panelType?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Mission Types
// ============================================================================

export interface MissionFactors {
  competition: 'low' | 'medium' | 'high';
  viralOpportunity: boolean;
  timing: boolean;
  historyMatch: boolean;
}

export interface TodaysMission {
  recommendation: string;
  confidence: number;
  category: string;
  categoryName: string;
  suggestedTitle: string;
  reasoning: string;
  factors: MissionFactors;
  expiresAt: string;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface IntelDashboardData {
  mission?: TodaysMission;
  viralClips?: unknown[];  // Uses existing ClipRadar types
  livePulse?: unknown;     // Uses existing Trends types
  youtubeTrending?: unknown[];
  goldenHours?: unknown[];
  nicheOpportunities?: unknown[];
  viralHooks?: unknown[];
  titleFormulas?: unknown[];
  thumbnailPatterns?: unknown[];
  competitionMeter?: unknown;
  weeklyHeatmap?: unknown;
  trendingHashtags?: string[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface SubscribeCategoryRequest {
  key: string;
  name: string;
  twitchId?: string;
  youtubeQuery?: string;
  platform: 'twitch' | 'youtube' | 'both';
  notifications?: boolean;
}

export interface SubscribeCategoryResponse {
  success: boolean;
  subscription: CategorySubscription;
  totalSubscriptions: number;
}

export interface UnsubscribeCategoryResponse {
  success: boolean;
  remainingSubscriptions: number;
}
