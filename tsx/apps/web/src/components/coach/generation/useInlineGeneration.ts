'use client';

/**
 * useInlineGeneration Hook
 * 
 * Manages generation state and polling for inline asset generation
 * within the Prompt Coach chat interface.
 * 
 * Features:
 * - Trigger generation from coach session
 * - Poll job status with exponential backoff (1s, 2s, 4s, 5s max)
 * - Track progress percentage
 * - Handle completion and error states
 * - Cleanup on unmount
 * 
 * @module coach/generation/useInlineGeneration
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '@aurastream/api-client';
import type { AssetType } from '@aurastream/api-client';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Asset returned from generation
 */
export interface Asset {
  /** Unique asset ID */
  id: string;
  /** CDN URL for the asset */
  url: string;
  /** Type of asset generated */
  assetType: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * Options for triggering generation
 */
export interface GenerateOptions {
  /** Type of asset to generate */
  assetType: AssetType;
  /** Optional brand kit ID */
  brandKitId?: string;
  /** Custom prompt for generation */
  customPrompt?: string;
  /** Media asset IDs to inject (max 2) */
  mediaAssetIds?: string[];
  /** Media asset placements with precise positioning */
  mediaAssetPlacements?: SerializedPlacement[];
  /** Canvas snapshot URL for single-image mode (more cost-effective for complex compositions) */
  canvasSnapshotUrl?: string;
  /** Canvas snapshot description for AI context */
  canvasSnapshotDescription?: string;
}

import type { SerializedPlacement } from '@aurastream/api-client';

/**
 * Generation status states
 */
export type GenerationStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed';

/**
 * Options for the useInlineGeneration hook
 */
export interface UseInlineGenerationOptions {
  /** Session ID for the coach session */
  sessionId: string;
  /** Callback when generation completes successfully */
  onComplete?: (asset: Asset) => void;
  /** Callback when generation fails */
  onError?: (error: string) => void;
}

/**
 * Return type for the useInlineGeneration hook
 */
export interface UseInlineGenerationResult {
  /** Trigger a new generation */
  triggerGeneration: (options: GenerateOptions) => Promise<string>;
  /** Current job ID (null if no active job) */
  jobId: string | null;
  /** Current generation status */
  status: GenerationStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Generated asset (null until completed) */
  asset: Asset | null;
  /** Error message (null if no error) */
  error: string | null;
  /** Reset the hook state */
  reset: () => void;
}

// ============================================================================
// Constants
// ============================================================================

/** Initial polling interval in milliseconds */
const INITIAL_POLL_INTERVAL = 1000;

/** Maximum polling interval in milliseconds */
const MAX_POLL_INTERVAL = 5000;

/** Backoff multiplier for exponential backoff */
const BACKOFF_MULTIPLIER = 2;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing inline generation state and polling.
 * 
 * @example
 * ```tsx
 * const {
 *   triggerGeneration,
 *   status,
 *   progress,
 *   asset,
 *   error,
 *   reset,
 * } = useInlineGeneration({
 *   sessionId: 'session-123',
 *   onComplete: (asset) => console.log('Generated:', asset),
 * });
 * 
 * // Trigger generation
 * const jobId = await triggerGeneration({
 *   assetType: 'thumbnail',
 *   customPrompt: 'A vibrant gaming thumbnail',
 * });
 * ```
 */
export function useInlineGeneration(
  options: UseInlineGenerationOptions
): UseInlineGenerationResult {
  const { sessionId, onComplete, onError } = options;

  // State
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for polling
  const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPollDelayRef = useRef(INITIAL_POLL_INTERVAL);
  const isMountedRef = useRef(true);

  // Store callbacks in refs to avoid stale closures
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
   * Poll job status with exponential backoff
   */
  const pollJobStatus = useCallback(async (currentJobId: string) => {
    if (!isMountedRef.current) return;

    try {
      const jobResponse = await apiClient.generation.getJob(currentJobId);

      if (!isMountedRef.current) return;

      // Update progress
      setProgress(jobResponse.progress);

      // Handle status transitions
      switch (jobResponse.status) {
        case 'queued':
          setStatus('queued');
          break;

        case 'processing':
          setStatus('processing');
          break;

        case 'completed': {
          setStatus('completed');
          clearPolling();

          // Fetch the generated assets
          try {
            const assets = await apiClient.generation.getJobAssets(currentJobId);
            if (!isMountedRef.current) return;

            if (assets && assets.length > 0) {
              const generatedAsset: Asset = {
                id: assets[0].id,
                url: assets[0].url,
                assetType: assets[0].assetType,
                width: assets[0].width,
                height: assets[0].height,
              };
              setAsset(generatedAsset);
              setProgress(100);
              onCompleteRef.current?.(generatedAsset);
            } else {
              const errorMsg = 'No assets generated';
              setError(errorMsg);
              setStatus('failed');
              onErrorRef.current?.(errorMsg);
            }
          } catch (assetError) {
            if (!isMountedRef.current) return;
            const errorMsg = assetError instanceof Error 
              ? assetError.message 
              : 'Failed to fetch generated assets';
            setError(errorMsg);
            setStatus('failed');
            onErrorRef.current?.(errorMsg);
          }
          return;
        }

        case 'failed':
        case 'partial': {
          setStatus('failed');
          clearPolling();
          const errorMsg = jobResponse.errorMessage || 'Generation failed';
          setError(errorMsg);
          onErrorRef.current?.(errorMsg);
          return;
        }
      }

      // Schedule next poll with exponential backoff
      const nextDelay = Math.min(
        currentPollDelayRef.current * BACKOFF_MULTIPLIER,
        MAX_POLL_INTERVAL
      );
      currentPollDelayRef.current = nextDelay;

      pollIntervalRef.current = setTimeout(() => {
        pollJobStatus(currentJobId);
      }, nextDelay);

    } catch (pollError) {
      if (!isMountedRef.current) return;

      const errorMsg = pollError instanceof Error 
        ? pollError.message 
        : 'Failed to check generation status';
      setError(errorMsg);
      setStatus('failed');
      clearPolling();
      onErrorRef.current?.(errorMsg);
    }
  }, [clearPolling]);

  /**
   * Trigger a new generation
   */
  const triggerGeneration = useCallback(async (
    generateOptions: GenerateOptions
  ): Promise<string> => {
    // Reset state
    setError(null);
    setAsset(null);
    setProgress(0);
    setStatus('queued');
    currentPollDelayRef.current = INITIAL_POLL_INTERVAL;
    clearPolling();

    try {
      const response = await apiClient.generation.create({
        assetType: generateOptions.assetType,
        brandKitId: generateOptions.brandKitId,
        customPrompt: generateOptions.customPrompt,
        // Pass media assets if provided
        mediaAssetIds: generateOptions.mediaAssetIds,
        mediaAssetPlacements: generateOptions.mediaAssetPlacements,
        // Pass canvas snapshot if provided (more cost-effective for complex compositions)
        canvasSnapshotUrl: generateOptions.canvasSnapshotUrl,
        canvasSnapshotDescription: generateOptions.canvasSnapshotDescription,
      });

      if (!isMountedRef.current) {
        return response.id;
      }

      setJobId(response.id);

      // Start polling
      pollIntervalRef.current = setTimeout(() => {
        pollJobStatus(response.id);
      }, INITIAL_POLL_INTERVAL);

      return response.id;
    } catch (createError) {
      if (!isMountedRef.current) {
        throw createError;
      }

      const errorMsg = createError instanceof Error 
        ? createError.message 
        : 'Failed to start generation';
      setError(errorMsg);
      setStatus('failed');
      onErrorRef.current?.(errorMsg);
      throw createError;
    }
  }, [clearPolling, pollJobStatus]);

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    clearPolling();
    setJobId(null);
    setStatus('idle');
    setProgress(0);
    setAsset(null);
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
    triggerGeneration,
    jobId,
    status,
    progress,
    asset,
    error,
    reset,
  };
}

export default useInlineGeneration;
