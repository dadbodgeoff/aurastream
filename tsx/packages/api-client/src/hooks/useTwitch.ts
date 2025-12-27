// Twitch Hooks for Streamer Studio
// React Query hooks for Twitch asset generation

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  TwitchGenerateRequest,
  PackGenerateRequest,
  TwitchJobResponse,
  PackResponse,
  DimensionSpecResponse,
  GameMetaResponse,
} from '../types/twitch';

// ============================================================================
// Query Keys
// ============================================================================

export const twitchKeys = {
  all: ['twitch'] as const,
  dimensions: () => [...twitchKeys.all, 'dimensions'] as const,
  gameMeta: (gameId: string) => [...twitchKeys.all, 'game-meta', gameId] as const,
  pack: (packId: string) => [...twitchKeys.all, 'pack', packId] as const,
  packs: () => [...twitchKeys.all, 'packs'] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Hook to fetch dimension specifications for all Twitch asset types
 */
export function useTwitchDimensions() {
  return useQuery({
    queryKey: twitchKeys.dimensions(),
    queryFn: () => apiClient.twitch.getDimensions(),
    staleTime: 1000 * 60 * 60, // 1 hour - dimensions don't change often
  });
}

/**
 * Hook to fetch game metadata for context
 */
export function useGameMeta(gameId: string | undefined) {
  return useQuery({
    queryKey: twitchKeys.gameMeta(gameId ?? ''),
    queryFn: () => apiClient.twitch.getGameMeta(gameId!),
    enabled: !!gameId,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - game meta cached
  });
}

/**
 * Hook to fetch pack status and assets
 */
export function usePack(packId: string | undefined) {
  return useQuery({
    queryKey: twitchKeys.pack(packId ?? ''),
    queryFn: () => apiClient.twitch.getPackStatus(packId!),
    enabled: !!packId,
    refetchInterval: (query) => {
      // Poll every 2 seconds while processing
      const data = query.state.data;
      if (data?.status === 'processing' || data?.status === 'queued') {
        return 2000;
      }
      return false;
    },
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Hook to generate a single Twitch asset
 */
export function useGenerateTwitchAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TwitchGenerateRequest) => apiClient.twitch.generate(data),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

/**
 * Hook to generate a pack of Twitch assets
 */
export function useGeneratePack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PackGenerateRequest) => apiClient.twitch.generatePack(data),
    onSuccess: (data) => {
      // Add the new pack to the cache
      queryClient.setQueryData(twitchKeys.pack(data.id), data);
      // Invalidate packs list
      queryClient.invalidateQueries({ queryKey: twitchKeys.packs() });
    },
  });
}
