/**
 * Create Studio Page - Unified Asset Creation Experience
 * 
 * Beautiful 3-panel interface for all asset creation methods:
 * - Quick Templates (50% of users) - Pre-built templates with vibes
 * - Build Your Own (1% of users) - Custom prompt creation
 * - AI Coach (49% of users) - Guided prompt refinement
 * 
 * URL Parameters:
 * - tab: 'templates' | 'custom' | 'coach' (default: 'templates')
 * 
 * @module app/dashboard/studio
 * @see CreateStudio - Main component
 */

'use client';

import { Suspense } from 'react';
import { CreateStudio } from '@/components/create-studio';

// =============================================================================
// Loading Skeleton
// =============================================================================

function StudioLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-background-elevated" />
        <div className="space-y-2">
          <div className="h-6 w-36 bg-background-elevated rounded" />
          <div className="h-4 w-56 bg-background-elevated rounded" />
        </div>
      </div>
      
      {/* Mode selector skeleton */}
      <div className="flex gap-1 p-1 bg-background-elevated/50 rounded-xl w-fit">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-11 w-32 bg-background-elevated rounded-lg" />
        ))}
      </div>
      
      {/* Content skeleton */}
      <div className="space-y-4 mt-6">
        <div className="h-48 bg-background-elevated rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-background-elevated rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

/**
 * Create Studio Page - Entry point for the unified creation experience.
 * 
 * This page provides a beautiful 3-panel interface that consolidates:
 * 1. Templates - Pre-built templates with vibes for quick creation
 * 2. Custom - Full control over platform, asset type, and prompt
 * 3. AI Coach - Guided prompt creation with AI assistance
 * 
 * @example URL patterns
 * ```
 * /dashboard/studio              → Templates tab (default)
 * /dashboard/studio?tab=custom   → Custom tab
 * /dashboard/studio?tab=coach    → AI Coach tab
 * ```
 */
export default function StudioPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<StudioLoadingSkeleton />}>
        <CreateStudio testId="studio-page" />
      </Suspense>
    </div>
  );
}
