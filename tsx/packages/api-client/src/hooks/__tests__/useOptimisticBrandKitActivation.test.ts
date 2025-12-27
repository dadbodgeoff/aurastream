/**
 * Tests for useOptimisticBrandKitActivation hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useOptimisticBrandKitActivation } from '../useOptimisticBrandKitActivation';
import { brandKitKeys } from '../useBrandKits';
import { apiClient } from '../../client';
import type { BrandKit, BrandKitListResponse } from '../../types/brandKit';

// Mock the API client
vi.mock('../../client', () => ({
  apiClient: {
    brandKits: {
      activate: vi.fn(),
    },
  },
}));

// Test data
const mockBrandKits: BrandKit[] = [
  {
    id: 'kit-1',
    user_id: 'user-1',
    name: 'Gaming Brand',
    is_active: true,
    primary_colors: ['#6366f1'],
    accent_colors: ['#f59e0b'],
    fonts: { headline: 'Inter', body: 'Inter' },
    logo_url: null,
    tone: 'competitive',
    style_reference: '',
    extracted_from: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'kit-2',
    user_id: 'user-1',
    name: 'Chill Stream',
    is_active: false,
    primary_colors: ['#10b981'],
    accent_colors: ['#3b82f6'],
    fonts: { headline: 'Poppins', body: 'Inter' },
    logo_url: null,
    tone: 'casual',
    style_reference: '',
    extracted_from: null,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

const mockListResponse: BrandKitListResponse = {
  brandKits: mockBrandKits,
  total: 2,
  activeId: 'kit-1',
};

describe('useOptimisticBrandKitActivation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Pre-populate the cache with mock data
    queryClient.setQueryData(brandKitKeys.list(), mockListResponse);
    queryClient.setQueryData(brandKitKeys.active(), mockBrandKits[0]);

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should optimistically update the cache when activating a brand kit', async () => {
    const activatedKit = { ...mockBrandKits[1], is_active: true };
    vi.mocked(apiClient.brandKits.activate).mockResolvedValue(activatedKit);

    const { result } = renderHook(() => useOptimisticBrandKitActivation(), { wrapper });

    act(() => {
      result.current.mutate('kit-2');
    });

    // Check optimistic update happened immediately
    await waitFor(() => {
      const listData = queryClient.getQueryData<BrandKitListResponse>(brandKitKeys.list());
      expect(listData?.activeId).toBe('kit-2');
      expect(listData?.brandKits.find(k => k.id === 'kit-2')?.is_active).toBe(true);
      expect(listData?.brandKits.find(k => k.id === 'kit-1')?.is_active).toBe(false);
    });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should rollback on error', async () => {
    const error = new Error('Network error');
    vi.mocked(apiClient.brandKits.activate).mockRejectedValue(error);

    const onError = vi.fn();
    const { result } = renderHook(
      () => useOptimisticBrandKitActivation({ onError }),
      { wrapper }
    );

    act(() => {
      result.current.mutate('kit-2');
    });

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Check rollback happened
    const listData = queryClient.getQueryData<BrandKitListResponse>(brandKitKeys.list());
    expect(listData?.activeId).toBe('kit-1');
    expect(listData?.brandKits.find(k => k.id === 'kit-1')?.is_active).toBe(true);
    expect(listData?.brandKits.find(k => k.id === 'kit-2')?.is_active).toBe(false);

    // Check error callback was called
    expect(onError).toHaveBeenCalledWith(error, 'kit-2');
  });

  it('should call onSuccess callback when activation succeeds', async () => {
    const activatedKit = { ...mockBrandKits[1], is_active: true };
    vi.mocked(apiClient.brandKits.activate).mockResolvedValue(activatedKit);

    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useOptimisticBrandKitActivation({ onSuccess }),
      { wrapper }
    );

    act(() => {
      result.current.mutate('kit-2');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith(activatedKit);
  });

  it('should update the active brand kit query', async () => {
    const activatedKit = { ...mockBrandKits[1], is_active: true };
    vi.mocked(apiClient.brandKits.activate).mockResolvedValue(activatedKit);

    const { result } = renderHook(() => useOptimisticBrandKitActivation(), { wrapper });

    act(() => {
      result.current.mutate('kit-2');
    });

    // Check active query was updated optimistically
    await waitFor(() => {
      const activeKit = queryClient.getQueryData<BrandKit>(brandKitKeys.active());
      expect(activeKit?.id).toBe('kit-2');
      expect(activeKit?.is_active).toBe(true);
    });
  });

  it('should invalidate queries on settlement', async () => {
    const activatedKit = { ...mockBrandKits[1], is_active: true };
    vi.mocked(apiClient.brandKits.activate).mockResolvedValue(activatedKit);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useOptimisticBrandKitActivation(), { wrapper });

    act(() => {
      result.current.mutate('kit-2');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: brandKitKeys.all });
  });
});
