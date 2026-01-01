/**
 * CustomPanel Component
 * 
 * Wrapper for CreatePageContent in the Create Studio.
 * Provides the "Build Your Own" prompt experience.
 * 
 * @module create-studio/CustomPanel
 */

'use client';

import { Suspense, lazy, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { CustomPanelProps } from './types';

// Lazy load CreatePageContent for code splitting
const CreatePageContent = lazy(() => 
  import('../create/CreatePageContent').then(m => ({ default: m.CreatePageContent }))
);

// =============================================================================
// Loading Skeleton
// =============================================================================

function CustomPanelSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Usage indicator skeleton */}
      <div className="flex justify-end">
        <div className="h-6 w-32 bg-background-elevated rounded" />
      </div>

      {/* Section 1: Platform */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-background-elevated" />
          <div className="h-5 w-36 bg-background-elevated rounded" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 w-24 rounded-lg bg-background-elevated" />
          ))}
        </div>
      </div>

      {/* Section 2: Asset Type */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-background-elevated" />
          <div className="h-5 w-40 bg-background-elevated rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-20 rounded-xl bg-background-elevated" />
          ))}
        </div>
      </div>

      {/* Section 3: Brand Kit */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-background-elevated" />
          <div className="h-5 w-28 bg-background-elevated rounded" />
          <div className="h-5 w-16 bg-background-elevated rounded" />
        </div>
        <div className="h-12 rounded-xl bg-background-elevated" />
      </div>
    </div>
  );
}

// =============================================================================
// CustomPanel Component
// =============================================================================

/**
 * CustomPanel - Build Your Own mode for Create Studio.
 * 
 * Wraps the existing CreatePageContent component with:
 * - Lazy loading for performance
 * - Loading skeleton
 * - Coach navigation callback
 * 
 * @example
 * ```tsx
 * <CustomPanel
 *   onGenerationStart={(jobId) => console.log('Started:', jobId)}
 *   onSwitchToCoach={() => setMode('coach')}
 * />
 * ```
 */
export function CustomPanel({
  onGenerationStart,
  onSwitchToCoach,
  className,
}: CustomPanelProps) {
  // Handle navigation to coach from within CreatePageContent
  const handleNavigateToCoach = useCallback(() => {
    onSwitchToCoach?.();
  }, [onSwitchToCoach]);

  return (
    <div 
      className={cn('h-full overflow-y-auto', className)}
      role="tabpanel"
      id="panel-custom"
      aria-labelledby="tab-custom"
    >
      <Suspense fallback={<CustomPanelSkeleton />}>
        <CreatePageContent
          onNavigateToCoach={handleNavigateToCoach}
          testId="create-studio-custom-panel"
        />
      </Suspense>
    </div>
  );
}

export default CustomPanel;
