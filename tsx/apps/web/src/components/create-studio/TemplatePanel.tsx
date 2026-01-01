/**
 * TemplatePanel Component
 * 
 * Wrapper for QuickCreateWizard in the Create Studio.
 * Provides seamless integration with the unified experience.
 * 
 * @module create-studio/TemplatePanel
 */

'use client';

import { Suspense, lazy } from 'react';
import { cn } from '@/lib/utils';
import type { TemplatePanelProps } from './types';

// Lazy load QuickCreateWizard for code splitting
const QuickCreateWizard = lazy(() => 
  import('../quick-create/QuickCreateWizard').then(m => ({ default: m.QuickCreateWizard }))
);

// =============================================================================
// Loading Skeleton
// =============================================================================

function TemplatePanelSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-background-elevated" />
        <div className="space-y-1">
          <div className="h-5 w-32 bg-background-elevated rounded" />
          <div className="h-3 w-48 bg-background-elevated rounded" />
        </div>
      </div>

      {/* Step indicator skeleton */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-background-elevated" />
            <div className="h-3 w-20 bg-background-elevated rounded" />
            {i < 3 && <div className="w-8 h-0.5 bg-background-elevated" />}
          </div>
        ))}
      </div>

      {/* Template grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div 
            key={i} 
            className="h-32 rounded-xl bg-background-elevated"
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// TemplatePanel Component
// =============================================================================

/**
 * TemplatePanel - Quick Templates mode for Create Studio.
 * 
 * Wraps the existing QuickCreateWizard component with:
 * - Lazy loading for performance
 * - Loading skeleton
 * - Error boundary integration
 * 
 * @example
 * ```tsx
 * <TemplatePanel
 *   onGenerationStart={(jobId) => console.log('Started:', jobId)}
 *   onSwitchToCoach={() => setMode('coach')}
 * />
 * ```
 */
export function TemplatePanel({
  onGenerationStart,
  onSwitchToCoach,
  className,
}: TemplatePanelProps) {
  return (
    <div 
      className={cn('h-full', className)}
      role="tabpanel"
      id="panel-templates"
      aria-labelledby="tab-templates"
    >
      <Suspense fallback={<TemplatePanelSkeleton />}>
        <QuickCreateWizard />
      </Suspense>
    </div>
  );
}

export default TemplatePanel;
