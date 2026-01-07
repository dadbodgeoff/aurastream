'use client';

/**
 * Canvas Toolbar - Transform & Edit Controls
 *
 * Provides controls for:
 * - Background removal (rembg worker)
 * - Zoom in/out
 * - Pan/move
 * - Reset transform
 * - Fit to canvas
 */

import { useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Move,
  Maximize2,
  RotateCcw,
  Eraser,
  Loader2,
  MousePointer,
  Hand,
} from 'lucide-react';

export type ToolMode = 'select' | 'pan';

export interface TransformState {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

interface CanvasToolbarProps {
  transform: TransformState;
  onTransformChange: (transform: TransformState) => void;
  toolMode: ToolMode;
  onToolModeChange: (mode: ToolMode) => void;
  onRemoveBackground: () => void;
  isRemovingBackground: boolean;
  hasTransparentBackground: boolean;
}

export function CanvasToolbar({
  transform,
  onTransformChange,
  toolMode,
  onToolModeChange,
  onRemoveBackground,
  isRemovingBackground,
  hasTransparentBackground,
}: CanvasToolbarProps) {
  const handleZoomIn = useCallback(() => {
    onTransformChange({
      ...transform,
      scale: Math.min(transform.scale * 1.25, 5),
    });
  }, [transform, onTransformChange]);

  const handleZoomOut = useCallback(() => {
    onTransformChange({
      ...transform,
      scale: Math.max(transform.scale / 1.25, 0.25),
    });
  }, [transform, onTransformChange]);

  const handleReset = useCallback(() => {
    onTransformChange({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
    });
  }, [onTransformChange]);

  const handleFit = useCallback(() => {
    onTransformChange({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
    });
  }, [onTransformChange]);

  const zoomPercent = Math.round(transform.scale * 100);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-gray-900/90 backdrop-blur-sm rounded-lg px-2 py-1.5 border border-gray-700/50 shadow-lg">
      {/* Tool Mode */}
      <div className="flex items-center border-r border-gray-700 pr-2 mr-1">
        <ToolButton
          icon={<MousePointer className="h-4 w-4" />}
          label="Select"
          isActive={toolMode === 'select'}
          onClick={() => onToolModeChange('select')}
        />
        <ToolButton
          icon={<Hand className="h-4 w-4" />}
          label="Pan"
          isActive={toolMode === 'pan'}
          onClick={() => onToolModeChange('pan')}
        />
      </div>

      {/* Zoom Controls */}
      <ToolButton
        icon={<ZoomOut className="h-4 w-4" />}
        label="Zoom Out"
        onClick={handleZoomOut}
        disabled={transform.scale <= 0.25}
      />
      <span className="text-xs text-gray-400 w-12 text-center font-mono">
        {zoomPercent}%
      </span>
      <ToolButton
        icon={<ZoomIn className="h-4 w-4" />}
        label="Zoom In"
        onClick={handleZoomIn}
        disabled={transform.scale >= 5}
      />

      <div className="w-px h-5 bg-gray-700 mx-1" />

      {/* Transform Controls */}
      <ToolButton
        icon={<Maximize2 className="h-4 w-4" />}
        label="Fit to Canvas"
        onClick={handleFit}
      />
      <ToolButton
        icon={<RotateCcw className="h-4 w-4" />}
        label="Reset Transform"
        onClick={handleReset}
      />

      <div className="w-px h-5 bg-gray-700 mx-1" />

      {/* Background Removal */}
      <ToolButton
        icon={
          isRemovingBackground ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eraser className="h-4 w-4" />
          )
        }
        label={hasTransparentBackground ? 'Background Removed' : 'Remove Background'}
        onClick={onRemoveBackground}
        disabled={isRemovingBackground || hasTransparentBackground}
        highlight={!hasTransparentBackground}
      />
    </div>
  );
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  highlight?: boolean;
}

function ToolButton({
  icon,
  label,
  onClick,
  isActive = false,
  disabled = false,
  highlight = false,
}: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
        p-1.5 rounded transition-colors
        ${isActive
          ? 'bg-purple-600 text-white'
          : highlight
          ? 'text-purple-400 hover:bg-purple-600/20 hover:text-purple-300'
          : 'text-gray-400 hover:bg-gray-700 hover:text-white'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {icon}
    </button>
  );
}

export const DEFAULT_TRANSFORM: TransformState = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
};
