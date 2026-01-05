/**
 * Snap Guides Component
 * 
 * Shows alignment guides when dragging elements.
 * Guides appear when elements align with canvas center, edges, or other elements.
 */

'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { AssetPlacement } from '../../placement/types';
import type { CanvasDimensions } from '../types';

// ============================================================================
// Types
// ============================================================================

interface SnapLine {
  type: 'horizontal' | 'vertical';
  position: number; // percentage 0-100
  label?: string;
  variant: 'center' | 'edge' | 'element';
}

interface SnapGuidesProps {
  placements: AssetPlacement[];
  dimensions: CanvasDimensions;
  activeElementId: string | null;
  activePosition?: { x: number; y: number };
  snapThreshold?: number; // percentage threshold for snapping
  showCenterGuides?: boolean;
  showEdgeGuides?: boolean;
  showElementGuides?: boolean;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SNAP_THRESHOLD = 2; // 2% of canvas
const EDGE_GUIDE_POSITIONS = [10, 90]; // 10% and 90% from edges

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a value is within the snap threshold of a target
 */
function isWithinThreshold(value: number, target: number, threshold: number): boolean {
  return Math.abs(value - target) <= threshold;
}

/**
 * Get the center position of a placement
 */
function getPlacementCenter(placement: AssetPlacement): { x: number; y: number } {
  return {
    x: placement.position.x,
    y: placement.position.y,
  };
}

/**
 * Get the edges of a placement
 */
function getPlacementEdges(placement: AssetPlacement): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  const halfWidth = placement.size.width / 2;
  const halfHeight = placement.size.height / 2;
  
  return {
    left: placement.position.x - halfWidth,
    right: placement.position.x + halfWidth,
    top: placement.position.y - halfHeight,
    bottom: placement.position.y + halfHeight,
  };
}

// ============================================================================
// Snap Guide Line Component
// ============================================================================

interface SnapLineProps {
  line: SnapLine;
  canvasWidth: number;
  canvasHeight: number;
}

function SnapLineComponent({ line, canvasWidth, canvasHeight }: SnapLineProps) {
  const variantStyles = {
    center: 'bg-interactive-500',
    edge: 'bg-amber-500',
    element: 'bg-emerald-500',
  };
  
  const style = line.type === 'horizontal'
    ? {
        left: 0,
        right: 0,
        top: `${line.position}%`,
        height: '1px',
      }
    : {
        top: 0,
        bottom: 0,
        left: `${line.position}%`,
        width: '1px',
      };
  
  return (
    <div
      className={cn(
        'absolute pointer-events-none',
        variantStyles[line.variant]
      )}
      style={style}
    >
      {/* Dashed overlay for better visibility */}
      <div
        className={cn(
          'absolute inset-0',
          line.type === 'horizontal' ? 'border-t border-dashed' : 'border-l border-dashed',
          line.variant === 'center' && 'border-interactive-400',
          line.variant === 'edge' && 'border-amber-400',
          line.variant === 'element' && 'border-emerald-400'
        )}
      />
      
      {/* Label */}
      {line.label && (
        <div
          className={cn(
            'absolute px-1.5 py-0.5 text-[10px] font-medium rounded whitespace-nowrap',
            line.variant === 'center' && 'bg-interactive-500 text-white',
            line.variant === 'edge' && 'bg-amber-500 text-white',
            line.variant === 'element' && 'bg-emerald-500 text-white',
            line.type === 'horizontal' ? 'left-2 -translate-y-1/2' : 'top-2 -translate-x-1/2'
          )}
        >
          {line.label}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SnapGuides({
  placements,
  dimensions,
  activeElementId,
  activePosition,
  snapThreshold = DEFAULT_SNAP_THRESHOLD,
  showCenterGuides = true,
  showEdgeGuides = true,
  showElementGuides = true,
  className,
}: SnapGuidesProps) {
  // Calculate which guides should be visible based on active element position
  const visibleGuides = useMemo(() => {
    if (!activeElementId || !activePosition) return [];
    
    const guides: SnapLine[] = [];
    const { x, y } = activePosition;
    
    // Center guides (50% horizontal and vertical)
    if (showCenterGuides) {
      if (isWithinThreshold(x, 50, snapThreshold)) {
        guides.push({
          type: 'vertical',
          position: 50,
          label: 'Center',
          variant: 'center',
        });
      }
      if (isWithinThreshold(y, 50, snapThreshold)) {
        guides.push({
          type: 'horizontal',
          position: 50,
          label: 'Center',
          variant: 'center',
        });
      }
    }
    
    // Edge guides (10% and 90%)
    if (showEdgeGuides) {
      for (const edgePos of EDGE_GUIDE_POSITIONS) {
        if (isWithinThreshold(x, edgePos, snapThreshold)) {
          guides.push({
            type: 'vertical',
            position: edgePos,
            label: `${edgePos}%`,
            variant: 'edge',
          });
        }
        if (isWithinThreshold(y, edgePos, snapThreshold)) {
          guides.push({
            type: 'horizontal',
            position: edgePos,
            label: `${edgePos}%`,
            variant: 'edge',
          });
        }
      }
    }
    
    // Element-to-element alignment guides
    if (showElementGuides) {
      const otherPlacements = placements.filter(p => p.assetId !== activeElementId);
      
      for (const placement of otherPlacements) {
        const center = getPlacementCenter(placement);
        const edges = getPlacementEdges(placement);
        
        // Center alignment
        if (isWithinThreshold(x, center.x, snapThreshold)) {
          guides.push({
            type: 'vertical',
            position: center.x,
            variant: 'element',
          });
        }
        if (isWithinThreshold(y, center.y, snapThreshold)) {
          guides.push({
            type: 'horizontal',
            position: center.y,
            variant: 'element',
          });
        }
        
        // Edge alignment
        if (isWithinThreshold(x, edges.left, snapThreshold)) {
          guides.push({
            type: 'vertical',
            position: edges.left,
            variant: 'element',
          });
        }
        if (isWithinThreshold(x, edges.right, snapThreshold)) {
          guides.push({
            type: 'vertical',
            position: edges.right,
            variant: 'element',
          });
        }
        if (isWithinThreshold(y, edges.top, snapThreshold)) {
          guides.push({
            type: 'horizontal',
            position: edges.top,
            variant: 'element',
          });
        }
        if (isWithinThreshold(y, edges.bottom, snapThreshold)) {
          guides.push({
            type: 'horizontal',
            position: edges.bottom,
            variant: 'element',
          });
        }
      }
    }
    
    // Remove duplicates based on type and position
    const uniqueGuides = guides.filter((guide, index, self) =>
      index === self.findIndex(g => g.type === guide.type && g.position === guide.position)
    );
    
    return uniqueGuides;
  }, [
    activeElementId,
    activePosition,
    placements,
    snapThreshold,
    showCenterGuides,
    showEdgeGuides,
    showElementGuides,
  ]);
  
  if (visibleGuides.length === 0) return null;
  
  return (
    <div className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}>
      {visibleGuides.map((line, index) => (
        <SnapLineComponent
          key={`${line.type}-${line.position}-${index}`}
          line={line}
          canvasWidth={dimensions.width}
          canvasHeight={dimensions.height}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Utility Export: Calculate Snap Position
// ============================================================================

/**
 * Calculate the snapped position for an element
 * Returns the position adjusted to snap to guides if within threshold
 */
export function calculateSnappedPosition(
  position: { x: number; y: number },
  placements: AssetPlacement[],
  activeElementId: string,
  snapThreshold: number = DEFAULT_SNAP_THRESHOLD,
  options: {
    snapToCenter?: boolean;
    snapToEdges?: boolean;
    snapToElements?: boolean;
  } = {}
): { x: number; y: number; snappedX: boolean; snappedY: boolean } {
  const {
    snapToCenter = true,
    snapToEdges = true,
    snapToElements = true,
  } = options;
  
  let { x, y } = position;
  let snappedX = false;
  let snappedY = false;
  
  // Snap to center
  if (snapToCenter) {
    if (isWithinThreshold(x, 50, snapThreshold)) {
      x = 50;
      snappedX = true;
    }
    if (isWithinThreshold(y, 50, snapThreshold)) {
      y = 50;
      snappedY = true;
    }
  }
  
  // Snap to edges
  if (snapToEdges && !snappedX) {
    for (const edgePos of EDGE_GUIDE_POSITIONS) {
      if (isWithinThreshold(x, edgePos, snapThreshold)) {
        x = edgePos;
        snappedX = true;
        break;
      }
    }
  }
  if (snapToEdges && !snappedY) {
    for (const edgePos of EDGE_GUIDE_POSITIONS) {
      if (isWithinThreshold(y, edgePos, snapThreshold)) {
        y = edgePos;
        snappedY = true;
        break;
      }
    }
  }
  
  // Snap to other elements
  if (snapToElements) {
    const otherPlacements = placements.filter(p => p.assetId !== activeElementId);
    
    for (const placement of otherPlacements) {
      const center = getPlacementCenter(placement);
      const edges = getPlacementEdges(placement);
      
      if (!snappedX) {
        if (isWithinThreshold(x, center.x, snapThreshold)) {
          x = center.x;
          snappedX = true;
        } else if (isWithinThreshold(x, edges.left, snapThreshold)) {
          x = edges.left;
          snappedX = true;
        } else if (isWithinThreshold(x, edges.right, snapThreshold)) {
          x = edges.right;
          snappedX = true;
        }
      }
      
      if (!snappedY) {
        if (isWithinThreshold(y, center.y, snapThreshold)) {
          y = center.y;
          snappedY = true;
        } else if (isWithinThreshold(y, edges.top, snapThreshold)) {
          y = edges.top;
          snappedY = true;
        } else if (isWithinThreshold(y, edges.bottom, snapThreshold)) {
          y = edges.bottom;
          snappedY = true;
        }
      }
      
      if (snappedX && snappedY) break;
    }
  }
  
  return { x, y, snappedX, snappedY };
}
