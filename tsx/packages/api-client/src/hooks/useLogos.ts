/**
 * Logo management hooks for Streamer Studio.
 * TanStack Query hooks for brand kit logo operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { brandKitKeys } from './useBrandKits';

// Types
export type LogoType = 'primary' | 'secondary' | 'icon' | 'monochrome' | 'watermark';

export interface LogoUploadResponse {
  type: LogoType;
  url: string;
  storagePath: string;
  contentType: string;
  fileSize: number;
  filename?: string;
}

export interface LogoListResponse {
  logos: Record<LogoType, string | null>;
  brandKitId: string;
  defaultLogoType: LogoType;
}

export interface LogoUrlResponse {
  type: LogoType;
  url: string | null;
}

export interface LogoDeleteResponse {
  deleted: boolean;
  type: LogoType;
}

// Query keys
export const logoKeys = {
  all: ['logos'] as const,
  list: (brandKitId: string) => [...logoKeys.all, 'list', brandKitId] as const,
  detail: (brandKitId: string, type: LogoType) => [...logoKeys.all, 'detail', brandKitId, type] as const,
};

// Helper to get base URL - same as apiClient initialization
function getBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'http://localhost:8000';
}

/**
 * Hook to list all logos for a brand kit.
 */
export function useLogos(brandKitId: string | undefined) {
  return useQuery({
    queryKey: logoKeys.list(brandKitId ?? ''),
    queryFn: async () => {
      const baseUrl = getBaseUrl();
      const token = apiClient.getAccessToken();
      
      const response = await fetch(`${baseUrl}/api/v1/brand-kits/${brandKitId}/logos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch logos');
      const data = await response.json();
      // Transform snake_case to camelCase
      return {
        logos: data.logos,
        brandKitId: data.brand_kit_id,
        defaultLogoType: data.default_logo_type || 'primary',
      } as LogoListResponse;
    },
    enabled: !!brandKitId,
  });
}

/**
 * Hook to get a specific logo URL.
 */
export function useLogo(brandKitId: string | undefined, logoType: LogoType) {
  return useQuery({
    queryKey: logoKeys.detail(brandKitId ?? '', logoType),
    queryFn: async () => {
      const baseUrl = getBaseUrl();
      const token = apiClient.getAccessToken();
      
      const response = await fetch(`${baseUrl}/api/v1/brand-kits/${brandKitId}/logos/${logoType}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch logo');
      return response.json() as Promise<LogoUrlResponse>;
    },
    enabled: !!brandKitId,
  });
}

/**
 * Hook to upload a logo.
 */
export function useUploadLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      brandKitId, 
      logoType, 
      file 
    }: { 
      brandKitId: string; 
      logoType: LogoType; 
      file: File;
    }) => {
      const baseUrl = getBaseUrl();
      const token = apiClient.getAccessToken();
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('logo_type', logoType);

      const response = await fetch(`${baseUrl}/api/v1/brand-kits/${brandKitId}/logos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to upload logo' }));
        throw new Error(error.detail || 'Failed to upload logo');
      }

      const data = await response.json();
      return {
        type: data.type,
        url: data.url,
        storagePath: data.storage_path,
        contentType: data.content_type,
        fileSize: data.file_size,
        filename: data.filename,
      } as LogoUploadResponse;
    },
    onSuccess: (_, variables) => {
      // Invalidate logo queries
      queryClient.invalidateQueries({ queryKey: logoKeys.list(variables.brandKitId) });
      queryClient.invalidateQueries({ queryKey: logoKeys.detail(variables.brandKitId, variables.logoType) });
      // Also invalidate brand kit to update logos metadata
      queryClient.invalidateQueries({ queryKey: brandKitKeys.detail(variables.brandKitId) });
    },
  });
}

/**
 * Hook to delete a logo.
 */
export function useDeleteLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      brandKitId, 
      logoType 
    }: { 
      brandKitId: string; 
      logoType: LogoType;
    }) => {
      const baseUrl = getBaseUrl();
      const token = apiClient.getAccessToken();
      
      const response = await fetch(`${baseUrl}/api/v1/brand-kits/${brandKitId}/logos/${logoType}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to delete logo' }));
        throw new Error(error.detail || 'Failed to delete logo');
      }

      return response.json() as Promise<LogoDeleteResponse>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: logoKeys.list(variables.brandKitId) });
      queryClient.invalidateQueries({ queryKey: logoKeys.detail(variables.brandKitId, variables.logoType) });
      queryClient.invalidateQueries({ queryKey: brandKitKeys.detail(variables.brandKitId) });
    },
  });
}

/**
 * Hook to set the default logo for asset generation.
 */
export function useSetDefaultLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      brandKitId, 
      logoType 
    }: { 
      brandKitId: string; 
      logoType: LogoType;
    }) => {
      const baseUrl = getBaseUrl();
      const token = apiClient.getAccessToken();
      
      const response = await fetch(`${baseUrl}/api/v1/brand-kits/${brandKitId}/logos/default`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logo_type: logoType }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to set default logo' }));
        throw new Error(error.detail || 'Failed to set default logo');
      }

      const data = await response.json();
      return { defaultLogoType: data.default_logo_type } as { defaultLogoType: LogoType };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: logoKeys.list(variables.brandKitId) });
      queryClient.invalidateQueries({ queryKey: brandKitKeys.detail(variables.brandKitId) });
    },
  });
}
