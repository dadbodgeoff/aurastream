/**
 * TanStack Query hooks for Vibe Branding feature.
 * 
 * Provides mutations and queries for:
 * - Image analysis (upload and URL)
 * - Usage tracking
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  AnalyzeResponse,
  AnalyzeUrlRequest,
  AnalyzeUploadOptions,
  UsageResponse,
} from '../types/vibeBranding';

// ============================================================================
// Query Keys
// ============================================================================

export const vibeBrandingKeys = {
  all: ['vibe-branding'] as const,
  usage: () => [...vibeBrandingKeys.all, 'usage'] as const,
};

// ============================================================================
// Mutations
// ============================================================================

/**
 * Analyze an uploaded image and extract brand identity.
 * 
 * @example
 * const { mutate: analyzeImage } = useAnalyzeImage();
 * analyzeImage({ file, options: { autoCreateKit: true } });
 */
export function useAnalyzeImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      options,
    }: {
      file: File;
      options?: AnalyzeUploadOptions;
    }): Promise<AnalyzeResponse> => {
      return apiClient.vibeBranding.analyzeUpload(file, options);
    },
    onSuccess: () => {
      // Invalidate usage and brand kits queries
      queryClient.invalidateQueries({ queryKey: vibeBrandingKeys.usage() });
      queryClient.invalidateQueries({ queryKey: ['brand-kits'] });
    },
  });
}

/**
 * Analyze an image from URL and extract brand identity.
 * 
 * @example
 * const { mutate: analyzeUrl } = useAnalyzeUrl();
 * analyzeUrl({ imageUrl: 'https://...', autoCreateKit: true });
 */
export function useAnalyzeUrl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AnalyzeUrlRequest): Promise<AnalyzeResponse> => {
      return apiClient.vibeBranding.analyzeUrl(data);
    },
    onSuccess: () => {
      // Invalidate usage and brand kits queries
      queryClient.invalidateQueries({ queryKey: vibeBrandingKeys.usage() });
      queryClient.invalidateQueries({ queryKey: ['brand-kits'] });
    },
  });
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get user's vibe branding usage for current month.
 * 
 * @example
 * const { data: usage, isLoading } = useVibeBrandingUsage();
 */
export function useVibeBrandingUsage() {
  return useQuery({
    queryKey: vibeBrandingKeys.usage(),
    queryFn: (): Promise<UsageResponse> => {
      return apiClient.vibeBranding.getUsage();
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
