/**
 * Hook for checking Prompt Coach access and trial status.
 * 
 * @module useCoachAccess
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@aurastream/api-client';
import type { CoachAccessResponse } from '@aurastream/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchCoachAccess(): Promise<CoachAccessResponse> {
  const accessToken = apiClient.getAccessToken();
  
  const response = await fetch(`${API_BASE_URL}/api/v1/coach/access`, {
    headers: {
      'Authorization': accessToken ? `Bearer ${accessToken}` : '',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch coach access');
  }

  const data = await response.json();
  
  // Transform snake_case to camelCase
  return {
    hasAccess: data.has_access,
    feature: data.feature,
    grounding: data.grounding,
    upgradeMessage: data.upgrade_message,
    trialAvailable: data.trial_available,
    trialUsed: data.trial_used,
  };
}

export interface UseCoachAccessReturn {
  /** Whether user can use the coach (premium or trial available) */
  hasAccess: boolean;
  /** Whether user has a free trial available */
  trialAvailable: boolean;
  /** Whether user has already used their trial */
  trialUsed: boolean;
  /** Whether grounding (game context) is available */
  grounding: boolean;
  /** Message to show for upgrade CTA */
  upgradeMessage?: string;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

/**
 * Hook to check coach access and trial status.
 * 
 * @example
 * ```tsx
 * const { hasAccess, trialAvailable, upgradeMessage } = useCoachAccess();
 * 
 * if (!hasAccess) {
 *   return <UpgradePrompt message={upgradeMessage} />;
 * }
 * ```
 */
export function useCoachAccess(): UseCoachAccessReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ['coach-access'],
    queryFn: fetchCoachAccess,
    staleTime: 30000, // Cache for 30 seconds
    retry: 1,
  });

  return {
    hasAccess: data?.hasAccess ?? false,
    trialAvailable: data?.trialAvailable ?? false,
    trialUsed: data?.trialUsed ?? false,
    grounding: data?.grounding ?? false,
    upgradeMessage: data?.upgradeMessage,
    isLoading,
    error: error as Error | null,
  };
}

export default useCoachAccess;
