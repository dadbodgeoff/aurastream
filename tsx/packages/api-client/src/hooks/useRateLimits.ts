/**
 * Rate Limits Admin API Hooks
 * 
 * React Query hooks for the rate limits admin dashboard.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '../client';

// Types
export interface LimitConfig {
  key: string;
  display_name: string;
  description: string;
  limit_type: string;
  category: string;
  free_limit: number;
  pro_limit: number;
  studio_limit: number;
  unlimited_limit: number;
}

export interface AllLimitsResponse {
  limits: LimitConfig[];
  categories: string[];
  tiers: string[];
}

export interface UsageItem {
  limit_key: string;
  display_name: string;
  category: string;
  limit_type: string;
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  retry_after: number | null;
  resets_at: string | null;
}

export interface UserUsageResponse {
  user_id: string;
  tier: string;
  usage: UsageItem[];
  checked_at: string;
}

export interface UpdateLimitRequest {
  free_limit?: number;
  pro_limit?: number;
  studio_limit?: number;
  unlimited_limit?: number;
}

export interface UpdateLimitResponse {
  success: boolean;
  limit_key: string;
  updated_values: Record<string, number>;
  message: string;
}

export interface ResetLimitResponse {
  success: boolean;
  user_id: string;
  limit_key: string;
  message: string;
}

// Query Keys
export const rateLimitsKeys = {
  all: ['rate-limits'] as const,
  limits: () => [...rateLimitsKeys.all, 'limits'] as const,
  tier: (tier: string) => [...rateLimitsKeys.all, 'tier', tier] as const,
  category: (category: string) => [...rateLimitsKeys.all, 'category', category] as const,
  userUsage: (userId: string, tier: string) => [...rateLimitsKeys.all, 'usage', userId, tier] as const,
};

// Hooks

/**
 * Fetch all rate limit configurations
 */
export function useRateLimits() {
  const client = getApiClient();
  
  return useQuery({
    queryKey: rateLimitsKeys.limits(),
    queryFn: async (): Promise<AllLimitsResponse> => {
      const response = await client.get('/admin/rate-limits');
      return response.data;
    },
  });
}

/**
 * Fetch limits for a specific tier
 */
export function useTierLimits(tier: string) {
  const client = getApiClient();
  
  return useQuery({
    queryKey: rateLimitsKeys.tier(tier),
    queryFn: async () => {
      const response = await client.get(`/admin/rate-limits/tiers/${tier}`);
      return response.data;
    },
    enabled: !!tier,
  });
}

/**
 * Fetch limits for a specific category
 */
export function useCategoryLimits(category: string) {
  const client = getApiClient();
  
  return useQuery({
    queryKey: rateLimitsKeys.category(category),
    queryFn: async () => {
      const response = await client.get(`/admin/rate-limits/categories/${category}`);
      return response.data;
    },
    enabled: !!category,
  });
}

/**
 * Fetch usage for a specific user
 */
export function useUserUsage(userId: string, tier: string = 'free') {
  const client = getApiClient();
  
  return useQuery({
    queryKey: rateLimitsKeys.userUsage(userId, tier),
    queryFn: async (): Promise<UserUsageResponse> => {
      const response = await client.get(`/admin/rate-limits/usage/${userId}`, {
        params: { tier },
      });
      return response.data;
    },
    enabled: !!userId,
  });
}

/**
 * Update a rate limit configuration
 */
export function useUpdateLimit() {
  const queryClient = useQueryClient();
  const client = getApiClient();
  
  return useMutation({
    mutationFn: async ({
      limitKey,
      updates,
    }: {
      limitKey: string;
      updates: UpdateLimitRequest;
    }): Promise<UpdateLimitResponse> => {
      const response = await client.put(`/admin/rate-limits/${limitKey}`, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rateLimitsKeys.all });
    },
  });
}

/**
 * Reset a specific limit for a user
 */
export function useResetUserLimit() {
  const queryClient = useQueryClient();
  const client = getApiClient();
  
  return useMutation({
    mutationFn: async ({
      userId,
      limitKey,
    }: {
      userId: string;
      limitKey: string;
    }): Promise<ResetLimitResponse> => {
      const response = await client.post(`/admin/rate-limits/reset/${userId}/${limitKey}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: rateLimitsKeys.userUsage(variables.userId, ''),
      });
    },
  });
}

/**
 * Reset all limits for a user
 */
export function useResetAllUserLimits() {
  const queryClient = useQueryClient();
  const client = getApiClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await client.post(`/admin/rate-limits/reset/${userId}`);
      return response.data;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({
        queryKey: rateLimitsKeys.userUsage(userId, ''),
      });
    },
  });
}
