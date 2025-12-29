/**
 * TanStack Query hooks for Monthly Usage Limits.
 * 
 * Provides queries for:
 * - Full usage status across all features
 * - Individual feature checks
 * 
 * @module hooks/useUsageLimits
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { UsageStatus, UsageCheckResponse, FeatureType } from '../types/usageLimits';

// ============================================================================
// Query Keys
// ============================================================================

export const usageLimitsKeys = {
  all: ['usage-limits'] as const,
  status: () => [...usageLimitsKeys.all, 'status'] as const,
  check: (feature: FeatureType) => [...usageLimitsKeys.all, 'check', feature] as const,
};

// ============================================================================
// Transform Functions
// ============================================================================

function transformFeatureUsage(data: Record<string, unknown>) {
  return {
    used: data.used as number,
    limit: data.limit as number,
    remaining: data.remaining as number,
    unlimited: data.unlimited as boolean,
  };
}

function transformUsageStatus(data: Record<string, unknown>): UsageStatus {
  return {
    tier: data.tier as UsageStatus['tier'],
    vibeBranding: transformFeatureUsage(data.vibe_branding as Record<string, unknown>),
    auraLab: transformFeatureUsage(data.aura_lab as Record<string, unknown>),
    coach: transformFeatureUsage(data.coach as Record<string, unknown>),
    creations: transformFeatureUsage(data.creations as Record<string, unknown>),
    profileCreator: transformFeatureUsage(data.profile_creator as Record<string, unknown>),
    resetsAt: data.resets_at as string | null,
  };
}

function transformUsageCheck(data: Record<string, unknown>): UsageCheckResponse {
  return {
    canUse: data.can_use as boolean,
    used: data.used as number,
    limit: data.limit as number,
    remaining: data.remaining as number,
    tier: data.tier as UsageCheckResponse['tier'],
    resetsAt: data.resets_at as string | null,
    upgradeMessage: data.upgrade_message as string | null,
  };
}

// ============================================================================
// API Functions
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchUsageStatus(): Promise<UsageStatus> {
  const accessToken = apiClient.getAccessToken();
  
  const response = await fetch(`${API_BASE_URL}/api/v1/usage/status`, {
    headers: {
      'Authorization': accessToken ? `Bearer ${accessToken}` : '',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch usage status');
  }

  const data = await response.json();
  return transformUsageStatus(data);
}

async function fetchUsageCheck(feature: FeatureType): Promise<UsageCheckResponse> {
  const accessToken = apiClient.getAccessToken();
  
  // Map camelCase to snake_case for API
  const featureMap: Record<FeatureType, string> = {
    vibeBranding: 'vibe_branding',
    auraLab: 'aura_lab',
    coach: 'coach',
    creations: 'creations',
    profileCreator: 'profile_creator',
  };
  
  const response = await fetch(`${API_BASE_URL}/api/v1/usage/check/${featureMap[feature]}`, {
    headers: {
      'Authorization': accessToken ? `Bearer ${accessToken}` : '',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to check ${feature} usage`);
  }

  const data = await response.json();
  return transformUsageCheck(data);
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Get complete usage status for all features.
 * 
 * @example
 * const { data, isLoading } = useUsageStatus();
 * if (data?.creations.remaining === 0) {
 *   showUpgradePrompt();
 * }
 */
export function useUsageStatus() {
  return useQuery({
    queryKey: usageLimitsKeys.status(),
    queryFn: fetchUsageStatus,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Check if user can use a specific feature.
 * 
 * @example
 * const { data } = useUsageCheck('vibeBranding');
 * if (!data?.canUse) {
 *   showLimitReachedModal();
 * }
 */
export function useUsageCheck(feature: FeatureType) {
  return useQuery({
    queryKey: usageLimitsKeys.check(feature),
    queryFn: () => fetchUsageCheck(feature),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to invalidate usage queries after an action.
 * 
 * @example
 * const invalidateUsage = useInvalidateUsage();
 * await createAsset();
 * invalidateUsage();
 */
export function useInvalidateUsage() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: usageLimitsKeys.all });
  };
}

/**
 * Convenience hook with computed values.
 */
export function useUsageLimits() {
  const { data, isLoading, error, refetch } = useUsageStatus();
  
  const canCreate = data ? data.creations.remaining > 0 || data.creations.unlimited : true;
  const canUseVibe = data ? data.vibeBranding.remaining > 0 || data.vibeBranding.unlimited : true;
  const canUseAuraLab = data ? data.auraLab.remaining > 0 || data.auraLab.unlimited : true;
  const canUseCoach = data ? data.coach.remaining > 0 || data.coach.unlimited : true;
  const canUseProfileCreator = data ? data.profileCreator.remaining > 0 || data.profileCreator.unlimited : true;
  
  const isPro = data?.tier === 'pro' || data?.tier === 'studio';
  
  return {
    data,
    isLoading,
    error,
    refetch,
    // Convenience booleans
    canCreate,
    canUseVibe,
    canUseAuraLab,
    canUseCoach,
    canUseProfileCreator,
    isPro,
  };
}
