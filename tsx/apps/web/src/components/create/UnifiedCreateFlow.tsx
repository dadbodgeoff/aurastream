/**
 * UnifiedCreateFlow Component
 * 
 * Container component that provides a unified tabbed interface for all asset
 * creation methods: Templates (Quick Create), Custom, and AI Coach.
 * 
 * Features:
 * - Tab navigation using CreateTabs component
 * - Lazy loading of tab content for performance
 * - Scroll position preservation on tab switch
 * - URL-based tab state management
 * - Accessibility compliant (ARIA, keyboard navigation)
 * 
 * @module create/UnifiedCreateFlow
 * @see CreateTabs - Tab navigation component
 * @see QuickCreateWizard - Templates tab content
 * @see CreatePageContent - Custom tab content
 * @see CoachPageContent - AI Coach tab content
 */

'use client';

import { Suspense, lazy, useCallback, useRef, useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CreateTabs, type CreateTabValue, validateTab } from './CreateTabs';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// =============================================================================
// Types
// =============================================================================

export interface UnifiedCreateFlowProps {
  /** Initial tab to display (overrides URL param) */
  initialTab?: CreateTabValue;
  /** Additional className for the container */
  className?: string;
  /** Test ID for e2e testing */
  testId?: string;
}

// =============================================================================
// Lazy-loaded Components
// =============================================================================

/**
 * Lazy load tab content components for better initial page load performance.
 * Each component is loaded only when its tab is first accessed.
 */
const QuickCreateWizard = lazy(() => 
  import('../quick-create/QuickCreateWizard').then(mod => ({ default: mod.QuickCreateWizard }))
);

const CreatePageContent = lazy(() => 
  import('./CreatePageContent').then(mod => ({ default: mod.CreatePageContent }))
);

const CoachPageContent = lazy(() => 
  import('../coach/CoachPageContent').then(mod => ({ default: mod.CoachPageContent }))
);

// =============================================================================
// Loading Skeletons
// =============================================================================

/**
 * Loading skeleton for Templates tab (QuickCreateWizard)
 */
function TemplatesLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading templates...">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-background-elevated" />
        <div className="space-y-2">
          <div className="h-5 w-32 bg-background-elevated rounded" />
          <div className="h-3 w-48 bg-background-elevated rounded" />
        </div>
      </div>
      
      {/* Step indicator skeleton */}
      <div className="flex items-center gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-background-elevated" />
            <div className="h-4 w-24 bg-background-elevated rounded" />
          </div>
        ))}
      </div>
      
      {/* Template grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-video rounded-xl bg-background-elevated" />
        ))}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for Custom tab (CreatePageContent)
 */
function CustomLoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse" aria-label="Loading custom create...">
      {/* Usage display skeleton */}
      <div className="flex justify-end">
        <div className="h-8 w-32 bg-background-elevated rounded-lg" />
      </div>
      
      {/* Section skeletons */}
      {[1, 2, 3].map((section) => (
        <div key={section} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-background-elevated" />
            <div className="h-5 w-40 bg-background-elevated rounded" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-background-elevated" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Loading skeleton for Coach tab (CoachPageContent)
 */
function CoachLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading AI coach...">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-background-elevated" />
          <div className="h-5 w-32 bg-background-elevated rounded" />
        </div>
        <div className="h-4 w-48 bg-background-elevated rounded" />
      </div>
      
      {/* Form skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 bg-background-elevated rounded" />
            <div className="h-12 w-full bg-background-elevated rounded-lg" />
          </div>
        ))}
      </div>
      
      {/* Button skeleton */}
      <div className="h-12 w-full bg-background-elevated rounded-xl" />
    </div>
  );
}

// =============================================================================
// Scroll Position Manager
// =============================================================================

/**
 * Hook to preserve and restore scroll positions for each tab.
 */
function useScrollPositionManager() {
  const scrollPositions = useRef<Map<CreateTabValue, number>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const saveScrollPosition = useCallback((tab: CreateTabValue) => {
    if (containerRef.current) {
      scrollPositions.current.set(tab, containerRef.current.scrollTop);
    }
  }, []);

  const restoreScrollPosition = useCallback((tab: CreateTabValue) => {
    if (containerRef.current) {
      const savedPosition = scrollPositions.current.get(tab) ?? 0;
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = savedPosition;
        }
      });
    }
  }, []);

  return {
    containerRef,
    saveScrollPosition,
    restoreScrollPosition,
  };
}

// =============================================================================
// UnifiedCreateFlow Component
// =============================================================================

/**
 * UnifiedCreateFlow - Main container for the unified asset creation experience.
 * 
 * Provides a tabbed interface that consolidates:
 * - Templates: Quick Create wizard with pre-built templates
 * - Custom: Full custom asset creation flow
 * - AI Coach: AI-powered prompt refinement
 * 
 * @example
 * ```tsx
 * // Basic usage (reads tab from URL)
 * <UnifiedCreateFlow />
 * 
 * // With initial tab override
 * <UnifiedCreateFlow initialTab="custom" />
 * ```
 */
export function UnifiedCreateFlow({
  initialTab,
  className,
  testId = 'unified-create-flow',
}: UnifiedCreateFlowProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Scroll position management
  const { containerRef, saveScrollPosition, restoreScrollPosition } = useScrollPositionManager();
  
  // Track which tabs have been loaded (for lazy loading optimization)
  const [loadedTabs, setLoadedTabs] = useState<Set<CreateTabValue>>(new Set());
  
  // Get active tab from URL or use initial/default
  const urlTab = searchParams.get('tab');
  const activeTab = initialTab ?? validateTab(urlTab);
  
  // Mark initial tab as loaded
  useEffect(() => {
    setLoadedTabs(prev => new Set(prev).add(activeTab));
  }, [activeTab]);

  /**
   * Handle tab change with scroll position preservation.
   */
  const handleTabChange = useCallback((newTab: CreateTabValue) => {
    // Save current scroll position
    saveScrollPosition(activeTab);
    
    // Mark new tab as loaded
    setLoadedTabs(prev => new Set(prev).add(newTab));
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    
    // Restore scroll position for new tab (after render)
    restoreScrollPosition(newTab);
  }, [activeTab, pathname, router, searchParams, saveScrollPosition, restoreScrollPosition]);

  /**
   * Handle navigation to coach tab from custom tab.
   */
  const handleNavigateToCoach = useCallback(() => {
    handleTabChange('coach');
  }, [handleTabChange]);

  /**
   * Get the appropriate loading skeleton for a tab.
   */
  const getLoadingSkeleton = (tab: CreateTabValue) => {
    switch (tab) {
      case 'templates':
        return <TemplatesLoadingSkeleton />;
      case 'custom':
        return <CustomLoadingSkeleton />;
      case 'coach':
        return <CoachLoadingSkeleton />;
      default:
        return <TemplatesLoadingSkeleton />;
    }
  };

  /**
   * Render tab content with lazy loading and suspense.
   */
  const renderTabContent = (tab: CreateTabValue) => {
    // Only render if tab has been accessed (lazy loading)
    if (!loadedTabs.has(tab)) {
      return null;
    }

    return (
      <ErrorBoundary 
        name={`CreateFlow:${tab}`} 
        errorMessage={`Failed to load ${tab === 'templates' ? 'templates' : tab === 'custom' ? 'custom create' : 'AI coach'}.`}
      >
        <Suspense fallback={getLoadingSkeleton(tab)}>
          {tab === 'templates' && <QuickCreateWizard />}
          {tab === 'custom' && (
            <CreatePageContent 
              onNavigateToCoach={handleNavigateToCoach}
              testId="unified-create-custom"
            />
          )}
          {tab === 'coach' && (
            <CoachPageContent testId="unified-create-coach" />
          )}
        </Suspense>
      </ErrorBoundary>
    );
  };

  return (
    <div 
      className={cn('w-full', className)} 
      data-testid={testId}
      role="region"
      aria-label="Asset creation interface"
    >
      {/* Tab Navigation */}
      <CreateTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        panels={{
          templates: (
            <div 
              ref={activeTab === 'templates' ? containerRef : undefined}
              className="overflow-y-auto"
            >
              {renderTabContent('templates')}
            </div>
          ),
          custom: (
            <div 
              ref={activeTab === 'custom' ? containerRef : undefined}
              className="overflow-y-auto"
            >
              {renderTabContent('custom')}
            </div>
          ),
          coach: (
            <div 
              ref={activeTab === 'coach' ? containerRef : undefined}
              className="overflow-y-auto min-h-[500px]"
            >
              {renderTabContent('coach')}
            </div>
          ),
        }}
      />
    </div>
  );
}

export default UnifiedCreateFlow;
