'use client';

/**
 * GenerationResultWithRefinement Component
 * 
 * Combines GenerationResult with the refinement flow.
 * Shows the generated image with "Satisfied/Refine" choice,
 * handles refinement input, and displays refined results.
 * 
 * @module coach/generation/GenerationResultWithRefinement
 */

import React, { memo, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { GenerationResult } from './GenerationResult';
import { GenerationProgress } from './GenerationProgress';
import { RefinementChoice } from './RefinementChoice';
import { RefineInput } from './RefineInput';
import { useRefinement } from './useRefinement';
import type { Asset } from './useInlineGeneration';

// ============================================================================
// Type Definitions
// ============================================================================

export interface GenerationResultWithRefinementProps {
  /** The generated asset to display */
  asset: Asset;
  /** Session ID for the coach session */
  sessionId: string;
  /** User's subscription tier */
  tier: 'free' | 'pro' | 'studio';
  /** Initial refinements used this month */
  initialRefinementsUsed?: number;
  /** Callback when download button is clicked */
  onDownload: (asset: Asset) => void;
  /** Callback when share button is clicked */
  onShare: (asset: Asset) => void;
  /** Callback when regenerate button is clicked (full regeneration) */
  onRegenerate: () => void;
  /** Callback when view fullscreen is clicked */
  onViewFullscreen: (asset: Asset) => void;
  /** Callback when user is satisfied and ends session */
  onSatisfied: (asset: Asset) => void;
  /** Callback when refinement completes with new asset */
  onRefinementComplete?: (asset: Asset) => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * GenerationResultWithRefinement displays a generated asset with refinement options.
 * 
 * Flow:
 * 1. Shows generated image with "Satisfied/Refine" choice
 * 2. If "Satisfied" → calls onSatisfied callback
 * 3. If "Refine" → shows refinement input
 * 4. On refinement submit → shows progress, then new image
 * 5. Loops back to step 1 with new image
 * 
 * @example
 * ```tsx
 * <GenerationResultWithRefinement
 *   asset={generatedAsset}
 *   sessionId="session-123"
 *   tier="pro"
 *   onDownload={(asset) => downloadAsset(asset)}
 *   onShare={(asset) => shareAsset(asset)}
 *   onRegenerate={() => startNewGeneration()}
 *   onViewFullscreen={(asset) => openLightbox(asset)}
 *   onSatisfied={(asset) => endSession(asset)}
 * />
 * ```
 */
export const GenerationResultWithRefinement = memo(function GenerationResultWithRefinement({
  asset: initialAsset,
  sessionId,
  tier,
  initialRefinementsUsed = 0,
  onDownload,
  onShare,
  onRegenerate,
  onViewFullscreen,
  onSatisfied,
  onRefinementComplete,
  onError,
  className,
  testId = 'generation-result-with-refinement',
}: GenerationResultWithRefinementProps) {
  // Track current asset (may change after refinements)
  const [currentAsset, setCurrentAsset] = useState<Asset>(initialAsset);

  // Refinement flow hook
  const {
    state,
    showRefineInput,
    hideRefineInput,
    submitRefinement,
    handleSatisfied: handleRefinementSatisfied,
    progress,
    refinedAsset,
    error,
    usageStatus,
    reset,
  } = useRefinement({
    sessionId,
    tier,
    initialRefinementsUsed,
    onComplete: (asset) => {
      setCurrentAsset(asset);
      onRefinementComplete?.(asset);
      // Reset to idle to show the new image with choice
      reset();
    },
    onSatisfied: () => {
      onSatisfied(currentAsset);
    },
    onError,
  });

  // Handle download
  const handleDownload = useCallback(() => {
    onDownload(currentAsset);
  }, [currentAsset, onDownload]);

  // Handle share
  const handleShare = useCallback(() => {
    onShare(currentAsset);
  }, [currentAsset, onShare]);

  // Handle view fullscreen
  const handleViewFullscreen = useCallback(() => {
    onViewFullscreen(currentAsset);
  }, [currentAsset, onViewFullscreen]);

  // Handle satisfied
  const handleSatisfied = useCallback(() => {
    onSatisfied(currentAsset);
  }, [currentAsset, onSatisfied]);

  // Render based on state
  const renderContent = () => {
    switch (state) {
      case 'idle':
        return (
          <>
            {/* Generated image */}
            <GenerationResult
              asset={currentAsset}
              onDownload={handleDownload}
              onShare={handleShare}
              onRegenerate={onRegenerate}
              onViewFullscreen={handleViewFullscreen}
            />

            {/* Refinement choice */}
            <RefinementChoice
              onSatisfied={handleSatisfied}
              onRefine={showRefineInput}
              usageStatus={usageStatus}
              className="mt-4"
            />

            {/* Error message */}
            {error && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </>
        );

      case 'input':
        return (
          <>
            {/* Show current image (smaller) */}
            <div className="relative rounded-lg overflow-hidden aspect-video bg-white/5 mb-4">
              <img
                src={currentAsset.url}
                alt="Current asset"
                className="w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="px-3 py-1.5 rounded-full bg-black/50 text-xs text-white">
                  Current image
                </span>
              </div>
            </div>

            {/* Refinement input */}
            <RefineInput
              onSubmit={submitRefinement}
              onCancel={hideRefineInput}
              usageStatus={usageStatus}
            />
          </>
        );

      case 'refining':
        return (
          <>
            {/* Show current image (dimmed) */}
            <div className="relative rounded-lg overflow-hidden aspect-video bg-white/5 mb-4">
              <img
                src={currentAsset.url}
                alt="Refining..."
                className="w-full h-full object-cover opacity-30"
              />
            </div>

            {/* Progress */}
            <GenerationProgress
              status="processing"
              progress={progress}
              statusMessage="Refining your image..."
            />
          </>
        );

      case 'complete':
        // This state is brief - we reset to idle after setting the new asset
        return (
          <GenerationProgress
            status="processing"
            progress={100}
            statusMessage="Refinement complete!"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      data-testid={testId}
      className={cn('space-y-0', className)}
    >
      {renderContent()}
    </div>
  );
});

GenerationResultWithRefinement.displayName = 'GenerationResultWithRefinement';

export default GenerationResultWithRefinement;
