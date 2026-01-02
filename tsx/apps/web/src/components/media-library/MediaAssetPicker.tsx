'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  useMediaLibrary,
  useMediaAccess,
  MAX_PROMPT_INJECTION_ASSETS,
  type MediaAsset,
  type MediaAssetType,
} from '@aurastream/api-client';
import { ASSET_TYPE_ICONS, ASSET_TYPE_COLORS } from './constants';
import { PlacementModal, createDefaultPlacement, getCanvasDimensions, type AssetPlacement } from './placement';

interface MediaAssetPickerProps {
  selectedAssets: MediaAsset[];
  onSelectionChange: (assets: MediaAsset[]) => void;
  /** Asset placements with precise positioning */
  placements?: AssetPlacement[];
  /** Callback when placements change */
  onPlacementsChange?: (placements: AssetPlacement[]) => void;
  /** Asset type being created (for canvas dimensions) */
  assetType?: string;
  maxAssets?: number;
  allowedTypes?: MediaAssetType[];
  className?: string;
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function LayoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
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

/**
 * Asset picker for injecting media into prompts.
 * 
 * Used in Create, Quick Create, Coach, and Thumbnail Recreation flows.
 * Limited to MAX_PROMPT_INJECTION_ASSETS (2) per prompt.
 * Pro/Studio only.
 * 
 * Now includes optional placement canvas for precise positioning.
 */
export function MediaAssetPicker({
  selectedAssets,
  onSelectionChange,
  placements,
  onPlacementsChange,
  assetType = 'thumbnail',
  maxAssets = MAX_PROMPT_INJECTION_ASSETS,
  allowedTypes,
  className,
}: MediaAssetPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlacementOpen, setIsPlacementOpen] = useState(false);
  const [filterType, setFilterType] = useState<MediaAssetType | undefined>();
  
  const { data: access, isLoading: accessLoading } = useMediaAccess();
  const { data: library, isLoading: libraryLoading } = useMediaLibrary({
    assetType: filterType,
    limit: 50,
    sortBy: 'usage_count',
    sortOrder: 'desc',
  });

  const handleSelect = useCallback((asset: MediaAsset) => {
    if (selectedAssets.find(a => a.id === asset.id)) {
      // Deselect
      onSelectionChange(selectedAssets.filter(a => a.id !== asset.id));
    } else if (selectedAssets.length < maxAssets) {
      // Select
      onSelectionChange([...selectedAssets, asset]);
    }
  }, [selectedAssets, maxAssets, onSelectionChange]);

  const handleRemove = useCallback((assetId: string) => {
    onSelectionChange(selectedAssets.filter(a => a.id !== assetId));
    // Also remove from placements if present
    if (onPlacementsChange && placements) {
      onPlacementsChange(placements.filter(p => p.assetId !== assetId));
    }
  }, [selectedAssets, onSelectionChange, placements, onPlacementsChange]);

  const handleSavePlacements = useCallback((newPlacements: AssetPlacement[]) => {
    if (onPlacementsChange) {
      onPlacementsChange(newPlacements);
    }
  }, [onPlacementsChange]);

  // Check if placement is configured for an asset
  const hasPlacement = useCallback((assetId: string) => {
    return placements?.some(p => p.assetId === assetId) ?? false;
  }, [placements]);

  // Filter types if specified
  const availableTypes = allowedTypes || [
    'face', 'logo', 'character', 'background', 'reference', 'object', 'game_skin'
  ];

  // No access - show upgrade prompt
  if (!accessLoading && !access?.hasAccess) {
    return (
      <div className={cn(
        'p-4 rounded-xl border border-border-subtle bg-background-surface/50',
        className
      )}>
        <div className="flex items-center gap-3 text-text-muted">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <LockIcon />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">Media Library</p>
            <p className="text-xs">Upgrade to Pro to inject your own assets</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Selected Assets */}
      <div className="flex flex-wrap gap-2">
        {selectedAssets.map((asset) => {
          const placed = hasPlacement(asset.id);
          return (
            <div
              key={asset.id}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg border',
                placed
                  ? 'bg-emerald-500/20 border-emerald-500/30'
                  : 'bg-interactive-500/20 border-interactive-500/30'
              )}
            >
              <img
                src={asset.thumbnailUrl || asset.url}
                alt={asset.displayName}
                className="w-6 h-6 rounded object-cover"
              />
              <span className="text-sm text-text-primary truncate max-w-[120px]">
                {asset.displayName}
              </span>
              {placed && (
                <span className="text-micro text-emerald-400 flex items-center gap-0.5">
                  <LayoutIcon />
                </span>
              )}
              <button
                onClick={() => handleRemove(asset.id)}
                className="p-0.5 rounded hover:bg-white/10 text-text-muted hover:text-text-primary"
              >
                <XIcon />
              </button>
            </div>
          );
        })}
        
        {/* Add Button */}
        {selectedAssets.length < maxAssets && (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-border-subtle text-text-muted hover:border-interactive-500 hover:text-interactive-400 transition-colors"
          >
            <PlusIcon />
            <span className="text-sm">Add Asset ({selectedAssets.length}/{maxAssets})</span>
          </button>
        )}
      </div>

      {/* Set Placement Button - Only show when assets are selected and placement is supported */}
      {selectedAssets.length > 0 && onPlacementsChange && (
        <button
          onClick={() => setIsPlacementOpen(true)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all w-full justify-center',
            placements && placements.length > 0
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-background-elevated border border-border-subtle text-text-secondary hover:bg-background-surface hover:text-text-primary'
          )}
        >
          <LayoutIcon />
          <span>
            {placements && placements.length > 0
              ? `Placement Set (${placements.length} asset${placements.length > 1 ? 's' : ''})`
              : 'Set Precise Placement'
            }
          </span>
        </button>
      )}

      {/* Picker Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <div className="relative w-full max-w-2xl bg-background-surface rounded-2xl border border-border-subtle shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <div>
                <h3 className="font-semibold text-text-primary">Select Assets</h3>
                <p className="text-sm text-text-muted">
                  Choose up to {maxAssets} assets to inject into your prompt
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-elevated"
              >
                <XIcon />
              </button>
            </div>

            {/* Type Filter */}
            <div className="flex gap-2 p-4 border-b border-border-subtle overflow-x-auto">
              <button
                onClick={() => setFilterType(undefined)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors',
                  !filterType
                    ? 'bg-interactive-500 text-white'
                    : 'bg-background-elevated text-text-muted hover:bg-background-surface'
                )}
              >
                All
              </button>
              {availableTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1.5',
                    filterType === type
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
                    const isSelected = selectedAssets.some(a => a.id === asset.id);
                    const isDisabled = !isSelected && selectedAssets.length >= maxAssets;
                    
                    return (
                      <button
                        key={asset.id}
                        onClick={() => !isDisabled && handleSelect(asset)}
                        disabled={isDisabled}
                        className={cn(
                          'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                          isSelected
                            ? 'border-interactive-500 ring-2 ring-interactive-500/30'
                            : isDisabled
                            ? 'border-border-subtle opacity-50 cursor-not-allowed'
                            : 'border-transparent hover:border-border-default'
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
                        
                        {/* Selection Indicator */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-interactive-500/20 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-interactive-500 text-white flex items-center justify-center">
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
                {selectedAssets.length} of {maxAssets} selected
              </p>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-lg bg-interactive-500 text-white hover:bg-interactive-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Placement Modal */}
      {onPlacementsChange && (
        <PlacementModal
          isOpen={isPlacementOpen}
          onClose={() => setIsPlacementOpen(false)}
          assetType={assetType}
          assets={selectedAssets}
          initialPlacements={placements}
          onSave={handleSavePlacements}
        />
      )}
    </div>
  );
}
