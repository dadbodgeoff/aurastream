'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@aurastream/shared';

// =============================================================================
// Types
// =============================================================================

export type CreateTabValue = 'templates' | 'custom' | 'coach';

export interface CreateTabConfig {
  value: CreateTabValue;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  disabled?: boolean;
}

export interface CreateTabsProps {
  /** Currently active tab (controlled) */
  activeTab?: CreateTabValue;
  /** Callback when tab changes */
  onTabChange?: (tab: CreateTabValue) => void;
  /** Children to render in each tab panel */
  children?: React.ReactNode;
  /** Tab panel content keyed by tab value */
  panels?: Partial<Record<CreateTabValue, React.ReactNode>>;
  /** Additional className for the container */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const VALID_TABS: CreateTabValue[] = ['templates', 'custom', 'coach'];
const DEFAULT_TAB: CreateTabValue = 'templates';

// Tab content animation variants with reduced motion support
const tabContentVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.15, ease: 'easeOut' as const }
  },
  exit: { 
    opacity: 0, 
    y: -8,
    transition: { duration: 0.1, ease: 'easeIn' as const }
  },
};

// Reduced motion variants (no transform animations)
const reducedMotionVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.1 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.05 }
  },
};

// =============================================================================
// Tab Styling (from spec)
// =============================================================================

const tabStyles = {
  container: 'flex gap-1 p-1 bg-background-elevated/50 rounded-lg w-fit',
  tab: {
    base: 'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-base',
    active: 'bg-interactive-600/20 text-interactive-400 shadow-sm',
    inactive: 'text-text-secondary hover:text-text-primary hover:bg-background-elevated/50',
    disabled: 'opacity-50 cursor-not-allowed',
  },
  badge: 'px-1.5 py-0.5 text-micro font-medium bg-interactive-600 text-white rounded',
  indicator: 'h-0.5 bg-interactive-500 rounded-full transition-all duration-200',
};

// =============================================================================
// Icons
// =============================================================================

const TemplatesIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

const CustomIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
  </svg>
);

const CoachIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validates and returns a valid tab value, defaulting to 'templates' if invalid
 */
function validateTab(tab: string | null): CreateTabValue {
  if (tab && VALID_TABS.includes(tab as CreateTabValue)) {
    return tab as CreateTabValue;
  }
  return DEFAULT_TAB;
}

// =============================================================================
// CreateTabs Component
// =============================================================================

export function CreateTabs({
  activeTab: controlledActiveTab,
  onTabChange,
  children,
  panels,
  className,
}: CreateTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  // Determine if user is Pro/Studio tier
  const isPro = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'studio' || user?.subscriptionTier === 'unlimited';

  // Get initial tab from URL or use default
  const urlTab = searchParams.get('tab');
  const initialTab = validateTab(urlTab);

  // Internal state for uncontrolled mode
  const [internalActiveTab, setInternalActiveTab] = useState<CreateTabValue>(initialTab);

  // Use controlled value if provided, otherwise use internal state
  const activeTab = controlledActiveTab ?? internalActiveTab;

  // Select animation variants based on reduced motion preference
  const animationVariants = useMemo(() => 
    prefersReducedMotion ? reducedMotionVariants : tabContentVariants,
    [prefersReducedMotion]
  );

  // Tab configuration
  const tabs: CreateTabConfig[] = [
    { value: 'templates', label: 'Templates', icon: <TemplatesIcon /> },
    { value: 'custom', label: 'Custom', icon: <CustomIcon /> },
    { 
      value: 'coach', 
      label: 'AI Coach', 
      icon: <CoachIcon />,
      badge: isPro ? undefined : 'Pro',
    },
  ];

  // Sync URL with active tab
  useEffect(() => {
    const currentUrlTab = searchParams.get('tab');
    const validatedUrlTab = validateTab(currentUrlTab);
    
    // If URL tab is different from active tab, update internal state
    if (validatedUrlTab !== activeTab && !controlledActiveTab) {
      setInternalActiveTab(validatedUrlTab);
    }
  }, [searchParams, activeTab, controlledActiveTab]);

  // Handle tab change
  const handleTabChange = useCallback((newTab: CreateTabValue) => {
    // Update internal state
    setInternalActiveTab(newTab);

    // Call external handler if provided
    onTabChange?.(newTab);

    // Update URL without full page reload
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [onTabChange, pathname, router, searchParams]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    const newTab = tabs[newIndex];
    if (!newTab.disabled) {
      handleTabChange(newTab.value);
      // Focus the new tab button
      const tabButton = document.querySelector(`[data-tab="${newTab.value}"]`) as HTMLButtonElement;
      tabButton?.focus();
    }
  }, [handleTabChange, tabs]);

  return (
    <div className={cn('w-full', className)}>
      {/* Tab List */}
      <div
        role="tablist"
        aria-label="Create asset options"
        className={tabStyles.container}
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.value;
          const isDisabled = tab.disabled;

          return (
            <button
              key={tab.value}
              role="tab"
              id={`create-tab-${tab.value}`}
              data-tab={tab.value}
              aria-selected={isActive}
              aria-controls={`create-tabpanel-${tab.value}`}
              aria-disabled={isDisabled}
              tabIndex={isActive ? 0 : -1}
              disabled={isDisabled}
              onClick={() => !isDisabled && handleTabChange(tab.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                tabStyles.tab.base,
                isActive && tabStyles.tab.active,
                !isActive && !isDisabled && tabStyles.tab.inactive,
                isDisabled && tabStyles.tab.disabled,
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={tabStyles.badge}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="mt-6">
        <AnimatePresence mode="wait">
          {tabs.map((tab) => {
            if (activeTab !== tab.value) return null;

            const panelContent = panels?.[tab.value] ?? children;

            return (
              <motion.div
                key={tab.value}
                role="tabpanel"
                id={`create-tabpanel-${tab.value}`}
                aria-labelledby={`create-tab-${tab.value}`}
                tabIndex={0}
                variants={animationVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {panelContent}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default CreateTabs;
export { VALID_TABS, DEFAULT_TAB, validateTab };
