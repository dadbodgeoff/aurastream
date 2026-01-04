'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { AssetPlacement } from './types';
import { POSITION_PRESETS, SIZE_PRESETS, SIZE_CONSTRAINTS } from './constants';

interface PlacementControlsProps {
  placement: AssetPlacement | null;
  onUpdate: (updates: Partial<AssetPlacement>) => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onRemove: () => void;
  totalLayers: number;
  className?: string;
}

/**
 * PlacementControls - Precise controls for asset placement
 * Responsive design that works on all screen sizes
 */
export function PlacementControls({
  placement,
  onUpdate,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onRemove,
  totalLayers,
  className,
}: PlacementControlsProps) {
  if (!placement) {
    return (
      <div className={cn('p-4 text-center text-text-muted text-sm', className)}>
        <p>Select an asset to adjust</p>
      </div>
    );
  }

  const handlePositionPreset = useCallback((x: number, y: number) => {
    onUpdate({
      position: { ...placement.position, x, y },
    });
  }, [placement.position, onUpdate]);

  const handleSizePreset = useCallback((size: number) => {
    const newSize = placement.size.maintainAspectRatio
      ? { width: size, height: size }
      : { width: size, height: placement.size.height };
    
    onUpdate({
      size: { ...placement.size, ...newSize },
    });
  }, [placement.size, onUpdate]);

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
      {/* Asset Info - Compact */}
      <div className="flex items-center gap-2 p-2 bg-background-elevated rounded-lg">
        <img
          src={placement.asset.thumbnailUrl || placement.asset.url}
          alt={placement.asset.displayName}
          className="w-8 h-8 rounded object-cover shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-primary truncate">
            {placement.asset.displayName}
          </p>
          <p className="text-micro text-text-muted capitalize">
            {placement.asset.assetType.replace('_', ' ')}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="p-1 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors shrink-0"
          title="Remove"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>

      {/* Quick Position - 3x3 Grid */}
      <div>
        <label className="block text-micro font-medium text-text-secondary mb-1.5">Quick Position</label>
        <div className="grid grid-cols-3 gap-1">
          {POSITION_PRESETS.map((preset) => {
            const isActive = 
              Math.abs(placement.position.x - preset.position.x) < 5 &&
              Math.abs(placement.position.y - preset.position.y) < 5;
            
            return (
              <button
                key={preset.id}
                onClick={() => handlePositionPreset(preset.position.x, preset.position.y)}
                className={cn(
                  'p-1.5 rounded text-xs transition-all',
                  isActive
                    ? 'bg-interactive-500 text-white'
                    : 'bg-background-elevated text-text-secondary hover:bg-background-surface'
                )}
                title={preset.label}
              >
                {preset.icon}
              </button>
            );
          })}
        </div>
      </div>

      {/* Position Sliders - Stacked */}
      <div>
        <label className="block text-micro font-medium text-text-secondary mb-1.5">Position</label>
        <div className="space-y-2">
          {/* X Position */}
          <div className="flex items-center gap-2">
            <span className="text-micro text-text-muted w-4">X</span>
            <input
              type="range"
              min="0"
              max="100"
              value={placement.position.x}
              onChange={(e) => handlePositionChange('x', Number(e.target.value))}
              className="flex-1 h-1 bg-background-elevated rounded-full appearance-none cursor-pointer accent-interactive-500"
            />
            <input
              type="number"
              min="0"
              max="100"
              value={Math.round(placement.position.x)}
              onChange={(e) => handlePositionChange('x', Number(e.target.value))}
              className="w-12 px-1.5 py-0.5 text-micro bg-background-base border border-border-subtle rounded text-center"
            />
          </div>
          {/* Y Position */}
          <div className="flex items-center gap-2">
            <span className="text-micro text-text-muted w-4">Y</span>
            <input
              type="range"
              min="0"
              max="100"
              value={placement.position.y}
              onChange={(e) => handlePositionChange('y', Number(e.target.value))}
              className="flex-1 h-1 bg-background-elevated rounded-full appearance-none cursor-pointer accent-interactive-500"
            />
            <input
              type="number"
              min="0"
              max="100"
              value={Math.round(placement.position.y)}
              onChange={(e) => handlePositionChange('y', Number(e.target.value))}
              className="w-12 px-1.5 py-0.5 text-micro bg-background-base border border-border-subtle rounded text-center"
            />
          </div>
        </div>
      </div>

      {/* Size */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-micro font-medium text-text-secondary">Size</label>
          <button
            onClick={() => onUpdate({ size: { ...placement.size, maintainAspectRatio: !placement.size.maintainAspectRatio } })}
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded text-micro transition-colors',
              placement.size.maintainAspectRatio
                ? 'bg-interactive-500/20 text-interactive-400'
                : 'bg-background-elevated text-text-muted'
            )}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {placement.size.maintainAspectRatio ? (
                <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
              ) : (
                <path d="M21 21l-6-6m6 6v-4.8m0 4.8h-4.8M3 3l6 6M3 3v4.8M3 3h4.8" />
              )}
            </svg>
            {placement.size.maintainAspectRatio ? 'Locked' : 'Free'}
          </button>
        </div>
        
        {/* Size Presets - Wrap on small screens */}
        <div className="flex flex-wrap gap-1 mb-2">
          {SIZE_PRESETS.map((preset) => {
            const isActive = Math.abs(placement.size.width - preset.size) < 3;
            return (
              <button
                key={preset.id}
                onClick={() => handleSizePreset(preset.size)}
                className={cn(
                  'px-2 py-1 rounded text-micro transition-all',
                  isActive
                    ? 'bg-interactive-500 text-white'
                    : 'bg-background-elevated text-text-secondary hover:bg-background-surface'
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        
        {/* Width/Height Inputs - Stacked */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-micro text-text-muted w-6">W</span>
            <input
              type="number"
              min={SIZE_CONSTRAINTS.minPercent}
              max={SIZE_CONSTRAINTS.maxPercent}
              value={Math.round(placement.size.width)}
              onChange={(e) => handleSizeChange('width', Number(e.target.value))}
              className="flex-1 px-2 py-1 text-micro bg-background-base border border-border-subtle rounded text-center"
            />
            <span className="text-micro text-text-muted">%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-micro text-text-muted w-6">H</span>
            <input
              type="number"
              min={SIZE_CONSTRAINTS.minPercent}
              max={SIZE_CONSTRAINTS.maxPercent}
              value={Math.round(placement.size.height)}
              onChange={(e) => handleSizeChange('height', Number(e.target.value))}
              className="flex-1 px-2 py-1 text-micro bg-background-base border border-border-subtle rounded text-center"
              disabled={placement.size.maintainAspectRatio}
            />
            <span className="text-micro text-text-muted">%</span>
          </div>
        </div>
      </div>

      {/* Opacity */}
      <div>
        <label className="block text-micro font-medium text-text-secondary mb-1.5">Opacity</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="10"
            max="100"
            value={placement.opacity}
            onChange={(e) => onUpdate({ opacity: Number(e.target.value) })}
            className="flex-1 h-1 bg-background-elevated rounded-full appearance-none cursor-pointer accent-interactive-500"
          />
          <span className="w-8 text-micro text-text-secondary text-right">{placement.opacity}%</span>
        </div>
      </div>

      {/* Layer Order - Enhanced for backgrounds */}
      <div>
        <label className="block text-micro font-medium text-text-secondary mb-1.5">Layer Order</label>
        
        {/* Quick layer actions */}
        <div className="flex items-center gap-1 mb-2">
          <button
            onClick={onSendToBack}
            disabled={placement.zIndex <= 1}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-micro transition-colors',
              placement.zIndex <= 1
                ? 'bg-background-elevated text-text-muted cursor-not-allowed'
                : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
            )}
            title="Use for backgrounds"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
            </svg>
            Background
          </button>
          <button
            onClick={onBringToFront}
            disabled={placement.zIndex >= totalLayers}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-micro transition-colors',
              placement.zIndex >= totalLayers
                ? 'bg-background-elevated text-text-muted cursor-not-allowed'
                : 'bg-interactive-500/10 text-interactive-400 hover:bg-interactive-500/20 border border-interactive-500/30'
            )}
            title="Bring to front"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            Front
          </button>
        </div>
        
        {/* Fine-tune layer controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={onSendBackward}
            disabled={placement.zIndex <= 1}
            className={cn(
              'flex items-center justify-center gap-1 px-2 py-1 rounded text-micro transition-colors',
              placement.zIndex <= 1
                ? 'bg-background-elevated text-text-muted cursor-not-allowed'
                : 'bg-background-elevated text-text-secondary hover:bg-background-surface'
            )}
            title="Move back one layer"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-background-base rounded">
            <span className="text-micro text-text-muted">Layer</span>
            <span className="text-micro text-text-primary font-medium">{placement.zIndex}</span>
            <span className="text-micro text-text-muted">of {totalLayers}</span>
          </div>
          <button
            onClick={onBringForward}
            disabled={placement.zIndex >= totalLayers}
            className={cn(
              'flex items-center justify-center gap-1 px-2 py-1 rounded text-micro transition-colors',
              placement.zIndex >= totalLayers
                ? 'bg-background-elevated text-text-muted cursor-not-allowed'
                : 'bg-background-elevated text-text-secondary hover:bg-background-surface'
            )}
            title="Move forward one layer"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        {/* Hint for backgrounds */}
        {placement.asset.assetType === 'background' && placement.zIndex > 1 && (
          <p className="text-micro text-amber-400 mt-1.5 text-center">
            💡 Tip: Click "Background" to send this behind other assets
          </p>
        )}
      </div>

      {/* Keyboard Hints - Compact */}
      <div className="pt-2 border-t border-border-subtle">
        <p className="text-micro text-text-muted text-center leading-relaxed">
          ↑↓←→ nudge • Shift for big steps
        </p>
      </div>
    </div>
  );
}
