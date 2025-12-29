// Generation Hooks for Streamer Studio
// TanStack Query hooks for generation jobs and assets

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { apiClient } from '../client';
import type {
  GenerateRequest,
  JobResponse,
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
// Error Classification
// ============================================================================

/**
 * Classify generation errors for appropriate handling
 */
export type GenerationErrorCode = 
  | 'GENERATION_RATE_LIMIT'
  | 'GENERATION_LIMIT_EXCEEDED'
  | 'GENERATION_FAILED'
  | 'GENERATION_TIMEOUT'
  | 'GENERATION_CONTENT_POLICY'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface ClassifiedError {
  code: GenerationErrorCode;
  message: string;
  retryable: boolean;
  retryAfter?: number; // seconds
}

/**
 * Classify an error for appropriate UI handling
 */
export function classifyGenerationError(error: unknown): ClassifiedError {
  if (!error) {
    return { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred', retryable: true };
  }

  // Handle fetch/network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return { code: 'NETWORK_ERROR', message: 'Network connection failed', retryable: true };
  }

  // Handle API error responses
  const err = error as any;
  const status = err?.status || err?.response?.status;
  const errorCode = err?.code || err?.error?.code || err?.response?.data?.error?.code;
  const errorMessage = err?.message || err?.error?.message || err?.response?.data?.error?.message;

  // Rate limit (429)
  if (status === 429 || errorCode === 'RATE_LIMIT' || errorCode === 'GENERATION_RATE_LIMIT') {
    const retryAfter = err?.retryAfter || err?.response?.headers?.['retry-after'] || 60;
    return {
      code: 'GENERATION_RATE_LIMIT',
      message: 'Too many requests. Please wait before trying again.',
      retryable: true,
      retryAfter: parseInt(retryAfter, 10),
    };
  }

  // Usage limit exceeded (403 with specific code)
  if (errorCode === 'USAGE_LIMIT_EXCEEDED' || errorCode === 'GENERATION_LIMIT_EXCEEDED') {
    return {
      code: 'GENERATION_LIMIT_EXCEEDED',
      message: 'Monthly generation limit reached. Upgrade for more.',
      retryable: false,
    };
  }

  // Content policy violation
  if (errorCode === 'CONTENT_POLICY' || errorCode === 'GENERATION_CONTENT_POLICY') {
    return {
      code: 'GENERATION_CONTENT_POLICY',
      message: 'Content policy violation. Please adjust your prompt.',
      retryable: false,
    };
  }

  // Timeout
  if (status === 408 || errorCode === 'TIMEOUT' || errorCode === 'GENERATION_TIMEOUT') {
    return {
      code: 'GENERATION_TIMEOUT',
      message: 'Generation timed out. Please try again.',
      retryable: true,
    };
  }

  // Server errors (5xx) - retryable
  if (status >= 500) {
    return {
      code: 'GENERATION_FAILED',
      message: errorMessage || 'Server error. Please try again.',
      retryable: true,
    };
  }

  // Default to failed but retryable
  return {
    code: 'GENERATION_FAILED',
    message: errorMessage || 'Generation failed. Please try again.',
    retryable: true,
  };
}

// ============================================================================
// Job Hooks
// ============================================================================

/**
 * Options for useGenerateAsset hook
 */
export interface UseGenerateAssetOptions {
  /** Callback on successful generation */
  onSuccess?: (data: JobResponse) => void;
  /** Callback on error with classified error info */
  onError?: (error: ClassifiedError, originalError: unknown) => void;
  /** Maximum retry attempts for transient failures */
  maxRetries?: number;
  /** Base delay between retries in ms */
  retryDelay?: number;
}

/**
 * Create a new generation job with enterprise error handling
 */
export function useGenerateAsset(options: UseGenerateAssetOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, maxRetries = 2, retryDelay = 1000 } = options;
  const retryCountRef = useRef(0);
  const lastRequestRef = useRef<GenerateRequest | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: GenerateRequest) => {
      lastRequestRef.current = data;
      return apiClient.generation.create(data);
    },
    onSuccess: (data) => {
      retryCountRef.current = 0;
      queryClient.invalidateQueries({ queryKey: generationKeys.jobs() });
      onSuccess?.(data);
    },
    onError: (error) => {
      const classified = classifyGenerationError(error);
      onError?.(classified, error);
    },
    retry: (failureCount, error) => {
      const classified = classifyGenerationError(error);
      // Only retry if error is retryable and under max retries
      if (!classified.retryable || failureCount >= maxRetries) {
        return false;
      }
      retryCountRef.current = failureCount + 1;
      return true;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s...
      return retryDelay * Math.pow(2, attemptIndex);
    },
  });

  // Manual retry function
  const retry = useCallback(() => {
    if (lastRequestRef.current) {
      retryCountRef.current = 0;
      mutation.mutate(lastRequestRef.current);
    }
  }, [mutation]);

  return {
    ...mutation,
    retry,
    retryCount: retryCountRef.current,
    classifiedError: mutation.error ? classifyGenerationError(mutation.error) : null,
  };
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
