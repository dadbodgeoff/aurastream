'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useMediaLibrary, type MediaAsset, type MediaAssetType } from '@aurastream/api-client';
import type { AssetPlacement, PlacementModalProps } from './types';
import { getCanvasDimensions, createDefaultPlacement } from './constants';
import { PlacementCanvas } from './PlacementCanvas';
import { PlacementControls } from './PlacementControls';
import { ASSET_TYPE_ICONS, ASSET_TYPE_COLORS } from '../constants';

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

/**
 * PlacementModal - Full-featured modal for asset placement
 * 
 * Features:
 * - Interactive canvas with drag/resize
 * - Precise controls panel
 * - Asset list with layer ordering
 * - Save/cancel with state management
 */
export function PlacementModal({
  isOpen,
  onClose,
  assetType,
  assets: initialAssets,
  initialPlacements,
  onSave,
}: PlacementModalProps) {
  const dimensions = useMemo(() => getCanvasDimensions(assetType), [assetType]);
  
  // Internal assets state (can be modified within the modal)
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
  
  // Sync assets when initialAssets changes
  useEffect(() => {
    setAssets(initialAssets);
  }, [initialAssets]);
  
  // Initialize placements from props or create defaults
  const [placements, setPlacements] = useState<AssetPlacement[]>(() => {
    if (initialPlacements && initialPlacements.length > 0) {
      return initialPlacements;
    }
    return initialAssets.map((asset, index) => createDefaultPlacement(asset, index, dimensions));
  });
  
  const [selectedId, setSelectedId] = useState<string | null>(
    placements.length > 0 ? placements[0].assetId : null
  );

  // Reset placements when assets change
  useEffect(() => {
    if (!isOpen) return;
    
    // Check if we need to update placements based on asset changes
    const currentAssetIds = new Set(placements.map(p => p.assetId));
    const newAssetIds = new Set(assets.map(a => a.id));
    
    // Add new assets
    const assetsToAdd = assets.filter(a => !currentAssetIds.has(a.id));
    // Remove deleted assets
    const placementsToKeep = placements.filter(p => newAssetIds.has(p.assetId));
    
    if (assetsToAdd.length > 0 || placementsToKeep.length !== placements.length) {
      const newPlacements = [
        ...placementsToKeep,
        ...assetsToAdd.map((asset, index) => 
          createDefaultPlacement(asset, placementsToKeep.length + index, dimensions)
        ),
      ];
      setPlacements(newPlacements);
      
      // Select first asset if current selection was removed
      if (selectedId && !newAssetIds.has(selectedId)) {
        setSelectedId(newPlacements.length > 0 ? newPlacements[0].assetId : null);
      }
    }
  }, [assets, isOpen, dimensions]);

  const selectedPlacement = useMemo(
    () => placements.find(p => p.assetId === selectedId) || null,
    [placements, selectedId]
  );

  const handlePlacementsChange = useCallback((newPlacements: AssetPlacement[]) => {
    setPlacements(newPlacements);
  }, []);

  const handleUpdatePlacement = useCallback((updates: Partial<AssetPlacement>) => {
    if (!selectedId) return;
    setPlacements(prev => 
      prev.map(p => p.assetId === selectedId ? { ...p, ...updates } : p)
    );
  }, [selectedId]);

  const handleBringForward = useCallback(() => {
    if (!selectedPlacement) return;
    const currentZ = selectedPlacement.zIndex;
    if (currentZ >= placements.length) return;
    
    setPlacements(prev => prev.map(p => {
      if (p.assetId === selectedId) return { ...p, zIndex: currentZ + 1 };
      if (p.zIndex === currentZ + 1) return { ...p, zIndex: currentZ };
      return p;
    }));
  }, [selectedPlacement, selectedId, placements.length]);

  const handleSendBackward = useCallback(() => {
    if (!selectedPlacement) return;
    const currentZ = selectedPlacement.zIndex;
    if (currentZ <= 1) return;
    
    setPlacements(prev => prev.map(p => {
      if (p.assetId === selectedId) return { ...p, zIndex: currentZ - 1 };
      if (p.zIndex === currentZ - 1) return { ...p, zIndex: currentZ };
      return p;
    }));
  }, [selectedPlacement, selectedId]);

  const handleSendToBack = useCallback(() => {
    if (!selectedPlacement) return;
    const currentZ = selectedPlacement.zIndex;
    if (currentZ <= 1) return;
    
    // Move selected to z-index 1, shift all others up
    setPlacements(prev => prev.map(p => {
      if (p.assetId === selectedId) return { ...p, zIndex: 1 };
      if (p.zIndex < currentZ) return { ...p, zIndex: p.zIndex + 1 };
      return p;
    }));
  }, [selectedPlacement, selectedId]);

  const handleBringToFront = useCallback(() => {
    if (!selectedPlacement) return;
    const currentZ = selectedPlacement.zIndex;
    const maxZ = placements.length;
    if (currentZ >= maxZ) return;
    
    // Move selected to max z-index, shift all others down
    setPlacements(prev => prev.map(p => {
      if (p.assetId === selectedId) return { ...p, zIndex: maxZ };
      if (p.zIndex > currentZ) return { ...p, zIndex: p.zIndex - 1 };
      return p;
    }));
  }, [selectedPlacement, selectedId, placements.length]);

  const handleRemove = useCallback(() => {
    if (!selectedId) return;
    const newPlacements = placements
      .filter(p => p.assetId !== selectedId)
      .map((p, i) => ({ ...p, zIndex: i + 1 })); // Reorder z-indices
    
    setPlacements(newPlacements);
    setSelectedId(newPlacements.length > 0 ? newPlacements[0].assetId : null);
  }, [selectedId, placements]);

  const handleSave = useCallback(() => {
    onSave(placements);
    onClose();
  }, [placements, onSave, onClose]);

  const handleCancel = useCallback(() => {
    // Reset to initial state
    if (initialPlacements && initialPlacements.length > 0) {
      setPlacements(initialPlacements);
    } else {
      setPlacements(initialAssets.map((asset, index) => createDefaultPlacement(asset, index, dimensions)));
    }
    setAssets(initialAssets);
    onClose();
  }, [initialPlacements, initialAssets, dimensions, onClose]);
  
  // Add asset from library
  const handleAddAsset = useCallback((asset: MediaAsset) => {
    if (assets.find(a => a.id === asset.id)) return; // Already added
    
    const newAssets = [...assets, asset];
    setAssets(newAssets);
    
    // Create placement for new asset
    const newPlacement = createDefaultPlacement(asset, placements.length, dimensions);
    setPlacements(prev => [...prev, newPlacement]);
    setSelectedId(asset.id);
  }, [assets, placements.length, dimensions]);
  
  // Remove asset
  const handleRemoveAsset = useCallback((assetId: string) => {
    setAssets(prev => prev.filter(a => a.id !== assetId));
    const newPlacements = placements
      .filter(p => p.assetId !== assetId)
      .map((p, i) => ({ ...p, zIndex: i + 1 }));
    setPlacements(newPlacements);
    
    if (selectedId === assetId) {
      setSelectedId(newPlacements.length > 0 ? newPlacements[0].assetId : null);
    }
  }, [placements, selectedId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-background-surface rounded-2xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border-subtle bg-background-elevated/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-interactive-500/10 text-interactive-500">
              <LayoutIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Add & Position Assets</h2>
              <p className="text-sm text-text-secondary">
                {dimensions.label} canvas ({dimensions.width}×{dimensions.height}px)
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

        {/* Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Canvas Area */}
          <div className="flex-1 p-6 overflow-auto flex flex-col">
            {/* Empty State */}
            {placements.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6">
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
            ) : (
              <>
                <PlacementCanvas
                  assetType={assetType}
                  assets={assets}
                  placements={placements}
                  onPlacementsChange={handlePlacementsChange}
                  selectedId={selectedId}
                  onSelectionChange={setSelectedId}
                />
                
                {/* Asset Thumbnails */}
                <div className="mt-4 flex items-center justify-center gap-2">
                  {placements.map((placement) => (
                    <div key={placement.assetId} className="relative group">
                      <button
                        onClick={() => setSelectedId(placement.assetId)}
                        className={cn(
                          'relative p-1 rounded-lg border-2 transition-all',
                          selectedId === placement.assetId
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
              </>
            )}
          </div>

          {/* Controls Panel - Responsive */}
          <div className="w-64 lg:w-72 xl:w-80 border-l border-border-subtle bg-background-base p-3 lg:p-4 overflow-y-auto shrink-0">
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
                onRemove={handleRemove}
                totalLayers={placements.length}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-text-muted">Select an asset to adjust</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle bg-background-elevated/50">
          <p className="text-sm text-text-muted">
            {placements.length} asset{placements.length !== 1 ? 's' : ''} placed
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-background-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={placements.length === 0}
              className={cn(
                'px-6 py-2 rounded-lg text-sm font-medium transition-all',
                placements.length > 0
                  ? 'bg-interactive-500 text-white hover:bg-interactive-600 shadow-lg shadow-interactive-500/20'
                  : 'bg-background-elevated text-text-muted cursor-not-allowed'
              )}
            >
              Save Placement
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
