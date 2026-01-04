'use client';

/**
 * AssetLibraryPicker Component
 * 
 * Modal picker for selecting reference assets from the user's media library
 * to attach to coach chat messages.
 * 
 * @module coach/input/AssetLibraryPicker
 */

import React, { memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  useMediaLibrary,
  useMediaAccess,
  type MediaAsset,
  type MediaAssetType,
} from '@aurastream/api-client';

// ============================================================================
// Constants
// ============================================================================

const MAX_REFERENCE_ASSETS = 2;

const ASSET_TYPE_ICONS: Record<MediaAssetType, string> = {
  face: '👤',
  logo: '🎨',
  character: '🎭',
  background: '🖼️',
  reference: '📎',
  object: '📦',
  game_skin: '🎮',
  overlay: '🔲',
  alert: '🔔',
  emote: '😀',
  badge: '🏅',
  panel: '📋',
  facecam_frame: '📷',
  stinger: '✨',
};

const ASSET_TYPE_COLORS: Record<MediaAssetType, string> = {
  face: 'bg-blue-500/20 text-blue-400',
  logo: 'bg-purple-500/20 text-purple-400',
  character: 'bg-pink-500/20 text-pink-400',
  background: 'bg-green-500/20 text-green-400',
  reference: 'bg-yellow-500/20 text-yellow-400',
  object: 'bg-orange-500/20 text-orange-400',
  game_skin: 'bg-cyan-500/20 text-cyan-400',
  overlay: 'bg-indigo-500/20 text-indigo-400',
  alert: 'bg-red-500/20 text-red-400',
  emote: 'bg-amber-500/20 text-amber-400',
  badge: 'bg-emerald-500/20 text-emerald-400',
  panel: 'bg-slate-500/20 text-slate-400',
  facecam_frame: 'bg-violet-500/20 text-violet-400',
  stinger: 'bg-fuchsia-500/20 text-fuchsia-400',
};

// ============================================================================
// Types
// ============================================================================

export interface SelectedReferenceAsset {
  assetId: string;
  displayName: string;
  assetType: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
}

export interface AssetLibraryPickerProps {
  /** Currently selected assets */
  selectedAssets: SelectedReferenceAsset[];
  /** Callback when selection changes */
  onSelectionChange: (assets: SelectedReferenceAsset[]) => void;
  /** Maximum number of assets that can be selected */
  maxAssets?: number;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// ============================================================================
// Icon Components
// ============================================================================

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const ImageLibraryIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20,6 9,17 4,12" />
  </svg>
);

const LockIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// ============================================================================
// Sub-Components
// ============================================================================

interface SelectedAssetChipProps {
  asset: SelectedReferenceAsset;
  onRemove: () => void;
}

const SelectedAssetChip = memo(function SelectedAssetChip({
  asset,
  onRemove,
}: SelectedAssetChipProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-accent-500/20 border border-accent-500/30">
      <img
        src={asset.thumbnailUrl || asset.url}
        alt={asset.displayName}
        className="w-6 h-6 rounded object-cover"
      />
      <span className="text-xs text-text-primary truncate max-w-[100px]">
        {asset.displayName}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="p-0.5 rounded hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
        aria-label={`Remove ${asset.displayName}`}
      >
        <XIcon className="w-3 h-3" />
      </button>
    </div>
  );
});

SelectedAssetChip.displayName = 'SelectedAssetChip';

// ============================================================================
// Main Component
// ============================================================================

/**
 * AssetLibraryPicker provides a modal interface for selecting reference
 * assets from the user's media library to attach to coach messages.
 */
export const AssetLibraryPicker = memo(function AssetLibraryPicker({
  selectedAssets,
  onSelectionChange,
  maxAssets = MAX_REFERENCE_ASSETS,
  className,
  testId = 'asset-library-picker',
}: AssetLibraryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState<MediaAssetType | undefined>();

  const { data: access, isLoading: accessLoading } = useMediaAccess();
  const { data: library, isLoading: libraryLoading } = useMediaLibrary({
    assetType: filterType,
    limit: 50,
    sortBy: 'usage_count',
    sortOrder: 'desc',
  });

  const handleSelect = useCallback((asset: MediaAsset) => {
    const isSelected = selectedAssets.some(a => a.assetId === asset.id);
    
    if (isSelected) {
      // Remove from selection
      onSelectionChange(selectedAssets.filter(a => a.assetId !== asset.id));
    } else if (selectedAssets.length < maxAssets) {
      // Add to selection
      const newAsset: SelectedReferenceAsset = {
        assetId: asset.id,
        displayName: asset.displayName,
        assetType: asset.assetType,
        url: asset.processedUrl || asset.url,
        thumbnailUrl: asset.thumbnailUrl ?? undefined,
      };
      onSelectionChange([...selectedAssets, newAsset]);
    }
  }, [selectedAssets, maxAssets, onSelectionChange]);

  const handleRemove = useCallback((assetId: string) => {
    onSelectionChange(selectedAssets.filter(a => a.assetId !== assetId));
  }, [selectedAssets, onSelectionChange]);

  const availableTypes: MediaAssetType[] = [
    'face', 'logo', 'character', 'background', 'reference', 'object', 'game_skin'
  ];

  // No access - show nothing (button will be hidden)
  if (!accessLoading && !access?.hasAccess) {
    return null;
  }

  return (
    <div data-testid={testId} className={cn('flex items-center gap-2', className)}>
      {/* Selected Assets Preview */}
      {selectedAssets.map((asset) => (
        <SelectedAssetChip
          key={asset.assetId}
          asset={asset}
          onRemove={() => handleRemove(asset.assetId)}
        />
      ))}

      {/* Add Button */}
      {selectedAssets.length < maxAssets && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
            'border border-dashed border-border-subtle',
            'text-text-muted hover:text-text-primary hover:border-accent-500',
            'transition-colors text-xs'
          )}
          aria-label="Add reference from library"
          data-testid={`${testId}-add-button`}
        >
          <ImageLibraryIcon className="w-4 h-4" />
          <span>Add Reference</span>
        </button>
      )}

      {/* Picker Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setIsOpen(false)} 
          />
          
          <div className="relative w-full max-w-2xl bg-background-surface rounded-2xl border border-border-subtle shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <div>
                <h3 className="font-semibold text-text-primary">Add Reference Image</h3>
                <p className="text-sm text-text-muted">
                  Select up to {maxAssets} images to help the coach understand your vision
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
                aria-label="Close"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Type Filter */}
            <div className="flex gap-2 p-4 border-b border-border-subtle overflow-x-auto">
              <button
                type="button"
                onClick={() => setFilterType(undefined)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors',
                  !filterType
                    ? 'bg-accent-500 text-white'
                    : 'bg-background-elevated text-text-muted hover:bg-background-surface'
                )}
              >
                All
              </button>
              {availableTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilterType(type)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1.5',
                    filterType === type
                      ? 'bg-accent-500 text-white'
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
                    <ImageLibraryIcon className="w-6 h-6 text-text-muted" />
                  </div>
                  <p className="text-text-muted">No assets found</p>
                  <p className="text-sm text-text-tertiary mt-1">
                    Upload assets in your Media Library first
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {library.assets.map((asset) => {
                    const isSelected = selectedAssets.some(a => a.assetId === asset.id);
                    const isDisabled = !isSelected && selectedAssets.length >= maxAssets;
                    
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => !isDisabled && handleSelect(asset)}
                        disabled={isDisabled}
                        className={cn(
                          'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                          isSelected
                            ? 'border-accent-500 ring-2 ring-accent-500/30'
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
                          ASSET_TYPE_COLORS[asset.assetType as MediaAssetType] || 'bg-gray-500/20 text-gray-400'
                        )}>
                          {ASSET_TYPE_ICONS[asset.assetType as MediaAssetType] || '📎'}
                        </div>
                        
                        {/* Selection Indicator */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-accent-500/20 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-accent-500 text-white flex items-center justify-center">
                              <CheckIcon className="w-4 h-4" />
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
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-lg bg-accent-500 text-white hover:bg-accent-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

AssetLibraryPicker.displayName = 'AssetLibraryPicker';

export default AssetLibraryPicker;
