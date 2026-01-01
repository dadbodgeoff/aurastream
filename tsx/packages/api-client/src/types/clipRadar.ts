/**
 * Clip Radar Types - Viral Clip Velocity Tracker
 */

// =============================================================================
// Live Clip Types
// =============================================================================

export interface ViralClip {
  /** Unique clip identifier - use this as React key */
  id: string;
  /** Alias for id (backend uses clip_id) */
  clipId: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  broadcasterName: string;
  creatorName: string;
  gameId: string;
  gameName: string;
  language: string;
  duration: number;
  viewCount: number;
  /** Views per minute - raw velocity value */
  velocity: number;
  /** Normalized velocity score (0-100) for UI display */
  velocityScore: number;
  totalGained: number;
  ageMinutes: number;
  alertReason: string;
  createdAt: string;
}

export interface FreshClip {
  clipId: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  broadcasterName: string;
  creatorName: string;
  gameId: string;
  gameName: string;
  language: string;
  duration: number;
  viewCount: number;
  velocity: number;
  ageMinutes: number;
  createdAt: string;
}

export interface ViralClipsResponse {
  clips: ViralClip[];
  total: number;
  lastPoll: string | null;
  categoriesTracked: number;
}

export interface FreshClipsResponse {
  clips: FreshClip[];
  total: number;
  maxAgeMinutes: number;
}

export interface RadarStatus {
  isActive: boolean;
  lastPoll: string | null;
  categoriesTracked: number;
  categoryList: TrackedCategory[];
}

export interface TrackedCategory {
  gameId: string;
  gameName: string;
}

// =============================================================================
// Recap Types
// =============================================================================

export interface RecapClip {
  clipId: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  broadcasterName: string;
  gameId?: string;
  gameName?: string;
  viewCount: number;
  velocity: number;
  alertReason?: string;
}

export interface DailyRecap {
  recapDate: string;
  totalClipsTracked: number;
  totalViralClips: number;
  totalViewsTracked: number;
  peakVelocity: number;
  topClips: RecapClip[];
  categoryStats: Record<string, CategorySummary>;
  pollsCount: number;
  firstPollAt: string | null;
  lastPollAt: string | null;
}

export interface CategorySummary {
  gameName: string;
  totalClips: number;
  viralCount: number;
}

export interface CategoryRecap {
  gameId: string;
  gameName: string;
  totalClips: number;
  totalViews: number;
  viralClipsCount: number;
  avgVelocity: number;
  peakVelocity: number;
  topClips: RecapClip[];
  hourlyActivity: HourlyActivity[];
}

export interface HourlyActivity {
  clips: number;
  views: number;
}

export interface RecapListResponse {
  recaps: DailyRecap[];
  total: number;
}

// =============================================================================
// Poll Result Types
// =============================================================================

export interface PollResult {
  success: boolean;
  message: string;
  categories: number;
  totalClips: number;
  viralClips: number;
  byCategory: CategoryPollResult[];
}

export interface CategoryPollResult {
  gameId: string;
  gameName: string;
  clips: number;
  viral: number;
  avgVelocity: number;
}
