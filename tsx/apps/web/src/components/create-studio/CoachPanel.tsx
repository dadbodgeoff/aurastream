/**
 * CoachPanel Component
 * 
 * Wrapper for CoachPageContent in the Create Studio.
 * Provides the AI-guided prompt refinement experience.
 * Supports canvas context from Canvas panel for canvas → coach flow.
 * 
 * @module create-studio/CoachPanel
 */

'use client';

import { Suspense, lazy, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { CoachPanelProps } from './types';

// Lazy load CoachPageContent for code splitting
const CoachPageContent = lazy(() => 
  import('../coach/CoachPageContent').then(m => ({ default: m.CoachPageContent }))
);

// =============================================================================
// Loading Skeleton
// =============================================================================

function CoachPanelSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-background-elevated" />
          <div className="h-6 w-32 bg-background-elevated rounded" />
        </div>
        <div className="h-4 w-48 bg-background-elevated rounded" />
      </div>

      {/* Usage indicator skeleton */}
      <div className="p-3 rounded-lg bg-background-elevated/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-background-elevated" />
            <div className="h-4 w-40 bg-background-elevated rounded" />
          </div>
        </div>
      </div>

      {/* Form skeleton */}
      <div className="space-y-6">
        {/* Brand Kit */}
        <div className="space-y-2">
          <div className="h-4 w-24 bg-background-elevated rounded" />
          <div className="h-12 rounded-xl bg-background-elevated" />
        </div>

        {/* Asset Type */}
        <div className="space-y-2">
          <div className="h-4 w-28 bg-background-elevated rounded" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-16 rounded-lg bg-background-elevated" />
            ))}
          </div>
        </div>

        {/* Mood */}
        <div className="space-y-2">
          <div className="h-4 w-16 bg-background-elevated rounded" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 w-20 rounded-lg bg-background-elevated" />
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="h-4 w-32 bg-background-elevated rounded" />
          <div className="h-24 rounded-xl bg-background-elevated" />
        </div>

        {/* Button */}
        <div className="h-12 w-full rounded-xl bg-background-elevated" />
      </div>
    </div>
  );
}

// =============================================================================
// CoachPanel Component
// =============================================================================

/**
 * CoachPanel - AI Coach mode for Create Studio.
 * 
 * Wraps the existing CoachPageContent component with:
 * - Lazy loading for performance
 * - Loading skeleton
 * - Generation completion callback
 * - Canvas context support for canvas → coach flow
 * 
 * @example
 * ```tsx
 * <CoachPanel
 *   onGenerationComplete={(assetId) => console.log('Generated:', assetId)}
 *   canvasContext={{ snapshotUrl: '...', description: '...' }}
 * />
 * ```
 */
export function CoachPanel({
  onGenerationComplete,
  canvasContext,
  onClearCanvasContext,
  className,
}: CoachPanelProps) {
  // Log canvas context for debugging
  useEffect(() => {
    if (canvasContext) {
      console.log('[CoachPanel] Received canvas context:', {
        snapshotUrl: canvasContext.snapshotUrl,
        description: canvasContext.description?.slice(0, 100),
        assetType: canvasContext.assetType,
        dimensions: `${canvasContext.width}x${canvasContext.height}`,
      });
    }
  }, [canvasContext]);

  return (
    <div 
      className={cn('h-full', className)}
      role="tabpanel"
      id="panel-coach"
      aria-labelledby="tab-coach"
    >
      {/* Canvas Context Banner */}
      {canvasContext && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <div className="w-16 h-12 rounded-lg bg-background-elevated overflow-hidden flex-shrink-0">
              <img 
                src={canvasContext.snapshotUrl} 
                alt="Canvas snapshot"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-400">
                Canvas attached
              </p>
              <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                {canvasContext.description || `${canvasContext.width}×${canvasContext.height} ${canvasContext.assetType}`}
              </p>
            </div>
            {onClearCanvasContext && (
              <button
                onClick={onClearCanvasContext}
                className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
                title="Remove canvas"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
      
      <Suspense fallback={<CoachPanelSkeleton />}>
        <CoachPageContent 
          testId="create-studio-coach-panel"
          canvasSnapshotUrl={canvasContext?.snapshotUrl}
          canvasSnapshotDescription={canvasContext?.description}
          initialAssetType={canvasContext?.assetType}
        />
      </Suspense>
    </div>
  );
}

export default CoachPanel;
