/**
 * Tests for useOptimisticAssetDeletion and useOptimisticBulkAssetDeletion hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import {
  useOptimisticAssetDeletion,
  useOptimisticBulkAssetDeletion,
} from '../useOptimisticAssetDeletion';
import { generationKeys } from '../useGeneration';
import { apiClient } from '../../client';
import type { AssetResponse, AssetListResponse } from '../../types/generation';

// Mock the API client
vi.mock('../../client', () => ({
  apiClient: {
    assets: {
      delete: vi.fn(),
    },
  },
}));

// Test data
const mockAssets: AssetResponse[] = [
  {
    id: 'asset-1',
    jobId: 'job-1',
    userId: 'user-1',
    assetType: 'thumbnail',
    url: 'https://example.com/asset1.png',
    width: 1280,
    height: 720,
    fileSize: 102400,
    isPublic: true,
    viralScore: 85,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'asset-2',
    jobId: 'job-1',
    userId: 'user-1',
    assetType: 'overlay',
    url: 'https://example.com/asset2.png',
    width: 1920,
    height: 1080,
    fileSize: 204800,
    isPublic: true,
    viralScore: 72,
    createdAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'asset-3',
    jobId: 'job-2',
    userId: 'user-1',
    assetType: 'banner',
    url: 'https://example.com/asset3.png',
    width: 1200,
    height: 480,
    fileSize: 153600,
    isPublic: false,
    viralScore: null,
    createdAt: '2024-01-03T00:00:00Z',
  },
];

const mockListResponse: AssetListResponse = {
  assets: mockAssets,
  total: 3,
  limit: 50,
  offset: 0,
};

describe('useOptimisticAssetDeletion', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Pre-populate the cache with mock data
    queryClient.setQueryData([...generationKeys.assets(), undefined], mockListResponse);
    queryClient.setQueryData(generationKeys.asset('asset-1'), mockAssets[0]);

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should optimistically remove asset from cache', async () => {
    vi.mocked(apiClient.assets.delete).mockResolvedValue(undefined);

    const { result } = renderHook(() => useOptimisticAssetDeletion(), { wrapper });

    act(() => {
      result.current.mutate('asset-2');
    });

    // Check optimistic update happened immediately
    await waitFor(() => {
      const listData = queryClient.getQueryData<AssetListResponse>([
        ...generationKeys.assets(),
        undefined,
      ]);
      expect(listData?.assets).toHaveLength(2);
      expect(listData?.assets.find(a => a.id === 'asset-2')).toBeUndefined();
      expect(listData?.total).toBe(2);
    });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should rollback on error', async () => {
    const error = new Error('Network error');
    vi.mocked(apiClient.assets.delete).mockRejectedValue(error);

    const onError = vi.fn();
    const { result } = renderHook(
      () => useOptimisticAssetDeletion({ onError }),
      { wrapper }
    );

    act(() => {
      result.current.mutate('asset-2');
    });

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Check rollback happened
    const listData = queryClient.getQueryData<AssetListResponse>([
      ...generationKeys.assets(),
      undefined,
    ]);
    expect(listData?.assets).toHaveLength(3);
    expect(listData?.assets.find(a => a.id === 'asset-2')).toBeDefined();

    // Check error callback was called
    expect(onError).toHaveBeenCalledWith(error, 'asset-2');
  });

  it('should call onSuccess callback when deletion succeeds', async () => {
    vi.mocked(apiClient.assets.delete).mockResolvedValue(undefined);

    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useOptimisticAssetDeletion({ onSuccess }),
      { wrapper }
    );

    act(() => {
      result.current.mutate('asset-2');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith('asset-2');
  });

  it('should remove individual asset query from cache', async () => {
    vi.mocked(apiClient.assets.delete).mockResolvedValue(undefined);

    // Verify asset query exists before deletion
    expect(queryClient.getQueryData(generationKeys.asset('asset-1'))).toBeDefined();

    const { result } = renderHook(() => useOptimisticAssetDeletion(), { wrapper });

    act(() => {
      result.current.mutate('asset-1');
    });

    // Check asset query was removed
    await waitFor(() => {
      expect(queryClient.getQueryData(generationKeys.asset('asset-1'))).toBeUndefined();
    });
  });

  it('should invalidate queries on settlement', async () => {
    vi.mocked(apiClient.assets.delete).mockResolvedValue(undefined);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useOptimisticAssetDeletion(), { wrapper });

    act(() => {
      result.current.mutate('asset-2');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: generationKeys.assets() });
  });
});

describe('useOptimisticBulkAssetDeletion', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Pre-populate the cache with mock data
    queryClient.setQueryData([...generationKeys.assets(), undefined], mockListResponse);

    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should optimistically remove multiple assets from cache', async () => {
    vi.mocked(apiClient.assets.delete).mockResolvedValue(undefined);

    const { result } = renderHook(() => useOptimisticBulkAssetDeletion(), { wrapper });

    act(() => {
      result.current.mutate(['asset-1', 'asset-2']);
    });

    // Check optimistic update happened immediately
    await waitFor(() => {
      const listData = queryClient.getQueryData<AssetListResponse>([
        ...generationKeys.assets(),
        undefined,
      ]);
      expect(listData?.assets).toHaveLength(1);
      expect(listData?.assets.find(a => a.id === 'asset-1')).toBeUndefined();
      expect(listData?.assets.find(a => a.id === 'asset-2')).toBeUndefined();
      expect(listData?.assets.find(a => a.id === 'asset-3')).toBeDefined();
      expect(listData?.total).toBe(1);
    });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should rollback all assets on error', async () => {
    const error = new Error('Network error');
    vi.mocked(apiClient.assets.delete).mockRejectedValue(error);

    const onError = vi.fn();
    const { result } = renderHook(
      () => useOptimisticBulkAssetDeletion({ onError }),
      { wrapper }
    );

    act(() => {
      result.current.mutate(['asset-1', 'asset-2']);
    });

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Check rollback happened
    const listData = queryClient.getQueryData<AssetListResponse>([
      ...generationKeys.assets(),
      undefined,
    ]);
    expect(listData?.assets).toHaveLength(3);

    // Check error callback was called with count
    expect(onError).toHaveBeenCalledWith(error, 2);
  });

  it('should call onSuccess callback with count when deletion succeeds', async () => {
    vi.mocked(apiClient.assets.delete).mockResolvedValue(undefined);

    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useOptimisticBulkAssetDeletion({ onSuccess }),
      { wrapper }
    );

    act(() => {
      result.current.mutate(['asset-1', 'asset-2', 'asset-3']);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(onSuccess).toHaveBeenCalledWith(3);
  });

  it('should delete all assets in parallel', async () => {
    vi.mocked(apiClient.assets.delete).mockResolvedValue(undefined);

    const { result } = renderHook(() => useOptimisticBulkAssetDeletion(), { wrapper });

    act(() => {
      result.current.mutate(['asset-1', 'asset-2']);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify delete was called for each asset
    expect(apiClient.assets.delete).toHaveBeenCalledTimes(2);
    expect(apiClient.assets.delete).toHaveBeenCalledWith('asset-1');
    expect(apiClient.assets.delete).toHaveBeenCalledWith('asset-2');
  });
});
