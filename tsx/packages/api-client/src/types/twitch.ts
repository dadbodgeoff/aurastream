// Twitch Types for Streamer Studio
// Matches backend Pydantic schemas for Twitch asset generation

// ============================================================================
// Asset Types
// ============================================================================

export type TwitchAssetType =
  | 'twitch_emote'
  | 'twitch_emote_112'
  | 'twitch_emote_56'
  | 'twitch_emote_28'
  | 'twitch_badge'
  | 'twitch_badge_36'
  | 'twitch_badge_18'
  | 'twitch_panel'
  | 'twitch_offline'
  | 'twitch_banner'
  | 'youtube_thumbnail'
  | 'youtube_banner'
  | 'tiktok_story'
  | 'square_pfp';

export type PackType = 'seasonal' | 'emote' | 'stream';

export type PackStatus = 'queued' | 'processing' | 'completed' | 'failed';

// ============================================================================
// Request Types
// ============================================================================

export interface TwitchGenerateRequest {
  assetType: TwitchAssetType;
  brandKitId?: string;
  customPrompt?: string;
  gameId?: string;
  textOverlay?: string;
  includeLogo?: boolean;
}

export interface PackGenerateRequest {
  packType: PackType;
  brandKitId?: string;
  customPrompt?: string;
  gameId?: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface TwitchAssetResponse {
  id: string;
  assetType: TwitchAssetType;
  url: string;
  width: number;
  height: number;
  fileSize: number;
  format: string;
  createdAt: string;
}

export interface TwitchJobResponse {
  id: string;
  userId: string;
  brandKitId: string | null;
  assetType: TwitchAssetType;
  status: PackStatus;
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface PackAssetResponse {
  id: string;
  assetType: TwitchAssetType;
  url: string;
  width: number;
  height: number;
  fileSize: number;
  format: string;
  filename: string;
}

export interface PackResponse {
  id: string;
  packType: PackType;
  brandKitId: string | null;
  status: PackStatus;
  progress: number;
  assets: PackAssetResponse[];
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface DimensionSpecResponse {
  assetType: TwitchAssetType;
  generationSize: [number, number];
  exportSize: [number, number];
  aspectRatio: string;
}

export interface GameMetaResponse {
  id: string;
  name: string;
  currentSeason?: string;
  genre?: string;
  iconUrl?: string;
}

// ============================================================================
// Dimension Specifications
// ============================================================================

export const TWITCH_ASSET_DIMENSIONS: Record<TwitchAssetType, { width: number; height: number }> = {
  twitch_emote: { width: 512, height: 512 },
  twitch_emote_112: { width: 112, height: 112 },
  twitch_emote_56: { width: 56, height: 56 },
  twitch_emote_28: { width: 28, height: 28 },
  twitch_badge: { width: 72, height: 72 },
  twitch_badge_36: { width: 36, height: 36 },
  twitch_badge_18: { width: 18, height: 18 },
  twitch_panel: { width: 320, height: 160 },
  twitch_offline: { width: 1920, height: 1080 },
  twitch_banner: { width: 1200, height: 480 },
  youtube_thumbnail: { width: 1280, height: 720 },
  youtube_banner: { width: 2560, height: 1440 },
  tiktok_story: { width: 1080, height: 1920 },
  square_pfp: { width: 800, height: 800 },
};

export const TWITCH_ASSET_TYPE_LABELS: Record<TwitchAssetType, string> = {
  twitch_emote: 'Twitch Emote',
  twitch_emote_112: 'Twitch Emote (112px)',
  twitch_emote_56: 'Twitch Emote (56px)',
  twitch_emote_28: 'Twitch Emote (28px)',
  twitch_badge: 'Twitch Badge',
  twitch_badge_36: 'Twitch Badge (36px)',
  twitch_badge_18: 'Twitch Badge (18px)',
  twitch_panel: 'Twitch Panel',
  twitch_offline: 'Twitch Offline Screen',
  twitch_banner: 'Twitch Banner',
  youtube_thumbnail: 'YouTube Thumbnail',
  youtube_banner: 'YouTube Banner',
  tiktok_story: 'TikTok Story',
  square_pfp: 'Square Profile Picture',
};

export const PACK_TYPE_LABELS: Record<PackType, string> = {
  seasonal: 'Seasonal Pack',
  emote: 'Emote Pack',
  stream: 'Stream Pack',
};

export const PACK_CONTENTS: Record<PackType, { type: TwitchAssetType; count: number }[]> = {
  seasonal: [
    { type: 'tiktok_story', count: 1 },
    { type: 'youtube_thumbnail', count: 1 },
    { type: 'twitch_emote', count: 3 },
  ],
  emote: [
    { type: 'twitch_emote', count: 5 },
  ],
  stream: [
    { type: 'twitch_panel', count: 3 },
    { type: 'twitch_offline', count: 1 },
  ],
};
