'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { useRemoveBackground, useRemoveBackgroundInProject } from '@aurastream/api-client';
import type { AssetPlacement, FitMode } from './types';
import { POSITION_PRESETS, SIZE_PRESETS, SIZE_CONSTRAINTS } from './constants';

interface PlacementControlsProps {
  placement: AssetPlacement | null;
  onUpdate: (updates: Partial<AssetPlacement>) => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onRemove: () => void;
  onAssetUpdated?: (asset: AssetPlacement['asset']) => void;
  totalLayers: number;
  className?: string;
  /** 
   * Optional project ID for project-scoped background removal.
   * When provided, background removal is isolated to this project only.
   * Other projects using the same asset won't be affected.
   */
  projectId?: string | null;
}

export function PlacementControls({
  placement,
  onUpdate,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onRemove,
  onAssetUpdated,
  totalLayers,
  className,
  projectId,
}: PlacementControlsProps) {
  const removeBackground = useRemoveBackground();
  const removeBackgroundInProject = useRemoveBackgroundInProject();
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  
  if (!placement) {
    return (
      <div className={cn('p-4 text-center text-white/40 text-sm', className)}>
        <p>Select an asset to adjust</p>
      </div>
    );
  }

  // Check if asset has a processed version available (globally)
  const hasProcessedVersion = placement.asset.hasBackgroundRemoved && placement.asset.processedUrl;
  // Check if we're currently using the original (not the processed version) in THIS project
  // Default to true for new placements - always start with original until user explicitly removes bg
  const isUsingOriginal = placement.useOriginalUrl ?? true;
  
  const handleRemoveBackground = async () => {
    if (isRemovingBg) return;
    setIsRemovingBg(true);
    try {
      // Use project-scoped removal if projectId is available
      if (projectId) {
        const result = await removeBackgroundInProject.mutateAsync({
          projectId,
          assetId: placement.asset.id,
        });
        // Update the asset with the new processed URL
        // For community assets, the processedUrl comes from the override response
        onAssetUpdated?.({
          ...placement.asset,
          processedUrl: result.processedUrl,
          hasBackgroundRemoved: true,
        });
        // Switch to using the processed version in this project
        onUpdate({ useOriginalUrl: false });
      } else {
        // Fallback to global removal (legacy behavior) - only works for user's own assets
        // Community assets require a projectId
        if (placement.asset.id.startsWith('community_')) {
          console.error('Cannot remove background from community asset without a project context');
          return;
        }
        const updated = await removeBackground.mutateAsync(placement.asset.id);
        onAssetUpdated?.({
          ...placement.asset,
          processedUrl: updated.processedUrl,
          hasBackgroundRemoved: true,
        });
        // Switch to using the processed version
        onUpdate({ useOriginalUrl: false });
      }
    } catch (error) {
      console.error('Failed to remove background:', error);
    } finally {
      setIsRemovingBg(false);
    }
  };
  
  /**
   * Toggle between original and processed (bg-removed) version.
   * This is PROJECT-SCOPED - each project can independently choose
   * whether to use the original or processed version of an asset.
   */
  const handleToggleVersion = useCallback(() => {
    onUpdate({ useOriginalUrl: !isUsingOriginal });
  }, [isUsingOriginal, onUpdate]);

  const handlePositionPreset = useCallback((x: number, y: number) => {
    onUpdate({ position: { ...placement.position, x, y } });
  }, [placement.position, onUpdate]);

  const handleSizePreset = useCallback((size: number) => {
    // For "Fill" preset (100%), also center the asset
    if (size === 100) {
      onUpdate({
        position: { ...placement.position, x: 50, y: 50 },
        size: { ...placement.size, width: 100, height: 100 },
      });
    } else {
      const newSize = placement.size.maintainAspectRatio
        ? { width: size, height: size }
        : { width: size, height: placement.size.height };
      onUpdate({ size: { ...placement.size, ...newSize } });
    }
  }, [placement.position, placement.size, onUpdate]);

  const handleSizeChange = useCallback((dimension: 'width' | 'height', value: number) => {
    const clampedValue = Math.max(SIZE_CONSTRAINTS.minPercent, Math.min(SIZE_CONSTRAINTS.maxPercent, value));
    if (placement.size.maintainAspectRatio) {
      const ratio = placement.size.width / placement.size.height;
      const newSize = dimension === 'width'
        ? { width: clampedValue, height: clampedValue / ratio }
        : { width: clampedValue * ratio, height: clampedValue };
      onUpdate({ size: { ...placement.size, ...newSize } });
    } else {
      onUpdate({ size: { ...placement.size, [dimension]: clampedValue } });
    }
  }, [placement.size, onUpdate]);

  const handlePositionChange = useCallback((axis: 'x' | 'y', value: number) => {
    const clampedValue = Math.max(0, Math.min(100, value));
    onUpdate({ position: { ...placement.position, [axis]: clampedValue } });
  }, [placement.position, onUpdate]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Asset Info */}
      <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
        <img
          src={placement.asset.thumbnailUrl || placement.asset.url}
          alt={placement.asset.displayName}
          className="w-8 h-8 rounded object-cover shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">{placement.asset.displayName}</p>
          <p className="text-[10px] text-white/40 capitalize">{placement.asset.assetType.replace('_', ' ')}</p>
        </div>
        <button onClick={onRemove} className="p-1 text-white/40 hover:text-red-400 rounded transition-colors" title="Remove">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>

      {/* Background Removal / Version Toggle */}
      <div className="space-y-1.5">
        {/* Always show Remove Background button - each project is independent */}
        <button
          onClick={handleRemoveBackground}
          disabled={isRemovingBg}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium transition-all',
            isRemovingBg ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
          )}
        >
          {isRemovingBg ? 'Removing...' : 'Remove Background'}
        </button>
        
        {/* Show toggle only when processed version exists AND user has used it in this project */}
        {hasProcessedVersion && !isUsingOriginal && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-medium text-white/50">Version</span>
            <button
              onClick={handleToggleVersion}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-all',
                'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
              )}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              BG Removed
            </button>
          </div>
        )}
        
        {/* Show option to switch back to original if using processed version */}
        {hasProcessedVersion && !isUsingOriginal && (
          <button
            onClick={handleToggleVersion}
            className="w-full text-[9px] text-white/40 hover:text-white/60 transition-colors"
          >
            Switch to original (with background)
          </button>
        )}
        
        {/* If processed version exists but we're using original, show option to use it */}
        {hasProcessedVersion && isUsingOriginal && (
          <button
            onClick={handleToggleVersion}
            className="w-full text-[9px] text-white/40 hover:text-white/60 transition-colors"
          >
            Use existing transparent version
          </button>
        )}
      </div>

      {/* Quick Position - Compact 3x3 */}
      <div>
        <label className="block text-[10px] font-medium text-white/50 mb-1">Position</label>
        <div className="grid grid-cols-3 gap-0.5">
          {POSITION_PRESETS.map((preset) => {
            const isActive = Math.abs(placement.position.x - preset.position.x) < 5 && Math.abs(placement.position.y - preset.position.y) < 5;
            return (
              <button
                key={preset.id}
                onClick={() => handlePositionPreset(preset.position.x, preset.position.y)}
                className={cn(
                  'p-1 rounded text-[10px] transition-all',
                  isActive ? 'bg-interactive-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                )}
                title={preset.label}
              >
                {preset.icon}
              </button>
            );
          })}
        </div>
      </div>

      {/* Position Sliders */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/40 w-3">X</span>
          <input
            type="range" min="0" max="100" value={placement.position.x}
            onChange={(e) => handlePositionChange('x', Number(e.target.value))}
            className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-interactive-500"
          />
          <input
            type="number" min="0" max="100" value={Math.round(placement.position.x)}
            onChange={(e) => handlePositionChange('x', Number(e.target.value))}
            className="w-10 px-1 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded text-center text-white"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/40 w-3">Y</span>
          <input
            type="range" min="0" max="100" value={placement.position.y}
            onChange={(e) => handlePositionChange('y', Number(e.target.value))}
            className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-interactive-500"
          />
          <input
            type="number" min="0" max="100" value={Math.round(placement.position.y)}
            onChange={(e) => handlePositionChange('y', Number(e.target.value))}
            className="w-10 px-1 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded text-center text-white"
          />
        </div>
      </div>

      {/* Size */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-medium text-white/50">Size</label>
          <button
            onClick={() => onUpdate({ size: { ...placement.size, maintainAspectRatio: !placement.size.maintainAspectRatio } })}
            className={cn(
              'flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] transition-colors',
              placement.size.maintainAspectRatio ? 'bg-interactive-500/20 text-interactive-400' : 'bg-white/5 text-white/40'
            )}
          >
            {placement.size.maintainAspectRatio ? '🔒' : '🔓'}
          </button>
        </div>
        
        {/* Size Presets - Including Fill */}
        <div className="flex flex-wrap gap-0.5 mb-1.5">
          {SIZE_PRESETS.map((preset) => {
            const isActive = preset.id === 'fill' 
              ? placement.size.width >= 98 && placement.size.height >= 98
              : Math.abs(placement.size.width - preset.size) < 3;
            return (
              <button
                key={preset.id}
                onClick={() => handleSizePreset(preset.size)}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] transition-all',
                  preset.id === 'fill' 
                    ? isActive 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                    : isActive 
                      ? 'bg-interactive-500 text-white' 
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        
        {/* W/H Inputs */}
        <div className="flex gap-1.5">
          <div className="flex-1 flex items-center gap-1">
            <span className="text-[10px] text-white/40">W</span>
            <input
              type="number" min={SIZE_CONSTRAINTS.minPercent} max={SIZE_CONSTRAINTS.maxPercent}
              value={Math.round(placement.size.width)}
              onChange={(e) => handleSizeChange('width', Number(e.target.value))}
              className="flex-1 px-1.5 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded text-center text-white"
            />
          </div>
          <div className="flex-1 flex items-center gap-1">
            <span className="text-[10px] text-white/40">H</span>
            <input
              type="number" min={SIZE_CONSTRAINTS.minPercent} max={SIZE_CONSTRAINTS.maxPercent}
              value={Math.round(placement.size.height)}
              onChange={(e) => handleSizeChange('height', Number(e.target.value))}
              className="flex-1 px-1.5 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded text-center text-white"
              disabled={placement.size.maintainAspectRatio}
            />
          </div>
        </div>
      </div>

      {/* Fit Mode - Only show when size is large (fill-like) */}
      {(placement.size.width >= 50 || placement.size.height >= 50) && (
        <div>
          <label className="block text-[10px] font-medium text-white/50 mb-1">Fit Mode</label>
          <div className="flex gap-0.5">
            {([
              { id: 'contain', label: 'Fit', desc: 'Show full image' },
              { id: 'cover', label: 'Fill', desc: 'Crop to fill' },
              { id: 'fill', label: 'Stretch', desc: 'May distort' },
            ] as const).map((mode) => {
              const currentMode = placement.fitMode || 
                ((placement.size.width >= 95 && placement.size.height >= 95) ? 'cover' : 'contain');
              const isActive = currentMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => onUpdate({ fitMode: mode.id })}
                  title={mode.desc}
                  className={cn(
                    'flex-1 px-1.5 py-1 rounded text-[10px] transition-all',
                    isActive 
                      ? 'bg-interactive-500 text-white' 
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  )}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
          <p className="text-[9px] text-white/30 mt-0.5">
            {(placement.fitMode || ((placement.size.width >= 95 && placement.size.height >= 95) ? 'cover' : 'contain')) === 'contain' 
              ? 'Full image visible, may have empty space'
              : (placement.fitMode || 'cover') === 'cover'
                ? 'Fills area, may crop edges'
                : 'Stretches to fill, may distort'}
          </p>
        </div>
      )}

      {/* Opacity */}
      <div>
        <label className="block text-[10px] font-medium text-white/50 mb-1">Opacity</label>
        <div className="flex items-center gap-1.5">
          <input
            type="range" min="10" max="100" value={placement.opacity}
            onChange={(e) => onUpdate({ opacity: Number(e.target.value) })}
            className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-interactive-500"
          />
          <span className="w-8 text-[10px] text-white/50 text-right">{placement.opacity}%</span>
        </div>
      </div>

      {/* Layer Order - Compact */}
      <div>
        <label className="block text-[10px] font-medium text-white/50 mb-1">Layer</label>
        <div className="flex items-center gap-1">
          <button
            onClick={onSendToBack}
            disabled={placement.zIndex <= 1}
            className={cn(
              'flex-1 px-1.5 py-1 rounded text-[10px] transition-colors',
              placement.zIndex <= 1 ? 'bg-white/5 text-white/20' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
            )}
          >
            Back
          </button>
          <div className="px-2 py-1 bg-white/5 rounded text-[10px] text-white/60">
            {placement.zIndex}/{totalLayers}
          </div>
          <button
            onClick={onBringToFront}
            disabled={placement.zIndex >= totalLayers}
            className={cn(
              'flex-1 px-1.5 py-1 rounded text-[10px] transition-colors',
              placement.zIndex >= totalLayers ? 'bg-white/5 text-white/20' : 'bg-interactive-500/10 text-interactive-400 hover:bg-interactive-500/20'
            )}
          >
            Front
          </button>
        </div>
      </div>

      {/* Keyboard hint */}
      <p className="text-[9px] text-white/30 text-center pt-1 border-t border-white/5">
        ↑↓←→ nudge • Shift = big steps
      </p>
    </div>
  );
}
