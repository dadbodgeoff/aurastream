'use client';

/**
 * useSessionContext Hook
 * 
 * Provides session state management for the Prompt Coach chat interface.
 * Tracks session ID, asset type, brand kit, and turns used/remaining.
 * 
 * @module coach/context/useSessionContext
 */

import { useState, useCallback, useMemo } from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Options for the useSessionContext hook
 */
export interface UseSessionContextOptions {
  /** Current session ID (null if not started) */
  sessionId: string | null;
  /** Type of asset being created */
  assetType: string;
  /** Brand kit ID (optional) */
  brandKitId?: string;
  /** Brand kit name for display (optional) */
  brandKitName?: string;
  /** Total turns allowed per session (default: 10) */
  totalTurns?: number;
  /** Initial turns used (default: 0) */
  initialTurnsUsed?: number;
}

/**
 * Return type for the useSessionContext hook
 */
export interface UseSessionContextResult {
  /** Current session ID */
  sessionId: string | null;
  /** Type of asset being created */
  assetType: string;
  /** Brand kit name for display (null if not set) */
  brandKitName: string | null;
  /** Number of turns used in this session */
  turnsUsed: number;
  /** Number of turns remaining */
  turnsRemaining: number;
  /** Total turns allowed per session */
  totalTurns: number;
  /** Whether turns are running low (< 3 remaining) */
  isLowTurns: boolean;
  /** Increment turns used by 1 */
  incrementTurns: () => void;
  /** End the current session */
  endSession: () => void;
  /** Reset session state */
  resetSession: () => void;
}

// ============================================================================
// Constants
// ============================================================================

/** Default total turns per session */
const DEFAULT_TOTAL_TURNS = 10;

/** Threshold for low turns warning */
const LOW_TURNS_THRESHOLD = 3;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook that provides session state management for the coach chat.
 * 
 * Features:
 * - Track session ID and asset type
 * - Calculate turns used/remaining
 * - Provide warning state when turns are low (< 3 remaining)
 * - End session functionality
 * 
 * @example
 * ```tsx
 * const {
 *   sessionId,
 *   assetType,
 *   turnsUsed,
 *   turnsRemaining,
 *   isLowTurns,
 *   endSession,
 * } = useSessionContext({
 *   sessionId: 'session-123',
 *   assetType: 'twitch_emote',
 *   brandKitName: 'My Brand Kit',
 * });
 * ```
 */
export function useSessionContext({
  sessionId,
  assetType,
  brandKitId,
  brandKitName,
  totalTurns = DEFAULT_TOTAL_TURNS,
  initialTurnsUsed = 0,
}: UseSessionContextOptions): UseSessionContextResult {
  // Track turns used
  const [turnsUsed, setTurnsUsed] = useState(initialTurnsUsed);
  const [isEnded, setIsEnded] = useState(false);

  // Calculate derived values
  const turnsRemaining = useMemo(() => {
    return Math.max(0, totalTurns - turnsUsed);
  }, [totalTurns, turnsUsed]);

  const isLowTurns = useMemo(() => {
    return turnsRemaining < LOW_TURNS_THRESHOLD && turnsRemaining > 0;
  }, [turnsRemaining]);

  // Increment turns used
  const incrementTurns = useCallback(() => {
    setTurnsUsed((prev) => Math.min(prev + 1, totalTurns));
  }, [totalTurns]);

  // End the current session
  const endSession = useCallback(() => {
    setIsEnded(true);
  }, []);

  // Reset session state
  const resetSession = useCallback(() => {
    setTurnsUsed(0);
    setIsEnded(false);
  }, []);

  return {
    sessionId: isEnded ? null : sessionId,
    assetType,
    brandKitName: brandKitName || null,
    turnsUsed,
    turnsRemaining,
    totalTurns,
    isLowTurns,
    incrementTurns,
    endSession,
    resetSession,
  };
}

export default useSessionContext;
