/**
 * Thumbnail Intelligence React Query Hooks
 * 
 * Provides hooks for fetching thumbnail analysis data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  ThumbnailIntelOverview,
  CategoryInsight,
  CategoryListItem,
  ThumbnailAnalysis,
} from '../types/thumbnailIntel';

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

export const thumbnailIntelKeys = {
  all: ['thumbnailIntel'] as const,
  categories: () => [...thumbnailIntelKeys.all, 'categories'] as const,
  overview: () => [...thumbnailIntelKeys.all, 'overview'] as const,
  category: (key: string) => [...thumbnailIntelKeys.all, 'category', key] as const,
};

// ============================================================================
// Transform Functions (snake_case to camelCase)
// ============================================================================

function transformThumbnailAnalysis(data: any): ThumbnailAnalysis {
  return {
    videoId: data.video_id,
    title: data.title,
    thumbnailUrl: data.thumbnail_url,
    // Alias for component compatibility
    url: data.thumbnail_url,
    viewCount: data.view_count,
    // Alias for component compatibility
    views: data.view_count,
    layoutType: data.layout_type,
    textPlacement: data.text_placement,
    focalPoint: data.focal_point,
    dominantColors: data.dominant_colors || [],
    colorMood: data.color_mood,
    backgroundStyle: data.background_style,
    hasFace: data.has_face,
    hasText: data.has_text,
    textContent: data.text_content,
    hasBorder: data.has_border,
    hasGlowEffects: data.has_glow_effects,
    hasArrowsCircles: data.has_arrows_circles,
    faceExpression: data.face_expression,
    facePosition: data.face_position,
    faceSize: data.face_size,
    faceLookingDirection: data.face_looking_direction,
    layoutRecipe: data.layout_recipe,
    colorRecipe: data.color_recipe,
    whyItWorks: data.why_it_works,
    difficulty: data.difficulty,
  };
}

function transformCategoryInsight(data: any): CategoryInsight {
  return {
    categoryKey: data.category_key,
    // Alias for component compatibility
    key: data.category_key,
    categoryName: data.category_name,
    // Alias for component compatibility
    name: data.category_name,
    analysisDate: data.analysis_date,
    thumbnails: (data.thumbnails || []).map(transformThumbnailAnalysis),
    commonLayout: data.common_layout,
    commonColors: data.common_colors || [],
    commonElements: data.common_elements || [],
    idealLayout: data.ideal_layout,
    idealColorPalette: data.ideal_color_palette || [],
    mustHaveElements: data.must_have_elements || [],
    avoidElements: data.avoid_elements || [],
    categoryStyleSummary: data.category_style_summary,
    proTips: data.pro_tips || [],
  };
}

function transformOverview(data: any): ThumbnailIntelOverview {
  return {
    analysisDate: data.analysis_date,
    categories: (data.categories || []).map(transformCategoryInsight),
    totalThumbnailsAnalyzed: data.total_thumbnails_analyzed || 0,
  };
}

function transformCategoryListItem(data: any): CategoryListItem {
  return {
    categoryKey: data.category_key,
    categoryName: data.category_name,
    colorTheme: data.color_theme,
    thumbnailCount: data.thumbnail_count,
    latestAnalysis: data.latest_analysis,
  };
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch list of available gaming categories.
 */
export function useThumbnailCategories(enabled = true) {
  return useQuery({
    queryKey: thumbnailIntelKeys.categories(),
    queryFn: async (): Promise<CategoryListItem[]> => {
      const res = await fetch(`${API_BASE}/thumbnail-intel/categories`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch categories');
      }
      const data = await res.json();
      return data.map(transformCategoryListItem);
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled,
  });
}

/**
 * Fetch overview of all category insights.
 */
export function useThumbnailIntelOverview(enabled = true) {
  return useQuery({
    queryKey: thumbnailIntelKeys.overview(),
    queryFn: async (): Promise<ThumbnailIntelOverview> => {
      const res = await fetch(`${API_BASE}/thumbnail-intel/overview`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch overview');
      }
      return transformOverview(await res.json());
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled,
  });
}

/**
 * Fetch insight for a specific gaming category.
 */
export function useCategoryInsight(categoryKey: string, enabled = true) {
  return useQuery({
    queryKey: thumbnailIntelKeys.category(categoryKey),
    queryFn: async (): Promise<CategoryInsight> => {
      const res = await fetch(`${API_BASE}/thumbnail-intel/category/${categoryKey}`, {
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to fetch category insight');
      }
      return transformCategoryInsight(await res.json());
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled: !!categoryKey && enabled,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export interface AnalyzeThumbnailResult {
  success: boolean;
  message: string;
  category?: string;
  thumbnailsAnalyzed?: number;
  categoriesAnalyzed?: number;
  details?: Array<{ category: string; thumbnails: number }>;
}

/**
 * Trigger thumbnail analysis for a category or all categories.
 * Admin only endpoint.
 */
export function useAnalyzeThumbnail() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (categoryKey?: string): Promise<AnalyzeThumbnailResult> => {
      const params = categoryKey ? `?category_key=${categoryKey}` : '';
      const res = await fetch(`${API_BASE}/thumbnail-intel/analyze${params}`, {
        method: 'POST',
        headers: authHeaders(getToken()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to trigger analysis');
      }
      const data = await res.json();
      return {
        success: data.success,
        message: data.message,
        category: data.category,
        thumbnailsAnalyzed: data.thumbnails_analyzed,
        categoriesAnalyzed: data.categories_analyzed,
        details: data.details,
      };
    },
    onSuccess: (_, categoryKey) => {
      // Invalidate relevant queries
      if (categoryKey) {
        queryClient.invalidateQueries({ queryKey: thumbnailIntelKeys.category(categoryKey) });
      }
      queryClient.invalidateQueries({ queryKey: thumbnailIntelKeys.overview() });
      queryClient.invalidateQueries({ queryKey: thumbnailIntelKeys.categories() });
    },
  });
}
