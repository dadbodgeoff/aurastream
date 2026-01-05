/**
 * Creator Media Library React Query Hooks
 * 
 * Provides hooks for managing user-uploaded media assets.
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  MediaAsset,
  MediaSummary,
  MediaForPrompt,
  UploadMediaRequest,
  UpdateMediaRequest,
  ListMediaParams,
  UploadMediaResponse,
  ListMediaResponse,
  MediaLibrarySummaryResponse,
  DeleteMediaResponse,
  BulkDeleteMediaResponse,
  AssetTypesResponse,
  MediaAssetType,
  MediaAccessResponse,
} from '../types/creatorMedia';

// ============================================================================
// API Configuration
// ============================================================================

const API_BASE = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : 'http://localhost:8000') + '/api/v1';

const getToken = () => apiClient.getAccessToken();
const authHeaders = (token: string | null): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

// ============================================================================
// Query Keys
// ============================================================================

export const creatorMediaKeys = {
  all: ['creatorMedia'] as const,
  access: () => [...creatorMediaKeys.all, 'access'] as const,
  lists: () => [...creatorMediaKeys.all, 'list'] as const,
  list: (params: ListMediaParams) => [...creatorMediaKeys.lists(), params] as const,
  details: () => [...creatorMediaKeys.all, 'detail'] as const,
  detail: (id: string) => [...creatorMediaKeys.details(), id] as const,
  summary: () => [...creatorMediaKeys.all, 'summary'] as const,
  types: () => [...creatorMediaKeys.all, 'types'] as const,
  primary: (type: MediaAssetType) => [...creatorMediaKeys.all, 'primary', type] as const,
  forPrompt: (ids: string[]) => [...creatorMediaKeys.all, 'forPrompt', ids] as const,
};

// ============================================================================
// Transform Functions (snake_case to camelCase)
// ============================================================================

function transformMediaAsset(data: any): MediaAsset {
  return {
    id: data.id,
    userId: data.user_id,
    assetType: data.asset_type,
    displayName: data.display_name,
    description: data.description,
    url: data.url,
    storagePath: data.storage_path,
    thumbnailUrl: data.thumbnail_url,
    processedUrl: data.processed_url,
    processedStoragePath: data.processed_storage_path,
    fileSize: data.file_size,
    mimeType: data.mime_type,
    width: data.width,
    height: data.height,
    tags: data.tags || [],
    isFavorite: data.is_favorite ?? false,
    isPrimary: data.is_primary ?? false,
    hasBackgroundRemoved: data.has_background_removed ?? false,
    metadata: data.metadata || {},
    usageCount: data.usage_count ?? 0,
    lastUsedAt: data.last_used_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function transformMediaSummary(data: any): MediaSummary {
  return {
    assetType: data.asset_type,
    totalCount: data.total_count,
    favoriteCount: data.favorite_count,
    latestUpload: data.latest_upload,
  };
}

function transformMediaForPrompt(data: any): MediaForPrompt {
  return {
    id: data.id,
    assetType: data.asset_type,
    displayName: data.display_name,
    url: data.url,
    metadata: data.metadata || {},
  };
}

// ============================================================================
// Access Check Hook
// ============================================================================

/**
 * Check if user has access to Media Library.
 * Pro/Studio only - free users will see hasAccess=false.
 */
export function useMediaAccess() {
  return useQuery({
    queryKey: creatorMediaKeys.access(),
    queryFn: async (): Promise<MediaAccessResponse> => {
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/media-library/access`, {
        headers: authHeaders(token),
      });
      
      if (!response.ok) {
        throw new Error('Failed to check media library access');
      }
      
      const data = await response.json();
      return {
        hasAccess: data.has_access,
        tier: data.tier,
        totalLimit: data.total_limit,
        maxPerPrompt: data.max_per_prompt,
        upgradeMessage: data.upgrade_message,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// List & Query Hooks
// ============================================================================

/**
 * List media assets with filtering and pagination.
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useMediaLibrary({ assetType: 'face', favoritesOnly: true });
 * ```
 */
export function useMediaLibrary(params: ListMediaParams = {}) {
  return useQuery({
    queryKey: creatorMediaKeys.list(params),
    queryFn: async (): Promise<ListMediaResponse> => {
      const token = getToken();
      
      const searchParams = new URLSearchParams();
      if (params.assetType) searchParams.set('asset_type', params.assetType);
      if (params.tags?.length) searchParams.set('tags', params.tags.join(','));
      if (params.favoritesOnly) searchParams.set('favorites_only', 'true');
      if (params.search) searchParams.set('search', params.search);
      if (params.limit) searchParams.set('limit', String(params.limit));
      if (params.offset) searchParams.set('offset', String(params.offset));
      if (params.sortBy) searchParams.set('sort_by', params.sortBy);
      if (params.sortOrder) searchParams.set('sort_order', params.sortOrder);
      
      const response = await fetch(
        `${API_BASE}/media-library?${searchParams.toString()}`,
        { headers: authHeaders(token) }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch media library');
      }
      
      const data = await response.json();
      return {
        assets: data.assets.map(transformMediaAsset),
        total: data.total,
        limit: data.limit,
        offset: data.offset,
        hasMore: data.has_more,
      };
    },
  });
}

/**
 * Infinite scroll media library.
 */
export function useInfiniteMediaLibrary(params: Omit<ListMediaParams, 'offset'> = {}) {
  const limit = params.limit || 20;
  
  return useInfiniteQuery({
    queryKey: [...creatorMediaKeys.lists(), 'infinite', params],
    queryFn: async ({ pageParam = 0 }): Promise<ListMediaResponse> => {
      const token = getToken();
      
      const searchParams = new URLSearchParams();
      if (params.assetType) searchParams.set('asset_type', params.assetType);
      if (params.tags?.length) searchParams.set('tags', params.tags.join(','));
      if (params.favoritesOnly) searchParams.set('favorites_only', 'true');
      if (params.search) searchParams.set('search', params.search);
      searchParams.set('limit', String(limit));
      searchParams.set('offset', String(pageParam));
      if (params.sortBy) searchParams.set('sort_by', params.sortBy);
      if (params.sortOrder) searchParams.set('sort_order', params.sortOrder);
      
      const response = await fetch(
        `${API_BASE}/media-library?${searchParams.toString()}`,
        { headers: authHeaders(token) }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch media library');
      }
      
      const data = await response.json();
      return {
        assets: data.assets.map(transformMediaAsset),
        total: data.total,
        limit: data.limit,
        offset: data.offset,
        hasMore: data.has_more,
      };
    },
    getNextPageParam: (lastPage) => 
      lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined,
    initialPageParam: 0,
  });
}

/**
 * Get a single media asset by ID.
 */
export function useMediaAsset(assetId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: creatorMediaKeys.detail(assetId),
    queryFn: async (): Promise<MediaAsset> => {
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/media-library/${assetId}`, {
        headers: authHeaders(token),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch media asset');
      }
      
      return transformMediaAsset(await response.json());
    },
    enabled: options?.enabled !== false && !!assetId,
  });
}

/**
 * Get library summary (counts by type).
 */
export function useMediaSummary() {
  return useQuery({
    queryKey: creatorMediaKeys.summary(),
    queryFn: async (): Promise<MediaLibrarySummaryResponse> => {
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/media-library/summary`, {
        headers: authHeaders(token),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch media summary');
      }
      
      const data = await response.json();
      return {
        summaries: data.summaries.map(transformMediaSummary),
        totalAssets: data.total_assets,
        storageUsedBytes: data.storage_used_bytes,
      };
    },
  });
}

/**
 * Get supported asset types.
 */
export function useAssetTypes() {
  return useQuery({
    queryKey: creatorMediaKeys.types(),
    queryFn: async (): Promise<AssetTypesResponse> => {
      const response = await fetch(`${API_BASE}/media-library/types`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch asset types');
      }
      
      return response.json();
    },
    staleTime: Infinity, // Types don't change
  });
}

/**
 * Get primary asset of a type.
 */
export function usePrimaryAsset(assetType: MediaAssetType, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: creatorMediaKeys.primary(assetType),
    queryFn: async (): Promise<MediaAsset | null> => {
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/media-library/primary/${assetType}`, {
        headers: authHeaders(token),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch primary asset');
      }
      
      const data = await response.json();
      return data ? transformMediaAsset(data) : null;
    },
    enabled: options?.enabled !== false,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Upload a new media asset.
 * 
 * @example
 * ```tsx
 * const { mutate: upload, isPending } = useUploadMedia();
 * 
 * upload({
 *   assetType: 'face',
 *   displayName: 'My Face',
 *   imageBase64: base64Data,
 *   tags: ['happy', 'front'],
 * });
 * ```
 */
export function useUploadMedia() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: UploadMediaRequest): Promise<UploadMediaResponse> => {
      const token = getToken();
      
      const body: Record<string, any> = {
        asset_type: request.assetType,
        display_name: request.displayName,
        description: request.description,
        image_base64: request.imageBase64,
        tags: request.tags,
        is_favorite: request.isFavorite,
        set_as_primary: request.setAsPrimary,
        metadata: request.metadata,
      };
      
      // Only include remove_background if explicitly set (null = use default)
      if (request.removeBackground !== undefined) {
        body.remove_background = request.removeBackground;
      }
      
      const response = await fetch(`${API_BASE}/media-library`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Upload failed');
      }
      
      const data = await response.json();
      return {
        asset: transformMediaAsset(data.asset),
        message: data.message,
      };
    },
    onSuccess: (data) => {
      // Invalidate only the specific asset type list, not all lists
      queryClient.invalidateQueries({ 
        queryKey: creatorMediaKeys.list({ assetType: data.asset.assetType }),
        exact: false,
      });
      // Also invalidate the unfiltered list
      queryClient.invalidateQueries({ 
        queryKey: creatorMediaKeys.list({}),
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: creatorMediaKeys.summary() });
      if (data.asset.isPrimary) {
        queryClient.invalidateQueries({ 
          queryKey: creatorMediaKeys.primary(data.asset.assetType) 
        });
      }
    },
  });
}

/**
 * Update a media asset.
 */
export function useUpdateMedia() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      assetId, 
      ...request 
    }: UpdateMediaRequest & { assetId: string }): Promise<MediaAsset> => {
      const token = getToken();
      
      const body: Record<string, any> = {};
      if (request.displayName !== undefined) body.display_name = request.displayName;
      if (request.description !== undefined) body.description = request.description;
      if (request.tags !== undefined) body.tags = request.tags;
      if (request.isFavorite !== undefined) body.is_favorite = request.isFavorite;
      if (request.isPrimary !== undefined) body.is_primary = request.isPrimary;
      if (request.metadata !== undefined) body.metadata = request.metadata;
      
      const response = await fetch(`${API_BASE}/media-library/${assetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Update failed');
      }
      
      return transformMediaAsset(await response.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: creatorMediaKeys.lists() });
      queryClient.setQueryData(creatorMediaKeys.detail(data.id), data);
      if (data.isPrimary) {
        queryClient.invalidateQueries({ 
          queryKey: creatorMediaKeys.primary(data.assetType) 
        });
      }
    },
  });
}

/**
 * Delete a media asset.
 */
export function useDeleteMedia() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assetId: string): Promise<DeleteMediaResponse> => {
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/media-library/${assetId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete asset');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creatorMediaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: creatorMediaKeys.summary() });
    },
  });
}

/**
 * Bulk delete media assets.
 */
export function useBulkDeleteMedia() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assetIds: string[]): Promise<BulkDeleteMediaResponse> => {
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/media-library/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify(assetIds),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete assets');
      }
      
      const data = await response.json();
      return {
        deletedCount: data.deleted_count,
        failedIds: data.failed_ids,
        message: data.message,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creatorMediaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: creatorMediaKeys.summary() });
    },
  });
}

/**
 * Toggle favorite status.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assetId: string): Promise<MediaAsset> => {
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/media-library/${assetId}/favorite`, {
        method: 'POST',
        headers: authHeaders(token),
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle favorite');
      }
      
      return transformMediaAsset(await response.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: creatorMediaKeys.lists() });
      queryClient.setQueryData(creatorMediaKeys.detail(data.id), data);
    },
  });
}

/**
 * Set asset as primary of its type.
 */
export function useSetPrimary() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assetId: string): Promise<MediaAsset> => {
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/media-library/${assetId}/set-primary`, {
        method: 'POST',
        headers: authHeaders(token),
      });
      
      if (!response.ok) {
        throw new Error('Failed to set primary');
      }
      
      return transformMediaAsset(await response.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: creatorMediaKeys.lists() });
      queryClient.invalidateQueries({ 
        queryKey: creatorMediaKeys.primary(data.assetType) 
      });
      queryClient.setQueryData(creatorMediaKeys.detail(data.id), data);
    },
  });
}

// ============================================================================
// Prompt Injection Hooks
// ============================================================================

/**
 * Get media assets formatted for prompt injection.
 * Automatically increments usage count.
 */
export function useMediaForPrompt(assetIds: string[], options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: creatorMediaKeys.forPrompt(assetIds),
    queryFn: async (): Promise<MediaForPrompt[]> => {
      if (!assetIds.length) return [];
      
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/media-library/for-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify(assetIds),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get media for prompt');
      }
      
      const data = await response.json();
      return data.map(transformMediaForPrompt);
    },
    enabled: options?.enabled !== false && assetIds.length > 0,
  });
}

/**
 * Mutation to get media for prompt (use when you want to trigger manually).
 */
export function useGetMediaForPrompt() {
  return useMutation({
    mutationFn: async (assetIds: string[]): Promise<MediaForPrompt[]> => {
      if (!assetIds.length) return [];
      
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/media-library/for-prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify(assetIds),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get media for prompt');
      }
      
      const data = await response.json();
      return data.map(transformMediaForPrompt);
    },
  });
}

// ============================================================================
// Background Removal Hook
// ============================================================================

/**
 * Remove background from an existing media asset.
 * 
 * Processes the original image through AI background removal and
 * stores the transparent version. The processed URL will be available
 * in the `processedUrl` field of the returned asset.
 * 
 * @example
 * ```tsx
 * const removeBackground = useRemoveBackground();
 * 
 * const handleRemoveBg = async (assetId: string) => {
 *   const updated = await removeBackground.mutateAsync(assetId);
 *   console.log('Processed URL:', updated.processedUrl);
 * };
 * ```
 */
export function useRemoveBackground() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assetId: string): Promise<MediaAsset> => {
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/media-library/${assetId}/remove-background`, {
        method: 'POST',
        headers: authHeaders(token),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to remove background' }));
        throw new Error(error.detail || 'Failed to remove background');
      }
      
      return transformMediaAsset(await response.json());
    },
    onSuccess: (data) => {
      // Update the asset in cache
      queryClient.setQueryData(creatorMediaKeys.detail(data.id), data);
      // Invalidate lists to refresh
      queryClient.invalidateQueries({ queryKey: creatorMediaKeys.lists() });
    },
  });
}
