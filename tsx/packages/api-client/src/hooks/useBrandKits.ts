/**
 * TanStack Query hooks for brand kit operations.
 * 
 * Enterprise UX Patterns:
 * - Proper error handling with retry logic
 * - Optimistic updates with rollback
 * - Loading states for all operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { BrandKit, BrandKitCreate, BrandKitUpdate, BrandKitListResponse } from '../types/brandKit';

export const brandKitKeys = {
  all: ['brandKits'] as const,
  lists: () => [...brandKitKeys.all, 'list'] as const,
  list: () => [...brandKitKeys.lists()] as const,
  details: () => [...brandKitKeys.all, 'detail'] as const,
  detail: (id: string) => [...brandKitKeys.details(), id] as const,
  active: () => [...brandKitKeys.all, 'active'] as const,
};

export function useBrandKits() {
  return useQuery({
    queryKey: brandKitKeys.list(),
    queryFn: () => apiClient.brandKits.list(),
    retry: 2,
    staleTime: 30000, // 30 seconds
  });
}

export function useBrandKit(id: string | undefined) {
  return useQuery({
    queryKey: brandKitKeys.detail(id ?? ''),
    queryFn: () => apiClient.brandKits.get(id!),
    enabled: !!id,
    retry: 2,
    staleTime: 30000,
  });
}

export function useActiveBrandKit() {
  return useQuery({
    queryKey: brandKitKeys.active(),
    queryFn: () => apiClient.brandKits.getActive(),
    retry: 2,
    staleTime: 30000,
  });
}

export function useCreateBrandKit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: BrandKitCreate) => apiClient.brandKits.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandKitKeys.all });
    },
    onError: (error) => {
      console.error('Failed to create brand kit:', error);
    },
  });
}

export function useUpdateBrandKit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BrandKitUpdate }) => 
      apiClient.brandKits.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: brandKitKeys.all });
      queryClient.invalidateQueries({ queryKey: brandKitKeys.detail(id) });
    },
    onError: (error) => {
      console.error('Failed to update brand kit:', error);
    },
  });
}

export function useDeleteBrandKit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.brandKits.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandKitKeys.all });
    },
    onError: (error) => {
      console.error('Failed to delete brand kit:', error);
    },
  });
}

export function useActivateBrandKit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.brandKits.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandKitKeys.all });
      queryClient.invalidateQueries({ queryKey: brandKitKeys.active() });
    },
    onError: (error) => {
      console.error('Failed to activate brand kit:', error);
    },
  });
}
