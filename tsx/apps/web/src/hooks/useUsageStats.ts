/**
 * Hook for fetching user usage statistics.
 * 
 * This hook uses the useUsageLimits hook from api-client which calls
 * /api/v1/usage/status endpoint for all 4 feature limits.
 * 
 * @module useUsageStats
 */

import { useUsageLimits, type UsageStatus } from '@aurastream/api-client';

/**
 * Legacy interface for backward compatibility.
 * Maps the new 4-feature system to the old single-generation format.
 */
export interface UsageStats {
  tier: 'free' | 'pro' | 'studio' | 'unlimited';
  tierDisplay: string;
  generationsUsed: number;
  generationsLimit: number;
  generationsRemaining: number;
  generationsPercentage: number;
  coachAvailable: boolean;
  coachMessagesPerSession: number;
  coachTrialAvailable: boolean;
  coachTrialUsed: boolean;
  periodStart: string | null;
  periodEnd: string | null;
  daysRemaining: number | null;
  canUpgrade: boolean;
  upgradeBenefits: string[];
}

/**
 * Transform new UsageStatus to legacy UsageStats format.
 */
function transformToLegacy(data: UsageStatus): UsageStats {
  const tierDisplay = data.tier === 'free' ? 'Free' : data.tier === 'pro' ? 'Pro' : data.tier === 'studio' ? 'Studio' : 'Unlimited';
  const generationsLimit = data.creations.limit;
  const generationsUsed = data.creations.used;
  const generationsRemaining = data.creations.remaining;
  const generationsPercentage = data.creations.unlimited 
    ? 0 
    : generationsLimit > 0 
      ? Math.round((generationsUsed / generationsLimit) * 100) 
      : 0;

  // Calculate days remaining until reset
  let daysRemaining: number | null = null;
  if (data.resetsAt) {
    const resetDate = new Date(data.resetsAt);
    const now = new Date();
    daysRemaining = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  return {
    tier: data.tier,
    tierDisplay,
    generationsUsed,
    generationsLimit,
    generationsRemaining,
    generationsPercentage,
    coachAvailable: data.coach.unlimited || data.coach.remaining > 0,
    coachMessagesPerSession: 10,
    coachTrialAvailable: data.tier === 'free' && data.coach.remaining > 0,
    coachTrialUsed: data.tier === 'free' && data.coach.used > 0,
    periodStart: null,
    periodEnd: data.resetsAt,
    daysRemaining,
    canUpgrade: data.tier === 'free',
    upgradeBenefits: data.tier === 'free' ? [
      '10 Vibe Branding analyses/month',
      '25 Aura Lab fusions/month',
      'Unlimited Coach sessions',
      '50 asset creations/month',
    ] : [],
  };
}

export interface UseUsageStatsReturn {
  data: UsageStats | undefined;
  fullData: UsageStatus | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  hasGenerationsRemaining: boolean;
  isNearLimit: boolean;
  isAtLimit: boolean;
  canUseCoach: boolean;
  canUseVibe: boolean;
  canUseAuraLab: boolean;
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
  const { 
    data: fullData, 
    isLoading, 
    error, 
    refetch,
    canCreate,
    canUseVibe,
    canUseAuraLab,
    canUseCoach,
  } = useUsageLimits();

  const data = fullData ? transformToLegacy(fullData) : undefined;
  const hasGenerationsRemaining = canCreate;
  
  const isNearLimit = data
    ? data.generationsLimit !== -1 && data.generationsPercentage >= 80
    : false;
  
  const isAtLimit = data
    ? data.generationsLimit !== -1 && data.generationsRemaining <= 0
    : false;

  return {
    data,
    fullData,
    isLoading,
    error: error as Error | null,
    refetch,
    hasGenerationsRemaining,
    isNearLimit,
    isAtLimit,
    canUseCoach,
    canUseVibe,
    canUseAuraLab,
  };
}

export default useUsageStats;
