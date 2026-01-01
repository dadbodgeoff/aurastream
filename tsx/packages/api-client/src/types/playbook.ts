/**
 * Streamer Playbook TypeScript Types
 * Algorithmic Masterclass for Small Streamers
 */

// ============================================================================
// Enums / Literal Types
// ============================================================================

export type StrategyPriority = 'critical' | 'high' | 'medium' | 'low';
export type ContentType = 'stream' | 'video' | 'short' | 'clip';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type ImpactLevel = 'game_changer' | 'significant' | 'moderate' | 'incremental';
export type PlaybookMood = 'bullish' | 'cautious' | 'opportunity' | 'competitive';
export type TimeSensitivity = 'now' | 'today' | 'this_week' | 'evergreen';
export type HookType = 'title' | 'thumbnail' | 'topic' | 'format' | 'hashtag';
export type CardType = 'stat' | 'tip' | 'warning' | 'opportunity' | 'trend' | 'quote';
export type CardColorTheme = 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'cyan';
export type CompetitionLevel = 'low' | 'medium' | 'high';
export type ViewerAvailability = 'low' | 'medium' | 'high';
export type GrowthPotential = 'explosive' | 'high' | 'moderate' | 'stable';

// ============================================================================
// Golden Hours
// ============================================================================

export interface GoldenHourWindow {
  day: string;
  startHour: number;
  endHour: number;
  timezone: string;
  competitionLevel: CompetitionLevel;
  viewerAvailability: ViewerAvailability;
  opportunityScore: number;
  reasoning: string;
}

// ============================================================================
// Weekly Schedule (Heatmap)
// ============================================================================

export interface WeeklyTimeSlot {
  hour: number;
  score: number;
  competition: CompetitionLevel;
  viewers: ViewerAvailability;
}

export interface WeeklySchedule {
  monday: WeeklyTimeSlot[];
  tuesday: WeeklyTimeSlot[];
  wednesday: WeeklyTimeSlot[];
  thursday: WeeklyTimeSlot[];
  friday: WeeklyTimeSlot[];
  saturday: WeeklyTimeSlot[];
  sunday: WeeklyTimeSlot[];
  timezone: string;
  bestSlot?: string;
  aiInsight?: string;
}

// ============================================================================
// Niche Opportunities
// ============================================================================

export interface NicheOpportunity {
  gameOrNiche: string;
  currentViewers: number;
  streamCount: number;
  avgViewersPerStream: number;
  saturationScore: number;
  growthPotential: GrowthPotential;
  whyNow: string;
  suggestedAngle: string;
  thumbnailUrl?: string;
}

// ============================================================================
// Viral Hooks
// ============================================================================

export interface ViralHook {
  hookType: HookType;
  hook: string;
  examples: string[];
  viralityScore: number;
  timeSensitivity: TimeSensitivity;
  usageTip: string;
}

// ============================================================================
// Title & Thumbnail
// ============================================================================

export interface TitleFormula {
  formula: string;
  template: string;
  example: string;
  avgViews: number;
  bestFor: string[];
}

export interface ThumbnailRecipe {
  recipeName: string;
  elements: string[];
  colorPalette: string[];
  textStyle: string;
  emotion: string;
  exampleUrl?: string;
  successRate: number;
}

// ============================================================================
// Content Strategy
// ============================================================================

export interface ContentStrategy {
  strategyId: string;
  title: string;
  description: string;
  whyItWorks: string;
  difficulty: DifficultyLevel;
  timeInvestment: string;
  expectedImpact: ImpactLevel;
  steps: string[];
  proTip?: string;
  toolsNeeded: string[];
}

// ============================================================================
// Video Ideas (AI-Generated)
// ============================================================================

export interface VideoIdea {
  ideaId: string;
  gameOrCategory: string;
  title: string;
  titleReasoning: string;
  hook: string;
  description: string;
  tags: string[];
  tagsReasoning: string;
  thumbnailConcept: string;
  thumbnailText: string;
  thumbnailColors: string[];
  inspiredBy: string;
  inspiredByViews: number;
  whyThisWorks: string;
  difficulty: DifficultyLevel;
  estimatedLength: string;
}

// ============================================================================
// Insight Cards
// ============================================================================

export interface InsightCard {
  cardId: string;
  cardType: CardType;
  icon: string;
  headline: string;
  body: string;
  metric?: string;
  metricLabel?: string;
  actionText?: string;
  actionLink?: string;
  colorTheme: CardColorTheme;
}

// ============================================================================
// Main Playbook Response
// ============================================================================

export interface TodaysPlaybook {
  playbookDate: string;
  generatedAt: string;
  
  // Hero Section
  headline: string;
  subheadline: string;
  mood: PlaybookMood;
  
  // Quick Stats
  totalTwitchViewers: number;
  totalYoutubeGamingViews: number;
  trendingGame: string;
  viralVideoCount: number;
  
  // Content Sections
  goldenHours: GoldenHourWindow[];
  weeklySchedule?: WeeklySchedule;
  nicheOpportunities: NicheOpportunity[];
  viralHooks: ViralHook[];
  titleFormulas: TitleFormula[];
  thumbnailRecipes: ThumbnailRecipe[];
  videoIdeas: VideoIdea[];
  strategies: ContentStrategy[];
  insightCards: InsightCard[];
  
  // Keywords & Hashtags
  trendingHashtags: string[];
  titleKeywords: string[];
  
  // Motivational
  dailyMantra: string;
  successStory?: string;
}

// ============================================================================
// Report List Item
// ============================================================================

export interface PlaybookReportSummary {
  id: string;
  reportDate: string;
  reportTime: string;
  reportTimestamp: string;
  headline: string;
  mood: PlaybookMood;
  trendingGame: string;
}
