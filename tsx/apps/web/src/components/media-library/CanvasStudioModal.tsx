/**
 * CanvasStudioModal Component
 * 
 * Full-featured canvas editor combining asset placement and sketch tools.
 * Enables users to compose assets and add annotations in one interface.
 */

'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useMediaLibrary, type MediaAsset, type MediaAssetType } from '@aurastream/api-client';
import { PlacementCanvas } from './placement/PlacementCanvas';
import { PlacementControls } from './placement/PlacementControls';
import { SketchCanvas } from './sketch/SketchCanvas';
import { SketchToolbar } from './sketch/SketchToolbar';
import { SketchToolPanel } from './sketch/SketchToolPanel';
import { useSketchStore, resetSketchStore } from './sketch/useSketchStore';
import { CanvasRenderer, type CanvasRendererHandle } from './canvas-export';
import { getCanvasDimensions, createDefaultPlacement } from './placement/constants';
import { ASSET_TYPE_ICONS, ASSET_TYPE_COLORS } from './constants';
import type { AssetPlacement } from './placement/types';
import type { AnySketchElement, ImageElement } from './canvas-export/types';

// ============================================================================
// Icons
// ============================================================================

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function LayoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function SmallXIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

// ============================================================================
// Types
// ============================================================================

type EditorMode = 'placement' | 'sketch';

interface CanvasStudioModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Asset type being created */
  assetType: string;
  /** Media assets to place */
  assets: MediaAsset[];
  /** Initial placements (if editing) */
  initialPlacements?: AssetPlacement[];
  /** Initial sketch elements */
  initialSketchElements?: AnySketchElement[];
  /** Save handler - receives placements and sketch elements */
  onSave: (placements: AssetPlacement[], sketchElements: AnySketchElement[]) => void;
  /** Optional: Export handler for canvas snapshot */
  onExport?: (dataUrl: string, blob: Blob) => void;
}

/**
 * Convert asset placements to ImageElement sketch elements
 * This allows assets to be manipulated directly on the sketch canvas
 */
function placementsToImageElements(placements: AssetPlacement[]): ImageElement[] {
  return placements.map((placement) => ({
    id: `image-${placement.assetId}`,
    type: 'image' as const,
    x: placement.position.x,
    y: placement.position.y,
    width: placement.size.width,
    height: placement.size.height,
    src: placement.asset.url,
    thumbnailSrc: placement.asset.thumbnailUrl || undefined,
    assetId: placement.assetId,
    displayName: placement.asset.displayName,
    rotation: placement.rotation,
    maintainAspectRatio: placement.size.maintainAspectRatio,
    zIndex: placement.zIndex,
    opacity: placement.opacity,
    color: 'transparent',
    strokeWidth: 0,
  }));
}

/**
 * Extract image elements from sketch elements and convert back to placements
 */
function imageElementsToPlacements(
  elements: AnySketchElement[],
  assets: MediaAsset[]
): AssetPlacement[] {
  const imageElements = elements.filter((el): el is ImageElement => el.type === 'image');
  
  const results: AssetPlacement[] = [];
  
  for (const el of imageElements) {
    const asset = assets.find(a => a.id === el.assetId);
    if (!asset) continue;
    
    results.push({
      assetId: el.assetId || asset.id,
      asset,
      position: {
        x: el.x,
        y: el.y,
        anchor: 'center',
      },
      size: {
        width: el.width,
        height: el.height,
        unit: 'percent',
        maintainAspectRatio: el.maintainAspectRatio,
      },
      rotation: el.rotation,
      opacity: el.opacity,
      zIndex: el.zIndex,
    });
  }
  
  return results;
}

// ============================================================================
// Component
// ============================================================================

export function CanvasStudioModal({
  isOpen,
  onClose,
  assetType,
  assets: initialAssets,
  initialPlacements,
  initialSketchElements,
  onSave,
  onExport,
}: CanvasStudioModalProps) {
  const dimensions = useMemo(() => getCanvasDimensions(assetType), [assetType]);
  const canvasRendererRef = useRef<CanvasRendererHandle>(null);
  
  // Internal assets state (can be modified within the studio)
  const [assets, setAssets] = useState<MediaAsset[]>(initialAssets);
  
  // Asset picker state
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [assetFilterType, setAssetFilterType] = useState<MediaAssetType | undefined>();
  
  // Fetch library for asset picker
  const { data: library, isLoading: libraryLoading } = useMediaLibrary({
    assetType: assetFilterType,
    limit: 50,
    sortBy: 'usage_count',
    sortOrder: 'desc',
  });
  
  // Available asset types for filter
  const availableAssetTypes: MediaAssetType[] = [
    'face', 'logo', 'character', 'background', 'reference', 'object', 'game_skin'
  ];
  
  // Editor mode - default to placement for adding/resizing assets
  const [mode, setMode] = useState<EditorMode>('placement');
  
  // Sync assets when initialAssets changes
  useEffect(() => {
    setAssets(initialAssets);
  }, [initialAssets]);
  
  // Placement state
  const [placements, setPlacements] = useState<AssetPlacement[]>(() => {
    if (initialPlacements && initialPlacements.length > 0) {
      return initialPlacements;
    }
    return assets.map((asset, index) => createDefaultPlacement(asset, index, dimensions));
  });
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(
    placements.length > 0 ? placements[0].assetId : null
  );
  
  // Sketch state from store
  const { elements: sketchElements } = useSketchStore();
  
  // Track if we've initialized for this open session
  const hasInitializedRef = useRef(false);
  
  // Initialize sketch elements (including converting placements to image elements)
  // Only run once when modal opens, not on every placement change
  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      return;
    }
    
    // Only initialize once per open session
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    
    // Start with initial sketch elements (non-image elements like freehand, shapes, etc.)
    const initialElements = initialSketchElements ? [...initialSketchElements] : [];
    
    // Convert placements to image elements so they can be manipulated in sketch mode
    const imageElements = placementsToImageElements(placements);
    
    // Filter out any existing image elements to avoid duplicates
    // (image elements come from placements, not from saved sketch elements)
    const nonImageElements = initialElements.filter(el => el.type !== 'image');
    
    // Combine: image elements (from placements) + other sketch elements (freehand, shapes, etc.)
    useSketchStore.setState({ elements: [...imageElements, ...nonImageElements] });
    
    console.log('[CanvasStudio] Initialized with:', {
      imageElements: imageElements.length,
      nonImageElements: nonImageElements.length,
      initialSketchElements: initialSketchElements?.length || 0,
    });
  }, [isOpen, initialSketchElements, placements]);
  
  // Reset sketch store on close
  useEffect(() => {
    if (!isOpen) {
      resetSketchStore();
    }
  }, [isOpen]);
  
  // Sync sketch image elements back to placements when they change
  useEffect(() => {
    if (!isOpen || mode !== 'sketch') return;
    
    // Extract image elements and convert back to placements
    const updatedPlacements = imageElementsToPlacements(sketchElements, assets);
    
    // Only update if there are actual changes to avoid infinite loops
    if (updatedPlacements.length > 0) {
      const hasChanges = updatedPlacements.some((newP, i) => {
        const oldP = placements.find(p => p.assetId === newP.assetId);
        if (!oldP) return true;
        return (
          oldP.position.x !== newP.position.x ||
          oldP.position.y !== newP.position.y ||
          oldP.size.width !== newP.size.width ||
          oldP.size.height !== newP.size.height
        );
      });
      
      if (hasChanges) {
        setPlacements(updatedPlacements);
      }
    }
  }, [sketchElements, isOpen, mode, assets]);
  
  // Handle mode change - sync data between modes
  const handleModeChange = useCallback((newMode: EditorMode) => {
    if (newMode === 'sketch' && mode === 'placement') {
      // Switching to sketch mode: ensure placements are converted to image elements
      const imageElements = placementsToImageElements(placements);
      const nonImageElements = sketchElements.filter(el => el.type !== 'image');
      useSketchStore.setState({ elements: [...imageElements, ...nonImageElements] });
    } else if (newMode === 'placement' && mode === 'sketch') {
      // Switching to placement mode: sync image elements back to placements
      const updatedPlacements = imageElementsToPlacements(sketchElements, assets);
      if (updatedPlacements.length > 0) {
        setPlacements(updatedPlacements);
      }
    }
    setMode(newMode);
  }, [mode, placements, sketchElements, assets]);
  
  // Update placements when assets change
  useEffect(() => {
    if (!isOpen) return;
    
    const currentAssetIds = new Set(placements.map(p => p.assetId));
    const newAssetIds = new Set(assets.map(a => a.id));
    
    const assetsToAdd = assets.filter(a => !currentAssetIds.has(a.id));
    const placementsToKeep = placements.filter(p => newAssetIds.has(p.assetId));
    
    if (assetsToAdd.length > 0 || placementsToKeep.length !== placements.length) {
      const newPlacements = [
        ...placementsToKeep,
        ...assetsToAdd.map((asset, index) => 
          createDefaultPlacement(asset, placementsToKeep.length + index, dimensions)
        ),
      ];
      setPlacements(newPlacements);
      
      if (selectedPlacementId && !newAssetIds.has(selectedPlacementId)) {
        setSelectedPlacementId(newPlacements.length > 0 ? newPlacements[0].assetId : null);
      }
    }
  }, [assets, isOpen, dimensions, placements, selectedPlacementId]);
  
  const selectedPlacement = useMemo(
    () => placements.find(p => p.assetId === selectedPlacementId) || null,
    [placements, selectedPlacementId]
  );
  
  // Handlers
  const handlePlacementsChange = useCallback((newPlacements: AssetPlacement[]) => {
    setPlacements(newPlacements);
  }, []);
  
  const handleUpdatePlacement = useCallback((updates: Partial<AssetPlacement>) => {
    if (!selectedPlacementId) return;
    setPlacements(prev => 
      prev.map(p => p.assetId === selectedPlacementId ? { ...p, ...updates } : p)
    );
  }, [selectedPlacementId]);
  
  const handleBringForward = useCallback(() => {
    if (!selectedPlacement) return;
    const currentZ = selectedPlacement.zIndex;
    if (currentZ >= placements.length) return;
    
    setPlacements(prev => prev.map(p => {
      if (p.assetId === selectedPlacementId) return { ...p, zIndex: currentZ + 1 };
      if (p.zIndex === currentZ + 1) return { ...p, zIndex: currentZ };
      return p;
    }));
  }, [selectedPlacement, selectedPlacementId, placements.length]);
  
  const handleSendBackward = useCallback(() => {
    if (!selectedPlacement) return;
    const currentZ = selectedPlacement.zIndex;
    if (currentZ <= 1) return;
    
    setPlacements(prev => prev.map(p => {
      if (p.assetId === selectedPlacementId) return { ...p, zIndex: currentZ - 1 };
      if (p.zIndex === currentZ - 1) return { ...p, zIndex: currentZ };
      return p;
    }));
  }, [selectedPlacement, selectedPlacementId]);
  
  const handleBringToFront = useCallback(() => {
    if (!selectedPlacement) return;
    const maxZ = placements.length;
    if (selectedPlacement.zIndex >= maxZ) return;
    
    setPlacements(prev => prev.map(p => {
      if (p.assetId === selectedPlacementId) return { ...p, zIndex: maxZ };
      if (p.zIndex > selectedPlacement.zIndex) return { ...p, zIndex: p.zIndex - 1 };
      return p;
    }));
  }, [selectedPlacement, selectedPlacementId, placements.length]);
  
  const handleSendToBack = useCallback(() => {
    if (!selectedPlacement) return;
    if (selectedPlacement.zIndex <= 1) return;
    
    setPlacements(prev => prev.map(p => {
      if (p.assetId === selectedPlacementId) return { ...p, zIndex: 1 };
      if (p.zIndex < selectedPlacement.zIndex) return { ...p, zIndex: p.zIndex + 1 };
      return p;
    }));
  }, [selectedPlacement, selectedPlacementId]);
  
  const handleRemovePlacement = useCallback(() => {
    if (!selectedPlacementId) return;
    const newPlacements = placements
      .filter(p => p.assetId !== selectedPlacementId)
      .map((p, i) => ({ ...p, zIndex: i + 1 }));
    
    setPlacements(newPlacements);
    setSelectedPlacementId(newPlacements.length > 0 ? newPlacements[0].assetId : null);
  }, [selectedPlacementId, placements]);
  
  const handleSave = useCallback(() => {
    // Extract final placements from image elements
    const finalPlacements = imageElementsToPlacements(sketchElements, assets);
    // Use original placements if no image elements found (fallback)
    const placementsToSave = finalPlacements.length > 0 ? finalPlacements : placements;
    
    // Filter out image elements from sketch elements (they're saved as placements)
    const nonImageSketchElements = sketchElements.filter(el => el.type !== 'image');
    
    console.log('[CanvasStudio] Saving:', {
      totalSketchElements: sketchElements.length,
      nonImageSketchElements: nonImageSketchElements.length,
      placementsToSave: placementsToSave.length,
      sketchTypes: nonImageSketchElements.map(el => el.type),
    });
    
    onSave(placementsToSave, nonImageSketchElements);
    onClose();
  }, [placements, sketchElements, assets, onSave, onClose]);
  
  const handleExport = useCallback(async () => {
    if (!canvasRendererRef.current || !onExport) return;
    
    try {
      const result = await canvasRendererRef.current.export();
      onExport(result.dataUrl, result.blob);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [onExport]);
  
  const handleCancel = useCallback(() => {
    if (initialPlacements && initialPlacements.length > 0) {
      setPlacements(initialPlacements);
    } else {
      setPlacements(assets.map((asset, index) => createDefaultPlacement(asset, index, dimensions)));
    }
    setAssets(initialAssets);
    resetSketchStore();
    onClose();
  }, [initialPlacements, assets, initialAssets, dimensions, onClose]);
  
  // Add asset from library
  const handleAddAsset = useCallback((asset: MediaAsset) => {
    if (assets.find(a => a.id === asset.id)) return; // Already added
    
    const newAssets = [...assets, asset];
    setAssets(newAssets);
    
    // Create placement for new asset
    const newPlacement = createDefaultPlacement(asset, placements.length, dimensions);
    setPlacements(prev => [...prev, newPlacement]);
    setSelectedPlacementId(asset.id);
  }, [assets, placements.length, dimensions]);
  
  // Remove asset
  const handleRemoveAsset = useCallback((assetId: string) => {
    setAssets(prev => prev.filter(a => a.id !== assetId));
    const newPlacements = placements
      .filter(p => p.assetId !== assetId)
      .map((p, i) => ({ ...p, zIndex: i + 1 }));
    setPlacements(newPlacements);
    
    if (selectedPlacementId === assetId) {
      setSelectedPlacementId(newPlacements.length > 0 ? newPlacements[0].assetId : null);
    }
  }, [placements, selectedPlacementId]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-7xl max-h-[95vh] bg-background-surface rounded-2xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col mt-16">
        {/* Header */}
        <div className="border-b border-border-subtle bg-background-elevated/50">
          {/* Title Row */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-interactive-500/10 text-interactive-500">
                {mode === 'placement' ? <LayoutIcon /> : <PenIcon />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Canvas Studio</h2>
                <p className="text-sm text-text-secondary">
                  {dimensions.label} ({dimensions.width}×{dimensions.height}px)
                </p>
              </div>
            </div>
            
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
            >
              <XIcon />
            </button>
          </div>
          
          {/* Mode Toggle Tabs - Centered below title */}
          <div className="flex justify-center pb-3">
            <div className="flex items-center bg-background-base rounded-xl p-1.5 shadow-inner border border-border-subtle">
              <button
                onClick={() => handleModeChange('placement')}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
                  mode === 'placement'
                    ? 'bg-interactive-500 text-white shadow-lg'
                    : 'text-text-secondary hover:text-text-primary hover:bg-background-surface'
                )}
              >
                <LayoutIcon />
                <span>Add & Resize</span>
              </button>
              <button
                onClick={() => handleModeChange('sketch')}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
                  mode === 'sketch'
                    ? 'bg-interactive-500 text-white shadow-lg'
                    : 'text-text-secondary hover:text-text-primary hover:bg-background-surface'
                )}
              >
                <PenIcon />
                <span>Sketch</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Sketch Toolbar (when in sketch mode) */}
          {mode === 'sketch' && (
            <div className="p-4 border-r border-border-subtle bg-background-base">
              <SketchToolbar orientation="vertical" />
            </div>
          )}
          
          {/* Canvas Area */}
          <div className="flex-1 p-6 overflow-auto flex flex-col items-center justify-center">
            <div
              className="relative rounded-xl border border-border-subtle bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]"
              style={{ 
                aspectRatio: `${dimensions.width} / ${dimensions.height}`,
                maxHeight: '70vh',
                maxWidth: dimensions.width > dimensions.height ? '90%' : `calc(70vh * ${dimensions.width / dimensions.height})`,
                width: '100%',
              }}
            >
              {/* Empty State */}
              {placements.length === 0 && mode === 'placement' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-20">
                  <div className="p-4 rounded-full bg-background-elevated mb-4">
                    <ImageIcon />
                  </div>
                  <h3 className="text-lg font-medium text-text-primary mb-2">No assets yet</h3>
                  <p className="text-sm text-text-muted text-center mb-4 max-w-xs">
                    Add assets from your library to place them on the canvas
                  </p>
                  <button
                    onClick={() => setIsAssetPickerOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-interactive-500 text-white hover:bg-interactive-600 transition-colors"
                  >
                    <PlusIcon />
                    Add Assets
                  </button>
                </div>
              )}
              
              {/* Placement Canvas (always rendered for asset display) */}
              {placements.length > 0 && (
                <PlacementCanvas
                  assetType={assetType}
                  assets={assets}
                  placements={placements}
                  onPlacementsChange={handlePlacementsChange}
                  selectedId={selectedPlacementId}
                  onSelectionChange={setSelectedPlacementId}
                  className={cn(
                    'absolute inset-0 z-0',
                    mode === 'sketch' && 'pointer-events-none'
                  )}
                />
              )}
              
              {/* Sketch Canvas (overlay when in sketch mode) */}
              {mode === 'sketch' && (
                <SketchCanvas
                  width={dimensions.width}
                  height={dimensions.height}
                  isActive={true}
                  className="absolute inset-0 z-10"
                />
              )}
              
              {/* Hidden Canvas Renderer for export */}
              <CanvasRenderer
                ref={canvasRendererRef}
                width={dimensions.width}
                height={dimensions.height}
                placements={placements}
                sketchElements={sketchElements}
                showPreview={false}
              />
              
              {/* Dimension label */}
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white/80 pointer-events-none z-20">
                {dimensions.width} × {dimensions.height}px
              </div>
            </div>
            
            {/* Asset Thumbnails */}
            {mode === 'placement' && placements.length > 0 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                {placements.map((placement) => (
                  <button
                    key={placement.assetId}
                    onClick={() => setSelectedPlacementId(placement.assetId)}
                    className={cn(
                      'relative p-1 rounded-lg border-2 transition-all',
                      selectedPlacementId === placement.assetId
                        ? 'border-interactive-500 bg-interactive-500/10'
                        : 'border-border-subtle hover:border-border-default'
                    )}
                  >
                    <img
                      src={placement.asset.thumbnailUrl || placement.asset.url}
                      alt={placement.asset.displayName}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-background-elevated border border-border-subtle rounded-full text-micro text-text-secondary flex items-center justify-center">
                      {placement.zIndex}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Controls Panel */}
          <div className="w-80 border-l border-border-subtle bg-background-base p-4 overflow-y-auto">
            {mode === 'placement' ? (
              <>
                {/* Add Assets Button */}
                <button
                  onClick={() => setIsAssetPickerOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mb-4 rounded-lg border-2 border-dashed border-interactive-500/50 text-interactive-400 hover:border-interactive-500 hover:bg-interactive-500/10 transition-colors font-medium"
                >
                  <PlusIcon />
                  Add from Library
                </button>
                
                {selectedPlacement ? (
                  <PlacementControls
                    placement={selectedPlacement}
                    onUpdate={handleUpdatePlacement}
                    onBringForward={handleBringForward}
                    onSendBackward={handleSendBackward}
                    onBringToFront={handleBringToFront}
                    onSendToBack={handleSendToBack}
                    onRemove={handleRemovePlacement}
                    totalLayers={placements.length}
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-text-muted">Select an asset to adjust</p>
                  </div>
                )}
                
                {/* Asset Thumbnails with remove buttons */}
                {placements.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border-subtle">
                    <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
                      Assets ({placements.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {placements.map((placement) => (
                        <div
                          key={placement.assetId}
                          className="relative group"
                        >
                          <button
                            onClick={() => setSelectedPlacementId(placement.assetId)}
                            className={cn(
                              'relative p-1 rounded-lg border-2 transition-all',
                              selectedPlacementId === placement.assetId
                                ? 'border-interactive-500 bg-interactive-500/10'
                                : 'border-border-subtle hover:border-border-default'
                            )}
                          >
                            <img
                              src={placement.asset.thumbnailUrl || placement.asset.url}
                              alt={placement.asset.displayName}
                              className="w-12 h-12 rounded object-cover"
                            />
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-background-elevated border border-border-subtle rounded-full text-micro text-text-secondary flex items-center justify-center">
                              {placement.zIndex}
                            </span>
                          </button>
                          {/* Remove button */}
                          <button
                            onClick={() => handleRemoveAsset(placement.assetId)}
                            className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            title="Remove asset"
                          >
                            <SmallXIcon />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <SketchToolPanel />
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle bg-background-elevated/50">
          <div className="flex items-center gap-4">
            <p className="text-sm text-text-muted">
              {placements.length} asset{placements.length !== 1 ? 's' : ''} • {sketchElements.filter(el => el.type !== 'image').length} sketch element{sketchElements.filter(el => el.type !== 'image').length !== 1 ? 's' : ''}
            </p>
            
            {onExport && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-background-surface transition-colors"
              >
                <DownloadIcon />
                Export Preview
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-background-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-interactive-500 text-white hover:bg-interactive-600 transition-colors"
            >
              Save Canvas
            </button>
          </div>
        </div>
      </div>
      
      {/* Asset Picker Modal */}
      {isAssetPickerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsAssetPickerOpen(false)} />
          
          <div className="relative w-full max-w-2xl bg-background-surface rounded-2xl border border-border-subtle shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <div>
                <h3 className="font-semibold text-text-primary">Add Assets</h3>
                <p className="text-sm text-text-muted">
                  Select assets from your library to add to the canvas
                </p>
              </div>
              <button
                onClick={() => setIsAssetPickerOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-elevated"
              >
                <XIcon />
              </button>
            </div>

            {/* Type Filter */}
            <div className="flex gap-2 p-4 border-b border-border-subtle overflow-x-auto">
              <button
                onClick={() => setAssetFilterType(undefined)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors',
                  !assetFilterType
                    ? 'bg-interactive-500 text-white'
                    : 'bg-background-elevated text-text-muted hover:bg-background-surface'
                )}
              >
                All
              </button>
              {availableAssetTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setAssetFilterType(type)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1.5',
                    assetFilterType === type
                      ? 'bg-interactive-500 text-white'
                      : 'bg-background-elevated text-text-muted hover:bg-background-surface'
                  )}
                >
                  <span>{ASSET_TYPE_ICONS[type]}</span>
                  <span className="capitalize">{type.replace('_', ' ')}</span>
                </button>
              ))}
            </div>

            {/* Asset Grid */}
            <div className="p-4 max-h-[50vh] overflow-y-auto">
              {libraryLoading ? (
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-lg bg-background-elevated animate-pulse" />
                  ))}
                </div>
              ) : !library?.assets.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-3 rounded-full bg-background-elevated mb-3">
                    <ImageIcon />
                  </div>
                  <p className="text-text-muted">No assets found</p>
                  <p className="text-sm text-text-tertiary mt-1">
                    Upload assets in your Media Library first
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {library.assets.map((asset) => {
                    const isAdded = assets.some(a => a.id === asset.id);
                    
                    return (
                      <button
                        key={asset.id}
                        onClick={() => {
                          if (!isAdded) {
                            handleAddAsset(asset);
                          }
                        }}
                        disabled={isAdded}
                        className={cn(
                          'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                          isAdded
                            ? 'border-emerald-500 ring-2 ring-emerald-500/30 opacity-75'
                            : 'border-transparent hover:border-interactive-500'
                        )}
                      >
                        <img
                          src={asset.thumbnailUrl || asset.url}
                          alt={asset.displayName}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Type Badge */}
                        <div className={cn(
                          'absolute top-1 left-1 px-1.5 py-0.5 rounded text-xs',
                          ASSET_TYPE_COLORS[asset.assetType]
                        )}>
                          {ASSET_TYPE_ICONS[asset.assetType]}
                        </div>
                        
                        {/* Added Indicator */}
                        {isAdded && (
                          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                              ✓
                            </div>
                          </div>
                        )}
                        
                        {/* Name Overlay */}
                        <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-xs text-white truncate">{asset.displayName}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border-subtle bg-background-elevated/50">
              <p className="text-sm text-text-muted">
                {assets.length} asset{assets.length !== 1 ? 's' : ''} added
              </p>
              <button
                onClick={() => setIsAssetPickerOpen(false)}
                className="px-4 py-2 rounded-lg bg-interactive-500 text-white hover:bg-interactive-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CanvasStudioModal;
