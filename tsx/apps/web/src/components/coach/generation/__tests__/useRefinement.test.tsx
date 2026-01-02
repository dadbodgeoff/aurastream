/**
 * Tests for the useRefinement hook
 * 
 * Verifies:
 * - State transitions (idle -> input -> refining -> complete)
 * - Usage status calculation based on tier
 * - API calls and polling
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRefinement } from '../useRefinement';

// Mock the API client
const mockRefineImage = vi.fn();
const mockGetJob = vi.fn();
const mockGetJobAssets = vi.fn();

vi.mock('@aurastream/api-client', () => ({
  apiClient: {
    coach: {
      refineImage: (...args: any[]) => mockRefineImage(...args),
    },
    generation: {
      getJob: (...args: any[]) => mockGetJob(...args),
      getJobAssets: (...args: any[]) => mockGetJobAssets(...args),
    },
  },
}));

// ============================================================================
// Tests
// ============================================================================

describe('useRefinement', () => {
  const defaultOptions = {
    sessionId: 'session-123',
    tier: 'pro' as const,
    initialRefinementsUsed: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('starts in idle state', () => {
      const { result } = renderHook(() => useRefinement(defaultOptions));

      expect(result.current.state).toBe('idle');
      expect(result.current.jobId).toBeNull();
      expect(result.current.progress).toBe(0);
      expect(result.current.refinedAsset).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('calculates usage status for pro tier', () => {
      const { result } = renderHook(() => useRefinement({
        ...defaultOptions,
        tier: 'pro',
        initialRefinementsUsed: 2,
      }));

      expect(result.current.usageStatus).toEqual({
        canRefine: true,
        freeRemaining: 3,
        isUnlimited: false,
        tier: 'pro',
        message: '3 free refinements remaining',
      });
    });

    it('calculates usage status for studio tier (unlimited)', () => {
      const { result } = renderHook(() => useRefinement({
        ...defaultOptions,
        tier: 'studio',
      }));

      expect(result.current.usageStatus).toEqual({
        canRefine: true,
        freeRemaining: -1,
        isUnlimited: true,
        tier: 'studio',
        message: 'Unlimited refinements',
      });
    });

    it('calculates usage status for free tier (cannot refine)', () => {
      const { result } = renderHook(() => useRefinement({
        ...defaultOptions,
        tier: 'free',
      }));

      expect(result.current.usageStatus).toEqual({
        canRefine: false,
        freeRemaining: 0,
        isUnlimited: false,
        tier: 'free',
        message: 'Upgrade to Pro or Studio to refine images',
      });
    });

    it('shows "counts as creation" message when pro user has no free refinements', () => {
      const { result } = renderHook(() => useRefinement({
        ...defaultOptions,
        tier: 'pro',
        initialRefinementsUsed: 5,
      }));

      expect(result.current.usageStatus.freeRemaining).toBe(0);
      expect(result.current.usageStatus.message).toBe('Refinements will count as creations');
    });
  });

  describe('State Transitions', () => {
    it('transitions to input state when showRefineInput is called', () => {
      const { result } = renderHook(() => useRefinement(defaultOptions));

      act(() => {
        result.current.showRefineInput();
      });

      expect(result.current.state).toBe('input');
    });

    it('transitions back to idle when hideRefineInput is called', () => {
      const { result } = renderHook(() => useRefinement(defaultOptions));

      act(() => {
        result.current.showRefineInput();
      });
      expect(result.current.state).toBe('input');

      act(() => {
        result.current.hideRefineInput();
      });
      expect(result.current.state).toBe('idle');
    });

    it('resets to idle state when reset is called', () => {
      const { result } = renderHook(() => useRefinement(defaultOptions));

      act(() => {
        result.current.showRefineInput();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.jobId).toBeNull();
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Refinement Submission', () => {
    it('prevents refinement for free tier', async () => {
      const { result } = renderHook(() => useRefinement({
        ...defaultOptions,
        tier: 'free',
      }));

      await act(async () => {
        await result.current.submitRefinement('Make it brighter');
      });

      expect(mockRefineImage).not.toHaveBeenCalled();
      expect(result.current.error).toBe('Refinement not available for your tier');
    });

    it('calls API and transitions to refining state on submit', async () => {
      mockRefineImage.mockResolvedValueOnce({
        jobId: 'job-456',
        status: 'queued',
        message: 'Refinement started',
        refinementsUsed: 1,
        refinementsRemaining: 4,
        countedAsCreation: false,
      });

      const { result } = renderHook(() => useRefinement(defaultOptions));

      await act(async () => {
        await result.current.submitRefinement('Make it brighter');
      });

      expect(mockRefineImage).toHaveBeenCalledWith('session-123', {
        refinement: 'Make it brighter',
      });
      expect(result.current.state).toBe('refining');
      expect(result.current.jobId).toBe('job-456');
    });

    it('handles API error gracefully', async () => {
      mockRefineImage.mockRejectedValueOnce(new Error('API Error'));

      const onError = vi.fn();
      const { result } = renderHook(() => useRefinement({
        ...defaultOptions,
        onError,
      }));

      await act(async () => {
        await result.current.submitRefinement('Make it brighter');
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.error).toBe('API Error');
      expect(onError).toHaveBeenCalledWith('API Error');
    });
  });

  describe('Callbacks', () => {
    it('calls onSatisfied when handleSatisfied is called', () => {
      const onSatisfied = vi.fn();
      const { result } = renderHook(() => useRefinement({
        ...defaultOptions,
        onSatisfied,
      }));

      act(() => {
        result.current.handleSatisfied();
      });

      expect(onSatisfied).toHaveBeenCalledTimes(1);
    });
  });
});
