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
  onRemove: () => void;
  totalLayers: number;
  className?: string;
}

/**
 * PlacementControls - Precise controls for asset placement
 * 
 * Features:
 * - Position presets (9-grid)
 * - Size presets and manual input
 * - Rotation slider
 * - Opacity slider
 * - Layer ordering
 * - Aspect ratio lock toggle
 */
export function PlacementControls({
  placement,
  onUpdate,
  onBringForward,
  onSendBackward,
  onRemove,
  totalLayers,
  className,
}: PlacementControlsProps) {
  if (!placement) {
    return (
      <div className={cn('p-4 text-center text-text-muted text-sm', className)}>
        <p>Select an asset on the canvas to adjust its placement</p>
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
    <div className={cn('space-y-4', className)}>
      {/* Asset Info */}
      <div className="flex items-center gap-3 p-2 bg-background-elevated rounded-lg">
        <img
          src={placement.asset.thumbnailUrl || placement.asset.url}
          alt={placement.asset.displayName}
          className="w-10 h-10 rounded object-cover"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {placement.asset.displayName}
          </p>
          <p className="text-xs text-text-muted capitalize">
            {placement.asset.assetType.replace('_', ' ')}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
          title="Remove from canvas"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>

      {/* Position Presets */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-2">Quick Position</label>
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
                  'p-2 rounded text-sm transition-all',
                  isActive
                    ? 'bg-interactive-500 text-white'
                    : 'bg-background-elevated text-text-secondary hover:bg-background-surface hover:text-text-primary'
                )}
                title={preset.label}
              >
                {preset.icon}
              </button>
            );
          })}
        </div>
      </div>

      {/* Precise Position */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-2">Position</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-micro text-text-muted mb-1">X Position</label>
            <div className="flex items-center gap-1">
              <input
                type="range"
                min="0"
                max="100"
                value={placement.position.x}
                onChange={(e) => handlePositionChange('x', Number(e.target.value))}
                className="flex-1 h-1.5 bg-background-elevated rounded-full appearance-none cursor-pointer accent-interactive-500"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={Math.round(placement.position.x)}
                onChange={(e) => handlePositionChange('x', Number(e.target.value))}
                className="w-14 px-2 py-1 text-xs bg-background-base border border-border-subtle rounded text-center"
              />
              <span className="text-xs text-text-muted">%</span>
            </div>
          </div>
          <div>
            <label className="block text-micro text-text-muted mb-1">Y Position</label>
            <div className="flex items-center gap-1">
              <input
                type="range"
                min="0"
                max="100"
                value={placement.position.y}
                onChange={(e) => handlePositionChange('y', Number(e.target.value))}
                className="flex-1 h-1.5 bg-background-elevated rounded-full appearance-none cursor-pointer accent-interactive-500"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={Math.round(placement.position.y)}
                onChange={(e) => handlePositionChange('y', Number(e.target.value))}
                className="w-14 px-2 py-1 text-xs bg-background-base border border-border-subtle rounded text-center"
              />
              <span className="text-xs text-text-muted">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Size Presets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-text-secondary">Size</label>
          <button
            onClick={() => onUpdate({ size: { ...placement.size, maintainAspectRatio: !placement.size.maintainAspectRatio } })}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded text-micro transition-colors',
              placement.size.maintainAspectRatio
                ? 'bg-interactive-500/20 text-interactive-400'
                : 'bg-background-elevated text-text-muted hover:text-text-secondary'
            )}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {placement.size.maintainAspectRatio ? (
                <path d="M12 2v4m0 12v4M2 12h4m12 0h4M7.8 7.8L5 5m14 14l-2.8-2.8M7.8 16.2L5 19m14-14l-2.8 2.8" />
              ) : (
                <path d="M21 21l-6-6m6 6v-4.8m0 4.8h-4.8M3 3l6 6M3 3v4.8M3 3h4.8" />
              )}
            </svg>
            {placement.size.maintainAspectRatio ? 'Locked' : 'Free'}
          </button>
        </div>
        <div className="flex gap-1 mb-2">
          {SIZE_PRESETS.map((preset) => {
            const isActive = Math.abs(placement.size.width - preset.size) < 3;
            return (
              <button
                key={preset.id}
                onClick={() => handleSizePreset(preset.size)}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded text-xs transition-all',
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
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-micro text-text-muted mb-1">Width</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={SIZE_CONSTRAINTS.minPercent}
                max={SIZE_CONSTRAINTS.maxPercent}
                value={Math.round(placement.size.width)}
                onChange={(e) => handleSizeChange('width', Number(e.target.value))}
                className="flex-1 px-2 py-1 text-xs bg-background-base border border-border-subtle rounded text-center"
              />
              <span className="text-xs text-text-muted">%</span>
            </div>
          </div>
          <div>
            <label className="block text-micro text-text-muted mb-1">Height</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={SIZE_CONSTRAINTS.minPercent}
                max={SIZE_CONSTRAINTS.maxPercent}
                value={Math.round(placement.size.height)}
                onChange={(e) => handleSizeChange('height', Number(e.target.value))}
                className="flex-1 px-2 py-1 text-xs bg-background-base border border-border-subtle rounded text-center"
                disabled={placement.size.maintainAspectRatio}
              />
              <span className="text-xs text-text-muted">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Opacity */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-2">Opacity</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="10"
            max="100"
            value={placement.opacity}
            onChange={(e) => onUpdate({ opacity: Number(e.target.value) })}
            className="flex-1 h-1.5 bg-background-elevated rounded-full appearance-none cursor-pointer accent-interactive-500"
          />
          <span className="w-10 text-xs text-text-secondary text-right">{placement.opacity}%</span>
        </div>
      </div>

      {/* Layer Order */}
      {totalLayers > 1 && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-2">Layer Order</label>
          <div className="flex items-center gap-2">
            <button
              onClick={onSendBackward}
              disabled={placement.zIndex <= 1}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors',
                placement.zIndex <= 1
                  ? 'bg-background-elevated text-text-muted cursor-not-allowed'
                  : 'bg-background-elevated text-text-secondary hover:bg-background-surface hover:text-text-primary'
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <span className="px-3 py-1.5 bg-background-base rounded text-xs text-text-primary font-medium">
              {placement.zIndex} / {totalLayers}
            </span>
            <button
              onClick={onBringForward}
              disabled={placement.zIndex >= totalLayers}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors',
                placement.zIndex >= totalLayers
                  ? 'bg-background-elevated text-text-muted cursor-not-allowed'
                  : 'bg-background-elevated text-text-secondary hover:bg-background-surface hover:text-text-primary'
              )}
            >
              Front
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Keyboard Hints */}
      <div className="pt-2 border-t border-border-subtle">
        <p className="text-micro text-text-muted text-center">
          Arrow keys to nudge • Shift+Arrow for larger steps • Delete to remove
        </p>
      </div>
    </div>
  );
}
