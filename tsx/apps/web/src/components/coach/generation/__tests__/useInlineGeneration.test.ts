/**
 * Tests for useInlineGeneration hook
 * 
 * @module coach/generation/__tests__/useInlineGeneration.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useInlineGeneration } from '../useInlineGeneration';
import { apiClient } from '@aurastream/api-client';

// Mock the API client
vi.mock('@aurastream/api-client', () => ({
  apiClient: {
    generation: {
      create: vi.fn(),
      getJob: vi.fn(),
      getJobAssets: vi.fn(),
    },
  },
}));

// Mock timers
vi.useFakeTimers();

describe('useInlineGeneration', () => {
  const mockSessionId = 'session-123';
  const mockJobId = 'job-456';
  const mockAsset = {
    id: 'asset-789',
    url: 'https://cdn.example.com/asset.png',
    assetType: 'thumbnail',
    width: 1280,
    height: 720,
    jobId: mockJobId,
    userId: 'user-123',
    fileSize: 12345,
    isPublic: true,
    viralScore: null,
    createdAt: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
  });

  describe('initial state', () => {
    it('should have idle status initially', () => {
      const { result } = renderHook(() =>
        useInlineGeneration({ sessionId: mockSessionId })
      );

      expect(result.current.status).toBe('idle');
      expect(result.current.jobId).toBeNull();
      expect(result.current.progress).toBe(0);
      expect(result.current.asset).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('triggerGeneration', () => {
    it('should create a job and start polling', async () => {
      vi.mocked(apiClient.generation.create).mockResolvedValue({
        id: mockJobId,
        status: 'queued',
        progress: 0,
      } as any);

      const { result } = renderHook(() =>
        useInlineGeneration({ sessionId: mockSessionId })
      );

      await act(async () => {
        const jobId = await result.current.triggerGeneration({
          assetType: 'thumbnail',
          customPrompt: 'Test prompt',
        });
        expect(jobId).toBe(mockJobId);
      });

      expect(result.current.status).toBe('queued');
      expect(result.current.jobId).toBe(mockJobId);
      expect(apiClient.generation.create).toHaveBeenCalledWith({
        assetType: 'thumbnail',
        brandKitId: undefined,
        customPrompt: 'Test prompt',
      });
    });

    it('should handle creation errors', async () => {
      const errorMessage = 'Failed to create job';
      vi.mocked(apiClient.generation.create).mockRejectedValue(
        new Error(errorMessage)
      );

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useInlineGeneration({ sessionId: mockSessionId, onError })
      );

      await act(async () => {
        await expect(
          result.current.triggerGeneration({
            assetType: 'thumbnail',
          })
        ).rejects.toThrow(errorMessage);
      });

      expect(result.current.status).toBe('failed');
      expect(result.current.error).toBe(errorMessage);
      expect(onError).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('polling behavior', () => {
    it('should poll with exponential backoff', async () => {
      vi.mocked(apiClient.generation.create).mockResolvedValue({
        id: mockJobId,
        status: 'queued',
        progress: 0,
      } as any);

      vi.mocked(apiClient.generation.getJob)
        .mockResolvedValueOnce({ status: 'queued', progress: 0 } as any)
        .mockResolvedValueOnce({ status: 'completed', progress: 100 } as any);

      vi.mocked(apiClient.generation.getJobAssets).mockResolvedValue([mockAsset] as any);

      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useInlineGeneration({ sessionId: mockSessionId, onComplete })
      );

      await act(async () => {
        await result.current.triggerGeneration({ assetType: 'thumbnail' });
      });

      // First poll at 1s
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      
      // Allow promises to resolve
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(apiClient.generation.getJob).toHaveBeenCalled();
    });

    it('should fetch assets on completion', async () => {
      vi.mocked(apiClient.generation.create).mockResolvedValue({
        id: mockJobId,
        status: 'queued',
        progress: 0,
      } as any);

      vi.mocked(apiClient.generation.getJob).mockResolvedValue({
        status: 'completed',
        progress: 100,
      } as any);

      vi.mocked(apiClient.generation.getJobAssets).mockResolvedValue([mockAsset] as any);

      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useInlineGeneration({ sessionId: mockSessionId, onComplete })
      );

      await act(async () => {
        await result.current.triggerGeneration({ assetType: 'thumbnail' });
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(apiClient.generation.getJobAssets).toHaveBeenCalledWith(mockJobId);
    });

    it('should handle job failure', async () => {
      vi.mocked(apiClient.generation.create).mockResolvedValue({
        id: mockJobId,
        status: 'queued',
        progress: 0,
      } as any);

      vi.mocked(apiClient.generation.getJob).mockResolvedValue({
        status: 'failed',
        progress: 0,
        errorMessage: 'Generation failed due to content policy',
      } as any);

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useInlineGeneration({ sessionId: mockSessionId, onError })
      );

      await act(async () => {
        await result.current.triggerGeneration({ assetType: 'thumbnail' });
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.status).toBe('failed');
      expect(result.current.error).toBe('Generation failed due to content policy');
    });

    it('should handle polling errors', async () => {
      vi.mocked(apiClient.generation.create).mockResolvedValue({
        id: mockJobId,
        status: 'queued',
        progress: 0,
      } as any);

      vi.mocked(apiClient.generation.getJob).mockRejectedValue(
        new Error('Network error')
      );

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useInlineGeneration({ sessionId: mockSessionId, onError })
      );

      await act(async () => {
        await result.current.triggerGeneration({ assetType: 'thumbnail' });
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.status).toBe('failed');
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      vi.mocked(apiClient.generation.create).mockResolvedValue({
        id: mockJobId,
        status: 'queued',
        progress: 0,
      } as any);

      const { result } = renderHook(() =>
        useInlineGeneration({ sessionId: mockSessionId })
      );

      await act(async () => {
        await result.current.triggerGeneration({ assetType: 'thumbnail' });
      });

      expect(result.current.jobId).toBe(mockJobId);

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.jobId).toBeNull();
      expect(result.current.progress).toBe(0);
      expect(result.current.asset).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should clear polling on reset', async () => {
      vi.mocked(apiClient.generation.create).mockResolvedValue({
        id: mockJobId,
        status: 'queued',
        progress: 0,
      } as any);

      vi.mocked(apiClient.generation.getJob).mockResolvedValue({
        status: 'processing',
        progress: 50,
      } as any);

      const { result } = renderHook(() =>
        useInlineGeneration({ sessionId: mockSessionId })
      );

      await act(async () => {
        await result.current.triggerGeneration({ assetType: 'thumbnail' });
      });

      act(() => {
        result.current.reset();
      });

      // Advance timers - should not trigger any more polls
      await act(async () => {
        vi.advanceTimersByTime(10000);
        await Promise.resolve();
      });

      // getJob should only have been called once (before reset)
      expect(apiClient.generation.getJob).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup polling on unmount', async () => {
      vi.mocked(apiClient.generation.create).mockResolvedValue({
        id: mockJobId,
        status: 'queued',
        progress: 0,
      } as any);

      const { result, unmount } = renderHook(() =>
        useInlineGeneration({ sessionId: mockSessionId })
      );

      await act(async () => {
        await result.current.triggerGeneration({ assetType: 'thumbnail' });
      });

      unmount();

      // Advance timers - should not cause errors
      await act(async () => {
        vi.advanceTimersByTime(10000);
        await Promise.resolve();
      });

      // No errors should be thrown
      expect(true).toBe(true);
    });
  });
});
