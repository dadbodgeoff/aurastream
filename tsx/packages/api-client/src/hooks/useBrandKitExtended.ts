/**
 * TanStack Query hooks for extended brand kit operations.
 * Provides hooks for colors, typography, voice, and guidelines endpoints.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  ColorPaletteInput,
  ColorPaletteResponseData,
  TypographyInput,
  TypographyResponseData,
  BrandVoiceInput,
  VoiceResponseData,
  BrandGuidelinesInput,
  GuidelinesResponseData,
} from '../types/brandKitExtended';
import {
  DEFAULT_COLOR_PALETTE,
  DEFAULT_TYPOGRAPHY,
  DEFAULT_BRAND_VOICE,
  DEFAULT_BRAND_GUIDELINES,
} from '../types/brandKitExtended';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : 'http://localhost:8000';

function getAccessToken(): string | null {
  return apiClient.getAccessToken();
}

// ============================================================================
// Query Keys
// ============================================================================

export const brandKitExtendedKeys = {
  all: ['brandKitExtended'] as const,
  colors: (brandKitId: string) => [...brandKitExtendedKeys.all, 'colors', brandKitId] as const,
  typography: (brandKitId: string) => [...brandKitExtendedKeys.all, 'typography', brandKitId] as const,
  voice: (brandKitId: string) => [...brandKitExtendedKeys.all, 'voice', brandKitId] as const,
  guidelines: (brandKitId: string) => [...brandKitExtendedKeys.all, 'guidelines', brandKitId] as const,
};

// ============================================================================
// Transform Functions (snake_case <-> camelCase)
// ============================================================================

function transformColorPaletteResponse(data: Record<string, unknown>): ColorPaletteResponseData {
  const colors = data.colors as ColorPaletteInput | undefined;
  return {
    brandKitId: data.brand_kit_id as string,
    colors: colors || DEFAULT_COLOR_PALETTE,
  };
}

function transformColorPaletteToApi(colors: ColorPaletteInput): Record<string, unknown> {
  // Colors use same format, no transformation needed
  return colors as unknown as Record<string, unknown>;
}

function transformTypographyResponse(data: Record<string, unknown>): TypographyResponseData {
  const typography = data.typography as TypographyInput | undefined;
  return {
    brandKitId: data.brand_kit_id as string,
    typography: typography || DEFAULT_TYPOGRAPHY,
  };
}

function transformTypographyToApi(typography: TypographyInput): Record<string, unknown> {
  // Typography uses same format, no transformation needed
  return typography as unknown as Record<string, unknown>;
}

function transformVoiceResponse(data: Record<string, unknown>): VoiceResponseData {
  const voice = data.voice as Record<string, unknown> | undefined;
  if (!voice) {
    return {
      brandKitId: data.brand_kit_id as string,
      voice: DEFAULT_BRAND_VOICE,
    };
  }
  return {
    brandKitId: data.brand_kit_id as string,
    voice: {
      tone: (voice.tone as BrandVoiceInput['tone']) || 'professional',
      personalityTraits: (voice.personality_traits as string[]) || [],
      tagline: (voice.tagline as string) || '',
      catchphrases: (voice.catchphrases as string[]) || [],
      contentThemes: (voice.content_themes as string[]) || [],
    },
  };
}

function transformVoiceToApi(voice: BrandVoiceInput): Record<string, unknown> {
  return {
    tone: voice.tone,
    personality_traits: voice.personalityTraits,
    tagline: voice.tagline || null,
    catchphrases: voice.catchphrases,
    content_themes: voice.contentThemes,
  };
}

function transformGuidelinesResponse(data: Record<string, unknown>): GuidelinesResponseData {
  const guidelines = data.guidelines as Record<string, unknown> | undefined;
  if (!guidelines) {
    return {
      brandKitId: data.brand_kit_id as string,
      guidelines: DEFAULT_BRAND_GUIDELINES,
    };
  }
  return {
    brandKitId: data.brand_kit_id as string,
    guidelines: {
      logoMinSizePx: (guidelines.logo_min_size_px as number) ?? 48,
      logoClearSpaceRatio: (guidelines.logo_clear_space_ratio as number) ?? 0.25,
      primaryColorRatio: (guidelines.primary_color_ratio as number) ?? 60,
      secondaryColorRatio: (guidelines.secondary_color_ratio as number) ?? 30,
      accentColorRatio: (guidelines.accent_color_ratio as number) ?? 10,
      prohibitedModifications: (guidelines.prohibited_modifications as string[]) || [],
      styleDo: (guidelines.style_do as string) || '',
      styleDont: (guidelines.style_dont as string) || '',
    },
  };
}

function transformGuidelinesToApi(guidelines: BrandGuidelinesInput): Record<string, unknown> {
  return {
    logo_min_size_px: guidelines.logoMinSizePx,
    logo_clear_space_ratio: guidelines.logoClearSpaceRatio,
    primary_color_ratio: guidelines.primaryColorRatio,
    secondary_color_ratio: guidelines.secondaryColorRatio,
    accent_color_ratio: guidelines.accentColorRatio,
    prohibited_modifications: guidelines.prohibitedModifications,
    style_do: guidelines.styleDo || null,
    style_dont: guidelines.styleDont || null,
  };
}

// ============================================================================
// Extended Colors Hooks
// ============================================================================

export function useExtendedColors(brandKitId: string | undefined) {
  return useQuery({
    queryKey: brandKitExtendedKeys.colors(brandKitId || ''),
    queryFn: async (): Promise<ColorPaletteResponseData> => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/v1/brand-kits/${brandKitId}/colors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        if (response.status === 404) {
          // Return default if not found
          return { brandKitId: brandKitId!, colors: DEFAULT_COLOR_PALETTE };
        }
        throw new Error('Failed to fetch extended colors');
      }
      const data = await response.json();
      return transformColorPaletteResponse(data);
    },
    enabled: !!brandKitId,
  });
}

export function useUpdateExtendedColors() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ brandKitId, colors }: { brandKitId: string; colors: ColorPaletteInput }) => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/v1/brand-kits/${brandKitId}/colors`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformColorPaletteToApi(colors)),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || 'Failed to update extended colors');
      }
      return response.json();
    },
    onSuccess: (_, { brandKitId }) => {
      queryClient.invalidateQueries({ queryKey: brandKitExtendedKeys.colors(brandKitId) });
      queryClient.invalidateQueries({ queryKey: ['brandKits'] });
    },
  });
}

// ============================================================================
// Typography Hooks
// ============================================================================

export function useTypography(brandKitId: string | undefined) {
  return useQuery({
    queryKey: brandKitExtendedKeys.typography(brandKitId || ''),
    queryFn: async (): Promise<TypographyResponseData> => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/v1/brand-kits/${brandKitId}/typography`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        if (response.status === 404) {
          return { brandKitId: brandKitId!, typography: DEFAULT_TYPOGRAPHY };
        }
        throw new Error('Failed to fetch typography');
      }
      const data = await response.json();
      return transformTypographyResponse(data);
    },
    enabled: !!brandKitId,
  });
}

export function useUpdateTypography() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ brandKitId, typography }: { brandKitId: string; typography: TypographyInput }) => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/v1/brand-kits/${brandKitId}/typography`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformTypographyToApi(typography)),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || 'Failed to update typography');
      }
      return response.json();
    },
    onSuccess: (_, { brandKitId }) => {
      queryClient.invalidateQueries({ queryKey: brandKitExtendedKeys.typography(brandKitId) });
      queryClient.invalidateQueries({ queryKey: ['brandKits'] });
    },
  });
}

// ============================================================================
// Brand Voice Hooks
// ============================================================================

export function useBrandVoice(brandKitId: string | undefined) {
  return useQuery({
    queryKey: brandKitExtendedKeys.voice(brandKitId || ''),
    queryFn: async (): Promise<VoiceResponseData> => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/v1/brand-kits/${brandKitId}/voice`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        if (response.status === 404) {
          return { brandKitId: brandKitId!, voice: DEFAULT_BRAND_VOICE };
        }
        throw new Error('Failed to fetch brand voice');
      }
      const data = await response.json();
      return transformVoiceResponse(data);
    },
    enabled: !!brandKitId,
  });
}

export function useUpdateBrandVoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ brandKitId, voice }: { brandKitId: string; voice: BrandVoiceInput }) => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/v1/brand-kits/${brandKitId}/voice`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformVoiceToApi(voice)),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || 'Failed to update brand voice');
      }
      return response.json();
    },
    onSuccess: (_, { brandKitId }) => {
      queryClient.invalidateQueries({ queryKey: brandKitExtendedKeys.voice(brandKitId) });
      queryClient.invalidateQueries({ queryKey: ['brandKits'] });
    },
  });
}

// ============================================================================
// Brand Guidelines Hooks
// ============================================================================

export function useBrandGuidelines(brandKitId: string | undefined) {
  return useQuery({
    queryKey: brandKitExtendedKeys.guidelines(brandKitId || ''),
    queryFn: async (): Promise<GuidelinesResponseData> => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/v1/brand-kits/${brandKitId}/guidelines`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        if (response.status === 404) {
          return { brandKitId: brandKitId!, guidelines: DEFAULT_BRAND_GUIDELINES };
        }
        throw new Error('Failed to fetch brand guidelines');
      }
      const data = await response.json();
      return transformGuidelinesResponse(data);
    },
    enabled: !!brandKitId,
  });
}

export function useUpdateBrandGuidelines() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ brandKitId, guidelines }: { brandKitId: string; guidelines: BrandGuidelinesInput }) => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/v1/brand-kits/${brandKitId}/guidelines`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformGuidelinesToApi(guidelines)),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || 'Failed to update brand guidelines');
      }
      return response.json();
    },
    onSuccess: (_, { brandKitId }) => {
      queryClient.invalidateQueries({ queryKey: brandKitExtendedKeys.guidelines(brandKitId) });
      queryClient.invalidateQueries({ queryKey: ['brandKits'] });
    },
  });
}
