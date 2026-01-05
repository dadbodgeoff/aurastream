/**
 * Community Hub React Query Hooks
 * 
 * Hooks for browsing pre-loaded community assets in Canvas Studio.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  CommunityHubAsset,
  CommunityHubCategory,
  ListCommunityHubAssetsParams,
  ListCommunityHubAssetsResponse,
  ListCommunityHubCategoriesResponse,
  CommunityHubSummaryResponse,
} from '../types/communityHub';
import type { MediaAsset } from '../types/creatorMedia';

// ============================================================================
// API Configuration
// ============================================================================

const API_BASE = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : 'http://localhost:8000') + '/api/v1';

// No auth needed for community hub - it's public
const defaultHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
});

// ============================================================================
// Query Keys
// ============================================================================

export const communityHubKeys = {
  all: ['communityHub'] as const,
  assets: () => [...communityHubKeys.all, 'assets'] as const,
  assetList: (params: ListCommunityHubAssetsParams) => [...communityHubKeys.assets(), params] as const,
  asset: (id: string) => [...communityHubKeys.assets(), id] as const,
  categories: () => [...communityHubKeys.all, 'categories'] as const,
  summary: () => [...communityHubKeys.all, 'summary'] as const,
};

// ============================================================================
// Transform Functions (snake_case to camelCase)
// ============================================================================

function transformCommunityHubAsset(data: any): CommunityHubAsset {
  return {
    id: data.id,
    assetType: data.asset_type,
    gameCategory: data.game_category,
    displayName: data.display_name,
    description: data.description,
    url: data.url,
    storagePath: data.storage_path,
    thumbnailUrl: data.thumbnail_url,
    fileSize: data.file_size,
    mimeType: data.mime_type,
    width: data.width,
    height: data.height,
    tags: data.tags || [],
    isFeatured: data.is_featured ?? false,
    isPremium: data.is_premium ?? false,
    usageCount: data.usage_count ?? 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function transformCommunityHubCategory(data: any): CommunityHubCategory {
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    iconUrl: data.icon_url,
    color: data.color,
    assetCount: data.asset_count ?? 0,
    isActive: data.is_active ?? true,
  };
}

/**
 * Convert a CommunityHubAsset to a MediaAsset for use in Canvas Studio.
 * This allows community hub assets to be used just like personal library assets.
 */
export function communityHubAssetToMediaAsset(asset: CommunityHubAsset): MediaAsset {
  return {
    id: `community_${asset.id}`, // Prefix to distinguish from user assets
    userId: 'community', // Special marker
    assetType: asset.assetType,
    displayName: asset.displayName,
    description: asset.description,
    url: asset.url,
    storagePath: asset.storagePath,
    thumbnailUrl: asset.thumbnailUrl,
    processedUrl: null,
    processedStoragePath: null,
    fileSize: asset.fileSize,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    tags: asset.tags,
    isFavorite: false,
    isPrimary: false,
    hasBackgroundRemoved: false,
    metadata: { source: 'community_hub', gameCategory: asset.gameCategory },
    usageCount: asset.usageCount,
    lastUsedAt: null,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * List community hub assets with optional filters.
 */
export function useCommunityHubAssets(params: ListCommunityHubAssetsParams = {}) {
  return useQuery({
    queryKey: communityHubKeys.assetList(params),
    queryFn: async (): Promise<ListCommunityHubAssetsResponse> => {
      const searchParams = new URLSearchParams();
      
      if (params.gameCategory) searchParams.set('game_category', params.gameCategory);
      if (params.assetType) searchParams.set('asset_type', params.assetType);
      if (params.search) searchParams.set('search', params.search);
      if (params.featuredOnly) searchParams.set('featured_only', 'true');
      if (params.limit) searchParams.set('limit', params.limit.toString());
      if (params.offset) searchParams.set('offset', params.offset.toString());
      if (params.tags?.length) {
        params.tags.forEach(tag => searchParams.append('tags', tag));
      }
      
      const url = `${API_BASE}/community-hub/assets?${searchParams.toString()}`;
      const response = await fetch(url, { headers: defaultHeaders() });
      
      if (!response.ok) {
        throw new Error('Failed to fetch community hub assets');
      }
      
      const data = await response.json();
      
      return {
        assets: data.assets.map(transformCommunityHubAsset),
        total: data.total,
        limit: data.limit,
        offset: data.offset,
        hasMore: data.has_more,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - community assets don't change often
  });
}

/**
 * Get a single community hub asset.
 */
export function useCommunityHubAsset(assetId: string) {
  return useQuery({
    queryKey: communityHubKeys.asset(assetId),
    queryFn: async (): Promise<CommunityHubAsset> => {
      const response = await fetch(
        `${API_BASE}/community-hub/assets/${assetId}`,
        { headers: defaultHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch community hub asset');
      }
      
      const data = await response.json();
      return transformCommunityHubAsset(data);
    },
    enabled: !!assetId,
  });
}

/**
 * List all game categories.
 */
export function useCommunityHubCategories() {
  return useQuery({
    queryKey: communityHubKeys.categories(),
    queryFn: async (): Promise<CommunityHubCategory[]> => {
      const response = await fetch(
        `${API_BASE}/community-hub/categories`,
        { headers: defaultHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch community hub categories');
      }
      
      const data = await response.json();
      return data.categories.map(transformCommunityHubCategory);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - categories rarely change
  });
}

/**
 * Get community hub summary stats.
 */
export function useCommunityHubSummary() {
  return useQuery({
    queryKey: communityHubKeys.summary(),
    queryFn: async (): Promise<CommunityHubSummaryResponse> => {
      const response = await fetch(
        `${API_BASE}/community-hub/summary`,
        { headers: defaultHeaders() }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch community hub summary');
      }
      
      const data = await response.json();
      return {
        totalAssets: data.total_assets,
        totalCategories: data.total_categories,
        featuredCount: data.featured_count,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Track when a user adds a community hub asset to their canvas.
 */
export function useTrackCommunityHubUsage() {
  return useMutation({
    mutationFn: async (assetId: string) => {
      // Extract the real ID if it has the community_ prefix
      const realId = assetId.startsWith('community_') 
        ? assetId.replace('community_', '') 
        : assetId;
      
      const response = await fetch(
        `${API_BASE}/community-hub/assets/${realId}/use`,
        { method: 'POST', headers: defaultHeaders() }
      );
      
      return response.json();
    },
  });
}
