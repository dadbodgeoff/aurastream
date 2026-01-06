/**
 * Project Asset Overrides React Query Hooks
 * 
 * Provides hooks for managing per-project asset settings.
 * Enables project-scoped background removal without affecting other projects.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

// ============================================================================
// Types
// ============================================================================

export interface ProjectAssetOverride {
  id: string;
  projectId: string;
  assetId: string;
  userId: string;
  useProcessedUrl: boolean;
  /** 
   * URL to user-processed version of the asset (e.g., bg-removed community asset).
   * Only used when useProcessedUrl = true and the source asset doesn't have its own processedUrl.
   */
  processedUrl: string | null;
  customCrop: { x: number; y: number; width: number; height: number } | null;
  customFilters: Record<string, number> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAssetOverridesResponse {
  projectId: string;
  overrides: ProjectAssetOverride[];
}

export interface UpsertOverrideRequest {
  useProcessedUrl?: boolean;
  customCrop?: { x: number; y: number; width: number; height: number } | null;
  customFilters?: Record<string, number> | null;
}

export interface BulkOverrideItem {
  assetId: string;
  useProcessedUrl: boolean;
  customCrop?: { x: number; y: number; width: number; height: number } | null;
  customFilters?: Record<string, number> | null;
}

export interface RemoveBackgroundInProjectResponse {
  assetId: string;
  projectId: string;
  processedUrl: string;
  useProcessedUrl: boolean;
  message: string;
}

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

export const projectAssetOverrideKeys = {
  all: ['projectAssetOverrides'] as const,
  project: (projectId: string) => [...projectAssetOverrideKeys.all, projectId] as const,
  asset: (projectId: string, assetId: string) => [...projectAssetOverrideKeys.project(projectId), assetId] as const,
};

// ============================================================================
// Transform Functions (snake_case to camelCase)
// ============================================================================

function transformOverride(data: any): ProjectAssetOverride {
  return {
    id: data.id,
    projectId: data.project_id,
    assetId: data.asset_id,
    userId: data.user_id,
    useProcessedUrl: data.use_processed_url ?? false,
    processedUrl: data.processed_url ?? null,
    customCrop: data.custom_crop,
    customFilters: data.custom_filters,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get all asset overrides for a project.
 * 
 * Returns a map of assetId -> override settings for easy lookup.
 */
export function useProjectAssetOverrides(projectId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: projectAssetOverrideKeys.project(projectId || ''),
    queryFn: async (): Promise<ProjectAssetOverridesResponse> => {
      if (!projectId) throw new Error('Project ID required');
      
      const token = getToken();
      const response = await fetch(
        `${API_BASE}/canvas-projects/${projectId}/asset-overrides`,
        { headers: authHeaders(token) }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch project asset overrides');
      }
      
      const data = await response.json();
      return {
        projectId: data.project_id,
        overrides: data.overrides.map(transformOverride),
      };
    },
    enabled: options?.enabled !== false && !!projectId,
  });
}

/**
 * Get override for a specific asset in a project.
 */
export function useProjectAssetOverride(
  projectId: string | null, 
  assetId: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: projectAssetOverrideKeys.asset(projectId || '', assetId || ''),
    queryFn: async (): Promise<ProjectAssetOverride | null> => {
      if (!projectId || !assetId) return null;
      
      const token = getToken();
      const response = await fetch(
        `${API_BASE}/canvas-projects/${projectId}/asset-overrides/${assetId}`,
        { headers: authHeaders(token) }
      );
      
      if (response.status === 404) {
        return null; // No override exists
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch asset override');
      }
      
      return transformOverride(await response.json());
    },
    enabled: options?.enabled !== false && !!projectId && !!assetId,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create or update an asset override for a project.
 */
export function useUpsertProjectAssetOverride() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      projectId, 
      assetId, 
      ...data 
    }: UpsertOverrideRequest & { projectId: string; assetId: string }): Promise<ProjectAssetOverride> => {
      const token = getToken();
      
      const body: Record<string, any> = {};
      if (data.useProcessedUrl !== undefined) body.use_processed_url = data.useProcessedUrl;
      if (data.customCrop !== undefined) body.custom_crop = data.customCrop;
      if (data.customFilters !== undefined) body.custom_filters = data.customFilters;
      
      const response = await fetch(
        `${API_BASE}/canvas-projects/${projectId}/asset-overrides/${assetId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(token),
          },
          body: JSON.stringify(body),
        }
      );
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to update asset override');
      }
      
      return transformOverride(await response.json());
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: projectAssetOverrideKeys.project(variables.projectId) 
      });
    },
  });
}

/**
 * Delete an asset override (reset to default).
 */
export function useDeleteProjectAssetOverride() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ projectId, assetId }: { projectId: string; assetId: string }): Promise<void> => {
      const token = getToken();
      
      const response = await fetch(
        `${API_BASE}/canvas-projects/${projectId}/asset-overrides/${assetId}`,
        {
          method: 'DELETE',
          headers: authHeaders(token),
        }
      );
      
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to delete asset override');
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: projectAssetOverrideKeys.project(variables.projectId) 
      });
    },
  });
}

/**
 * Bulk upsert overrides for multiple assets.
 * 
 * Useful when saving a project - send all asset overrides in one request.
 */
export function useBulkUpsertProjectAssetOverrides() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      projectId, 
      overrides 
    }: { projectId: string; overrides: BulkOverrideItem[] }): Promise<ProjectAssetOverridesResponse> => {
      const token = getToken();
      
      const body = {
        overrides: overrides.map(o => ({
          asset_id: o.assetId,
          use_processed_url: o.useProcessedUrl,
          custom_crop: o.customCrop,
          custom_filters: o.customFilters,
        })),
      };
      
      const response = await fetch(
        `${API_BASE}/canvas-projects/${projectId}/asset-overrides/bulk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(token),
          },
          body: JSON.stringify(body),
        }
      );
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to bulk update overrides');
      }
      
      const data = await response.json();
      return {
        projectId: data.project_id,
        overrides: data.overrides.map(transformOverride),
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: projectAssetOverrideKeys.project(variables.projectId) 
      });
    },
  });
}

/**
 * Remove background from an asset AND enable it for this project only.
 * 
 * This is the project-scoped version of background removal:
 * - Processes the asset if not already done
 * - Sets the project override to use the processed URL
 * - Other projects using this asset are NOT affected
 */
export function useRemoveBackgroundInProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      projectId, 
      assetId 
    }: { projectId: string; assetId: string }): Promise<RemoveBackgroundInProjectResponse> => {
      const token = getToken();
      
      const response = await fetch(
        `${API_BASE}/canvas-projects/${projectId}/asset-overrides/remove-background`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(token),
          },
          body: JSON.stringify({ asset_id: assetId }),
        }
      );
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to remove background');
      }
      
      const data = await response.json();
      return {
        assetId: data.asset_id,
        projectId: data.project_id,
        processedUrl: data.processed_url,
        useProcessedUrl: data.use_processed_url,
        message: data.message,
      };
    },
    onSuccess: (data, variables) => {
      // Invalidate project overrides
      queryClient.invalidateQueries({ 
        queryKey: projectAssetOverrideKeys.project(variables.projectId) 
      });
      
      // Also invalidate the asset detail to reflect has_background_removed
      queryClient.invalidateQueries({ 
        queryKey: ['creatorMedia', 'detail', variables.assetId] 
      });
    },
  });
}

// ============================================================================
// Utility Hook: Get effective URL for an asset in a project
// ============================================================================

/**
 * Helper to determine which URL to use for an asset in a project context.
 * 
 * Priority:
 * 1. If override says use processed AND override has its own processedUrl (community assets), use that
 * 2. If override says use processed AND asset has processedUrl, use asset's processedUrl
 * 3. Otherwise, use original URL
 * 
 * @param asset - The MediaAsset object
 * @param overrides - Map of assetId -> ProjectAssetOverride
 * @returns The URL to use (processed or original)
 */
export function getEffectiveAssetUrl(
  asset: { id: string; url: string; processedUrl?: string | null; hasBackgroundRemoved?: boolean },
  overrides: Map<string, ProjectAssetOverride> | null
): string {
  if (!overrides) return asset.url;
  
  const override = overrides.get(asset.id);
  
  if (override?.useProcessedUrl) {
    // First check if the override itself has a processed URL (for community assets)
    if (override.processedUrl) {
      return override.processedUrl;
    }
    // Then check if the asset has a processed URL
    if (asset.hasBackgroundRemoved && asset.processedUrl) {
      return asset.processedUrl;
    }
  }
  
  // Default to original
  return asset.url;
}

/**
 * Convert overrides array to a Map for easy lookup.
 */
export function overridesToMap(overrides: ProjectAssetOverride[]): Map<string, ProjectAssetOverride> {
  return new Map(overrides.map(o => [o.assetId, o]));
}

