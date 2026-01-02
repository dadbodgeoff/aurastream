'use client';

/**
 * useRefinement Hook
 * 
 * Manages the refinement flow state and API calls for multi-turn image editing.
 * 
 * Features:
 * - Track refinement state (idle, input, refining, complete)
 * - Call refine API endpoint
 * - Poll for refinement job completion
 * - Track usage limits
 * 
 * @module coach/generation/useRefinement
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '@aurastream/api-client';
import type { RefinementUsageStatus, RefineImageResponse } from '@aurastream/api-client';
import type { Asset } from './useInlineGeneration';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Refinement flow states
 */
export type RefinementState = 
  | 'idle'      // Showing choice buttons
  | 'input'     // Showing refinement input
  | 'refining'  // Refinement in progress
  | 'complete'; // Refinement complete (new image ready)

/**
 * Options for the useRefinement hook
 */
export interface UseRefinementOptions {
  /** Session ID for the coach session */
  sessionId: string;
  /** User's subscription tier */
  tier: 'free' | 'pro' | 'studio';
  /** Initial refinements used this month */
  initialRefinementsUsed?: number;
  /** Callback when refinement completes */
  onComplete?: (asset: Asset) => void;
  /** Callback when user is satisfied (ends session) */
  onSatisfied?: () => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

/**
 * Return type for the useRefinement hook
 */
export interface UseRefinementResult {
  /** Current refinement state */
  state: RefinementState;
  /** Show the refinement input */
  showRefineInput: () => void;
  /** Hide the refinement input and go back to choice */
  hideRefineInput: () => void;
  /** Submit a refinement */
  submitRefinement: (refinement: string) => Promise<void>;
  /** Handle user satisfied (ends session) */
  handleSatisfied: () => void;
  /** Current job ID being polled */
  jobId: string | null;
  /** Progress percentage (0-100) */
  progress: number;
  /** Refined asset (null until complete) */
  refinedAsset: Asset | null;
  /** Error message */
  error: string | null;
  /** Refinement usage status */
  usageStatus: RefinementUsageStatus;
  /** Reset to idle state */
  reset: () => void;
}

// ============================================================================
// Constants
// ============================================================================

/** Tier-based refinement limits */
const TIER_REFINEMENT_LIMITS: Record<string, number> = {
  free: 0,
  pro: 5,
  studio: -1, // Unlimited
};

/** Initial polling interval */
const INITIAL_POLL_INTERVAL = 1000;

/** Maximum polling interval */
const MAX_POLL_INTERVAL = 5000;

/** Backoff multiplier */
const BACKOFF_MULTIPLIER = 2;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing the refinement flow.
 * 
 * @example
 * ```tsx
 * const {
 *   state,
 *   showRefineInput,
 *   submitRefinement,
 *   handleSatisfied,
 *   usageStatus,
 *   refinedAsset,
 * } = useRefinement({
 *   sessionId: 'session-123',
 *   tier: 'pro',
 *   onComplete: (asset) => setCurrentAsset(asset),
 *   onSatisfied: () => endSession(),
 * });
 * ```
 */
export function useRefinement(options: UseRefinementOptions): UseRefinementResult {
  const {
    sessionId,
    tier,
    initialRefinementsUsed = 0,
    onComplete,
    onSatisfied,
    onError,
  } = options;

  // State
  const [state, setState] = useState<RefinementState>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [refinedAsset, setRefinedAsset] = useState<Asset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refinementsUsed, setRefinementsUsed] = useState(initialRefinementsUsed);

  // Refs
  const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPollDelayRef = useRef(INITIAL_POLL_INTERVAL);
  const isMountedRef = useRef(true);

  // Callbacks refs to avoid stale closures
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Calculate usage status
  const limit = TIER_REFINEMENT_LIMITS[tier] ?? 0;
  const isUnlimited = limit === -1;
  const freeRemaining = isUnlimited ? -1 : Math.max(0, limit - refinementsUsed);
  const canRefine = tier !== 'free';

  const usageStatus: RefinementUsageStatus = {
    canRefine,
    freeRemaining,
    isUnlimited,
    tier,
    message: !canRefine
      ? 'Upgrade to Pro or Studio to refine images'
      : isUnlimited
        ? 'Unlimited refinements'
        : freeRemaining > 0
          ? `${freeRemaining} free refinement${freeRemaining !== 1 ? 's' : ''} remaining`
          : 'Refinements will count as creations',
  };

  /**
   * Clear polling interval
   */
  const clearPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  /**
   * Poll job status
   */
  const pollJobStatus = useCallback(async (currentJobId: string) => {
    if (!isMountedRef.current) return;

    try {
      const jobResponse = await apiClient.generation.getJob(currentJobId);

      if (!isMountedRef.current) return;

      setProgress(jobResponse.progress);

      switch (jobResponse.status) {
        case 'queued':
        case 'processing':
          // Continue polling with backoff
          const nextDelay = Math.min(
            currentPollDelayRef.current * BACKOFF_MULTIPLIER,
            MAX_POLL_INTERVAL
          );
          currentPollDelayRef.current = nextDelay;

          pollIntervalRef.current = setTimeout(() => {
            pollJobStatus(currentJobId);
          }, nextDelay);
          break;

        case 'completed': {
          clearPolling();
          
          // Fetch the generated asset
          try {
            const assets = await apiClient.generation.getJobAssets(currentJobId);
            if (!isMountedRef.current) return;

            if (assets && assets.length > 0) {
              const asset: Asset = {
                id: assets[0].id,
                url: assets[0].url,
                assetType: assets[0].assetType,
                width: assets[0].width,
                height: assets[0].height,
              };
              setRefinedAsset(asset);
              setProgress(100);
              setState('complete');
              onCompleteRef.current?.(asset);
            } else {
              throw new Error('No assets generated');
            }
          } catch (assetError) {
            if (!isMountedRef.current) return;
            const errorMsg = assetError instanceof Error 
              ? assetError.message 
              : 'Failed to fetch refined asset';
            setError(errorMsg);
            setState('idle');
            onErrorRef.current?.(errorMsg);
          }
          break;
        }

        case 'failed':
        case 'partial': {
          clearPolling();
          const errorMsg = jobResponse.errorMessage || 'Refinement failed';
          setError(errorMsg);
          setState('idle');
          onErrorRef.current?.(errorMsg);
          break;
        }
      }
    } catch (pollError) {
      if (!isMountedRef.current) return;
      
      const errorMsg = pollError instanceof Error 
        ? pollError.message 
        : 'Failed to check refinement status';
      setError(errorMsg);
      setState('idle');
      clearPolling();
      onErrorRef.current?.(errorMsg);
    }
  }, [clearPolling]);

  /**
   * Show refinement input
   */
  const showRefineInput = useCallback(() => {
    setError(null);
    setState('input');
  }, []);

  /**
   * Hide refinement input
   */
  const hideRefineInput = useCallback(() => {
    setState('idle');
  }, []);

  /**
   * Submit a refinement
   */
  const submitRefinement = useCallback(async (refinement: string) => {
    if (!canRefine) {
      setError('Refinement not available for your tier');
      return;
    }

    setError(null);
    setProgress(0);
    setRefinedAsset(null);
    setState('refining');
    currentPollDelayRef.current = INITIAL_POLL_INTERVAL;
    clearPolling();

    try {
      const response = await apiClient.coach.refineImage(sessionId, { refinement });

      if (!isMountedRef.current) return;

      setJobId(response.jobId);
      setRefinementsUsed(response.refinementsUsed);

      // Start polling
      pollIntervalRef.current = setTimeout(() => {
        pollJobStatus(response.jobId);
      }, INITIAL_POLL_INTERVAL);

    } catch (submitError) {
      if (!isMountedRef.current) return;

      const errorMsg = submitError instanceof Error 
        ? submitError.message 
        : 'Failed to start refinement';
      setError(errorMsg);
      setState('idle');
      onErrorRef.current?.(errorMsg);
    }
  }, [sessionId, canRefine, clearPolling, pollJobStatus]);

  /**
   * Handle user satisfied
   */
  const handleSatisfied = useCallback(() => {
    onSatisfied?.();
  }, [onSatisfied]);

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    clearPolling();
    setState('idle');
    setJobId(null);
    setProgress(0);
    setRefinedAsset(null);
    setError(null);
    currentPollDelayRef.current = INITIAL_POLL_INTERVAL;
  }, [clearPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, [clearPolling]);

  return {
    state,
    showRefineInput,
    hideRefineInput,
    submitRefinement,
    handleSatisfied,
    jobId,
    progress,
    refinedAsset,
    error,
    usageStatus,
    reset,
  };
}

export default useRefinement;
