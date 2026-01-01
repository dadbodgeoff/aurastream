/**
 * Trend Intelligence TypeScript Types
 * All properties use camelCase (backend uses snake_case).
 * 
 * @see docs/TREND_INTELLIGENCE_MASTER_SCHEMA.md
 */

// ============================================================================
// Enums / Literal Types
// ============================================================================

export type TrendCategory = 'gaming' | 'entertainment' | 'music' | 'education';
export type TrendVelocity = 'rising' | 'stable' | 'falling';
export type AlertType = 'game_spike' | 'video_viral' | 'streamer_rising';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ColorMood = 'warm' | 'cool' | 'neutral' | 'vibrant';
export type Composition = 'centered' | 'rule_of_thirds' | 'left_heavy' | 'right_heavy';
export type InsightCategory = 'thumbnail' | 'title' | 'timing' | 'game' | 'general';

// Game filtering types
export type GameFilter = 
  | 'fortnite' 
  | 'warzone' 
  | 'valorant' 
  | 'minecraft' 
  | 'arc_raiders'
  | 'league_of_legends' 
  | 'apex_legends' 
  | 'gta' 
  | 'roblox' 
  | 'call_of_duty';

export type SortBy = 'views' | 'likes' | 'engagement' | 'date' | 'duration';
export type SortOrder = 'asc' | 'desc';
export type DurationType = 'short' | 'medium' | 'long' | 'any';

// ============================================================================
// Daily Brief Types
// ============================================================================

export interface DailyBrief {
  date: string;
  thumbnailOfDay: ThumbnailOfDay | null;
  youtubeHighlights: YouTubeHighlight[];
  twitchHighlights: TwitchHighlight[];
  hotGames: HotGame[];
  insights: Insight[];
  bestUploadTimes: TimingRecommendation | null;
  bestStreamTimes: TimingRecommendation | null;
  titlePatterns: TitlePatterns | null;
  thumbnailPatterns: ThumbnailPatterns | null;
}

export interface ThumbnailOfDay {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  views: number;
  viralScore: number;
  whyItWorks: string;
}

// ============================================================================
// YouTube Types
// ============================================================================

export interface YouTubeHighlight {
  videoId: string;
  title: string;
  thumbnail: string;
  channelId?: string;
  channelTitle: string;
  category?: string;
  publishedAt?: string;
  views: number;
  likes: number;
  commentCount?: number;
  engagementRate?: number;
  viralScore?: number;
  velocity?: TrendVelocity;
  insight?: string;
  durationSeconds?: number;
  isLive: boolean;
  isShort: boolean;
  tags: string[];
  // New fields
  description?: string;
  defaultAudioLanguage?: string;
  hasCaptions: boolean;
  topicCategories: string[];
  isLicensed: boolean;
  isMadeForKids: boolean;
  subscriberCount?: number;
}

export interface YouTubeTrendingResponse {
  videos: YouTubeHighlight[];
  category: string;
  region: string;
  fetchedAt: string;
}

export interface YouTubeSearchRequest {
  query: string;
  category?: TrendCategory;
  maxResults?: number;
}

export interface YouTubeSearchResponse {
  videos: YouTubeHighlight[];
  query: string;
  resultCount: number;
  rateLimitRemaining?: number;
}

// Game-specific YouTube types
export interface YouTubeGameTrendingRequest {
  game?: GameFilter;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  durationType?: DurationType;
  isLive?: boolean;
  isShort?: boolean;
  hasCaptions?: boolean;
  minViews?: number;
  maxViews?: number;
  minEngagement?: number;
  language?: string;
  page?: number;
  perPage?: number;
}

export interface YouTubeGameTrendingResponse {
  videos: YouTubeHighlight[];
  game?: string;
  gameDisplayName?: string;
  sortBy: string;
  sortOrder: string;
  filtersApplied: Record<string, unknown>;
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasMore: boolean;
  fetchedAt: string;
}

export interface AvailableGame {
  id: string;
  name: string;
  query: string;
}

export interface AvailableGamesResponse {
  games: AvailableGame[];
}

// ============================================================================
// Twitch Types
// ============================================================================

export interface TwitchHighlight {
  streamerId: string;
  streamerName: string;
  gameId: string;
  gameName: string;
  viewerCount: number;
  peakViewers?: number;
  thumbnail: string;
  title: string;
  startedAt?: string;
  durationMinutes?: number;
  language?: string;
  tags: string[];
  isMature: boolean;
  velocity?: TrendVelocity;
  insight?: string;
  // New fields
  followerCount?: number;
  broadcasterType?: string;
  profileImageUrl?: string;
}

export interface TwitchClip {
  id: string;
  url: string;
  embedUrl: string;
  broadcasterId: string;
  broadcasterName: string;
  creatorId: string;
  creatorName: string;
  videoId?: string;
  gameId: string;
  language: string;
  title: string;
  viewCount: number;
  createdAt: string;
  thumbnailUrl: string;
  duration: number;
}

export interface TwitchClipsResponse {
  clips: TwitchClip[];
  gameId?: string;
  period: string;
  fetchedAt: string;
}

export interface TwitchLiveResponse {
  streams: TwitchHighlight[];
  totalViewers: number;
  fetchedAt: string;
}

export interface HotGame {
  gameId: string;
  name: string;
  twitchViewers: number;
  twitchStreams: number;
  youtubeVideos?: number;
  youtubeTotalViews?: number;
  trend?: TrendVelocity;
  boxArtUrl?: string;
  topTags: string[];
  avgViewersPerStream?: number;
  topLanguages: string[];
}

export interface TwitchGamesResponse {
  games: HotGame[];
  fetchedAt: string;
}

// ============================================================================
// Thumbnail Analysis Types
// ============================================================================

export interface FaceEmotion {
  emotion: string;
  confidence: number;
}

export interface DominantColor {
  hex: string;
  percentage: number;
}

export interface ThumbnailAnalysis {
  sourceType?: string;
  sourceId?: string;
  thumbnailUrl?: string;
  hasFace: boolean;
  faceCount: number;
  faceEmotions: FaceEmotion[];
  hasText: boolean;
  detectedText: string[];
  dominantColors: DominantColor[];
  colorMood?: ColorMood;
  composition?: Composition;
  complexityScore?: number;
  thumbnailScore?: number;
  analyzedAt?: string;
}

// ============================================================================
// Velocity Alert Types
// ============================================================================

export interface VelocityAlert {
  id: string;
  alertType: AlertType;
  platform: 'youtube' | 'twitch';
  subjectId: string;
  subjectName: string;
  subjectThumbnail?: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  velocityScore: number;
  severity: AlertSeverity;
  insight?: string;
  isActive?: boolean;
  detectedAt: string;
}

export interface VelocityAlertsResponse {
  alerts: VelocityAlert[];
  totalActive: number;
}

// ============================================================================
// Timing Types
// ============================================================================

export interface TimingRecommendation {
  bestDay: string;
  bestHour: number;
  bestHourLocal: string;
  timezone: string;
  confidence: number;
  dataPoints: number;
}

// ============================================================================
// Insight Types
// ============================================================================

export interface Insight {
  category: InsightCategory;
  insight: string;
  confidence: number;
  dataPoints: number;
}

// ============================================================================
// Pattern Analysis Types
// ============================================================================

export interface TopWord {
  word: string;
  count: number;
  avgViews: number;
}

export interface TitlePatterns {
  topWords: TopWord[];
  avgLength: number;
  numberUsage: number;
  emojiUsage: number;
  questionUsage: number;
}

export interface TrendingKeyword {
  keyword: string;
  count: number;
  avgViews?: number;
  avgEngagement?: number;
  source: 'title' | 'tag' | 'topic' | 'description';
}

export interface TrendingKeywordsResponse {
  titleKeywords: TrendingKeyword[];
  tagKeywords: TrendingKeyword[];
  topicKeywords: TrendingKeyword[];
  captionKeywords: TrendingKeyword[];
  hashtags: string[];
  category: string;
  generatedAt: string;
}

export interface ThumbnailPatterns {
  facePercentage: number;
  avgColorCount: number;
  textUsage: number;
  avgComplexity: number;
}

// ============================================================================
// History Types
// ============================================================================

export interface TrendHistoryResponse {
  days: number;
  youtubeSnapshots: Record<string, unknown>[];
  twitchHourly: Record<string, unknown>[];
  velocityAlerts: VelocityAlert[];
}
