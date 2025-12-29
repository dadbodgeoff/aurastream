/**
 * Tests for useOptimisticBrandKitDeletion hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useOptimisticBrandKitDeletion } from '../useOptimisticBrandKitDeletion';
import { brandKitKeys } from '../useBrandKits';
import { apiClient } from '../../client';
import type { BrandKit, BrandKitListResponse } from '../../types/brandKit';

// Mock the API client
vi.mock('../../client', () => ({
  apiClient: {
    brandKits: {
      delete: vi.fn(),
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
    accent_colors: ['#21808D'],
    fonts: { headline: 'Poppins', body: 'Inter' },
    logo_url: null,
    tone: 'casual',
    style_reference: '',
    extracted_from: null,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 'kit-3',
    user_id: 'user-1',
    name: 'Pro Esports',
    is_active: false,
    primary_colors: ['#ef4444'],
    accent_colors: ['#fbbf24'],
    fonts: { headline: 'Oswald', body: 'Roboto' },
    logo_url: null,
    tone: 'professional',
    style_reference: '',
    extracted_from: null,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
];

const mockListResponse: BrandKitListResponse = {
  brandKits: mockBrandKits,
  total: 3,
  activeId: 'kit-1',
};

describe('useOptimisticBrandKitDeletion', () => {
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
    queryClient.setQueryData(brandKitKeys.detail('kit-2'), mockBrandKits[1]);

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should optimistically remove brand kit from cache', async () => {
    vi.mocked(apiClient.brandKits.delete).mockResolvedValue(undefined);

    const { result } = renderHook(() => useOptimisticBrandKitDeletion(), { wrapper });

    act(() => {
      result.current.mutate('kit-2');
    });

    // Check optimistic update happened immediately
    await waitFor(() => {
      const listData = queryClient.getQueryData<BrandKitListResponse>(brandKitKeys.list());
      expect(listData?.brandKits).toHaveLength(2);
      expect(listData?.brandKits.find(k => k.id === 'kit-2')).toBeUndefined();
      expect(listData?.total).toBe(2);
    });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should rollback on error', async () => {
    const error = new Error('Network error');
    vi.mocked(apiClient.brandKits.delete).mockRejectedValue(error);

    const onError = vi.fn();
    const { result } = renderHook(
      () => useOptimisticBrandKitDeletion({ onError }),
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
    expect(listData?.brandKits).toHaveLength(3);
    expect(listData?.brandKits.find(k => k.id === 'kit-2')).toBeDefined();

    // Check error callback was called
    expect(onError).toHaveBeenCalledWith(error, 'kit-2');
  });

  it('should call onSuccess callback when deletion succeeds', async () => {
    vi.mocked(apiClient.brandKits.delete).mockResolvedValue(undefined);

    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useOptimisticBrandKitDeletion({ onSuccess }),
      { wrapper }
    );

    act(() => {
      result.current.mutate('kit-2');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith('kit-2');
  });

  it('should clear active brand kit when deleting the active one', async () => {
    vi.mocked(apiClient.brandKits.delete).mockResolvedValue(undefined);

    const { result } = renderHook(() => useOptimisticBrandKitDeletion(), { wrapper });

    act(() => {
      result.current.mutate('kit-1'); // Delete the active kit
    });

    // Check active query was cleared
    await waitFor(() => {
      const activeKit = queryClient.getQueryData<BrandKit | null>(brandKitKeys.active());
      expect(activeKit).toBeNull();
    });

    // Check list was updated
    const listData = queryClient.getQueryData<BrandKitListResponse>(brandKitKeys.list());
    expect(listData?.activeId).toBeNull();
  });

  it('should preserve active brand kit when deleting a non-active one', async () => {
    vi.mocked(apiClient.brandKits.delete).mockResolvedValue(undefined);

    const { result } = renderHook(() => useOptimisticBrandKitDeletion(), { wrapper });

    act(() => {
      result.current.mutate('kit-2'); // Delete a non-active kit
    });

    // Check active query was preserved
    await waitFor(() => {
      const activeKit = queryClient.getQueryData<BrandKit | null>(brandKitKeys.active());
      expect(activeKit?.id).toBe('kit-1');
    });

    // Check list activeId was preserved
    const listData = queryClient.getQueryData<BrandKitListResponse>(brandKitKeys.list());
    expect(listData?.activeId).toBe('kit-1');
  });

  it('should invalidate queries on settlement', async () => {
    vi.mocked(apiClient.brandKits.delete).mockResolvedValue(undefined);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useOptimisticBrandKitDeletion(), { wrapper });

    act(() => {
      result.current.mutate('kit-2');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: brandKitKeys.all });
  });

  it('should remove individual brand kit detail query', async () => {
    vi.mocked(apiClient.brandKits.delete).mockResolvedValue(undefined);

    // Verify detail query exists before deletion
    expect(queryClient.getQueryData(brandKitKeys.detail('kit-2'))).toBeDefined();

    const { result } = renderHook(() => useOptimisticBrandKitDeletion(), { wrapper });

    act(() => {
      result.current.mutate('kit-2');
    });

    // Check detail query was removed
    await waitFor(() => {
      expect(queryClient.getQueryData(brandKitKeys.detail('kit-2'))).toBeUndefined();
    });
  });
});
