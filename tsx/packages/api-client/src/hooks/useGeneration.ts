// Generation Hooks for Streamer Studio
// TanStack Query hooks for generation jobs and assets

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  GenerateRequest,
  JobResponse,
  JobListResponse,
  AssetResponse,
  JobFilters,
  AssetFilters,
} from '../types/generation';

// ============================================================================
// Query Keys
// ============================================================================

export const generationKeys = {
  all: ['generation'] as const,
  jobs: () => [...generationKeys.all, 'jobs'] as const,
  job: (id: string) => [...generationKeys.jobs(), id] as const,
  jobAssets: (jobId: string) => [...generationKeys.job(jobId), 'assets'] as const,
  assets: () => [...generationKeys.all, 'assets'] as const,
  asset: (id: string) => [...generationKeys.assets(), id] as const,
};

// ============================================================================
// Job Hooks
// ============================================================================

/**
 * Create a new generation job
 */
export function useGenerateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateRequest) => {
      // Pass data directly to the client - it handles transformation
      return apiClient.generation.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: generationKeys.jobs() });
    },
  });
}

/**
 * Get a single job by ID with automatic polling while processing
 */
export function useJob(jobId: string | undefined) {
  return useQuery({
    queryKey: generationKeys.job(jobId ?? ''),
    queryFn: () => apiClient.generation.getJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data as JobResponse | undefined;
      // Poll every 2 seconds while job is queued or processing
      if (data?.status === 'queued' || data?.status === 'processing') {
        return 2000;
      }
      return false;
    },
  });
}

/**
 * List all jobs with optional filters
 */
export function useJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: [...generationKeys.jobs(), filters],
    queryFn: () => apiClient.generation.listJobs(filters),
  });
}

/**
 * Get assets for a specific job
 */
export function useJobAssets(jobId: string | undefined) {
  return useQuery({
    queryKey: generationKeys.jobAssets(jobId ?? ''),
    queryFn: () => apiClient.generation.getJobAssets(jobId!),
    enabled: !!jobId,
  });
}

// ============================================================================
// Asset Hooks
// ============================================================================

/**
 * List all assets with optional filters
 */
export function useAssets(filters?: AssetFilters) {
  return useQuery({
    queryKey: [...generationKeys.assets(), filters],
    queryFn: () => apiClient.assets.list(filters),
  });
}

/**
 * Get a single asset by ID
 */
export function useAsset(assetId: string | undefined) {
  return useQuery({
    queryKey: generationKeys.asset(assetId ?? ''),
    queryFn: () => apiClient.assets.get(assetId!),
    enabled: !!assetId,
  });
}

/**
 * Delete an asset
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.assets.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: generationKeys.assets() });
    },
  });
}

/**
 * Update asset visibility
 */
export function useUpdateAssetVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      apiClient.assets.updateVisibility(id, { isPublic }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: generationKeys.asset(variables.id) });
      queryClient.invalidateQueries({ queryKey: generationKeys.assets() });
    },
  });
}
