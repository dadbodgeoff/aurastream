// Generation Types for Streamer Studio
// Matches backend Pydantic schemas

import type {
  BrandCustomization,
  LogoPosition,
  LogoSize,
  LogoType,
} from './brand-kit-enhanced';

export type AssetType = 
  | 'thumbnail' 
  | 'overlay' 
  | 'banner' 
  | 'story_graphic' 
  | 'clip_cover'
  // Twitch emotes
  | 'twitch_emote'
  | 'twitch_emote_112'
  | 'twitch_emote_56'
  | 'twitch_emote_28'
  // TikTok emotes
  | 'tiktok_emote'
  | 'tiktok_emote_300'
  | 'tiktok_emote_200'
  | 'tiktok_emote_100'
  // Other Twitch assets
  | 'twitch_badge'
  | 'twitch_panel'
  | 'twitch_offline'
  // Profile Creator assets
  | 'profile_picture'
  | 'streamer_logo';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'partial';

// Re-export brand customization types for convenience
export type { 
  BrandCustomization,
  ColorSelection,
  TypographySelection,
  VoiceSelection,
  BrandIntensity,
  TypographyLevel,
  LogoPosition,
  LogoSize,
  LogoType,
} from './brand-kit-enhanced';

// ============================================================================
// Request Types
// ============================================================================

export interface GenerateRequest {
  assetType: AssetType;
  brandKitId?: string;
  customPrompt?: string;
  // Full brand customization (preferred)
  brandCustomization?: BrandCustomization;
  // Legacy logo options (deprecated, use brandCustomization instead)
  includeLogo?: boolean;
  logoPosition?: LogoPosition;
  logoSize?: LogoSize;
  logoType?: LogoType;
}

// ============================================================================
// Response Types
// ============================================================================

export interface JobResponse {
  id: string;
  userId: string;
  brandKitId: string | null;
  assetType: AssetType;
  status: JobStatus;
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface JobListResponse {
  jobs: JobResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface AssetResponse {
  id: string;
  jobId: string;
  userId: string;
  assetType: AssetType;
  url: string;
  width: number;
  height: number;
  fileSize: number;
  isPublic: boolean;
  viralScore: number | null;
  createdAt: string;
}

export interface AssetListResponse {
  assets: AssetResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface AssetVisibilityUpdate {
  isPublic: boolean;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface JobFilters {
  status?: JobStatus;
  limit?: number;
  offset?: number;
}

export interface AssetFilters {
  assetType?: AssetType;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Asset Dimensions
// ============================================================================

export const ASSET_DIMENSIONS: Record<AssetType, { width: number; height: number }> = {
  thumbnail: { width: 1280, height: 720 },
  overlay: { width: 1920, height: 1080 },
  banner: { width: 1200, height: 480 },
  story_graphic: { width: 1080, height: 1920 },
  clip_cover: { width: 1080, height: 1080 },
  // Twitch emotes
  twitch_emote: { width: 512, height: 512 },
  twitch_emote_112: { width: 112, height: 112 },
  twitch_emote_56: { width: 56, height: 56 },
  twitch_emote_28: { width: 28, height: 28 },
  // TikTok emotes
  tiktok_emote: { width: 300, height: 300 },
  tiktok_emote_300: { width: 300, height: 300 },
  tiktok_emote_200: { width: 200, height: 200 },
  tiktok_emote_100: { width: 100, height: 100 },
  // Other Twitch assets
  twitch_badge: { width: 72, height: 72 },
  twitch_panel: { width: 320, height: 160 },
  twitch_offline: { width: 1920, height: 1080 },
  // Profile Creator assets
  profile_picture: { width: 400, height: 400 },
  streamer_logo: { width: 512, height: 512 },
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  thumbnail: 'Thumbnail',
  overlay: 'Stream Overlay',
  banner: 'Channel Banner',
  story_graphic: 'Story Graphic',
  clip_cover: 'Clip Cover',
  // Twitch emotes
  twitch_emote: 'Twitch Emote',
  twitch_emote_112: 'Twitch Emote (112px)',
  twitch_emote_56: 'Twitch Emote (56px)',
  twitch_emote_28: 'Twitch Emote (28px)',
  // TikTok emotes
  tiktok_emote: 'TikTok Emote',
  tiktok_emote_300: 'TikTok Emote (300px)',
  tiktok_emote_200: 'TikTok Emote (200px)',
  tiktok_emote_100: 'TikTok Emote (100px)',
  // Other Twitch assets
  twitch_badge: 'Twitch Badge',
  twitch_panel: 'Twitch Panel',
  twitch_offline: 'Offline Screen',
  // Profile Creator assets
  profile_picture: 'Profile Picture',
  streamer_logo: 'Streamer Logo',
};
