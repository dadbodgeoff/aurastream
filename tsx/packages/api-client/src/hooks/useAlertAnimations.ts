/**
 * Alert Animation Studio React Query Hooks
 *
 * Hooks for managing 3D animated stream alerts.
 * Requires Pro or Studio subscription.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import {
  AnimationProject,
  AnimationProjectList,
  AnimationPreset,
  DepthMapJob,
  OBSBrowserSource,
  ExportResponse,
  CreateAnimationProjectRequest,
  UpdateAnimationProjectRequest,
  ExportAnimationRequest,
  CreatePresetRequest,
  transformAnimationProject,
  transformAnimationPreset,
  transformDepthMapJob,
  transformOBSBrowserSource,
  toSnakeCaseAnimationConfig,
} from '../types/alertAnimation';

const API_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:8000') + '/api/v1';

// ============================================================================
// Query Keys
// ============================================================================

export const alertAnimationKeys = {
  all: ['alertAnimations'] as const,
  lists: () => [...alertAnimationKeys.all, 'list'] as const,
  list: (page: number, pageSize: number) =>
    [...alertAnimationKeys.lists(), { page, pageSize }] as const,
  details: () => [...alertAnimationKeys.all, 'detail'] as const,
  detail: (id: string) => [...alertAnimationKeys.details(), id] as const,
  presets: () => [...alertAnimationKeys.all, 'presets'] as const,
  presetsByCategory: (category: string) =>
    [...alertAnimationKeys.presets(), category] as const,
  obsUrl: (id: string) => [...alertAnimationKeys.all, 'obs', id] as const,
};

// ============================================================================
// Project Hooks
// ============================================================================

/**
 * List user's animation projects with pagination.
 */
export function useAnimationProjects(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: alertAnimationKeys.list(page, pageSize),
    queryFn: async (): Promise<AnimationProjectList> => {
      const token = apiClient.getAccessToken();
      const response = await fetch(
        `${API_BASE}/alert-animations?page=${page}&page_size=${pageSize}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || 'Failed to fetch animation projects');
      }

      const data = await response.json();
      return {
        projects: data.projects.map(transformAnimationProject),
        total: data.total,
        page: data.page,
        pageSize: data.page_size,
      };
    },
  });
}

/**
 * Get a single animation project with its exports.
 */
export function useAnimationProject(projectId: string | undefined) {
  return useQuery({
    queryKey: alertAnimationKeys.detail(projectId || ''),
    queryFn: async (): Promise<AnimationProject> => {
      if (!projectId) throw new Error('Project ID required');

      const token = apiClient.getAccessToken();
      const response = await fetch(`${API_BASE}/alert-animations/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || 'Failed to fetch animation project');
      }

      const data = await response.json();
      return transformAnimationProject(data);
    },
    enabled: !!projectId,
  });
}

/**
 * Create a new animation project.
 */
export function useCreateAnimationProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAnimationProjectRequest): Promise<AnimationProject> => {
      const token = apiClient.getAccessToken();

      const body: any = {
        source_url: data.sourceUrl,
        name: data.name || 'Untitled Animation',
      };

      if (data.sourceAssetId) {
        body.source_asset_id = data.sourceAssetId;
      }

      if (data.animationConfig) {
        body.animation_config = toSnakeCaseAnimationConfig(data.animationConfig);
      }

      const response = await fetch(`${API_BASE}/alert-animations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || 'Failed to create animation project');
      }

      const result = await response.json();
      return transformAnimationProject(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertAnimationKeys.lists() });
    },
  });
}

/**
 * Update an animation project.
 */
export function useUpdateAnimationProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      data,
    }: {
      projectId: string;
      data: UpdateAnimationProjectRequest;
    }): Promise<AnimationProject> => {
      const token = apiClient.getAccessToken();

      const body: any = {};
      if (data.name !== undefined) body.name = data.name;
      if (data.exportFormat !== undefined) body.export_format = data.exportFormat;
      if (data.exportWidth !== undefined) body.export_width = data.exportWidth;
      if (data.exportHeight !== undefined) body.export_height = data.exportHeight;
      if (data.exportFps !== undefined) body.export_fps = data.exportFps;
      if (data.animationConfig !== undefined) {
        body.animation_config = toSnakeCaseAnimationConfig(data.animationConfig);
      }

      const response = await fetch(`${API_BASE}/alert-animations/${projectId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || 'Failed to update animation project');
      }

      const result = await response.json();
      return transformAnimationProject(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: alertAnimationKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: alertAnimationKeys.lists() });
    },
  });
}

/**
 * Delete an animation project.
 */
export function useDeleteAnimationProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string): Promise<void> => {
      const token = apiClient.getAccessToken();

      const response = await fetch(`${API_BASE}/alert-animations/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || 'Failed to delete animation project');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertAnimationKeys.lists() });
    },
  });
}

// ============================================================================
// Processing Hooks
// ============================================================================

/**
 * Generate depth map for an animation project.
 */
export function useGenerateDepthMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string): Promise<DepthMapJob> => {
      const token = apiClient.getAccessToken();

      const response = await fetch(`${API_BASE}/alert-animations/${projectId}/depth-map`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || 'Failed to generate depth map');
      }

      const data = await response.json();
      return transformDepthMapJob(data);
    },
    onSuccess: (_, projectId) => {
      // Invalidate project to refresh depth map URL when complete
      queryClient.invalidateQueries({ queryKey: alertAnimationKeys.detail(projectId) });
    },
  });
}

/**
 * Export animation to WebM/GIF.
 */
export function useExportAnimation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      data,
    }: {
      projectId: string;
      data?: ExportAnimationRequest;
    }): Promise<ExportResponse> => {
      const token = apiClient.getAccessToken();

      const body: any = {};
      if (data?.format) body.format = data.format;
      if (data?.width) body.width = data.width;
      if (data?.height) body.height = data.height;
      if (data?.fps) body.fps = data.fps;
      if (data?.useServerExport !== undefined) body.use_server_export = data.useServerExport;

      const response = await fetch(`${API_BASE}/alert-animations/${projectId}/export`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || 'Failed to export animation');
      }

      const result = await response.json();

      if (result.export_mode === 'client') {
        return {
          exportMode: 'client',
          animationConfig: result.animation_config,
          depthMapUrl: result.depth_map_url,
          sourceUrl: result.source_url,
          instructions: result.instructions,
        };
      } else {
        return {
          exportMode: 'server',
          jobId: result.job_id,
          status: result.status,
        };
      }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: alertAnimationKeys.detail(projectId) });
    },
  });
}

/**
 * Get OBS browser source URL for an animation project.
 */
export function useOBSBrowserSource(projectId: string | undefined) {
  return useQuery({
    queryKey: alertAnimationKeys.obsUrl(projectId || ''),
    queryFn: async (): Promise<OBSBrowserSource> => {
      if (!projectId) throw new Error('Project ID required');

      const token = apiClient.getAccessToken();
      const response = await fetch(`${API_BASE}/alert-animations/${projectId}/obs-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || 'Failed to get OBS URL');
      }

      const data = await response.json();
      return transformOBSBrowserSource(data);
    },
    enabled: !!projectId,
  });
}

// ============================================================================
// Preset Hooks
// ============================================================================

/**
 * List all animation presets (system + user custom).
 */
export function useAnimationPresets(category?: string) {
  return useQuery({
    queryKey: category
      ? alertAnimationKeys.presetsByCategory(category)
      : alertAnimationKeys.presets(),
    queryFn: async (): Promise<AnimationPreset[]> => {
      const token = apiClient.getAccessToken();
      const url = category
        ? `${API_BASE}/alert-animations/presets/${category}`
        : `${API_BASE}/alert-animations/presets`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || 'Failed to fetch presets');
      }

      const data = await response.json();
      return data.map(transformAnimationPreset);
    },
  });
}

/**
 * Create a custom animation preset.
 */
export function useCreatePreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePresetRequest): Promise<AnimationPreset> => {
      const token = apiClient.getAccessToken();

      const response = await fetch(`${API_BASE}/alert-animations/presets`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || 'Failed to create preset');
      }

      const result = await response.json();
      return transformAnimationPreset(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertAnimationKeys.presets() });
    },
  });
}

/**
 * Delete a custom preset.
 */
export function useDeletePreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (presetId: string): Promise<void> => {
      const token = apiClient.getAccessToken();

      const response = await fetch(`${API_BASE}/alert-animations/presets/${presetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || 'Failed to delete preset');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertAnimationKeys.presets() });
    },
  });
}
