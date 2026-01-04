/**
 * Create Draft Store using Zustand
 * 
 * Persists Creator Studio state (Quick Create + Canvas Studio) to localStorage.
 * Allows users to close and reopen without losing their work.
 *
 * Features:
 * - Auto-saves all form state on change
 * - Restores state when user returns
 * - Supports both Quick Create and Canvas Studio modes
 * - Draft expiration (24 hours)
 * - Clear draft on successful generation
 *
 * @module stores/createDraftStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

/** Serializable placement data for persistence */
export interface SerializedPlacement {
  assetId: string;
  assetUrl: string;
  assetName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  flipX: boolean;
  flipY: boolean;
}

/** Serializable media asset for persistence */
export interface SerializedMediaAsset {
  id: string;
  url: string;
  thumbnailUrl?: string;
  displayName: string;
  assetType: string;
}

/** Labeled region for canvas */
export interface SerializedRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
}

/** Brand customization settings */
export interface BrandCustomizationDraft {
  include_logo: boolean;
  logo_type: string;
  logo_position: string;
  logo_size: string;
  brand_intensity: string;
  colors?: {
    primary_index?: number;
    secondary_index?: number;
    accent_index?: number;
    use_gradient?: number;
  };
  voice?: {
    use_tagline?: boolean;
    use_catchphrase?: number;
  };
}

/**
 * Sketch element stored as JSON-serializable object.
 * The actual type is AnySketchElement from canvas-export/types.ts
 * but we store it as Record to avoid circular dependencies.
 */
export type SerializedSketchElement = Record<string, unknown>;

/** Complete draft state */
export interface CreateDraft {
  // Form state
  platform: string;
  selectedAssetType: string;
  selectedBrandKitId: string;
  prompt: string;
  brandCustomization: BrandCustomizationDraft;
  
  // Media assets
  selectedMediaAssets: SerializedMediaAsset[];
  mediaAssetPlacements: SerializedPlacement[];
  sketchElements: SerializedSketchElement[];
  regions: SerializedRegion[];
  
  // Canvas mode
  useCanvasMode: boolean;
  canvasDescription: string;
  canvasPromptDescription: string;
  selectedTemplateId?: string;
  
  // Coach context
  coachMood: string | null;
  coachCustomMood: string;
  coachGame: string;
  coachDescription: string;
  
  // Metadata
  lastUpdated: number;
  version: number;
}

/** Store state and actions */
export interface CreateDraftState extends CreateDraft {
  // Actions
  updateDraft: (updates: Partial<CreateDraft>) => void;
  setFormField: <K extends keyof CreateDraft>(key: K, value: CreateDraft[K]) => void;
  setMediaAssets: (assets: SerializedMediaAsset[]) => void;
  setPlacements: (placements: SerializedPlacement[]) => void;
  setSketchElements: (elements: SerializedSketchElement[]) => void;
  setRegions: (regions: SerializedRegion[]) => void;
  clearDraft: () => void;
  hasDraft: () => boolean;
  getDraftAge: () => number;
  isExpired: () => boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const CREATE_DRAFT_STORAGE_KEY = 'aurastream-create-draft';
const SCHEMA_VERSION = 1;
const DRAFT_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Default draft state */
const DEFAULT_DRAFT: CreateDraft = {
  platform: 'general',
  selectedAssetType: 'thumbnail',
  selectedBrandKitId: '',
  prompt: '',
  brandCustomization: {
    include_logo: false,
    logo_type: 'primary',
    logo_position: 'bottom-right',
    logo_size: 'medium',
    brand_intensity: 'balanced',
  },
  selectedMediaAssets: [],
  mediaAssetPlacements: [],
  sketchElements: [],
  regions: [],
  useCanvasMode: false,
  canvasDescription: '',
  canvasPromptDescription: '',
  selectedTemplateId: undefined,
  coachMood: null,
  coachCustomMood: '',
  coachGame: '',
  coachDescription: '',
  lastUpdated: 0,
  version: SCHEMA_VERSION,
};

// ============================================================================
// Store
// ============================================================================

/**
 * Create Draft Store
 * 
 * Persists all Creator Studio state to localStorage for recovery.
 * 
 * @example
 * ```tsx
 * import { useCreateDraftStore } from '@aurastream/shared';
 * 
 * function CreatePage() {
 *   const { prompt, setFormField, hasDraft, clearDraft } = useCreateDraftStore();
 *   
 *   // Auto-restore on mount
 *   useEffect(() => {
 *     if (hasDraft() && !isExpired()) {
 *       // Draft restored automatically by Zustand persist
 *     }
 *   }, []);
 *   
 *   // Update draft on change
 *   const handlePromptChange = (value: string) => {
 *     setFormField('prompt', value);
 *   };
 *   
 *   // Clear on successful generation
 *   const handleGenerateSuccess = () => {
 *     clearDraft();
 *   };
 * }
 * ```
 */
export const useCreateDraftStore = create<CreateDraftState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_DRAFT,

      updateDraft: (updates) => {
        set((state) => ({
          ...state,
          ...updates,
          lastUpdated: Date.now(),
        }));
      },

      setFormField: (key, value) => {
        set((state) => ({
          ...state,
          [key]: value,
          lastUpdated: Date.now(),
        }));
      },

      setMediaAssets: (assets) => {
        set((state) => ({
          ...state,
          selectedMediaAssets: assets,
          lastUpdated: Date.now(),
        }));
      },

      setPlacements: (placements) => {
        set((state) => ({
          ...state,
          mediaAssetPlacements: placements,
          lastUpdated: Date.now(),
        }));
      },

      setSketchElements: (elements) => {
        set((state) => ({
          ...state,
          sketchElements: elements,
          lastUpdated: Date.now(),
        }));
      },

      setRegions: (regions) => {
        set((state) => ({
          ...state,
          regions: regions,
          lastUpdated: Date.now(),
        }));
      },

      clearDraft: () => {
        set({
          ...DEFAULT_DRAFT,
          lastUpdated: 0,
        });
      },

      hasDraft: () => {
        const state = get();
        // Check if any meaningful content exists
        return (
          state.lastUpdated > 0 &&
          (state.prompt.trim().length > 0 ||
           state.selectedMediaAssets.length > 0 ||
           state.mediaAssetPlacements.length > 0 ||
           state.sketchElements.length > 0 ||
           state.regions.length > 0 ||
           state.coachDescription.trim().length > 0)
        );
      },

      getDraftAge: () => {
        const state = get();
        if (state.lastUpdated === 0) return Infinity;
        return Date.now() - state.lastUpdated;
      },

      isExpired: () => {
        const state = get();
        if (state.lastUpdated === 0) return true;
        return Date.now() - state.lastUpdated > DRAFT_EXPIRATION_MS;
      },
    }),
    {
      name: CREATE_DRAFT_STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): CreateDraft => ({
        platform: state.platform,
        selectedAssetType: state.selectedAssetType,
        selectedBrandKitId: state.selectedBrandKitId,
        prompt: state.prompt,
        brandCustomization: state.brandCustomization,
        selectedMediaAssets: state.selectedMediaAssets,
        mediaAssetPlacements: state.mediaAssetPlacements,
        sketchElements: state.sketchElements,
        regions: state.regions,
        useCanvasMode: state.useCanvasMode,
        canvasDescription: state.canvasDescription,
        canvasPromptDescription: state.canvasPromptDescription,
        selectedTemplateId: state.selectedTemplateId,
        coachMood: state.coachMood,
        coachCustomMood: state.coachCustomMood,
        coachGame: state.coachGame,
        coachDescription: state.coachDescription,
        lastUpdated: state.lastUpdated,
        version: state.version,
      }),
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0 || !persistedState) {
          return DEFAULT_DRAFT;
        }
        // Future migrations here
        return persistedState as CreateDraft;
      },
    }
  )
);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get current draft state (non-reactive)
 */
export function getCreateDraftState(): CreateDraftState {
  return useCreateDraftStore.getState();
}

/**
 * Clear draft and reset to defaults
 */
export function clearCreateDraft(): void {
  useCreateDraftStore.getState().clearDraft();
}

/**
 * Check if a valid draft exists
 */
export function hasValidDraft(): boolean {
  const state = useCreateDraftStore.getState();
  return state.hasDraft() && !state.isExpired();
}

/**
 * Wait for hydration from localStorage
 */
export function waitForDraftHydration(): Promise<void> {
  return new Promise((resolve) => {
    if (useCreateDraftStore.persist.hasHydrated()) {
      resolve();
      return;
    }
    const unsubscribe = useCreateDraftStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}
