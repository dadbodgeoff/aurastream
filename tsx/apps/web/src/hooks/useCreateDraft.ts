/**
 * useCreateDraft Hook
 * 
 * Integrates the createDraftStore with CreatePageContent.
 * Handles bidirectional sync between React state and persisted storage.
 * 
 * @module hooks/useCreateDraft
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { 
  useCreateDraftStore, 
  type SerializedMediaAsset,
  type SerializedPlacement,
  type SerializedRegion,
  type SerializedSketchElement,
  type BrandCustomizationDraft,
} from '@aurastream/shared';
import type { MediaAsset } from '@aurastream/api-client';
import type { AssetPlacement } from '../components/media-library/placement';
import type { AnySketchElement } from '../components/media-library/canvas-export/types';
import type { LabeledRegion } from '../components/media-library/sketch/RegionLabel';

// ============================================================================
// Serialization Helpers
// ============================================================================

/**
 * Serialize MediaAsset for storage
 */
function serializeMediaAsset(asset: MediaAsset): SerializedMediaAsset {
  return {
    id: asset.id,
    url: asset.url,
    thumbnailUrl: asset.thumbnailUrl ?? undefined,
    displayName: asset.displayName,
    assetType: asset.assetType,
  };
}

/**
 * Deserialize MediaAsset from storage (partial - only fields we need)
 */
function deserializeMediaAsset(serialized: SerializedMediaAsset): MediaAsset {
  return {
    id: serialized.id,
    url: serialized.url,
    thumbnailUrl: serialized.thumbnailUrl ?? null,
    displayName: serialized.displayName,
    assetType: serialized.assetType as MediaAsset['assetType'],
    // Default values for non-persisted fields
    userId: '',
    fileSize: 0,
    mimeType: 'image/png',
    width: 0,
    height: 0,
    usageCount: 0,
    storagePath: '',
    tags: [],
    isFavorite: false,
    isPrimary: false,
    hasBackgroundRemoved: false,
    metadata: {},
    description: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Serialize AssetPlacement for storage
 */
function serializePlacement(placement: AssetPlacement): SerializedPlacement {
  return {
    assetId: placement.assetId,
    assetUrl: placement.asset.url,
    assetName: placement.asset.displayName,
    x: placement.position.x,
    y: placement.position.y,
    width: placement.size.width,
    height: placement.size.height,
    rotation: placement.rotation,
    opacity: placement.opacity,
    zIndex: placement.zIndex,
    flipX: false, // Not in current type, default to false
    flipY: false, // Not in current type, default to false
  };
}

/**
 * Deserialize AssetPlacement from storage
 * Note: Requires the full MediaAsset to be available
 */
function deserializePlacement(serialized: SerializedPlacement, assets: MediaAsset[]): AssetPlacement | null {
  const asset = assets.find(a => a.id === serialized.assetId);
  if (!asset) return null;
  
  return {
    assetId: serialized.assetId,
    asset,
    position: {
      x: serialized.x,
      y: serialized.y,
      anchor: 'center',
    },
    size: {
      width: serialized.width,
      height: serialized.height,
      unit: 'percent',
      maintainAspectRatio: true,
    },
    rotation: serialized.rotation,
    opacity: serialized.opacity,
    zIndex: serialized.zIndex,
  };
}

/**
 * Serialize LabeledRegion for storage
 */
function serializeRegion(region: LabeledRegion): SerializedRegion {
  return {
    id: region.id,
    x: region.x,
    y: region.y,
    width: region.width,
    height: region.height,
    label: region.label,
    color: region.color,
  };
}

/**
 * Deserialize LabeledRegion from storage
 */
function deserializeRegion(serialized: SerializedRegion): LabeledRegion {
  return {
    id: serialized.id,
    x: serialized.x,
    y: serialized.y,
    width: serialized.width,
    height: serialized.height,
    label: serialized.label,
    color: serialized.color,
  };
}

// ============================================================================
// Hook Types
// ============================================================================

export interface UseCreateDraftOptions {
  /** Called when draft is restored on mount */
  onDraftRestored?: () => void;
}

export interface UseCreateDraftReturn {
  // Draft state
  hasDraft: boolean;
  isExpired: boolean;
  draftAge: number;
  
  // Restore functions
  restoreDraft: () => {
    platform: string;
    selectedAssetType: string;
    selectedBrandKitId: string;
    prompt: string;
    brandCustomization: BrandCustomizationDraft;
    selectedMediaAssets: MediaAsset[];
    mediaAssetPlacements: AssetPlacement[];
    sketchElements: AnySketchElement[];
    regions: LabeledRegion[];
    useCanvasMode: boolean;
    coachMood: string | null;
    coachCustomMood: string;
    coachGame: string;
    coachDescription: string;
  } | null;
  
  // Save functions
  savePlatform: (platform: string) => void;
  saveAssetType: (assetType: string) => void;
  saveBrandKitId: (brandKitId: string) => void;
  savePrompt: (prompt: string) => void;
  saveBrandCustomization: (customization: BrandCustomizationDraft) => void;
  saveMediaAssets: (assets: MediaAsset[]) => void;
  savePlacements: (placements: AssetPlacement[]) => void;
  saveSketchElements: (elements: AnySketchElement[]) => void;
  saveRegions: (regions: LabeledRegion[]) => void;
  saveCanvasMode: (useCanvasMode: boolean) => void;
  saveCoachContext: (mood: string | null, customMood: string, game: string, description: string) => void;
  
  // Clear draft
  clearDraft: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing Create Studio draft persistence.
 * 
 * @example
 * ```tsx
 * function CreatePage() {
 *   const [prompt, setPrompt] = useState('');
 *   const { hasDraft, restoreDraft, savePrompt, clearDraft } = useCreateDraft();
 *   
 *   // Restore draft on mount
 *   useEffect(() => {
 *     if (hasDraft) {
 *       const draft = restoreDraft();
 *       if (draft) {
 *         setPrompt(draft.prompt);
 *         // ... restore other fields
 *       }
 *     }
 *   }, []);
 *   
 *   // Save on change
 *   const handlePromptChange = (value: string) => {
 *     setPrompt(value);
 *     savePrompt(value);
 *   };
 *   
 *   // Clear on successful generation
 *   const handleGenerateSuccess = () => {
 *     clearDraft();
 *   };
 * }
 * ```
 */
export function useCreateDraft(options: UseCreateDraftOptions = {}): UseCreateDraftReturn {
  const { onDraftRestored } = options;
  const hasRestoredRef = useRef(false);
  
  const store = useCreateDraftStore();
  
  // Check draft status
  const hasDraft = store.hasDraft();
  const isExpired = store.isExpired();
  const draftAge = store.getDraftAge();
  
  // Restore draft data
  const restoreDraft = useCallback(() => {
    if (!hasDraft || isExpired) return null;
    
    // First deserialize media assets
    const mediaAssets = store.selectedMediaAssets.map(deserializeMediaAsset);
    
    // Then deserialize placements using the media assets
    const placements = store.mediaAssetPlacements
      .map(p => deserializePlacement(p, mediaAssets))
      .filter((p): p is AssetPlacement => p !== null);
    
    return {
      platform: store.platform,
      selectedAssetType: store.selectedAssetType,
      selectedBrandKitId: store.selectedBrandKitId,
      prompt: store.prompt,
      brandCustomization: store.brandCustomization,
      selectedMediaAssets: mediaAssets,
      mediaAssetPlacements: placements,
      sketchElements: store.sketchElements as unknown as AnySketchElement[],
      regions: store.regions.map(deserializeRegion),
      useCanvasMode: store.useCanvasMode,
      coachMood: store.coachMood,
      coachCustomMood: store.coachCustomMood,
      coachGame: store.coachGame,
      coachDescription: store.coachDescription,
    };
  }, [hasDraft, isExpired, store]);
  
  // Notify on draft restore (once)
  useEffect(() => {
    if (hasDraft && !isExpired && !hasRestoredRef.current && onDraftRestored) {
      hasRestoredRef.current = true;
      onDraftRestored();
    }
  }, [hasDraft, isExpired, onDraftRestored]);
  
  // Save functions
  const savePlatform = useCallback((platform: string) => {
    store.setFormField('platform', platform);
  }, [store]);
  
  const saveAssetType = useCallback((assetType: string) => {
    store.setFormField('selectedAssetType', assetType);
  }, [store]);
  
  const saveBrandKitId = useCallback((brandKitId: string) => {
    store.setFormField('selectedBrandKitId', brandKitId);
  }, [store]);
  
  const savePrompt = useCallback((prompt: string) => {
    store.setFormField('prompt', prompt);
  }, [store]);
  
  const saveBrandCustomization = useCallback((customization: BrandCustomizationDraft) => {
    store.setFormField('brandCustomization', customization);
  }, [store]);
  
  const saveMediaAssets = useCallback((assets: MediaAsset[]) => {
    store.setMediaAssets(assets.map(serializeMediaAsset));
  }, [store]);
  
  const savePlacements = useCallback((placements: AssetPlacement[]) => {
    store.setPlacements(placements.map(serializePlacement));
  }, [store]);
  
  const saveSketchElements = useCallback((elements: AnySketchElement[]) => {
    store.setSketchElements(elements as unknown as SerializedSketchElement[]);
  }, [store]);
  
  const saveRegions = useCallback((regions: LabeledRegion[]) => {
    store.setRegions(regions.map(serializeRegion));
  }, [store]);
  
  const saveCanvasMode = useCallback((useCanvasMode: boolean) => {
    store.setFormField('useCanvasMode', useCanvasMode);
  }, [store]);
  
  const saveCoachContext = useCallback((
    mood: string | null, 
    customMood: string, 
    game: string, 
    description: string
  ) => {
    store.updateDraft({
      coachMood: mood,
      coachCustomMood: customMood,
      coachGame: game,
      coachDescription: description,
    });
  }, [store]);
  
  const clearDraft = useCallback(() => {
    store.clearDraft();
    hasRestoredRef.current = false;
  }, [store]);
  
  return {
    hasDraft,
    isExpired,
    draftAge,
    restoreDraft,
    savePlatform,
    saveAssetType,
    saveBrandKitId,
    savePrompt,
    saveBrandCustomization,
    saveMediaAssets,
    savePlacements,
    saveSketchElements,
    saveRegions,
    saveCanvasMode,
    saveCoachContext,
    clearDraft,
  };
}

export default useCreateDraft;
