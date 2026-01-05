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
  selectedId: controlledSelectedId,
  onSelectionChange,
  isInteractive = true,
  className,
}: PlacementCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Support both controlled and uncontrolled selection
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const selectedId = controlledSelectedId !== undefined ? controlledSelectedId : internalSelectedId;
  const setSelectedId = useCallback((id: string | null) => {
    if (onSelectionChange) {
      onSelectionChange(id);
    } else {
      setInternalSelectedId(id);
    }
  }, [onSelectionChange]);
  
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
    if (!isInteractive) return;
    
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
  }, [isInteractive, getCanvasCoords]);

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
        // Resize the asset - scale deltas for better responsiveness
        const resizeMultiplier = 1.5; // Make resize more responsive
        const scaledDeltaX = deltaX * resizeMultiplier;
        const scaledDeltaY = deltaY * resizeMultiplier;
        
        let newWidth = dragState.startSize.width;
        let newHeight = dragState.startSize.height;
        
        const handle = dragState.resizeHandle;
        
        if (handle?.includes('e')) newWidth = Math.max(SIZE_CONSTRAINTS.minPercent, dragState.startSize.width + scaledDeltaX);
        if (handle?.includes('w')) newWidth = Math.max(SIZE_CONSTRAINTS.minPercent, dragState.startSize.width - scaledDeltaX);
        if (handle?.includes('s')) newHeight = Math.max(SIZE_CONSTRAINTS.minPercent, dragState.startSize.height + scaledDeltaY);
        if (handle?.includes('n')) newHeight = Math.max(SIZE_CONSTRAINTS.minPercent, dragState.startSize.height - scaledDeltaY);
        
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

  // Deselect on canvas click (only if clicking the canvas background, not an asset)
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!isInteractive) return;
    // Only deselect if the click target is the canvas itself, not a child element
    if (e.target === canvasRef.current) {
      setSelectedId(null);
    }
  }, [isInteractive, setSelectedId]);

  // Keyboard controls for selected asset
  useEffect(() => {
    if (!selectedId || !isInteractive) return;
    
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
  }, [selectedId, placements, updatePlacement, onPlacementsChange, setSelectedId]);

  const selectedPlacement = placements.find(p => p.assetId === selectedId);

  // Check if we're being used as an overlay (absolute positioning from parent)
  // In this case, we should fill the parent container, not create our own dimensions
  const isOverlayMode = className?.includes('absolute');

  return (
    <div className={cn(
      'relative',
      isOverlayMode ? 'w-full h-full' : 'flex items-center justify-center',
      className
    )}>
      {/* Canvas Container */}
      <div 
        className={cn(
          "relative bg-background-elevated overflow-hidden",
          isOverlayMode 
            ? "w-full h-full" 
            : "mx-auto rounded-xl border-2 border-border-subtle"
        )}
        style={isOverlayMode ? undefined : { 
          aspectRatio: `${dimensions.width} / ${dimensions.height}`,
          maxHeight: '60vh',
          maxWidth: dimensions.width > dimensions.height ? '100%' : `calc(60vh * ${dimensions.width / dimensions.height})`,
          width: '100%',
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
          className={cn(
            "absolute inset-0",
            isInteractive ? "cursor-default" : "pointer-events-none"
          )}
          onClick={handleCanvasClick}
        >
          {/* Placed Assets */}
          {placements
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((placement) => {
              const isSelected = placement.assetId === selectedId;
              // Use object-cover when asset is meant to fill (size >= 95%)
              const isFillMode = placement.size.width >= 95 && placement.size.height >= 95;
              
              return (
                <div
                  key={placement.assetId}
                  className={cn(
                    'absolute cursor-move',
                    isSelected && 'ring-1 ring-interactive-500'
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
                  {/* Asset Image - use object-cover for fill mode */}
                  <img
                    src={placement.asset.processedUrl || placement.asset.thumbnailUrl || placement.asset.url}
                    alt={placement.asset.displayName}
                    className={cn(
                      'w-full h-full pointer-events-none select-none',
                      isFillMode ? 'object-cover' : 'object-contain'
                    )}
                    draggable={false}
                  />
                  
                  {/* Resize Handles (when selected) - smaller */}
                  {isSelected && (
                    <>
                      {/* Corner handles - smaller */}
                      {['nw', 'ne', 'sw', 'se'].map((handle) => (
                        <div
                          key={handle}
                          className={cn(
                            'absolute w-2 h-2 bg-interactive-500 rounded-full border border-white shadow cursor-nwse-resize',
                            handle === 'nw' && 'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
                            handle === 'ne' && 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
                            handle === 'sw' && 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
                            handle === 'se' && 'bottom-0 right-0 translate-x-1/2 translate-y-1/2'
                          )}
                          onMouseDown={(e) => handleAssetMouseDown(e, placement, handle)}
                        />
                      ))}
                      
                      {/* Edge handles - smaller */}
                      {['n', 'e', 's', 'w'].map((handle) => (
                        <div
                          key={handle}
                          className={cn(
                            'absolute bg-interactive-500/60 rounded-sm',
                            (handle === 'n' || handle === 's') && 'left-1/2 -translate-x-1/2 w-6 h-1.5 cursor-ns-resize',
                            (handle === 'e' || handle === 'w') && 'top-1/2 -translate-y-1/2 w-1.5 h-6 cursor-ew-resize',
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
        
        {/* Dimension Label - only show when not in overlay mode */}
        {!isOverlayMode && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white/80 pointer-events-none">
            {dimensions.width} × {dimensions.height}px
          </div>
        )}
      </div>
      
      {/* Position Info - only show when not in overlay mode */}
      {!isOverlayMode && selectedPlacement && (
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
