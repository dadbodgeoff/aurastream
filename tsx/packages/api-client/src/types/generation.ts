// Generation Types for Streamer Studio
// Matches backend Pydantic schemas

import type {
  BrandCustomization,
  LogoPosition,
  LogoSize,
  LogoType,
} from './brand-kit-enhanced';

export type AssetType = 'thumbnail' | 'overlay' | 'banner' | 'story_graphic' | 'clip_cover';
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
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  thumbnail: 'Thumbnail',
  overlay: 'Stream Overlay',
  banner: 'Channel Banner',
  story_graphic: 'Story Graphic',
  clip_cover: 'Clip Cover',
};
