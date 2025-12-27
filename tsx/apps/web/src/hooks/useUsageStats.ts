/**
 * Hook for fetching user usage statistics.
 * 
 * Provides real-time usage data including generation counts,
 * coach access, and tier limits.
 * 
 * @module useUsageStats
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@aurastream/api-client';
import type { UsageStats } from '@aurastream/api-client/src/types/usage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Transform snake_case API response to camelCase
 */
function transformUsageStats(data: Record<string, unknown>): UsageStats {
  return {
    tier: data.tier as UsageStats['tier'],
    tierDisplay: data.tier_display as string,
    generationsUsed: data.generations_used as number,
    generationsLimit: data.generations_limit as number,
    generationsRemaining: data.generations_remaining as number,
    generationsPercentage: data.generations_percentage as number,
    coachAvailable: data.coach_available as boolean,
    coachMessagesPerSession: data.coach_messages_per_session as number,
    coachTrialAvailable: data.coach_trial_available as boolean,
    coachTrialUsed: data.coach_trial_used as boolean,
    periodStart: data.period_start as string | null,
    periodEnd: data.period_end as string | null,
    daysRemaining: data.days_remaining as number | null,
    canUpgrade: data.can_upgrade as boolean,
    upgradeBenefits: data.upgrade_benefits as string[],
  };
}

async function fetchUsageStats(): Promise<UsageStats> {
  const accessToken = apiClient.getAccessToken();
  
  const response = await fetch(`${API_BASE_URL}/api/v1/usage`, {
    headers: {
      'Authorization': accessToken ? `Bearer ${accessToken}` : '',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch usage stats');
  }

  const data = await response.json();
  return transformUsageStats(data);
}

export interface UseUsageStatsReturn {
  /** Usage statistics data */
  data: UsageStats | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch function */
  refetch: () => void;
  
  // Convenience getters
  /** Whether user has generations remaining */
  hasGenerationsRemaining: boolean;
  /** Whether user is at or near limit (>80%) */
  isNearLimit: boolean;
  /** Whether user is at limit */
  isAtLimit: boolean;
  /** Whether coach is available (including trial) */
  canUseCoach: boolean;
}

/**
 * Hook to fetch and manage usage statistics.
 * 
 * @example
 * ```tsx
 * const { data, hasGenerationsRemaining, isNearLimit } = useUsageStats();
 * 
 * if (!hasGenerationsRemaining) {
 *   return <UpgradePrompt />;
 * }
 * ```
 */
export function useUsageStats(): UseUsageStatsReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['usage-stats'],
    queryFn: fetchUsageStats,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Calculate convenience values
  const hasGenerationsRemaining = data 
    ? data.generationsLimit === -1 || data.generationsRemaining > 0
    : true;
  
  const isNearLimit = data
    ? data.generationsLimit !== -1 && data.generationsPercentage >= 80
    : false;
  
  const isAtLimit = data
    ? data.generationsLimit !== -1 && data.generationsRemaining <= 0
    : false;
  
  const canUseCoach = data?.coachAvailable ?? false;

  return {
    data,
    isLoading,
    error: error as Error | null,
    refetch,
    hasGenerationsRemaining,
    isNearLimit,
    isAtLimit,
    canUseCoach,
  };
}

export default useUsageStats;
