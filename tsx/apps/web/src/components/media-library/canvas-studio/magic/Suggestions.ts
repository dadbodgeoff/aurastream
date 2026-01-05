/**
 * Suggestions Engine
 * 
 * Analyzes canvas state and provides smart suggestions for improvement.
 * Suggestions help users create better designs with minimal effort.
 */

import type { AssetPlacement } from '../../placement/types';
import type { CanvasDimensions } from '../types';
import type { Suggestion, SuggestionType, SuggestionPriority } from './types';
import { findCollisions, getBoundingBox } from './CollisionDetection';

// ============================================================================
// Suggestion Generators
// ============================================================================

/**
 * Generate a unique suggestion ID
 */
function generateSuggestionId(type: SuggestionType, index: number): string {
  return `${type}-${Date.now()}-${index}`;
}

/**
 * Create a suggestion object
 */
function createSuggestion(
  type: SuggestionType,
  priority: SuggestionPriority,
  message: string,
  action?: Suggestion['action']
): Suggestion {
  return {
    id: generateSuggestionId(type, Math.random()),
    type,
    priority,
    message,
    action,
    dismissed: false,
  };
}

// ============================================================================
// Layout Suggestions
// ============================================================================

/**
 * Check for overlapping elements and suggest fixes
 */
function checkOverlaps(
  placements: AssetPlacement[],
  dimensions: CanvasDimensions
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const collisions = findCollisions(placements, dimensions);
  
  if (collisions.size > 0) {
    const overlappingCount = collisions.size;
    suggestions.push(
      createSuggestion(
        'layout',
        'high',
        `${overlappingCount} element${overlappingCount > 1 ? 's' : ''} overlapping. Try auto-arrange for better spacing.`,
        {
          type: 'AUTO_ARRANGE',
          payload: { preset: 'grid' },
        }
      )
    );
  }
  
  return suggestions;
}

/**
 * Check if elements are too close to edges
 */
function checkEdgeProximity(
  placements: AssetPlacement[],
  dimensions: CanvasDimensions
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const edgeThreshold = 5; // 5% from edge is considered too close
  
  const tooCloseToEdge = placements.filter(p => {
    const box = getBoundingBox(p, dimensions);
    const leftEdge = (box.x / dimensions.width) * 100;
    const rightEdge = ((box.x + box.width) / dimensions.width) * 100;
    const topEdge = (box.y / dimensions.height) * 100;
    const bottomEdge = ((box.y + box.height) / dimensions.height) * 100;
    
    return leftEdge < edgeThreshold || 
           rightEdge > (100 - edgeThreshold) ||
           topEdge < edgeThreshold || 
           bottomEdge > (100 - edgeThreshold);
  });
  
  if (tooCloseToEdge.length > 0) {
    suggestions.push(
      createSuggestion(
        'spacing',
        'medium',
        'Some elements are close to the edge. Add padding for a cleaner look.',
        {
          type: 'ADD_PADDING',
          payload: { padding: 10 },
        }
      )
    );
  }
  
  return suggestions;
}

/**
 * Check for unbalanced layouts
 */
function checkBalance(
  placements: AssetPlacement[],
  dimensions: CanvasDimensions
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  if (placements.length < 2) return suggestions;
  
  // Calculate center of mass
  let totalX = 0;
  let totalY = 0;
  
  for (const p of placements) {
    totalX += p.position.x;
    totalY += p.position.y;
  }
  
  const avgX = totalX / placements.length;
  const avgY = totalY / placements.length;
  
  // Check if heavily weighted to one side
  const xImbalance = Math.abs(avgX - 50);
  const yImbalance = Math.abs(avgY - 50);
  
  if (xImbalance > 25) {
    const side = avgX < 50 ? 'left' : 'right';
    suggestions.push(
      createSuggestion(
        'layout',
        'low',
        `Design is weighted to the ${side}. Consider balancing elements.`,
        {
          type: 'APPLY_LAYOUT',
          payload: { preset: 'centered' },
        }
      )
    );
  }
  
  return suggestions;
}

// ============================================================================
// Alignment Suggestions
// ============================================================================

/**
 * Check if elements could benefit from alignment
 */
function checkAlignment(
  placements: AssetPlacement[],
  dimensions: CanvasDimensions
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  if (placements.length < 2) return suggestions;
  
  // Check for near-alignments (elements almost aligned but not quite)
  const alignmentThreshold = 3; // 3% tolerance
  
  // Check horizontal alignment
  const xPositions = placements.map(p => p.position.x);
  const nearlyAlignedX = xPositions.some((x, i) => 
    xPositions.some((x2, j) => 
      i !== j && Math.abs(x - x2) > 0 && Math.abs(x - x2) < alignmentThreshold
    )
  );
  
  if (nearlyAlignedX) {
    suggestions.push(
      createSuggestion(
        'alignment',
        'low',
        'Some elements are nearly aligned. Snap to perfect alignment?',
        {
          type: 'ALIGN_ELEMENTS',
          payload: { alignment: 'center' },
        }
      )
    );
  }
  
  return suggestions;
}

// ============================================================================
// Content Suggestions
// ============================================================================

/**
 * Check for empty canvas
 */
function checkEmptyCanvas(placements: AssetPlacement[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  if (placements.length === 0) {
    suggestions.push(
      createSuggestion(
        'layout',
        'high',
        'Canvas is empty. Add some assets to get started!',
        {
          type: 'OPEN_ASSET_PICKER',
          payload: {},
        }
      )
    );
  }
  
  return suggestions;
}

/**
 * Check for single element that could be centered
 */
function checkSingleElement(
  placements: AssetPlacement[],
  dimensions: CanvasDimensions
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  if (placements.length === 1) {
    const p = placements[0];
    const distFromCenter = Math.sqrt(
      Math.pow(p.position.x - 50, 2) + Math.pow(p.position.y - 50, 2)
    );
    
    if (distFromCenter > 10) {
      suggestions.push(
        createSuggestion(
          'layout',
          'medium',
          'Center your element for a balanced look?',
          {
            type: 'CENTER_ELEMENT',
            payload: { assetId: p.assetId },
          }
        )
      );
    }
  }
  
  return suggestions;
}

// ============================================================================
// Main Suggestion Generator
// ============================================================================

export interface SuggestionOptions {
  /** Maximum number of suggestions to return */
  maxSuggestions?: number;
  /** Types of suggestions to include */
  includeTypes?: SuggestionType[];
  /** Minimum priority level */
  minPriority?: SuggestionPriority;
}

const DEFAULT_OPTIONS: Required<SuggestionOptions> = {
  maxSuggestions: 5,
  includeTypes: ['layout', 'spacing', 'alignment'],
  minPriority: 'low',
};

const PRIORITY_ORDER: Record<SuggestionPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Generate all applicable suggestions for the current canvas state
 * 
 * @param placements - Current placements on canvas
 * @param dimensions - Canvas dimensions
 * @param options - Suggestion generation options
 * @returns Array of suggestions sorted by priority
 */
export function generateSuggestions(
  placements: AssetPlacement[],
  dimensions: CanvasDimensions,
  options: SuggestionOptions = {}
): Suggestion[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Collect all suggestions
  const allSuggestions: Suggestion[] = [
    ...checkEmptyCanvas(placements),
    ...checkSingleElement(placements, dimensions),
    ...checkOverlaps(placements, dimensions),
    ...checkEdgeProximity(placements, dimensions),
    ...checkBalance(placements, dimensions),
    ...checkAlignment(placements, dimensions),
  ];
  
  // Filter by type
  const filteredByType = allSuggestions.filter(s => 
    opts.includeTypes.includes(s.type)
  );
  
  // Filter by priority
  const minPriorityValue = PRIORITY_ORDER[opts.minPriority];
  const filteredByPriority = filteredByType.filter(s =>
    PRIORITY_ORDER[s.priority] >= minPriorityValue
  );
  
  // Sort by priority (high first)
  const sorted = filteredByPriority.sort((a, b) =>
    PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]
  );
  
  // Limit count
  return sorted.slice(0, opts.maxSuggestions);
}

/**
 * Apply a suggestion action
 * Returns the action type and payload for the parent to handle
 */
export function getSuggestionAction(suggestion: Suggestion): {
  type: string;
  payload: Record<string, unknown>;
} | null {
  return suggestion.action ?? null;
}
