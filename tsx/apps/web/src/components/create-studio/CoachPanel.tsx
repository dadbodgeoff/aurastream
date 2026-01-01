/**
 * CoachPanel Component
 * 
 * Wrapper for CoachPageContent in the Create Studio.
 * Provides the AI-guided prompt refinement experience.
 * 
 * @module create-studio/CoachPanel
 */

'use client';

import { Suspense, lazy } from 'react';
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
 * 
 * @example
 * ```tsx
 * <CoachPanel
 *   onGenerationComplete={(assetId) => console.log('Generated:', assetId)}
 * />
 * ```
 */
export function CoachPanel({
  onGenerationComplete,
  className,
}: CoachPanelProps) {
  return (
    <div 
      className={cn('h-full', className)}
      role="tabpanel"
      id="panel-coach"
      aria-labelledby="tab-coach"
    >
      <Suspense fallback={<CoachPanelSkeleton />}>
        <CoachPageContent testId="create-studio-coach-panel" />
      </Suspense>
    </div>
  );
}

export default CoachPanel;
