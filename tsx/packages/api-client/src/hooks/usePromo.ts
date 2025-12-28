/**
 * TanStack Query hooks for promo chatroom operations.
 * Uses apiClient for proper auth handling with token refresh.
 */

import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  PromoMessage,
  PromoMessagesListResponse,
  LeaderboardResponse,
  PromoCheckoutRequest,
} from '../types/promo';

// Re-export types for convenience
export type {
  PromoMessage,
  PromoMessageAuthor,
  UserBadges,
  LinkPreview,
  PromoMessagesListResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  PromoCheckoutRequest,
  PromoCheckoutResponse,
} from '../types/promo';

// Also export as PromoMessagesPage for backward compatibility
export type PromoMessagesPage = PromoMessagesListResponse;

// Query Keys
export const promoKeys = {
  all: ['promo'] as const,
  messages: () => [...promoKeys.all, 'messages'] as const,
  pinned: () => [...promoKeys.all, 'pinned'] as const,
  leaderboard: () => [...promoKeys.all, 'leaderboard'] as const,
};

// Query Hooks
export function usePromoMessages(limit = 20) {
  return useInfiniteQuery({
    queryKey: promoKeys.messages(),
    queryFn: async ({ pageParam }): Promise<PromoMessagesPage> => {
      const result = await apiClient.promo.getMessages(pageParam, limit);
      return result as PromoMessagesPage;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
  });
}

export function usePinnedMessage() {
  return useQuery({
    queryKey: promoKeys.pinned(),
    queryFn: async (): Promise<PromoMessage | null> => {
      const result = await apiClient.promo.getPinnedMessage();
      return result as PromoMessage | null;
    },
  });
}

export function useLeaderboard(enabled = true) {
  return useQuery({
    queryKey: promoKeys.leaderboard(),
    queryFn: async (): Promise<LeaderboardResponse> => {
      const result = await apiClient.promo.getLeaderboard();
      return result as LeaderboardResponse;
    },
    enabled,
  });
}

// Mutation Hooks
export function usePromoCheckout() {
  return useMutation({
    mutationFn: (data: PromoCheckoutRequest) => apiClient.promo.createCheckout(data),
  });
}

export function useDeletePromoMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => apiClient.promo.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promoKeys.messages() });
      queryClient.invalidateQueries({ queryKey: promoKeys.pinned() });
    },
  });
}
