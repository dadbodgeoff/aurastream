/**
 * useCreateStudio Hook
 * 
 * State management for the Create Studio unified experience.
 * Handles mode switching, generation state, and cross-panel communication.
 * 
 * @module create-studio/useCreateStudio
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { 
  CreationMode, 
  CreateStudioState, 
  CreateStudioActions 
} from './types';

// =============================================================================
// Constants
// =============================================================================

const INITIAL_STATE: CreateStudioState = {
  activeMode: 'templates',
  showPreview: false,
  assetType: null,
  brandKitId: null,
  currentPrompt: null,
  isGenerating: false,
  jobId: null,
  error: null,
};

// Map URL tab params to creation modes
const TAB_TO_MODE: Record<string, CreationMode> = {
  templates: 'templates',
  custom: 'custom',
  coach: 'coach',
};

// =============================================================================
// Hook
// =============================================================================

export interface UseCreateStudioOptions {
  /** Initial mode override */
  initialMode?: CreationMode;
  /** Sync mode changes to URL */
  syncToUrl?: boolean;
}

export interface UseCreateStudioReturn {
  state: CreateStudioState;
  actions: CreateStudioActions;
}

/**
 * Hook for managing Create Studio state.
 * 
 * @example
 * ```tsx
 * const { state, actions } = useCreateStudio({ syncToUrl: true });
 * 
 * // Switch modes
 * actions.setMode('coach');
 * 
 * // Start generation
 * actions.startGeneration('job-123');
 * ```
 */
export function useCreateStudio(
  options: UseCreateStudioOptions = {}
): UseCreateStudioReturn {
  const { initialMode, syncToUrl = true } = options;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Determine initial mode from URL or prop
  const urlTab = searchParams.get('tab');
  const urlMode = urlTab ? TAB_TO_MODE[urlTab] : undefined;
  const resolvedInitialMode: CreationMode = initialMode ?? urlMode ?? 'templates';

  // State
  const [state, setState] = useState<CreateStudioState>({
    ...INITIAL_STATE,
    activeMode: resolvedInitialMode,
  });

  // ==========================================================================
  // Actions
  // ==========================================================================

  const setMode = useCallback((mode: CreationMode) => {
    setState(prev => ({ ...prev, activeMode: mode, error: null }));
    
    // Sync to URL if enabled
    if (syncToUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', mode);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [syncToUrl, searchParams, router]);

  const togglePreview = useCallback(() => {
    setState(prev => ({ ...prev, showPreview: !prev.showPreview }));
  }, []);

  const setAssetType = useCallback((type: string) => {
    setState(prev => ({ ...prev, assetType: type }));
  }, []);

  const setBrandKitId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, brandKitId: id }));
  }, []);

  const setPrompt = useCallback((prompt: string) => {
    setState(prev => ({ ...prev, currentPrompt: prompt }));
  }, []);

  const startGeneration = useCallback((jobId: string) => {
    setState(prev => ({ 
      ...prev, 
      isGenerating: true, 
      jobId, 
      error: null 
    }));
  }, []);

  const completeGeneration = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isGenerating: false, 
      jobId: null 
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isGenerating: false }));
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  // ==========================================================================
  // Memoized Actions Object
  // ==========================================================================

  const actions = useMemo<CreateStudioActions>(() => ({
    setMode,
    togglePreview,
    setAssetType,
    setBrandKitId,
    setPrompt,
    startGeneration,
    completeGeneration,
    setError,
    reset,
  }), [
    setMode,
    togglePreview,
    setAssetType,
    setBrandKitId,
    setPrompt,
    startGeneration,
    completeGeneration,
    setError,
    reset,
  ]);

  return { state, actions };
}

// =============================================================================
// Exports
// =============================================================================

export type { CreateStudioState, CreateStudioActions };
