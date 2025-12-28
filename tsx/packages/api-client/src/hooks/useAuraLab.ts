/**
 * TanStack Query hooks for The Aura Lab feature.
 * 
 * Provides mutations and queries for:
 * - Test subject upload
 * - Element fusion
 * - Inventory management
 * - Usage tracking
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import type {
  SetSubjectResponse,
  FuseRequest,
  FuseResponse,
  InventoryResponse,
  InventoryFilters,
  UsageResponse,
  ElementsResponse,
  SuccessResponse,
} from '../types/auraLab';

// ============================================================================
// Query Keys
// ============================================================================

export const auraLabKeys = {
  all: ['aura-lab'] as const,
  inventory: () => [...auraLabKeys.all, 'inventory'] as const,
  inventoryFiltered: (filters?: InventoryFilters) => [...auraLabKeys.inventory(), filters] as const,
  usage: () => [...auraLabKeys.all, 'usage'] as const,
  elements: () => [...auraLabKeys.all, 'elements'] as const,
};

// ============================================================================
// Mutations
// ============================================================================

/**
 * Upload a test subject image for fusion experiments.
 * 
 * @example
 * const { mutate: setSubject } = useSetSubject();
 * setSubject(file);
 */
export function useSetSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File): Promise<SetSubjectResponse> => {
      return apiClient.auraLab.setSubject(file);
    },
    onSuccess: () => {
      // Invalidate usage query as upload may count toward limits
      queryClient.invalidateQueries({ queryKey: auraLabKeys.usage() });
    },
  });
}

/**
 * Perform a fusion between the test subject and an element.
 * 
 * @example
 * const { mutate: fuse } = useFuse();
 * fuse({ subjectId: '...', elementId: 'fire' });
 */
export function useFuse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: FuseRequest): Promise<FuseResponse> => {
      return apiClient.auraLab.fuse(request);
    },
    onSuccess: () => {
      // Invalidate usage query after fusion
      queryClient.invalidateQueries({ queryKey: auraLabKeys.usage() });
    },
  });
}

/**
 * Keep a fusion result and add it to inventory.
 * 
 * @example
 * const { mutate: keepFusion } = useKeepFusion();
 * keepFusion('fusion-id');
 */
export function useKeepFusion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fusionId: string): Promise<SuccessResponse> => {
      return apiClient.auraLab.keep(fusionId);
    },
    onSuccess: () => {
      // Invalidate inventory query after keeping
      queryClient.invalidateQueries({ queryKey: auraLabKeys.inventory() });
    },
  });
}

/**
 * Trash a fusion result (discard without saving).
 * 
 * @example
 * const { mutate: trashFusion } = useTrashFusion();
 * trashFusion('fusion-id');
 */
export function useTrashFusion() {
  return useMutation({
    mutationFn: (fusionId: string): Promise<SuccessResponse> => {
      return apiClient.auraLab.trash(fusionId);
    },
  });
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get the user's saved fusion inventory.
 * 
 * @example
 * const { data: inventory, isLoading } = useAuraLabInventory();
 */
export function useAuraLabInventory(filters?: InventoryFilters) {
  return useQuery({
    queryKey: auraLabKeys.inventoryFiltered(filters),
    queryFn: (): Promise<InventoryResponse> => {
      return apiClient.auraLab.getInventory(filters);
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get the user's daily fusion usage.
 * 
 * @example
 * const { data: usage, isLoading } = useAuraLabUsage();
 */
export function useAuraLabUsage() {
  return useQuery({
    queryKey: auraLabKeys.usage(),
    queryFn: (): Promise<UsageResponse> => {
      return apiClient.auraLab.getUsage();
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get available elements for fusion.
 * 
 * @example
 * const { data: elementsData, isLoading } = useAuraLabElements();
 */
export function useAuraLabElements() {
  return useQuery({
    queryKey: auraLabKeys.elements(),
    queryFn: (): Promise<ElementsResponse> => {
      return apiClient.auraLab.getElements();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (elements don't change often)
  });
}
