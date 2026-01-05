/**
 * Community Hub Types
 * 
 * TypeScript interfaces for the Community Hub - pre-loaded assets for Canvas Studio.
 */

import type { MediaAssetType } from './creatorMedia';

// ============================================================================
// Core Types
// ============================================================================

/**
 * A pre-loaded community hub asset.
 * These are curated assets available to all users.
 */
export interface CommunityHubAsset {
  id: string;
  assetType: MediaAssetType;
  gameCategory: string;
  displayName: string;
  description?: string | null;
  url: string;
  storagePath: string;
  thumbnailUrl?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  tags: string[];
  isFeatured: boolean;
  isPremium: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * A game category in the community hub.
 */
export interface CommunityHubCategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  color?: string | null;
  assetCount: number;
  isActive: boolean;
}

// ============================================================================
// Request Types
// ============================================================================

export interface ListCommunityHubAssetsParams {
  gameCategory?: string;
  assetType?: MediaAssetType;
  tags?: string[];
  search?: string;
  featuredOnly?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Response Types
// ============================================================================

export interface ListCommunityHubAssetsResponse {
  assets: CommunityHubAsset[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ListCommunityHubCategoriesResponse {
  categories: CommunityHubCategory[];
}

export interface CommunityHubSummaryResponse {
  totalAssets: number;
  totalCategories: number;
  featuredCount: number;
}
