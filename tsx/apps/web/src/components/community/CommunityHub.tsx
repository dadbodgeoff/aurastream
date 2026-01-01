'use client';

/**
 * CommunityHub Component
 * 
 * Container component for the Community Hub with tab navigation.
 * Renders appropriate content based on active tab using lazy loading.
 * 
 * Tabs:
 * - Gallery: Community posts and inspiration
 * - Creators: Spotlight creators with follow functionality
 * - Promo: Promo board with paid messages
 * 
 * @module components/community/CommunityHub
 */

import { Suspense, lazy, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CommunityTabs, CommunityTabValue } from './CommunityTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';

// =============================================================================
// Lazy Loaded Components
// =============================================================================

/**
 * Lazy load tab content components for better initial load performance.
 * Each tab content is loaded only when the tab is activated.
 */
const CommunityGalleryContent = lazy(() => 
  import('./CommunityGalleryContent').then(mod => ({ default: mod.CommunityGalleryContent }))
);

const CreatorSpotlightContent = lazy(() => 
  import('./CreatorSpotlightContent').then(mod => ({ default: mod.CreatorSpotlightContent }))
);

const PromoBoardContent = lazy(() => 
  import('./PromoBoardContent').then(mod => ({ default: mod.PromoBoardContent }))
);

// =============================================================================
// Types
// =============================================================================

/** Props for CommunityHub component */
export interface CommunityHubProps {
  /** Optional className for the container */
  className?: string;
  /** Initial tab to display (from URL params) */
  initialTab?: CommunityTabValue;
}

// =============================================================================
// Skeleton Components
// =============================================================================

/**
 * Skeleton for gallery tab content
 */
function GallerySkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading gallery...">
      {/* Hero skeleton */}
      <Skeleton className="w-full h-48 md:h-64 rounded-xl" />
      
      {/* Quick actions skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
      
      {/* Gallery grid skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border-subtle overflow-hidden">
              <Skeleton className="aspect-square w-full" rounded="none" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center gap-2">
                  <Skeleton width={24} height={24} rounded="full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for creators tab content
 */
function CreatorsSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading creators...">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32 hidden md:block" />
      </div>
      
      {/* Search and filters skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-10 w-64" />
      </div>
      
      {/* Creators grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-subtle overflow-hidden">
            <div className="p-4 pb-3">
              <div className="flex items-start gap-3">
                <Skeleton width={48} height={48} rounded="full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
            <div className="px-4 pb-2">
              <div className="grid grid-cols-6 gap-1">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="aspect-square" rounded="none" />
                ))}
              </div>
            </div>
            <div className="p-4 pt-2 border-t border-border-subtle/50">
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for promo tab content
 */
function PromoSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading promo board...">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton width={32} height={32} rounded="lg" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      
      {/* Main content skeleton */}
      <div className="flex gap-4">
        {/* Chat feed skeleton */}
        <div className="flex-1 space-y-3">
          {/* King banner skeleton */}
          <Skeleton className="h-24 w-full rounded-lg" />
          
          {/* Messages skeleton */}
          <div className="rounded-lg border border-border-subtle overflow-hidden">
            <div className="px-3 py-2 border-b border-border-subtle">
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="p-3 space-y-4 min-h-[300px]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton width={32} height={32} rounded="full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Sidebar skeleton (desktop only) */}
        <aside className="hidden lg:block w-64 space-y-3">
          <div className="rounded-lg border border-border-subtle overflow-hidden">
            <div className="px-3 py-2 border-b border-border-subtle">
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="p-2 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * CommunityHub - Container component for the Community Hub.
 * 
 * Features:
 * - Tab navigation using CommunityTabs (URL-driven)
 * - Lazy loading of tab content for performance
 * - Suspense boundaries with content-aware skeletons
 * - Error boundaries for resilience
 * - Banned user handling
 * - Accessible with ARIA labels and keyboard navigation
 * 
 * @example
 * ```tsx
 * // Basic usage (reads tab from URL)
 * <CommunityHub />
 * 
 * // With initial tab
 * <CommunityHub initialTab="creators" />
 * 
 * // With custom className
 * <CommunityHub className="max-w-7xl mx-auto" />
 * ```
 */
export function CommunityHub({ className, initialTab: _initialTab }: CommunityHubProps) {
  const router = useRouter();
  const [isBanned, setIsBanned] = useState(false);

  // Handle banned user state
  const handleBanned = useCallback(() => {
    setIsBanned(true);
  }, []);

  // Banned user UI
  if (isBanned) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <svg 
              width="32" 
              height="32" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              className="text-red-500"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text-primary">Account Restricted</h2>
          <p className="text-text-secondary">
            Your community access has been restricted. If you believe this is an error, please contact our support team.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => router.push('/support')}
              className="px-6 py-2.5 rounded-lg font-medium bg-interactive-600 text-white hover:bg-interactive-500 transition-colors"
            >
              Contact Support
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2.5 rounded-lg font-medium border border-border-subtle text-text-secondary hover:bg-background-elevated transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      <CommunityTabs>
        {{
          gallery: (
            <ErrorBoundary name="CommunityGallery" errorMessage="Failed to load gallery content.">
              <Suspense fallback={<GallerySkeleton />}>
                <CommunityGalleryContent 
                  showHero={true}
                  showQuickActions={true}
                  onBanned={handleBanned}
                />
              </Suspense>
            </ErrorBoundary>
          ),
          creators: (
            <ErrorBoundary name="CreatorSpotlight" errorMessage="Failed to load creators.">
              <Suspense fallback={<CreatorsSkeleton />}>
                <CreatorSpotlightContent onBanned={handleBanned} />
              </Suspense>
            </ErrorBoundary>
          ),
          promo: (
            <ErrorBoundary name="PromoBoard" errorMessage="Failed to load promo board.">
              <Suspense fallback={<PromoSkeleton />}>
                <PromoBoardContent />
              </Suspense>
            </ErrorBoundary>
          ),
        }}
      </CommunityTabs>
    </div>
  );
}

export default CommunityHub;
