/**
 * Auto-Layout Module
 * Smart positioning and arrangement algorithms for canvas elements
 */

import type { AssetPlacement } from '../../placement/types';
import type { CanvasDimensions } from '../types';
import type { AutoLayoutOptions, LayoutPreset, AlignmentOption } from './types';
import { getBoundingBox } from './CollisionDetection';

// ============================================================================
// Layout Presets
// ============================================================================

/**
 * Predefined layout configurations for common arrangements
 */
export const LAYOUT_PRESETS: Record<LayoutPreset, {
  name: string;
  description: string;
  getPositions: (count: number) => Array<{ x: number; y: number }>;
}> = {
  centered: {
    name: 'Centered',
    description: 'All elements centered on canvas',
    getPositions: (count: number) => {
      const positions: Array<{ x: number; y: number }> = [];
      const verticalSpacing = 80 / Math.max(count, 1);
      const startY = 10 + verticalSpacing / 2;
      for (let i = 0; i < count; i++) {
        positions.push({ x: 50, y: startY + i * verticalSpacing });
      }
      return positions;
    },
  },

  'left-heavy': {
    name: 'Left Heavy',
    description: 'Main element on left, others stacked right',
    getPositions: (count: number) => {
      if (count === 0) return [];
      if (count === 1) return [{ x: 30, y: 50 }];
      const positions: Array<{ x: number; y: number }> = [{ x: 25, y: 50 }];
      const rightCount = count - 1;
      const verticalSpacing = 70 / Math.max(rightCount, 1);
      const startY = 15 + verticalSpacing / 2;
      for (let i = 0; i < rightCount; i++) {
        positions.push({ x: 75, y: startY + i * verticalSpacing });
      }
      return positions;
    },
  },

  'right-heavy': {
    name: 'Right Heavy',
    description: 'Main element on right, others stacked left',
    getPositions: (count: number) => {
      if (count === 0) return [];
      if (count === 1) return [{ x: 70, y: 50 }];
      const positions: Array<{ x: number; y: number }> = [{ x: 75, y: 50 }];
      const leftCount = count - 1;
      const verticalSpacing = 70 / Math.max(leftCount, 1);
      const startY = 15 + verticalSpacing / 2;
      for (let i = 0; i < leftCount; i++) {
        positions.push({ x: 25, y: startY + i * verticalSpacing });
      }
      return positions;
    },
  },

  grid: {
    name: 'Grid',
    description: 'Elements arranged in a grid pattern',
    getPositions: (count: number) => {
      if (count === 0) return [];
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const positions: Array<{ x: number; y: number }> = [];
      const cellWidth = 80 / cols;
      const cellHeight = 80 / rows;
      const startX = 10 + cellWidth / 2;
      const startY = 10 + cellHeight / 2;
      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        positions.push({
          x: startX + col * cellWidth,
          y: startY + row * cellHeight,
        });
      }
      return positions;
    },
  },

  diagonal: {
    name: 'Diagonal',
    description: 'Elements arranged diagonally',
    getPositions: (count: number) => {
      if (count === 0) return [];
      const positions: Array<{ x: number; y: number }> = [];
      const step = 70 / Math.max(count - 1, 1);
      for (let i = 0; i < count; i++) {
        positions.push({ x: 15 + i * step, y: 15 + i * step });
      }
      return positions;
    },
  },

  stacked: {
    name: 'Stacked',
    description: 'Elements stacked vertically in center',
    getPositions: (count: number) => {
      if (count === 0) return [];
      const positions: Array<{ x: number; y: number }> = [];
      const spacing = 80 / Math.max(count, 1);
      const startY = 10 + spacing / 2;
      for (let i = 0; i < count; i++) {
        positions.push({ x: 50, y: startY + i * spacing });
      }
      return positions;
    },
  },
};

// ============================================================================
// Layout Application Functions
// ============================================================================

/**
 * Apply a layout preset to placements
 * 
 * @param placements - Current placements to rearrange
 * @param preset - Layout preset to apply
 * @param dimensions - Canvas dimensions
 * @returns Updated placements with new positions
 */
export function applyLayoutPreset(
  placements: AssetPlacement[],
  preset: LayoutPreset,
  dimensions: CanvasDimensions
): AssetPlacement[] {
  const layoutConfig = LAYOUT_PRESETS[preset];
  if (!layoutConfig) return placements;

  const positions = layoutConfig.getPositions(placements.length);
  
  return placements.map((placement, index) => ({
    ...placement,
    position: {
      ...placement.position,
      x: positions[index]?.x ?? placement.position.x,
      y: positions[index]?.y ?? placement.position.y,
    },
  }));
}

/**
 * Default auto-layout options
 */
export const DEFAULT_AUTO_LAYOUT_OPTIONS: AutoLayoutOptions = {
  padding: 10,
  spacing: 10,
  alignment: 'center',
  distribution: 'spread',
};

/**
 * Auto-arrange placements with smart positioning
 * 
 * @param placements - Placements to arrange
 * @param dimensions - Canvas dimensions
 * @param options - Layout options
 * @returns Arranged placements
 */
export function autoArrange(
  placements: AssetPlacement[],
  dimensions: CanvasDimensions,
  options: Partial<AutoLayoutOptions> = {}
): AssetPlacement[] {
  if (placements.length === 0) return [];
  
  const opts = { ...DEFAULT_AUTO_LAYOUT_OPTIONS, ...options };
  const paddingPercent = (opts.padding / dimensions.width) * 100;
  const spacingPercent = (opts.spacing / dimensions.width) * 100;
  
  // Calculate total width needed
  const totalWidthPercent = placements.reduce((sum, p) => {
    return sum + (p.size.unit === 'percent' ? p.size.width : (p.size.width / dimensions.width) * 100);
  }, 0);
  
  const availableWidth = 100 - 2 * paddingPercent;
  const totalSpacing = (placements.length - 1) * spacingPercent;
  
  // Determine starting X based on distribution
  let currentX: number;
  let actualSpacing: number;
  
  if (opts.distribution === 'spread' && placements.length > 1) {
    actualSpacing = (availableWidth - totalWidthPercent) / (placements.length - 1);
    currentX = paddingPercent;
  } else {
    actualSpacing = spacingPercent;
    const contentWidth = totalWidthPercent + totalSpacing;
    currentX = opts.alignment === 'start' 
      ? paddingPercent 
      : opts.alignment === 'end'
        ? 100 - paddingPercent - contentWidth
        : (100 - contentWidth) / 2;
  }

  return placements.map((placement) => {
    const widthPercent = placement.size.unit === 'percent' 
      ? placement.size.width 
      : (placement.size.width / dimensions.width) * 100;
    
    const newX = currentX + widthPercent / 2;
    currentX += widthPercent + actualSpacing;
    
    return {
      ...placement,
      position: {
        ...placement.position,
        x: Math.min(Math.max(newX, paddingPercent), 100 - paddingPercent),
        y: 50, // Center vertically
      },
    };
  });
}

/**
 * Center a single element on the canvas
 * 
 * @param placement - Placement to center
 * @param _dimensions - Canvas dimensions (reserved for future use)
 * @returns Centered placement
 */
export function centerElement(
  placement: AssetPlacement,
  _dimensions: CanvasDimensions
): AssetPlacement {
  return {
    ...placement,
    position: {
      ...placement.position,
      x: 50,
      y: 50,
      anchor: 'center',
    },
  };
}

/**
 * Distribute placements evenly horizontally
 * 
 * @param placements - Placements to distribute
 * @param _dimensions - Canvas dimensions (reserved for future use)
 * @param padding - Padding from edges (percentage)
 * @returns Distributed placements
 */
export function distributeHorizontally(
  placements: AssetPlacement[],
  _dimensions: CanvasDimensions,
  padding: number = 10
): AssetPlacement[] {
  if (placements.length <= 1) return placements;
  
  const availableWidth = 100 - 2 * padding;
  const spacing = availableWidth / (placements.length - 1);
  
  return placements.map((placement, index) => ({
    ...placement,
    position: {
      ...placement.position,
      x: padding + index * spacing,
    },
  }));
}

/**
 * Distribute placements evenly vertically
 * 
 * @param placements - Placements to distribute
 * @param _dimensions - Canvas dimensions (reserved for future use)
 * @param padding - Padding from edges (percentage)
 * @returns Distributed placements
 */
export function distributeVertically(
  placements: AssetPlacement[],
  _dimensions: CanvasDimensions,
  padding: number = 10
): AssetPlacement[] {
  if (placements.length <= 1) return placements;
  
  const availableHeight = 100 - 2 * padding;
  const spacing = availableHeight / (placements.length - 1);
  
  return placements.map((placement, index) => ({
    ...placement,
    position: {
      ...placement.position,
      y: padding + index * spacing,
    },
  }));
}

/**
 * Align elements to a common edge or center
 * 
 * @param placements - Placements to align
 * @param alignment - Alignment option
 * @param dimensions - Canvas dimensions
 * @returns Aligned placements
 */
export function alignElements(
  placements: AssetPlacement[],
  alignment: AlignmentOption,
  dimensions: CanvasDimensions
): AssetPlacement[] {
  if (placements.length === 0) return [];
  
  // Get bounding boxes for all placements
  const boxes = placements.map(p => ({
    placement: p,
    box: getBoundingBox(p, dimensions),
  }));

  // Calculate alignment reference point
  let referenceValue: number;
  
  switch (alignment) {
    case 'left':
      referenceValue = Math.min(...boxes.map(b => b.box.x));
      break;
    case 'right':
      referenceValue = Math.max(...boxes.map(b => b.box.x + b.box.width));
      break;
    case 'center':
      const minX = Math.min(...boxes.map(b => b.box.x));
      const maxX = Math.max(...boxes.map(b => b.box.x + b.box.width));
      referenceValue = (minX + maxX) / 2;
      break;
    case 'top':
      referenceValue = Math.min(...boxes.map(b => b.box.y));
      break;
    case 'bottom':
      referenceValue = Math.max(...boxes.map(b => b.box.y + b.box.height));
      break;
    case 'middle':
      const minY = Math.min(...boxes.map(b => b.box.y));
      const maxY = Math.max(...boxes.map(b => b.box.y + b.box.height));
      referenceValue = (minY + maxY) / 2;
      break;
    default:
      return placements;
  }
  
  // Apply alignment to each placement
  return boxes.map(({ placement, box }) => {
    let newX = placement.position.x;
    let newY = placement.position.y;
    
    switch (alignment) {
      case 'left':
        newX = (referenceValue + box.width / 2) / dimensions.width * 100;
        break;
      case 'right':
        newX = (referenceValue - box.width / 2) / dimensions.width * 100;
        break;
      case 'center':
        newX = referenceValue / dimensions.width * 100;
        break;
      case 'top':
        newY = (referenceValue + box.height / 2) / dimensions.height * 100;
        break;
      case 'bottom':
        newY = (referenceValue - box.height / 2) / dimensions.height * 100;
        break;
      case 'middle':
        newY = referenceValue / dimensions.height * 100;
        break;
    }
    
    return {
      ...placement,
      position: { ...placement.position, x: newX, y: newY },
    };
  });
}
