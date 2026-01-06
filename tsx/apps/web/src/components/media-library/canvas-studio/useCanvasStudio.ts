/**
 * Canvas Studio Hook
 * 
 * Manages all state and business logic for the Canvas Studio modal.
 * Single source of truth: sketchElements store.
 */

'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { MediaAsset } from '@aurastream/api-client';
import { useSketchStore, resetSketchStore } from '../sketch/useSketchStore';
import { getCanvasDimensions, createDefaultPlacement } from '../placement/constants';
import { placementsToImageElements, imageElementsToPlacements } from './utils';
import type { AssetPlacement } from '../placement/types';
import type { AnySketchElement, ImageElement } from '../canvas-export/types';
import type { EditorMode, CanvasDimensions, CanvasProjectState } from './types';
import type { CanvasRendererHandle } from '../canvas-export';
import type { StudioMode } from './modes/types';
import type { CanvasTemplate, CanvasType } from './templates/data';
import { applyTemplate, autoAssignAssets } from './templates/TemplateEngine';
import {
  applyLayoutPreset,
  autoArrange,
  centerElement,
  alignElements,
  type LayoutPreset,
  type AlignmentOption,
} from './magic';

interface UseCanvasStudioProps {
  isOpen: boolean;
  assetType: string;
  initialAssets: MediaAsset[];
  initialPlacements?: AssetPlacement[];
  initialSketchElements?: AnySketchElement[];
  projectId?: string;  // ENTERPRISE FIX: Add projectId to detect switches
  onSave: (state: CanvasProjectState) => void;
  onClose: () => void;
  onExport?: (dataUrl: string, blob: Blob) => void;
  canvasRendererRef: React.RefObject<CanvasRendererHandle | null>;
}

export function useCanvasStudio({
  isOpen,
  assetType,
  initialAssets,
  initialPlacements,
  initialSketchElements,
  projectId,  // ENTERPRISE FIX: Track project ID for proper reset
  onSave,
  onClose,
  onExport,
  canvasRendererRef,
}: UseCanvasStudioProps) {
  // Dimensions
  const dimensions: CanvasDimensions = useMemo(
    () => getCanvasDimensions(assetType),
    [assetType]
  );

  // Local state
  const [mode, setMode] = useState<EditorMode>('assets');
  const [studioMode] = useState<StudioMode>('pro'); // Always pro mode
  const [activeTemplate, setActiveTemplate] = useState<CanvasTemplate | null>(null);
  // Only show wizard for NEW projects (no existing data)
  const hasExistingData = (initialPlacements && initialPlacements.length > 0) || 
                          (initialSketchElements && initialSketchElements.length > 0);
  const [showWizard, setShowWizard] = useState(false); // Disabled for now - templates need work
  const [assets, setAssets] = useState<MediaAsset[]>(initialAssets);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [assetFilterType, setAssetFilterType] = useState<string | undefined>();
  
  // Track initialization - now tracks WHAT data we initialized with
  const initializedDataRef = useRef<string | null>(null);
  
  // ENTERPRISE FIX: Track project ID to detect switches
  const prevProjectIdRef = useRef<string | undefined>(undefined);
  
  // Track if we're waiting for data to load
  // ENTERPRISE FIX: Start as false, only true after store is populated
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Force re-render counter to ensure SketchCanvas picks up store changes
  const [, forceUpdate] = useState(0);
  
  // ENTERPRISE FIX: Reset refs when project ID changes
  // This ensures clean slate when switching between projects
  useEffect(() => {
    if (projectId !== prevProjectIdRef.current && prevProjectIdRef.current !== undefined) {
      console.log('[useCanvasStudio] Project ID changed, resetting initialization refs:', {
        from: prevProjectIdRef.current,
        to: projectId,
      });
      // Reset all initialization tracking
      hasInitializedSyncRef.current = false;
      initializedDataRef.current = null;
      setIsInitialized(false);
      // Reset the store to ensure clean slate
      resetSketchStore();
    }
    prevProjectIdRef.current = projectId;
  }, [projectId]);
  
  // ENTERPRISE FIX: Synchronously initialize store on first render if we have data
  // This prevents the race condition where canvas renders before store is populated
  const hasInitializedSyncRef = useRef(false);
  if (isOpen && !hasInitializedSyncRef.current) {
    const hasData = (initialSketchElements && initialSketchElements.length > 0) ||
                    (initialPlacements && initialPlacements.length > 0) ||
                    (initialAssets.length > 0);
    
    console.log('[useCanvasStudio] Sync init check:', {
      isOpen,
      hasInitializedSync: hasInitializedSyncRef.current,
      hasData,
      sketchCount: initialSketchElements?.length || 0,
      placementCount: initialPlacements?.length || 0,
      assetCount: initialAssets.length,
    });
    
    if (hasData) {
      console.log('[useCanvasStudio] Synchronous initialization with data');
      
      const initialElements = initialSketchElements ? [...initialSketchElements] : [];
      const savedImageElements = initialElements.filter(el => el.type === 'image');
      const nonImageElements = initialElements.filter(el => el.type !== 'image');

      let imageElements: AnySketchElement[];
      
      if (savedImageElements.length > 0) {
        imageElements = savedImageElements;
      } else if (initialPlacements && initialPlacements.length > 0) {
        imageElements = placementsToImageElements(initialPlacements);
      } else if (initialAssets.length > 0) {
        const defaultPlacements = initialAssets.map((asset, index) =>
          createDefaultPlacement(asset, index, dimensions)
        );
        imageElements = placementsToImageElements(defaultPlacements);
      } else {
        imageElements = [];
      }

      const allElements = [...imageElements, ...nonImageElements];
      useSketchStore.setState({ elements: allElements });
      hasInitializedSyncRef.current = true;
      
      // Create fingerprint for tracking
      const dataFingerprint = JSON.stringify({
        sketchCount: initialSketchElements?.length || 0,
        placementCount: initialPlacements?.length || 0,
        assetCount: initialAssets.length,
        firstSketchId: initialSketchElements?.[0]?.id || null,
        firstPlacementId: initialPlacements?.[0]?.assetId || null,
        firstAssetId: initialAssets[0]?.id || null,
        sketchTypes: initialSketchElements?.map(el => el.type).join(',') || '',
      });
      initializedDataRef.current = dataFingerprint;
      
      // ENTERPRISE FIX: Schedule a force update to ensure SketchCanvas re-renders
      // This is needed because the store update during render might not trigger re-render
      setTimeout(() => forceUpdate(n => n + 1), 0);
    }
  }
  
  // Reset sync flag when modal closes
  if (!isOpen && hasInitializedSyncRef.current) {
    hasInitializedSyncRef.current = false;
  }

  // Sketch state from store - SINGLE SOURCE OF TRUTH
  const { elements: sketchElements } = useSketchStore();

  // DERIVED: Compute placements from sketchElements
  const placements = useMemo(
    () => imageElementsToPlacements(sketchElements, assets),
    [sketchElements, assets]
  );

  const selectedPlacement = useMemo(
    () => placements.find(p => p.assetId === selectedPlacementId) || null,
    [placements, selectedPlacementId]
  );

  // Sync assets when initialAssets changes (only on meaningful changes)
  // ENTERPRISE FIX: Use a ref to track if we've already initialized to prevent
  // resetting user's work when initialAssets gets a new reference
  const hasInitializedAssetsRef = useRef(false);
  useEffect(() => {
    // Only sync on first open or when initialAssets actually has content
    // Don't reset if user has already added/modified assets
    if (!hasInitializedAssetsRef.current && initialAssets.length > 0) {
      setAssets(initialAssets);
      hasInitializedAssetsRef.current = true;
    }
  }, [initialAssets]);
  
  // Reset the ref when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasInitializedAssetsRef.current = false;
    }
  }, [isOpen]);

  // Initialize sketch elements when modal opens or data changes
  // ENTERPRISE FIX: This effect handles data arriving AFTER initial render (API fetch)
  // The synchronous initialization above handles data available at first render
  useEffect(() => {
    if (!isOpen) {
      initializedDataRef.current = null;
      hasInitializedSyncRef.current = false;
      setIsInitialized(false);
      return;
    }

    // Create a fingerprint of the initial data to detect changes
    const dataFingerprint = JSON.stringify({
      sketchCount: initialSketchElements?.length || 0,
      placementCount: initialPlacements?.length || 0,
      assetCount: initialAssets.length,
      firstSketchId: initialSketchElements?.[0]?.id || null,
      firstPlacementId: initialPlacements?.[0]?.assetId || null,
      firstAssetId: initialAssets[0]?.id || null,
      sketchTypes: initialSketchElements?.map(el => el.type).join(',') || '',
    });

    // Skip if we already initialized with this exact data (either sync or async)
    if (initializedDataRef.current === dataFingerprint) {
      // Already initialized, just ensure isInitialized is true
      if (!isInitialized) setIsInitialized(true);
      return;
    }
    
    console.log('[useCanvasStudio] Effect initialization with fingerprint:', dataFingerprint);
    initializedDataRef.current = dataFingerprint;

    const initialElements = initialSketchElements ? [...initialSketchElements] : [];
    const savedImageElements = initialElements.filter(el => el.type === 'image');
    const nonImageElements = initialElements.filter(el => el.type !== 'image');

    let imageElements: AnySketchElement[];
    
    // Priority 1: Use saved image elements from sketch (preserves exact positions)
    if (savedImageElements.length > 0) {
      console.log('[useCanvasStudio] Using saved image elements:', savedImageElements.length);
      imageElements = savedImageElements;
    } 
    // Priority 2: Use initial placements (converted to image elements)
    else if (initialPlacements && initialPlacements.length > 0) {
      console.log('[useCanvasStudio] Using initial placements:', initialPlacements.length);
      imageElements = placementsToImageElements(initialPlacements);
    } 
    // Priority 3: Create default placements from assets
    else if (initialAssets.length > 0) {
      console.log('[useCanvasStudio] Creating default placements from assets:', initialAssets.length);
      const defaultPlacements = initialAssets.map((asset, index) =>
        createDefaultPlacement(asset, index, dimensions)
      );
      imageElements = placementsToImageElements(defaultPlacements);
    }
    // Priority 4: Empty canvas
    else {
      console.log('[useCanvasStudio] Starting with empty canvas');
      imageElements = [];
    }

    // Combine image elements with non-image elements (text, drawings, etc.)
    const allElements = [...imageElements, ...nonImageElements];
    console.log('[useCanvasStudio] Setting elements:', {
      imageCount: imageElements.length,
      nonImageCount: nonImageElements.length,
      total: allElements.length,
    });
    
    useSketchStore.setState({ elements: allElements });
    hasInitializedSyncRef.current = true;
    setIsInitialized(true);

    // Select first image element if available
    if (imageElements.length > 0) {
      const firstImage = imageElements[0] as ImageElement;
      setSelectedPlacementId(firstImage.assetId || null);
    }
  }, [isOpen, initialSketchElements, initialPlacements, initialAssets, dimensions, isInitialized]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      resetSketchStore();
    }
  }, [isOpen]);

  // Keyboard shortcuts for asset management
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Delete/Backspace to remove selected asset
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPlacementId) {
        e.preventDefault();
        // Remove the asset from the canvas
        setAssets(prev => prev.filter(a => a.id !== selectedPlacementId));
        
        const remainingElements = useSketchStore.getState().elements.filter(el => {
          if (el.type !== 'image') return true;
          return (el as ImageElement).assetId !== selectedPlacementId;
        });

        let zIndex = 1;
        const reindexedElements = remainingElements.map(el => {
          if (el.type !== 'image') return el;
          return { ...el, zIndex: zIndex++ };
        });

        useSketchStore.setState({ elements: reindexedElements });

        // Select next available asset
        const remainingImages = reindexedElements.filter(el => el.type === 'image') as ImageElement[];
        setSelectedPlacementId(remainingImages.length > 0 ? remainingImages[0].assetId || null : null);
      }

      // Escape to deselect
      if (e.key === 'Escape' && selectedPlacementId) {
        setSelectedPlacementId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedPlacementId]);

  // Sync assets changes to sketch store
  useEffect(() => {
    if (!isOpen) return;

    const currentAssetIds = new Set(placements.map(p => p.assetId));
    const newAssetIds = new Set(assets.map(a => a.id));

    const assetsToAdd = assets.filter(a => !currentAssetIds.has(a.id));
    const imageElementsToKeep = sketchElements.filter(el =>
      el.type !== 'image' || (el.type === 'image' && newAssetIds.has((el as ImageElement).assetId || ''))
    );

    if (assetsToAdd.length > 0 || imageElementsToKeep.length !== sketchElements.length) {
      const newImageElements = placementsToImageElements(
        assetsToAdd.map((asset, index) =>
          createDefaultPlacement(asset, placements.length + index, dimensions)
        )
      );

      useSketchStore.setState({ elements: [...imageElementsToKeep, ...newImageElements] });

      if (selectedPlacementId && !newAssetIds.has(selectedPlacementId)) {
        const remainingPlacements = imageElementsToPlacements(imageElementsToKeep, assets);
        setSelectedPlacementId(remainingPlacements.length > 0 ? remainingPlacements[0].assetId : null);
      }
    }
  }, [assets, isOpen, dimensions, placements, selectedPlacementId, sketchElements]);

  // Handlers
  const handlePlacementsChange = useCallback((newPlacements: AssetPlacement[]) => {
    const newImageElements = placementsToImageElements(newPlacements);
    const nonImageElements = sketchElements.filter(el => el.type !== 'image');
    useSketchStore.setState({ elements: [...newImageElements, ...nonImageElements] });
  }, [sketchElements]);

  const handleUpdatePlacement = useCallback((updates: Partial<AssetPlacement>) => {
    if (!selectedPlacementId) return;

    useSketchStore.setState({
      elements: sketchElements.map(el => {
        if (el.type !== 'image') return el;
        const imgEl = el as ImageElement;
        if (imgEl.assetId !== selectedPlacementId) return el;

        return {
          ...imgEl,
          x: updates.position?.x ?? imgEl.x,
          y: updates.position?.y ?? imgEl.y,
          width: updates.size?.width ?? imgEl.width,
          height: updates.size?.height ?? imgEl.height,
          rotation: updates.rotation ?? imgEl.rotation,
          opacity: updates.opacity ?? imgEl.opacity,
          zIndex: updates.zIndex ?? imgEl.zIndex,
          maintainAspectRatio: updates.size?.maintainAspectRatio ?? imgEl.maintainAspectRatio,
        };
      }),
    });
  }, [selectedPlacementId, sketchElements]);

  const handleBringForward = useCallback(() => {
    if (!selectedPlacement) return;
    const currentZ = selectedPlacement.zIndex;
    if (currentZ >= placements.length) return;

    useSketchStore.setState({
      elements: sketchElements.map(el => {
        if (el.type !== 'image') return el;
        const imgEl = el as ImageElement;
        if (imgEl.assetId === selectedPlacementId) return { ...imgEl, zIndex: currentZ + 1 };
        if (imgEl.zIndex === currentZ + 1) return { ...imgEl, zIndex: currentZ };
        return el;
      }),
    });
  }, [selectedPlacement, selectedPlacementId, placements.length, sketchElements]);

  const handleSendBackward = useCallback(() => {
    if (!selectedPlacement) return;
    const currentZ = selectedPlacement.zIndex;
    if (currentZ <= 1) return;

    useSketchStore.setState({
      elements: sketchElements.map(el => {
        if (el.type !== 'image') return el;
        const imgEl = el as ImageElement;
        if (imgEl.assetId === selectedPlacementId) return { ...imgEl, zIndex: currentZ - 1 };
        if (imgEl.zIndex === currentZ - 1) return { ...imgEl, zIndex: currentZ };
        return el;
      }),
    });
  }, [selectedPlacement, selectedPlacementId, sketchElements]);

  const handleBringToFront = useCallback(() => {
    if (!selectedPlacement) return;
    const maxZ = placements.length;
    if (selectedPlacement.zIndex >= maxZ) return;

    useSketchStore.setState({
      elements: sketchElements.map(el => {
        if (el.type !== 'image') return el;
        const imgEl = el as ImageElement;
        if (imgEl.assetId === selectedPlacementId) return { ...imgEl, zIndex: maxZ };
        if (imgEl.zIndex > selectedPlacement.zIndex) return { ...imgEl, zIndex: imgEl.zIndex - 1 };
        return el;
      }),
    });
  }, [selectedPlacement, selectedPlacementId, placements.length, sketchElements]);

  const handleSendToBack = useCallback(() => {
    if (!selectedPlacement) return;
    if (selectedPlacement.zIndex <= 1) return;

    useSketchStore.setState({
      elements: sketchElements.map(el => {
        if (el.type !== 'image') return el;
        const imgEl = el as ImageElement;
        if (imgEl.assetId === selectedPlacementId) return { ...imgEl, zIndex: 1 };
        if (imgEl.zIndex < selectedPlacement.zIndex) return { ...imgEl, zIndex: imgEl.zIndex + 1 };
        return el;
      }),
    });
  }, [selectedPlacement, selectedPlacementId, sketchElements]);

  const handleRemovePlacement = useCallback(() => {
    if (!selectedPlacementId) return;

    const remainingElements = sketchElements.filter(el => {
      if (el.type !== 'image') return true;
      return (el as ImageElement).assetId !== selectedPlacementId;
    });

    let zIndex = 1;
    const reindexedElements = remainingElements.map(el => {
      if (el.type !== 'image') return el;
      return { ...el, zIndex: zIndex++ };
    });

    useSketchStore.setState({ elements: reindexedElements });

    const remainingPlacements = imageElementsToPlacements(reindexedElements, assets);
    setSelectedPlacementId(remainingPlacements.length > 0 ? remainingPlacements[0].assetId : null);
  }, [selectedPlacementId, sketchElements, assets]);

  const handleAddAsset = useCallback((asset: MediaAsset) => {
    if (assets.find(a => a.id === asset.id)) return;

    const newAssets = [...assets, asset];
    setAssets(newAssets);

    const newPlacement = createDefaultPlacement(asset, placements.length, dimensions);
    const newImageElement = placementsToImageElements([newPlacement])[0];

    useSketchStore.setState({
      elements: [...sketchElements, newImageElement],
    });

    setSelectedPlacementId(asset.id);
  }, [assets, placements.length, dimensions, sketchElements]);

  const handleRemoveAsset = useCallback((assetId: string) => {
    setAssets(prev => prev.filter(a => a.id !== assetId));

    const remainingElements = sketchElements.filter(el => {
      if (el.type !== 'image') return true;
      return (el as ImageElement).assetId !== assetId;
    });

    let zIndex = 1;
    const reindexedElements = remainingElements.map(el => {
      if (el.type !== 'image') return el;
      return { ...el, zIndex: zIndex++ };
    });

    useSketchStore.setState({ elements: reindexedElements });

    if (selectedPlacementId === assetId) {
      const remainingPlacements = imageElementsToPlacements(reindexedElements, assets.filter(a => a.id !== assetId));
      setSelectedPlacementId(remainingPlacements.length > 0 ? remainingPlacements[0].assetId : null);
    }
  }, [sketchElements, selectedPlacementId, assets]);

  // Handle asset updates (e.g., after background removal)
  const handleAssetUpdated = useCallback((updatedAsset: MediaAsset) => {
    setAssets(prev => prev.map(a => a.id === updatedAsset.id ? updatedAsset : a));
  }, []);

  const handleSave = useCallback(async () => {
    // Generate thumbnail from canvas
    let thumbnailUrl: string | undefined;
    if (canvasRendererRef.current) {
      try {
        const result = await canvasRendererRef.current.export();
        // Create a smaller thumbnail (max 400px wide)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const maxWidth = 400;
          const scale = Math.min(1, maxWidth / result.width);
          canvas.width = result.width * scale;
          canvas.height = result.height * scale;
          
          const img = new Image();
          img.src = result.dataUrl;
          await new Promise<void>((resolve) => {
            img.onload = () => {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
              resolve();
            };
            img.onerror = () => resolve();
          });
        }
      } catch (err) {
        console.warn('Failed to generate thumbnail:', err);
      }
    }
    
    onSave({
      placements,
      sketchElements,
      assets,
      thumbnailUrl,
    });
    onClose();
  }, [placements, sketchElements, assets, onSave, onClose, canvasRendererRef]);

  const handleCancel = useCallback(() => {
    setAssets(initialAssets);
    resetSketchStore();
    onClose();
  }, [initialAssets, onClose]);

  const handleExport = useCallback(async () => {
    if (!canvasRendererRef.current || !onExport) return;

    try {
      const result = await canvasRendererRef.current.export();
      onExport(result.dataUrl, result.blob);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [canvasRendererRef, onExport]);

  // Template application handler
  const handleApplyTemplate = useCallback((template: CanvasTemplate | null) => {
    setActiveTemplate(template);
    setShowWizard(false);
    
    if (!template) {
      // Start blank - just use default placements for existing assets
      const defaultPlacements = assets.map((asset, index) =>
        createDefaultPlacement(asset, index, dimensions)
      );
      const imageElements = placementsToImageElements(defaultPlacements);
      useSketchStore.setState({ elements: imageElements });
      return;
    }
    
    // Auto-assign assets to template slots
    const assignments = autoAssignAssets(template, assets);
    const applied = applyTemplate(template, assignments);
    
    // Update sketch store with template-positioned elements
    useSketchStore.setState({ elements: applied.sketchElements });
    
    // Select first placement if any
    if (applied.placements.length > 0) {
      setSelectedPlacementId(applied.placements[0].assetId);
    }
  }, [assets, dimensions]);

  // Handle wizard completion
  const handleWizardComplete = useCallback((result: {
    canvasType: CanvasType;
    template: CanvasTemplate | null;
  }) => {
    handleApplyTemplate(result.template);
  }, [handleApplyTemplate]);

  // Handle suggestion actions from SuggestionsPanel
  const handleSuggestionAction = useCallback((action: { type: string; payload: Record<string, unknown> }) => {
    switch (action.type) {
      case 'AUTO_ARRANGE': {
        const preset = (action.payload.preset as LayoutPreset) || 'grid';
        const newPlacements = applyLayoutPreset(placements, preset, dimensions);
        handlePlacementsChange(newPlacements);
        break;
      }
      case 'APPLY_LAYOUT': {
        const preset = action.payload.preset as LayoutPreset;
        if (preset) {
          const newPlacements = applyLayoutPreset(placements, preset, dimensions);
          handlePlacementsChange(newPlacements);
        }
        break;
      }
      case 'CENTER_ELEMENT': {
        const assetId = action.payload.assetId as string;
        const placement = placements.find(p => p.assetId === assetId);
        if (placement) {
          const centered = centerElement(placement, dimensions);
          const newPlacements = placements.map(p =>
            p.assetId === assetId ? centered : p
          );
          handlePlacementsChange(newPlacements);
        }
        break;
      }
      case 'ALIGN_ELEMENTS': {
        const alignment = action.payload.alignment as AlignmentOption;
        if (alignment) {
          const newPlacements = alignElements(placements, alignment, dimensions);
          handlePlacementsChange(newPlacements);
        }
        break;
      }
      case 'ADD_PADDING': {
        // Auto-arrange with padding
        const newPlacements = autoArrange(placements, dimensions, { padding: 10 });
        handlePlacementsChange(newPlacements);
        break;
      }
      case 'OPEN_ASSET_PICKER': {
        setIsAssetPickerOpen(true);
        break;
      }
      default:
        console.warn('Unknown suggestion action:', action.type);
    }
  }, [placements, dimensions, handlePlacementsChange]);

  return {
    // State
    mode,
    studioMode,
    activeTemplate,
    showWizard,
    assets,
    placements,
    selectedPlacementId,
    selectedPlacement,
    sketchElements,
    dimensions,
    isAssetPickerOpen,
    assetFilterType,
    isInitialized,  // ENTERPRISE FIX: Expose initialization state
    
    // Setters
    setMode,
    setShowWizard,
    setSelectedPlacementId,
    setIsAssetPickerOpen,
    setAssetFilterType,
    
    // Handlers
    handlePlacementsChange,
    handleUpdatePlacement,
    handleBringForward,
    handleSendBackward,
    handleBringToFront,
    handleSendToBack,
    handleRemovePlacement,
    handleAddAsset,
    handleRemoveAsset,
    handleAssetUpdated,
    handleSave,
    handleCancel,
    handleExport,
    handleApplyTemplate,
    handleWizardComplete,
    handleSuggestionAction,
  };
}
