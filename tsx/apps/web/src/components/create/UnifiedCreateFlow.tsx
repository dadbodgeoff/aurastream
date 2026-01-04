/**
 * UnifiedCreateFlow Component
 * 
 * Container component that provides a unified card-based interface for asset
 * creation methods: Quick Create and Build Your Own (with integrated AI Coach).
 * 
 * Features:
 * - Card-based method selection
 * - Lazy loading of method content for performance
 * - Scroll position preservation on method switch
 * - URL-based method state management
 * - Accessibility compliant (ARIA, keyboard navigation)
 * 
 * @module create/UnifiedCreateFlow
 * @see MethodSelector - Card-based method selection
 * @see QuickCreateWizard - Quick Create content
 * @see CreatePageContent - Build Your Own content (with integrated Coach)
 */

'use client';

import { Suspense, lazy, useCallback, useRef, useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@aurastream/shared';
import { MethodSelector, type CreationMethod } from './MethodSelector';
import { CreateStudioHeader } from './CreateStudioHeader';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Legacy tab support for backwards compatibility
import { type CreateTabValue, validateTab } from './CreateTabs';

// =============================================================================
// Types
// =============================================================================

export interface UnifiedCreateFlowProps {
  /** Initial method to display (overrides URL param) */
  initialMethod?: CreationMethod;
  /** Additional className for the container */
  className?: string;
  /** Test ID for e2e testing */
  testId?: string;
}

// =============================================================================
// Method Validation
// =============================================================================

const VALID_METHODS: CreationMethod[] = ['quick', 'custom'];
const DEFAULT_METHOD: CreationMethod = 'quick';

/**
 * Convert legacy tab value to new method value
 */
function tabToMethod(tab: CreateTabValue | null): CreationMethod {
  if (tab === 'templates') return 'quick';
  if (tab === 'custom' || tab === 'coach') return 'custom'; // Coach now part of custom
  return DEFAULT_METHOD;
}

/**
 * Convert method value to legacy tab value (for URL backwards compat)
 */
function methodToTab(method: CreationMethod): CreateTabValue {
  if (method === 'quick') return 'templates';
  return method;
}

/**
 * Validate and return a valid method value
 */
function validateMethod(value: string | null): CreationMethod {
  // Check new method param first
  if (value && VALID_METHODS.includes(value as CreationMethod)) {
    return value as CreationMethod;
  }
  // Fall back to legacy tab param conversion
  const legacyTab = validateTab(value);
  return tabToMethod(legacyTab);
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

// =============================================================================
// Scroll Position Manager
// =============================================================================

/**
 * Hook to preserve and restore scroll positions for each method.
 */
function useScrollPositionManager() {
  const scrollPositions = useRef<Map<CreationMethod, number>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const saveScrollPosition = useCallback((method: CreationMethod) => {
    if (containerRef.current) {
      scrollPositions.current.set(method, containerRef.current.scrollTop);
    }
  }, []);

  const restoreScrollPosition = useCallback((method: CreationMethod) => {
    if (containerRef.current) {
      const savedPosition = scrollPositions.current.get(method) ?? 0;
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
 * Provides a card-based interface that consolidates:
 * - Quick Create: Template-based fast creation
 * - Build Your Own: Full custom asset creation flow
 * - AI Coach: AI-powered prompt refinement
 * 
 * @example
 * ```tsx
 * // Basic usage (reads method from URL)
 * <UnifiedCreateFlow />
 * 
 * // With initial method override
 * <UnifiedCreateFlow initialMethod="custom" />
 * ```
 */
export function UnifiedCreateFlow({
  initialMethod,
  className,
  testId = 'unified-create-flow',
}: UnifiedCreateFlowProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  // Check if user is premium
  const isPremiumUser = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'studio' || user?.subscriptionTier === 'unlimited';
  
  // Scroll position management
  const { containerRef, saveScrollPosition, restoreScrollPosition } = useScrollPositionManager();
  
  // Track which methods have been loaded (for lazy loading optimization)
  const [loadedMethods, setLoadedMethods] = useState<Set<CreationMethod>>(new Set());
  
  // Get active method from URL or use initial/default
  // Support both new 'method' param and legacy 'tab' param
  const urlMethod = searchParams.get('method') || searchParams.get('tab');
  const activeMethod = initialMethod ?? validateMethod(urlMethod);
  
  // Mark initial method as loaded
  useEffect(() => {
    setLoadedMethods(prev => new Set(prev).add(activeMethod));
  }, [activeMethod]);

  /**
   * Handle method change with scroll position preservation.
   */
  const handleMethodChange = useCallback((newMethod: CreationMethod) => {
    // Save current scroll position
    saveScrollPosition(activeMethod);
    
    // Mark new method as loaded
    setLoadedMethods(prev => new Set(prev).add(newMethod));
    
    // Update URL (use 'method' param, keep 'tab' for backwards compat)
    const params = new URLSearchParams(searchParams.toString());
    params.set('method', newMethod);
    params.set('tab', methodToTab(newMethod)); // Backwards compat
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    
    // Restore scroll position for new method (after render)
    restoreScrollPosition(newMethod);
  }, [activeMethod, pathname, router, searchParams, saveScrollPosition, restoreScrollPosition]);

  /**
   * Get the appropriate loading skeleton for a method.
   */
  const getLoadingSkeleton = (method: CreationMethod) => {
    switch (method) {
      case 'quick':
        return <TemplatesLoadingSkeleton />;
      case 'custom':
        return <CustomLoadingSkeleton />;
      default:
        return <TemplatesLoadingSkeleton />;
    }
  };

  /**
   * Render method content with lazy loading and suspense.
   */
  const renderMethodContent = (method: CreationMethod) => {
    // Only render if method has been accessed (lazy loading)
    if (!loadedMethods.has(method)) {
      return null;
    }

    const methodLabel = method === 'quick' ? 'Quick Create' : 'Build Your Own';

    return (
      <ErrorBoundary 
        name={`CreateFlow:${method}`} 
        errorMessage={`Failed to load ${methodLabel}.`}
      >
        <Suspense fallback={getLoadingSkeleton(method)}>
          {method === 'quick' && <QuickCreateWizard />}
          {method === 'custom' && (
            <CreatePageContent testId="unified-create-custom" />
          )}
        </Suspense>
      </ErrorBoundary>
    );
  };

  return (
    <div 
      className={cn('w-full space-y-4', className)} 
      data-testid={testId}
      role="region"
      aria-label="Asset creation interface"
    >
      {/* Header */}
      <CreateStudioHeader />

      {/* Method Selector Cards */}
      <MethodSelector
        selectedMethod={activeMethod}
        onMethodChange={handleMethodChange}
        isPremiumUser={isPremiumUser}
      />

      {/* Method Content */}
      <div 
        ref={containerRef}
        className="min-h-[400px]"
      >
        {renderMethodContent(activeMethod)}
      </div>
    </div>
  );
}

export default UnifiedCreateFlow;
