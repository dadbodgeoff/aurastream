/**
 * Canvas Projects React Query Hooks
 * 
 * Provides hooks for managing canvas studio projects.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

// ============================================================================
// Types
// ============================================================================

export interface CanvasProject {
  id: string;
  userId: string;
  name: string;
  assetType: string;
  thumbnailUrl: string | null;
  sketchElements: any[];
  placements: any[];
  assets: any[];  // Full MediaAsset objects for reconstruction
  createdAt: string;
  updatedAt: string;
}

export interface CanvasProjectListItem {
  id: string;
  name: string;
  assetType: string;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasProjectListResponse {
  projects: CanvasProjectListItem[];
  total: number;
}

export interface CreateCanvasProjectRequest {
  name?: string;
  assetType: string;
  sketchElements?: any[];
  placements?: any[];
  assets?: any[];  // Full MediaAsset objects
  thumbnailUrl?: string;
}

export interface UpdateCanvasProjectRequest {
  name?: string;
  sketchElements?: any[];
  placements?: any[];
  assets?: any[];  // Full MediaAsset objects
  thumbnailUrl?: string;
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

export const canvasProjectKeys = {
  all: ['canvasProjects'] as const,
  lists: () => [...canvasProjectKeys.all, 'list'] as const,
  list: (params?: { limit?: number; offset?: number }) => [...canvasProjectKeys.lists(), params] as const,
  details: () => [...canvasProjectKeys.all, 'detail'] as const,
  detail: (id: string) => [...canvasProjectKeys.details(), id] as const,
};

// ============================================================================
// Transform Functions (snake_case to camelCase)
// ============================================================================

function transformProject(data: any): CanvasProject {
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    assetType: data.asset_type,
    thumbnailUrl: data.thumbnail_url,
    sketchElements: data.sketch_elements || [],
    placements: data.placements || [],
    assets: data.assets || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function transformProjectListItem(data: any): CanvasProjectListItem {
  return {
    id: data.id,
    name: data.name,
    assetType: data.asset_type,
    thumbnailUrl: data.thumbnail_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * List canvas projects for the current user.
 */
export function useCanvasProjects(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: canvasProjectKeys.list(params),
    queryFn: async (): Promise<CanvasProjectListResponse> => {
      const token = getToken();
      
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.offset) searchParams.set('offset', String(params.offset));
      
      const response = await fetch(
        `${API_BASE}/canvas-projects?${searchParams.toString()}`,
        { headers: authHeaders(token) }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch canvas projects');
      }
      
      const data = await response.json();
      return {
        projects: data.projects.map(transformProjectListItem),
        total: data.total,
      };
    },
  });
}

/**
 * Get a single canvas project by ID with full data.
 */
export function useCanvasProject(projectId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: canvasProjectKeys.detail(projectId),
    queryFn: async (): Promise<CanvasProject> => {
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/canvas-projects/${projectId}`, {
        headers: authHeaders(token),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch canvas project');
      }
      
      return transformProject(await response.json());
    },
    enabled: options?.enabled !== false && !!projectId,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new canvas project.
 */
export function useCreateCanvasProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: CreateCanvasProjectRequest): Promise<CanvasProject> => {
      const token = getToken();
      
      const body = {
        name: request.name || 'Untitled Project',
        asset_type: request.assetType,
        sketch_elements: request.sketchElements || [],
        placements: request.placements || [],
        assets: request.assets || [],
        thumbnail_url: request.thumbnailUrl,
      };
      
      const response = await fetch(`${API_BASE}/canvas-projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to create canvas project');
      }
      
      return transformProject(await response.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: canvasProjectKeys.lists() });
    },
  });
}

/**
 * Update a canvas project.
 */
export function useUpdateCanvasProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      projectId, 
      ...request 
    }: UpdateCanvasProjectRequest & { projectId: string }): Promise<CanvasProject> => {
      const token = getToken();
      
      const body: Record<string, any> = {};
      if (request.name !== undefined) body.name = request.name;
      if (request.sketchElements !== undefined) body.sketch_elements = request.sketchElements;
      if (request.placements !== undefined) body.placements = request.placements;
      if (request.assets !== undefined) body.assets = request.assets;
      if (request.thumbnailUrl !== undefined) body.thumbnail_url = request.thumbnailUrl;
      
      const response = await fetch(`${API_BASE}/canvas-projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to update canvas project');
      }
      
      return transformProject(await response.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: canvasProjectKeys.lists() });
      queryClient.setQueryData(canvasProjectKeys.detail(data.id), data);
    },
  });
}

/**
 * Delete a canvas project.
 */
export function useDeleteCanvasProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (projectId: string): Promise<void> => {
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/canvas-projects/${projectId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete canvas project');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: canvasProjectKeys.lists() });
    },
  });
}
