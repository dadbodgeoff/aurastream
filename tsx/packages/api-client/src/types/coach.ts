// Coach Types for Prompt Coach Feature
// Types for the AI-powered prompt coaching system

// Asset types supported by the coach (matches backend coach.py AssetTypeEnum)
export type CoachAssetType = 
  // General asset types (matching generation.py)
  | 'thumbnail'
  | 'overlay'
  | 'banner'
  | 'story_graphic'
  | 'clip_cover'
  // Twitch-specific asset types
  | 'twitch_emote' 
  | 'twitch_badge' 
  | 'twitch_panel'
  | 'twitch_offline'
  // Legacy/extended types for backwards compatibility
  | 'youtube_thumbnail' 
  | 'twitch_banner' 
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

// Brand context passed to coach (all fields optional per backend)
export interface CoachBrandContext {
  brandKitId?: string | null;  // Optional - users can proceed without a brand kit
  colors: CoachColorInfo[];    // Empty array if no brand kit
  tone: string;                // Defaults to 'professional'
  fonts?: CoachFontInfo | null; // Optional - system defaults used if not specified
  logoUrl?: string | null;     // Optional
}

// Request to start a new coach session (brandContext is optional per backend)
export interface StartCoachRequest {
  brandContext?: CoachBrandContext | null;  // Optional - defaults provided for users without brand kits
  assetType: CoachAssetType;
  mood: CoachMood;
  customMood?: string | null;  // Required when mood='custom'
  gameId?: string | null;
  gameName?: string | null;
  description: string;  // min 5, max 500 chars
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

// Types of chunks in the SSE stream (matches backend StreamChunkTypeEnum)
export type CoachStreamChunkType = 
  | 'token'              // Response token
  | 'intent_ready'       // Intent parsed (backend)
  | 'grounding'          // Searching game context
  | 'grounding_complete' // Search done
  | 'done'               // Session complete
  | 'error'              // Error occurred
  // Frontend-only types for UI state
  | 'validation'         // Prompt validation results (frontend)
  | 'redirect'           // Redirect instruction (frontend)
  | 'usage_info';        // Usage info from backend

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

// Response for coach access check (matches backend CoachAccessResponse)
export interface CoachAccessResponse {
  hasAccess: boolean;
  feature: 'full_coach' | 'tips_only';
  grounding: boolean;
  upgradeMessage?: string | null;
  rateLimits?: {
    messages?: { remaining: number; limit: number; windowSeconds: number };
    sessions?: { remaining: number; limit: number; windowSeconds: number };
  } | null;
  trialAvailable?: boolean | null;
  trialUsed?: boolean | null;
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

// ============================================================================
// Refinement Types (Multi-turn image editing)
// ============================================================================

/**
 * Request to refine a generated image using multi-turn conversation.
 * Uses Gemini's conversation context for cheaper refinements.
 */
export interface RefineImageRequest {
  /** What to change about the image (3-500 chars) */
  refinement: string;
}

/**
 * Response after triggering image refinement.
 * Includes usage tracking for tier-based limits.
 */
export interface RefineImageResponse {
  /** Generation job UUID for polling */
  jobId: string;
  /** Initial job status */
  status: string;
  /** Status message */
  message: string;
  /** Total refinements used this month */
  refinementsUsed: number;
  /** Free refinements remaining (-1 for unlimited) */
  refinementsRemaining: number;
  /** Whether this refinement counted as a creation (Pro users after 5 free) */
  countedAsCreation: boolean;
}

/**
 * Refinement usage status for UI display
 */
export interface RefinementUsageStatus {
  /** Whether user can refine (has access) */
  canRefine: boolean;
  /** Number of free refinements remaining */
  freeRemaining: number;
  /** Whether refinements are unlimited (-1) */
  isUnlimited: boolean;
  /** User's subscription tier */
  tier: 'free' | 'pro' | 'studio';
  /** Message to display about refinement limits */
  message: string;
}
