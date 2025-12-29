/**
 * TanStack Query hooks for Profile Creator feature.
 * 
 * @module hooks/useProfileCreator
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  ProfileCreatorAccessResponse,
  SessionStateResponse,
  GenerationResultResponse,
  GalleryResponse,
  StartProfileCreatorRequest,
  GenerateFromSessionRequest,
  CreationType,
} from '../types/profileCreator';

// ============================================================================
// Query Keys
// ============================================================================

export const profileCreatorKeys = {
  all: ['profile-creator'] as const,
  access: () => [...profileCreatorKeys.all, 'access'] as const,
  session: (id: string) => [...profileCreatorKeys.all, 'session', id] as const,
  gallery: (filters?: { creationType?: CreationType }) => 
    [...profileCreatorKeys.all, 'gallery', filters] as const,
};

// ============================================================================
// Transform Functions
// ============================================================================

function transformAccessResponse(data: Record<string, unknown>): ProfileCreatorAccessResponse {
  return {
    canUse: data.can_use as boolean,
    used: data.used as number,
    limit: data.limit as number,
    remaining: data.remaining as number,
    tier: data.tier as string,
    resetsAt: data.resets_at as string | null,
  };
}

function transformSessionResponse(data: Record<string, unknown>): SessionStateResponse {
  return {
    sessionId: data.session_id as string,
    creationType: data.creation_type as CreationType,
    status: data.status as SessionStateResponse['status'],
    stylePreset: data.style_preset as SessionStateResponse['stylePreset'],
    refinedDescription: data.refined_description as string | null,
    isReady: data.is_ready as boolean,
    confidence: data.confidence as number,
    turnsUsed: data.turns_used as number,
    turnsRemaining: data.turns_remaining as number,
    createdAt: data.created_at as string,
    expiresAt: data.expires_at as string,
  };
}

function transformGenerationResponse(data: Record<string, unknown>): GenerationResultResponse {
  return {
    jobId: data.job_id as string,
    assetId: data.asset_id as string | null,
    status: data.status as GenerationResultResponse['status'],
    assetUrl: data.asset_url as string | null,
    width: data.width as number | null,
    height: data.height as number | null,
    createdAt: data.created_at as string,
  };
}

function transformGalleryResponse(data: Record<string, unknown>): GalleryResponse {
  const items = (data.items as Record<string, unknown>[]).map((item) => ({
    id: item.id as string,
    creationType: item.creation_type as CreationType,
    assetUrl: item.asset_url as string,
    thumbnailUrl: item.thumbnail_url as string | null,
    width: item.width as number,
    height: item.height as number,
    stylePreset: item.style_preset as GalleryResponse['items'][0]['stylePreset'],
    promptUsed: item.prompt_used as string | null,
    createdAt: item.created_at as string,
  }));

  return {
    items,
    total: data.total as number,
    limit: data.limit as number,
    offset: data.offset as number,
  };
}

// ============================================================================
// API Functions
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchAccess(): Promise<ProfileCreatorAccessResponse> {
  const accessToken = apiClient.getAccessToken();
  
  const response = await fetch(`${API_BASE_URL}/api/v1/profile-creator/access`, {
    headers: {
      'Authorization': accessToken ? `Bearer ${accessToken}` : '',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch profile creator access');
  }

  const data = await response.json();
  return transformAccessResponse(data);
}

async function fetchSession(sessionId: string): Promise<SessionStateResponse> {
  const accessToken = apiClient.getAccessToken();
  
  const response = await fetch(
    `${API_BASE_URL}/api/v1/profile-creator/sessions/${sessionId}`,
    {
      headers: {
        'Authorization': accessToken ? `Bearer ${accessToken}` : '',
      },
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch session');
  }

  const data = await response.json();
  return transformSessionResponse(data);
}

async function fetchGallery(
  creationType?: CreationType,
  limit = 20,
  offset = 0
): Promise<GalleryResponse> {
  const accessToken = apiClient.getAccessToken();
  
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  
  if (creationType) {
    params.set('creation_type', creationType);
  }
  
  const response = await fetch(
    `${API_BASE_URL}/api/v1/profile-creator/gallery?${params}`,
    {
      headers: {
        'Authorization': accessToken ? `Bearer ${accessToken}` : '',
      },
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch gallery');
  }

  const data = await response.json();
  return transformGalleryResponse(data);
}

async function generateFromSession(
  sessionId: string,
  options: GenerateFromSessionRequest
): Promise<GenerationResultResponse> {
  const accessToken = apiClient.getAccessToken();
  
  const response = await fetch(
    `${API_BASE_URL}/api/v1/profile-creator/sessions/${sessionId}/generate`,
    {
      method: 'POST',
      headers: {
        'Authorization': accessToken ? `Bearer ${accessToken}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        output_size: options.outputSize || 'medium',
        output_format: options.outputFormat || 'png',
        background: options.background || 'transparent',
        background_color: options.backgroundColor,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail?.message || 'Failed to generate');
  }

  const data = await response.json();
  return transformGenerationResponse(data);
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to check profile creator access and quota.
 */
export function useProfileCreatorAccess() {
  return useQuery({
    queryKey: profileCreatorKeys.access(),
    queryFn: fetchAccess,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to get session state.
 */
export function useProfileCreatorSession(sessionId: string | null) {
  return useQuery({
    queryKey: profileCreatorKeys.session(sessionId || ''),
    queryFn: () => fetchSession(sessionId!),
    enabled: !!sessionId,
    refetchInterval: (data) => {
      // Poll while generating
      if (data?.status === 'generating') {
        return 2000;
      }
      return false;
    },
  });
}

/**
 * Hook to get profile creator gallery.
 */
export function useProfileCreatorGallery(options?: {
  creationType?: CreationType;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: profileCreatorKeys.gallery({ creationType: options?.creationType }),
    queryFn: () => fetchGallery(
      options?.creationType,
      options?.limit,
      options?.offset
    ),
  });
}

/**
 * Hook to generate from a session.
 */
export function useGenerateFromSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      sessionId, 
      options 
    }: { 
      sessionId: string; 
      options: GenerateFromSessionRequest;
    }) => generateFromSession(sessionId, options),
    onSuccess: () => {
      // Invalidate gallery to show new item
      queryClient.invalidateQueries({ queryKey: profileCreatorKeys.gallery() });
      // Invalidate access to update remaining count
      queryClient.invalidateQueries({ queryKey: profileCreatorKeys.access() });
    },
  });
}

/**
 * Helper to create SSE URL for starting a session.
 */
export function getStartSessionUrl(): string {
  return `${API_BASE_URL}/api/v1/profile-creator/start`;
}

/**
 * Helper to create SSE URL for continuing a session.
 */
export function getContinueSessionUrl(sessionId: string): string {
  return `${API_BASE_URL}/api/v1/profile-creator/sessions/${sessionId}/messages`;
}

/**
 * Transform request to snake_case for API.
 */
export function transformStartRequest(request: StartProfileCreatorRequest): Record<string, unknown> {
  return {
    creation_type: request.creationType,
    brand_context: request.brandContext ? {
      brand_kit_id: request.brandContext.brandKitId,
      brand_name: request.brandContext.brandName,
      primary_colors: request.brandContext.primaryColors?.map(c => ({
        hex: c.hex,
        name: c.name,
      })),
      accent_colors: request.brandContext.accentColors?.map(c => ({
        hex: c.hex,
        name: c.name,
      })),
      tone: request.brandContext.tone,
    } : null,
    initial_description: request.initialDescription,
    style_preset: request.stylePreset,
  };
}
