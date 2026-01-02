'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { AssetPlacement, DragState, PlacementCanvasProps } from './types';
import { 
  getCanvasDimensions, 
  SNAP_SETTINGS, 
  SIZE_CONSTRAINTS,
  getRegionFromPosition,
} from './constants';

/**
 * PlacementCanvas - Interactive canvas for positioning media assets
 * 
 * Features:
 * - Drag to position assets
 * - Resize handles for scaling
 * - Snap-to-grid for precision
 * - Real-time position feedback
 * - Layer ordering visualization
 */
export function PlacementCanvas({
  assetType,
  assets,
  placements,
  onPlacementsChange,
  className,
}: PlacementCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    isResizing: false,
    resizeHandle: null,
    startX: 0,
    startY: 0,
    startPosition: { x: 0, y: 0, anchor: 'center' },
    startSize: { width: 20, height: 20, unit: 'percent', maintainAspectRatio: true },
  });

  const dimensions = useMemo(() => getCanvasDimensions(assetType), [assetType]);
  
  // Calculate canvas display size (fit within container while maintaining aspect ratio)
  const aspectRatio = dimensions.width / dimensions.height;
  
  // Snap position to grid
  const snapToGrid = useCallback((value: number): number => {
    if (!SNAP_SETTINGS.enabled) return value;
    const snapped = Math.round(value / SNAP_SETTINGS.gridSize) * SNAP_SETTINGS.gridSize;
    
    // Snap to edges
    if (Math.abs(snapped) < SNAP_SETTINGS.edgeThreshold) return 0;
    if (Math.abs(snapped - 100) < SNAP_SETTINGS.edgeThreshold) return 100;
    if (Math.abs(snapped - 50) < SNAP_SETTINGS.edgeThreshold) return 50;
    
    return Math.max(0, Math.min(100, snapped));
  }, []);

  // Get canvas-relative coordinates from mouse event
  const getCanvasCoords = useCallback((e: MouseEvent | React.MouseEvent): { x: number; y: number } => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    return { x: snapToGrid(x), y: snapToGrid(y) };
  }, [snapToGrid]);

  // Update a specific placement
  const updatePlacement = useCallback((assetId: string, updates: Partial<AssetPlacement>) => {
    onPlacementsChange(
      placements.map(p => p.assetId === assetId ? { ...p, ...updates } : p)
    );
  }, [placements, onPlacementsChange]);

  // Handle mouse down on asset
  const handleAssetMouseDown = useCallback((
    e: React.MouseEvent,
    placement: AssetPlacement,
    handle?: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedId(placement.assetId);
    
    const coords = getCanvasCoords(e);
    
    setDragState({
      isDragging: !handle,
      isResizing: !!handle,
      resizeHandle: handle || null,
      startX: coords.x,
      startY: coords.y,
      startPosition: { ...placement.position },
      startSize: { ...placement.size },
    });
  }, [getCanvasCoords]);

  // Handle mouse move
  useEffect(() => {
    if (!dragState.isDragging && !dragState.isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const coords = getCanvasCoords(e);
      const deltaX = coords.x - dragState.startX;
      const deltaY = coords.y - dragState.startY;
      
      if (!selectedId) return;
      
      if (dragState.isDragging) {
        // Move the asset
        const newX = snapToGrid(dragState.startPosition.x + deltaX);
        const newY = snapToGrid(dragState.startPosition.y + deltaY);
        
        updatePlacement(selectedId, {
          position: {
            ...dragState.startPosition,
            x: Math.max(0, Math.min(100, newX)),
            y: Math.max(0, Math.min(100, newY)),
          },
        });
      } else if (dragState.isResizing) {
        // Resize the asset
        let newWidth = dragState.startSize.width;
        let newHeight = dragState.startSize.height;
        
        const handle = dragState.resizeHandle;
        
        if (handle?.includes('e')) newWidth = Math.max(SIZE_CONSTRAINTS.minPercent, dragState.startSize.width + deltaX);
        if (handle?.includes('w')) newWidth = Math.max(SIZE_CONSTRAINTS.minPercent, dragState.startSize.width - deltaX);
        if (handle?.includes('s')) newHeight = Math.max(SIZE_CONSTRAINTS.minPercent, dragState.startSize.height + deltaY);
        if (handle?.includes('n')) newHeight = Math.max(SIZE_CONSTRAINTS.minPercent, dragState.startSize.height - deltaY);
        
        // Maintain aspect ratio if enabled
        if (dragState.startSize.maintainAspectRatio) {
          const ratio = dragState.startSize.width / dragState.startSize.height;
          if (handle?.includes('e') || handle?.includes('w')) {
            newHeight = newWidth / ratio;
          } else {
            newWidth = newHeight * ratio;
          }
        }
        
        updatePlacement(selectedId, {
          size: {
            ...dragState.startSize,
            width: Math.min(SIZE_CONSTRAINTS.maxPercent, newWidth),
            height: Math.min(SIZE_CONSTRAINTS.maxPercent, newHeight),
          },
        });
      }
    };
    
    const handleMouseUp = () => {
      setDragState(prev => ({
        ...prev,
        isDragging: false,
        isResizing: false,
        resizeHandle: null,
      }));
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, selectedId, getCanvasCoords, snapToGrid, updatePlacement]);

  // Deselect on canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedId(null);
    }
  }, []);

  // Keyboard controls for selected asset
  useEffect(() => {
    if (!selectedId) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const placement = placements.find(p => p.assetId === selectedId);
      if (!placement) return;
      
      const step = e.shiftKey ? 10 : SNAP_SETTINGS.gridSize;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          updatePlacement(selectedId, {
            position: { ...placement.position, x: Math.max(0, placement.position.x - step) },
          });
          break;
        case 'ArrowRight':
          e.preventDefault();
          updatePlacement(selectedId, {
            position: { ...placement.position, x: Math.min(100, placement.position.x + step) },
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          updatePlacement(selectedId, {
            position: { ...placement.position, y: Math.max(0, placement.position.y - step) },
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          updatePlacement(selectedId, {
            position: { ...placement.position, y: Math.min(100, placement.position.y + step) },
          });
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          onPlacementsChange(placements.filter(p => p.assetId !== selectedId));
          setSelectedId(null);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, placements, updatePlacement, onPlacementsChange]);

  const selectedPlacement = placements.find(p => p.assetId === selectedId);

  return (
    <div className={cn('relative', className)}>
      {/* Canvas Container */}
      <div 
        className="relative mx-auto bg-background-elevated rounded-xl overflow-hidden border-2 border-border-subtle"
        style={{ 
          aspectRatio: `${dimensions.width} / ${dimensions.height}`,
          maxHeight: '60vh',
        }}
      >
        {/* Grid Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--color-border-subtle) 1px, transparent 1px),
              linear-gradient(to bottom, var(--color-border-subtle) 1px, transparent 1px)
            `,
            backgroundSize: '10% 10%',
          }}
        />
        
        {/* Center Guides */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-interactive-500/20" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-interactive-500/20" />
        </div>
        
        {/* Interactive Canvas */}
        <div
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          onClick={handleCanvasClick}
        >
          {/* Placed Assets */}
          {placements
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((placement) => {
              const isSelected = placement.assetId === selectedId;
              
              return (
                <div
                  key={placement.assetId}
                  className={cn(
                    'absolute cursor-move transition-shadow',
                    isSelected && 'ring-2 ring-interactive-500 ring-offset-2 ring-offset-background-base'
                  )}
                  style={{
                    left: `${placement.position.x}%`,
                    top: `${placement.position.y}%`,
                    width: `${placement.size.width}%`,
                    height: `${placement.size.height}%`,
                    transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
                    opacity: placement.opacity / 100,
                    zIndex: placement.zIndex,
                  }}
                  onMouseDown={(e) => handleAssetMouseDown(e, placement)}
                >
                  {/* Asset Image */}
                  <img
                    src={placement.asset.thumbnailUrl || placement.asset.url}
                    alt={placement.asset.displayName}
                    className="w-full h-full object-contain pointer-events-none select-none"
                    draggable={false}
                  />
                  
                  {/* Resize Handles (when selected) */}
                  {isSelected && (
                    <>
                      {/* Corner handles */}
                      {['nw', 'ne', 'sw', 'se'].map((handle) => (
                        <div
                          key={handle}
                          className={cn(
                            'absolute w-3 h-3 bg-interactive-500 rounded-full border-2 border-white shadow-md cursor-nwse-resize',
                            handle === 'nw' && 'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
                            handle === 'ne' && 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
                            handle === 'sw' && 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
                            handle === 'se' && 'bottom-0 right-0 translate-x-1/2 translate-y-1/2'
                          )}
                          onMouseDown={(e) => handleAssetMouseDown(e, placement, handle)}
                        />
                      ))}
                      
                      {/* Edge handles */}
                      {['n', 'e', 's', 'w'].map((handle) => (
                        <div
                          key={handle}
                          className={cn(
                            'absolute bg-interactive-500/50 rounded-sm',
                            (handle === 'n' || handle === 's') && 'left-1/2 -translate-x-1/2 w-8 h-2 cursor-ns-resize',
                            (handle === 'e' || handle === 'w') && 'top-1/2 -translate-y-1/2 w-2 h-8 cursor-ew-resize',
                            handle === 'n' && 'top-0 -translate-y-1/2',
                            handle === 's' && 'bottom-0 translate-y-1/2',
                            handle === 'e' && 'right-0 translate-x-1/2',
                            handle === 'w' && 'left-0 -translate-x-1/2'
                          )}
                          onMouseDown={(e) => handleAssetMouseDown(e, placement, handle)}
                        />
                      ))}
                    </>
                  )}
                </div>
              );
            })}
        </div>
        
        {/* Dimension Label */}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white/80 pointer-events-none">
          {dimensions.width} × {dimensions.height}px
        </div>
      </div>
      
      {/* Position Info */}
      {selectedPlacement && (
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-interactive-500" />
            {getRegionFromPosition(selectedPlacement.position.x, selectedPlacement.position.y)}
          </span>
          <span>X: {Math.round(selectedPlacement.position.x)}%</span>
          <span>Y: {Math.round(selectedPlacement.position.y)}%</span>
          <span>Size: {Math.round(selectedPlacement.size.width)}%</span>
        </div>
      )}
    </div>
  );
}
