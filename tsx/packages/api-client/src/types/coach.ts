// Coach Types for Prompt Coach Feature
// Types for the AI-powered prompt coaching system

// Asset types supported by the coach
export type CoachAssetType = 
  | 'twitch_emote' 
  | 'youtube_thumbnail' 
  | 'twitch_banner' 
  | 'twitch_badge' 
  | 'twitch_panel'
  | 'twitch_offline'
  | 'overlay' 
  | 'story_graphic'
  | 'tiktok_story'
  | 'instagram_story'
  | 'instagram_reel';

// Mood types for prompt generation
export type CoachMood = 'hype' | 'cozy' | 'rage' | 'chill' | 'custom';

// Color information from brand kit
export interface CoachColorInfo {
  hex: string;
  name: string;
}

// Font information from brand kit
export interface CoachFontInfo {
  headline: string;
  body: string;
}

// Brand context passed to coach
export interface CoachBrandContext {
  brandKitId: string;
  colors: CoachColorInfo[];
  tone: string;
  fonts: CoachFontInfo;
  logoUrl?: string;
}

// Request to start a new coach session
export interface StartCoachRequest {
  brandContext: CoachBrandContext;
  assetType: CoachAssetType;
  mood: CoachMood;
  customMood?: string;
  gameId?: string;
  gameName?: string;
  description: string;
}

// Request to continue an existing chat
export interface ContinueChatRequest {
  message: string;
}

// Validation issue from prompt analysis
export interface CoachValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  suggestion?: string;
}

// Result of prompt validation
export interface CoachValidationResult {
  isValid: boolean;
  isGenerationReady: boolean;
  qualityScore: number;
  issues: CoachValidationIssue[];
  fixedPrompt?: string;
}

// Types of chunks in the SSE stream
export type CoachStreamChunkType = 
  | 'token'
  | 'validation'
  | 'grounding'
  | 'grounding_complete'
  | 'done'
  | 'error'
  | 'redirect';

// Individual chunk from the SSE stream
export interface CoachStreamChunk {
  type: CoachStreamChunkType;
  content: string;
  metadata?: {
    isValid?: boolean;
    isGenerationReady?: boolean;
    qualityScore?: number;
    issues?: CoachValidationIssue[];
    promptVersion?: number;
    sessionId?: string;
    totalTokens?: number;
    searching?: string;
    context?: string;
  };
}

// Response for coach access check
export interface CoachAccessResponse {
  hasAccess: boolean;
  feature: 'full_coach' | 'tips_only';
  grounding: boolean;
  upgradeMessage?: string;
  trialAvailable?: boolean;
  trialUsed?: boolean;
}

// Individual prompt tip
export interface CoachPromptTip {
  id: string;
  title: string;
  description: string;
  example: string;
}

// Response for tips-only users
export interface CoachTipsResponse {
  feature: 'tips_only';
  tips: CoachPromptTip[];
  upgradeCta: {
    title: string;
    description: string;
    buttonText: string;
  };
}

// Current session state
export interface CoachSessionStateResponse {
  sessionId: string;
  status: 'active' | 'ended' | 'expired';
  turnsUsed: number;
  turnsRemaining: number;
  currentPrompt?: string;
  promptVersions: number;
}

// Response when ending a session
export interface CoachEndSessionResponse {
  sessionId: string;
  finalPrompt?: string;
  confidenceScore: number;
  keywords: string[];
  metadata: Record<string, unknown>;
}
