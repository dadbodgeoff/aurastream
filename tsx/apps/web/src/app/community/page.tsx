'use client';

/**
 * Community Page
 * 
 * Main entry point for the Community Hub.
 * Renders the CommunityHub container with URL-driven tab navigation.
 * 
 * URL Parameters:
 * - tab: 'gallery' | 'creators' | 'promo' (default: 'gallery')
 * 
 * @module app/community/page
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CommunityHub, CommunityTabValue } from '@/components/community';
import { PageHeader } from '@/components/navigation';
import { Skeleton } from '@/components/ui/Skeleton';

// =============================================================================
// Types
// =============================================================================

/** Valid tab values for the community page */
const VALID_TABS: CommunityTabValue[] = ['gallery', 'creators', 'promo'];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validates and returns a valid tab value from URL params.
 * Defaults to 'gallery' if invalid or missing.
 */
function getValidTab(tabParam: string | null): CommunityTabValue {
  if (tabParam && VALID_TABS.includes(tabParam as CommunityTabValue)) {
    return tabParam as CommunityTabValue;
  }
  return 'gallery';
}

// =============================================================================
// Page Skeleton
// =============================================================================

/**
 * Full page skeleton while loading
 */
function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        
        {/* Tabs skeleton */}
        <div className="flex gap-1 p-1 bg-background-elevated/50 rounded-lg w-fit">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-md" />
          ))}
        </div>
        
        {/* Content skeleton */}
        <div className="space-y-6">
          <Skeleton className="w-full h-48 md:h-64 rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border-subtle overflow-hidden">
                <Skeleton className="aspect-square w-full" rounded="none" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Inner Component (needs useSearchParams)
// =============================================================================

/**
 * Inner component that uses useSearchParams.
 * Wrapped in Suspense boundary in the main page component.
 */
function CommunityPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = getValidTab(tabParam);

  return (
    <div className="min-h-screen bg-background-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* Page Header */}
        <PageHeader 
          title="Community"
          subtitle="Discover and share amazing stream assets"
        />

        {/* Community Hub with Tab Navigation */}
        <CommunityHub initialTab={initialTab} />
      </div>
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

/**
 * Community Page - Main entry point for the Community Hub.
 * 
 * Features:
 * - URL-driven tab navigation (?tab=gallery|creators|promo)
 * - Default tab is 'gallery'
 * - Page header with title and description
 * - Suspense boundary for search params
 * - All old URLs continue to work (backwards compatible)
 * 
 * @example
 * ```
 * /community           → Gallery tab (default)
 * /community?tab=gallery   → Gallery tab
 * /community?tab=creators  → Creators tab
 * /community?tab=promo     → Promo Board tab
 * ```
 */
export default function CommunityPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CommunityPageContent />
    </Suspense>
  );
}
