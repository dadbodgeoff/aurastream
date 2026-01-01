/**
 * Creator Intel Zustand Store
 *
 * Manages local state for the Creator Intel dashboard.
 * Syncs with React Query for server state.
 *
 * @module stores/intelStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  CategorySubscription,
  PanelConfig,
  PanelType,
  PanelSize,
  UserIntelPreferences,
} from '@aurastream/api-client';

// ============================================================================
// Types
// ============================================================================

interface IntelState {
  // Server-synced state
  subscribedCategories: CategorySubscription[];
  dashboardLayout: PanelConfig[];
  timezone: string;

  // UI state
  activeFilter: string; // 'all' or category key
  isDragging: boolean;
  editingPanelType: PanelType | null;
  isPanelLibraryOpen: boolean;
  isCategoryPickerOpen: boolean;

  // Optimistic update tracking
  pendingLayoutUpdate: boolean;
}

interface IntelActions {
  // Sync from server
  syncFromServer: (prefs: UserIntelPreferences) => void;

  // Filter actions
  setActiveFilter: (filter: string) => void;

  // Layout actions
  updateLayout: (layout: PanelConfig[]) => void;
  addPanel: (panelType: PanelType, size: PanelSize) => void;
  removePanel: (panelType: PanelType) => void;
  updatePanelSize: (panelType: PanelType, size: PanelSize) => void;
  resetLayout: () => void;

  // UI state actions
  setIsDragging: (isDragging: boolean) => void;
  setEditingPanel: (panelType: PanelType | null) => void;
  setPanelLibraryOpen: (open: boolean) => void;
  setCategoryPickerOpen: (open: boolean) => void;

  // Category actions (optimistic)
  addCategoryOptimistic: (category: CategorySubscription) => void;
  removeCategoryOptimistic: (categoryKey: string) => void;

  // Pending state
  setPendingLayoutUpdate: (pending: boolean) => void;
}

type IntelStore = IntelState & IntelActions;

// ============================================================================
// Default Layout
// ============================================================================

/**
 * Default Intel Dashboard Layout
 * 
 * Grid: 4 columns, each row is 100px
 * 
 * Panel sizes:
 * - small:  1x2 (1 col, 200px)
 * - wide:   2x2 (2 cols, 200px)
 * - large:  2x3 (2 cols, 300px)
 * - tall:   1x4 (1 col, 400px)
 * 
 * Layout visualization (4 cols):
 * 
 * Row 0-1: [  live_pulse (wide)  ][youtube_trending][competition]
 * Row 2-3: [thumbnail_patterns(wide)][golden_hours][niche_opps ]
 * Row 4-5: [title_formulas][hashtags][viral_hooks ][viral_clips]
 * 
 * Note: Today's Mission is rendered separately above the grid
 */
const DEFAULT_LAYOUT: PanelConfig[] = [
  // Row 0-1: Top row
  { panelType: 'live_pulse', position: { x: 0, y: 0 }, size: 'wide' },
  { panelType: 'youtube_trending', position: { x: 2, y: 0 }, size: 'small' },
  { panelType: 'competition_meter', position: { x: 3, y: 0 }, size: 'small' },
  
  // Row 2-3: Middle row
  { panelType: 'thumbnail_patterns', position: { x: 0, y: 2 }, size: 'wide' },
  { panelType: 'golden_hours', position: { x: 2, y: 2 }, size: 'small' },
  { panelType: 'niche_opportunities', position: { x: 3, y: 2 }, size: 'small' },
  
  // Row 4-5: Bottom row
  { panelType: 'title_formulas', position: { x: 0, y: 4 }, size: 'small' },
  { panelType: 'trending_hashtags', position: { x: 1, y: 4 }, size: 'small' },
  { panelType: 'viral_hooks', position: { x: 2, y: 4 }, size: 'small' },
  { panelType: 'viral_clips', position: { x: 3, y: 4 }, size: 'small' },
];

// ============================================================================
// Store
// ============================================================================

export const useIntelStore = create<IntelStore>()(
  persist(
    (set, get) => ({
      // Initial state
      subscribedCategories: [],
      dashboardLayout: DEFAULT_LAYOUT,
      timezone: 'America/New_York',
      activeFilter: 'all',
      isDragging: false,
      editingPanelType: null,
      isPanelLibraryOpen: false,
      isCategoryPickerOpen: false,
      pendingLayoutUpdate: false,

      // Sync from server (called when React Query data loads)
      syncFromServer: (prefs) => {
        set({
          subscribedCategories: prefs.subscribedCategories,
          dashboardLayout:
            prefs.dashboardLayout.length > 0
              ? prefs.dashboardLayout
              : DEFAULT_LAYOUT,
          timezone: prefs.timezone,
        });
      },

      // Filter actions
      setActiveFilter: (filter) => {
        set({ activeFilter: filter });
      },

      // Layout actions
      updateLayout: (layout) => {
        set({ dashboardLayout: layout, pendingLayoutUpdate: true });
      },

      addPanel: (panelType, size) => {
        const { dashboardLayout } = get();

        // Check if panel already exists
        if (dashboardLayout.some((p) => p.panelType === panelType)) {
          return;
        }

        // Find next available position
        const maxY = Math.max(...dashboardLayout.map((p) => p.position.y), -1);
        const newPanel: PanelConfig = {
          panelType,
          position: { x: 0, y: maxY + 1 },
          size,
        };

        set({
          dashboardLayout: [...dashboardLayout, newPanel],
          pendingLayoutUpdate: true,
        });
      },

      removePanel: (panelType) => {
        const { dashboardLayout } = get();
        set({
          dashboardLayout: dashboardLayout.filter(
            (p) => p.panelType !== panelType
          ),
          pendingLayoutUpdate: true,
        });
      },

      updatePanelSize: (panelType, size) => {
        const { dashboardLayout } = get();
        set({
          dashboardLayout: dashboardLayout.map((p) =>
            p.panelType === panelType ? { ...p, size } : p
          ),
          pendingLayoutUpdate: true,
        });
      },

      resetLayout: () => {
        set({
          dashboardLayout: DEFAULT_LAYOUT,
          pendingLayoutUpdate: true,
        });
      },

      // UI state actions
      setIsDragging: (isDragging) => set({ isDragging }),
      setEditingPanel: (panelType) => set({ editingPanelType: panelType }),
      setPanelLibraryOpen: (open) => set({ isPanelLibraryOpen: open }),
      setCategoryPickerOpen: (open) => set({ isCategoryPickerOpen: open }),

      // Category actions (optimistic updates)
      addCategoryOptimistic: (category) => {
        const { subscribedCategories } = get();
        if (subscribedCategories.some((c) => c.key === category.key)) {
          return;
        }
        set({ subscribedCategories: [...subscribedCategories, category] });
      },

      removeCategoryOptimistic: (categoryKey) => {
        const { subscribedCategories, activeFilter } = get();
        const newCategories = subscribedCategories.filter(
          (c) => c.key !== categoryKey
        );

        // Reset filter if removing the currently filtered category
        const newFilter = activeFilter === categoryKey ? 'all' : activeFilter;

        set({
          subscribedCategories: newCategories,
          activeFilter: newFilter,
        });
      },

      // Pending state
      setPendingLayoutUpdate: (pending) => set({ pendingLayoutUpdate: pending }),
    }),
    {
      name: 'intel-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist certain fields
      partialize: (state) => ({
        activeFilter: state.activeFilter,
        // Don't persist layout - that comes from server
      }),
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectSubscribedCategories = (state: IntelStore) =>
  state.subscribedCategories;
export const selectDashboardLayout = (state: IntelStore) =>
  state.dashboardLayout;
export const selectActiveFilter = (state: IntelStore) => state.activeFilter;
export const selectIsDragging = (state: IntelStore) => state.isDragging;

// Get panels that should be visible (respects tier limits)
export const selectVisiblePanels =
  (maxPanels: number) => (state: IntelStore) => {
    return state.dashboardLayout.slice(0, maxPanels);
  };

// Check if a panel type is already in the layout
export const selectIsPanelInLayout =
  (panelType: PanelType) => (state: IntelStore) => {
    return state.dashboardLayout.some((p) => p.panelType === panelType);
  };

// Get filtered category names for display
export const selectFilteredCategoryName = (state: IntelStore) => {
  if (state.activeFilter === 'all') return 'All Categories';
  const category = state.subscribedCategories.find(
    (c) => c.key === state.activeFilter
  );
  return category?.name || 'All Categories';
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the current intel store state (non-reactive)
 * Useful for accessing state outside of React components
 *
 * @returns Current intel store state
 */
export function getIntelState(): IntelStore {
  return useIntelStore.getState();
}

/**
 * Reset intel store to default values
 * Clears all stored state
 */
export function resetIntelStore(): void {
  useIntelStore.setState({
    subscribedCategories: [],
    dashboardLayout: DEFAULT_LAYOUT,
    timezone: 'America/New_York',
    activeFilter: 'all',
    isDragging: false,
    editingPanelType: null,
    isPanelLibraryOpen: false,
    isCategoryPickerOpen: false,
    pendingLayoutUpdate: false,
  });
}

/**
 * Check if intel store has been hydrated from storage
 * Useful for SSR scenarios where you need to wait for client-side hydration
 *
 * @returns Promise that resolves when hydration is complete
 */
export function waitForIntelHydration(): Promise<void> {
  return new Promise((resolve) => {
    // Check if already hydrated
    if (useIntelStore.persist.hasHydrated()) {
      resolve();
      return;
    }

    // Wait for hydration
    const unsubscribe = useIntelStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}
