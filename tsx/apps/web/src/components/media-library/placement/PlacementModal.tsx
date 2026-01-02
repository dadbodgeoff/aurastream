'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { AssetPlacement, PlacementModalProps } from './types';
import { getCanvasDimensions, createDefaultPlacement } from './constants';
import { PlacementCanvas } from './PlacementCanvas';
import { PlacementControls } from './PlacementControls';

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
  assets,
  initialPlacements,
  onSave,
}: PlacementModalProps) {
  const dimensions = useMemo(() => getCanvasDimensions(assetType), [assetType]);
  
  // Initialize placements from props or create defaults
  const [placements, setPlacements] = useState<AssetPlacement[]>(() => {
    if (initialPlacements && initialPlacements.length > 0) {
      return initialPlacements;
    }
    return assets.map((asset, index) => createDefaultPlacement(asset, index, dimensions));
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
      setPlacements(assets.map((asset, index) => createDefaultPlacement(asset, index, dimensions)));
    }
    onClose();
  }, [initialPlacements, assets, dimensions, onClose]);

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-background-elevated/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-interactive-500/10 text-interactive-500">
              <LayoutIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Asset Placement</h2>
              <p className="text-sm text-text-secondary">
                Position your assets on the {dimensions.label} canvas ({dimensions.width}×{dimensions.height}px)
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
          <div className="flex-1 p-6 overflow-auto">
            <PlacementCanvas
              assetType={assetType}
              assets={assets}
              placements={placements}
              onPlacementsChange={handlePlacementsChange}
            />
            
            {/* Asset Thumbnails */}
            <div className="mt-4 flex items-center justify-center gap-2">
              {placements.map((placement) => (
                <button
                  key={placement.assetId}
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
              ))}
            </div>
          </div>

          {/* Controls Panel */}
          <div className="w-80 border-l border-border-subtle bg-background-base p-4 overflow-y-auto">
            <PlacementControls
              placement={selectedPlacement}
              onUpdate={handleUpdatePlacement}
              onBringForward={handleBringForward}
              onSendBackward={handleSendBackward}
              onRemove={handleRemove}
              totalLayers={placements.length}
            />
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
    </div>
  );
}
