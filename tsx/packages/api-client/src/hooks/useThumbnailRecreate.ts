/**
 * Thumbnail Recreation React Query Hooks
 * 
 * Provides hooks for the thumbnail recreation feature.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  RecreateRequest,
  RecreateResponse,
  RecreationStatus,
  RecreationHistory,
  RecreationHistoryItem,
  FaceAsset,
  FaceAssetsResponse,
  UploadFaceRequest,
  UploadFaceResponse,
} from '../types/thumbnailRecreate';
import type { ThumbnailAnalysis } from '../types/thumbnailIntel';

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

export const thumbnailRecreateKeys = {
  all: ['thumbnailRecreate'] as const,
  status: (id: string) => [...thumbnailRecreateKeys.all, 'status', id] as const,
  history: () => [...thumbnailRecreateKeys.all, 'history'] as const,
  faces: () => [...thumbnailRecreateKeys.all, 'faces'] as const,
};

// ============================================================================
// Transform Functions (snake_case to camelCase)
// ============================================================================

function transformRecreateResponse(data: any): RecreateResponse {
  return {
    recreationId: data.recreation_id,
    jobId: data.job_id,
    status: data.status,
    estimatedSeconds: data.estimated_seconds,
    message: data.message,
  };
}

function transformRecreationStatus(data: any): RecreationStatus {
  return {
    recreationId: data.recreation_id,
    jobId: data.job_id,
    status: data.status,
    progressPercent: data.progress_percent,
    generatedThumbnailUrl: data.generated_thumbnail_url,
    downloadUrl: data.download_url,
    assetId: data.asset_id,
    errorMessage: data.error_message,
  };
}

function transformHistoryItem(data: any): RecreationHistoryItem {
  return {
    id: data.id,
    referenceVideoId: data.reference_video_id,
    referenceThumbnailUrl: data.reference_thumbnail_url,
    generatedThumbnailUrl: data.generated_thumbnail_url,
    customText: data.custom_text,
    status: data.status,
    createdAt: data.created_at,
  };
}

function transformFaceAsset(data: any): FaceAsset {
  return {
    id: data.id,
    displayName: data.display_name,
    originalUrl: data.original_url,
    processedUrl: data.processed_url,
    isPrimary: data.is_primary,
    createdAt: data.created_at,
  };
}

// Transform analysis to snake_case for API
function transformAnalysisToSnake(analysis: ThumbnailAnalysis): any {
  return {
    video_id: analysis.videoId,
    title: analysis.title,
    thumbnail_url: analysis.thumbnailUrl,
    view_count: analysis.viewCount,
    layout_type: analysis.layoutType,
    text_placement: analysis.textPlacement,
    focal_point: analysis.focalPoint,
    dominant_colors: analysis.dominantColors,
    color_mood: analysis.colorMood,
    background_style: analysis.backgroundStyle,
    has_face: analysis.hasFace,
    has_text: analysis.hasText,
    text_content: analysis.textContent,
    has_border: analysis.hasBorder,
    has_glow_effects: analysis.hasGlowEffects,
    has_arrows_circles: analysis.hasArrowsCircles,
    face_expression: analysis.faceExpression,
    face_position: analysis.facePosition,
    face_size: analysis.faceSize,
    face_looking_direction: analysis.faceLookingDirection,
    layout_recipe: analysis.layoutRecipe,
    color_recipe: analysis.colorRecipe,
    why_it_works: analysis.whyItWorks,
    difficulty: analysis.difficulty,
  };
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Start a thumbnail recreation.
 * 
 * @example
 * ```tsx
 * const { mutate: recreate, isPending } = useRecreateThumbnail();
 * 
 * recreate({
 *   videoId: 'abc123',
 *   thumbnailUrl: 'https://...',
 *   analysis: thumbnailAnalysis,
 *   faceImageBase64: base64Image,
 * });
 * ```
 */
export function useRecreateThumbnail() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: RecreateRequest): Promise<RecreateResponse> => {
      const token = getToken();
      
      const body = {
        video_id: request.videoId,
        thumbnail_url: request.thumbnailUrl,
        analysis: transformAnalysisToSnake(request.analysis),
        face_image_base64: request.faceImageBase64,
        face_asset_id: request.faceAssetId,
        custom_text: request.customText,
        use_brand_colors: request.useBrandColors,
        brand_kit_id: request.brandKitId,
        additional_instructions: request.additionalInstructions,
      };
      
      const response = await fetch(`${API_BASE}/thumbnails/recreate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Recreation failed');
      }
      
      return transformRecreateResponse(await response.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: thumbnailRecreateKeys.history() });
    },
  });
}

/**
 * Poll recreation status.
 * 
 * @example
 * ```tsx
 * const { data: status } = useRecreationStatus(recreationId, {
 *   refetchInterval: (data) => data?.status === 'completed' ? false : 2000,
 * });
 * ```
 */
export function useRecreationStatus(
  recreationId: string,
  options?: { enabled?: boolean; refetchInterval?: number | false }
) {
  return useQuery({
    queryKey: thumbnailRecreateKeys.status(recreationId),
    queryFn: async (): Promise<RecreationStatus> => {
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/thumbnails/recreate/${recreationId}`, {
        headers: authHeaders(token),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get recreation status');
      }
      
      return transformRecreationStatus(await response.json());
    },
    enabled: options?.enabled !== false && !!recreationId,
    refetchInterval: options?.refetchInterval,
  });
}

/**
 * Get recreation history.
 * 
 * @example
 * ```tsx
 * const { data: history } = useRecreationHistory();
 * ```
 */
export function useRecreationHistory(limit = 20, offset = 0) {
  return useQuery({
    queryKey: [...thumbnailRecreateKeys.history(), limit, offset],
    queryFn: async (): Promise<RecreationHistory> => {
      const token = getToken();
      
      const response = await fetch(
        `${API_BASE}/thumbnails/recreations?limit=${limit}&offset=${offset}`,
        { headers: authHeaders(token) }
      );
      
      if (!response.ok) {
        throw new Error('Failed to get recreation history');
      }
      
      const data = await response.json();
      return {
        recreations: data.recreations.map(transformHistoryItem),
        total: data.total,
      };
    },
  });
}

/**
 * Get user's saved face assets.
 * 
 * @example
 * ```tsx
 * const { data: faces } = useFaceAssets();
 * ```
 */
export function useFaceAssets() {
  return useQuery({
    queryKey: thumbnailRecreateKeys.faces(),
    queryFn: async (): Promise<FaceAssetsResponse> => {
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/thumbnails/faces`, {
        headers: authHeaders(token),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get face assets');
      }
      
      const data = await response.json();
      return {
        faces: data.faces.map(transformFaceAsset),
        total: data.total,
      };
    },
  });
}

/**
 * Upload a new face asset.
 * 
 * @example
 * ```tsx
 * const { mutate: uploadFace } = useUploadFace();
 * 
 * uploadFace({
 *   imageBase64: base64Image,
 *   displayName: 'My Face',
 *   setAsPrimary: true,
 * });
 * ```
 */
export function useUploadFace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: UploadFaceRequest): Promise<UploadFaceResponse> => {
      const token = getToken();
      
      const body = {
        image_base64: request.imageBase64,
        display_name: request.displayName,
        set_as_primary: request.setAsPrimary,
      };
      
      const response = await fetch(`${API_BASE}/thumbnails/faces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Face upload failed');
      }
      
      const data = await response.json();
      return {
        face: transformFaceAsset(data.face),
        message: data.message,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: thumbnailRecreateKeys.faces() });
    },
  });
}

/**
 * Delete a face asset.
 * 
 * @example
 * ```tsx
 * const { mutate: deleteFace } = useDeleteFace();
 * deleteFace(faceId);
 * ```
 */
export function useDeleteFace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (faceId: string): Promise<void> => {
      const token = getToken();
      
      const response = await fetch(`${API_BASE}/thumbnails/faces/${faceId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete face asset');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: thumbnailRecreateKeys.faces() });
    },
  });
}
