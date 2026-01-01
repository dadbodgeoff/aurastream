'use client';

/**
 * CommunityTabs Component
 * 
 * Tab navigation for the Community Hub with URL-driven state.
 * Tabs: Gallery | Creators | Promo Board
 * 
 * @module components/community/CommunityTabs
 */

import { useCallback, useId, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export type CommunityTabValue = 'gallery' | 'creators' | 'promo';

interface TabConfig {
  value: CommunityTabValue;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface CommunityTabsProps {
  /** Content to render for each tab */
  children: {
    gallery: React.ReactNode;
    creators: React.ReactNode;
    promo: React.ReactNode;
  };
  /** Optional className for the container */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const TABS: TabConfig[] = [
  {
    value: 'gallery',
    label: 'Gallery',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
  {
    value: 'creators',
    label: 'Creators',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    value: 'promo',
    label: 'Promo Board',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    badge: '$1',
  },
];

const DEFAULT_TAB: CommunityTabValue = 'gallery';

// Animation variants for tab content
const tabContentVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] as const }
  },
  exit: { 
    opacity: 0, 
    y: -8,
    transition: { duration: 0.1, ease: [0.4, 0, 1, 1] as const }
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
// Styles
// =============================================================================

const styles = {
  container: 'flex gap-1 p-1 bg-background-elevated/50 rounded-lg w-fit',
  tab: {
    base: 'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-base',
    active: 'bg-interactive-600/20 text-interactive-400 shadow-sm',
    inactive: 'text-text-secondary hover:text-text-primary hover:bg-background-elevated/50',
  },
  badge: 'px-1.5 py-0.5 text-micro font-medium bg-interactive-600 text-white rounded',
  tabPanel: 'focus:outline-none',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validates and returns a valid tab value, defaulting to 'gallery' if invalid
 */
function getValidTabValue(value: string | null): CommunityTabValue {
  if (value && ['gallery', 'creators', 'promo'].includes(value)) {
    return value as CommunityTabValue;
  }
  return DEFAULT_TAB;
}

// =============================================================================
// Component
// =============================================================================

export function CommunityTabs({ children, className }: CommunityTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabId = useId();
  const prefersReducedMotion = useReducedMotion();
  
  // Get current tab from URL, default to 'gallery'
  const currentTab = getValidTabValue(searchParams.get('tab'));

  // Select animation variants based on reduced motion preference
  const animationVariants = useMemo(() => 
    prefersReducedMotion ? reducedMotionVariants : tabContentVariants,
    [prefersReducedMotion]
  );

  // Handle tab change - update URL
  const handleTabChange = useCallback((value: string) => {
    const newTab = getValidTabValue(value);
    const params = new URLSearchParams(searchParams.toString());
    
    if (newTab === DEFAULT_TAB) {
      // Remove tab param if it's the default
      params.delete('tab');
    } else {
      params.set('tab', newTab);
    }
    
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    
    // Use replace to avoid adding to history for tab changes
    router.replace(newUrl, { scroll: false });
  }, [router, pathname, searchParams]);

  return (
    <Tabs.Root
      value={currentTab}
      onValueChange={handleTabChange}
      className={cn('w-full', className)}
    >
      {/* Tab List */}
      <Tabs.List
        className={styles.container}
        aria-label="Community sections"
      >
        {TABS.map((tab) => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              styles.tab.base,
              currentTab === tab.value ? styles.tab.active : styles.tab.inactive
            )}
            id={`${tabId}-tab-${tab.value}`}
            aria-controls={`${tabId}-panel-${tab.value}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge && (
              <span 
                className={styles.badge} 
                role="status"
                aria-label={`Cost: ${tab.badge} per message`}
              >
                {tab.badge}
              </span>
            )}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {/* Tab Panels with Animation */}
      <div className="mt-6">
        <AnimatePresence mode="wait">
          {TABS.map((tab) => (
            currentTab === tab.value && (
              <Tabs.Content
                key={tab.value}
                value={tab.value}
                className={styles.tabPanel}
                id={`${tabId}-panel-${tab.value}`}
                aria-labelledby={`${tabId}-tab-${tab.value}`}
                forceMount
              >
                <motion.div
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={animationVariants}
                >
                  {children[tab.value]}
                </motion.div>
              </Tabs.Content>
            )
          ))}
        </AnimatePresence>
      </div>
    </Tabs.Root>
  );
}

export default CommunityTabs;
