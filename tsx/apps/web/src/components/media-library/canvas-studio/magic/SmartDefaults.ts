/**
 * Smart Defaults Module
 * Context-aware default values for asset placement
 */

import type { AssetPlacement } from '../../placement/types';
import type { CanvasDimensions } from '../types';
import type { SmartSize, SmartPosition } from './types';
import { checkPlacementCollision, suggestNonCollidingPosition } from './CollisionDetection';

// ============================================================================
// Size Recommendations
// ============================================================================

/**
 * Size recommendations by asset type and canvas type
 * Values are percentages of canvas dimensions
 */
const SIZE_RECOMMENDATIONS: Record<string, Record<string, SmartSize>> = {
  // Logo placements
  logo: {
    twitch_emote: { widthPercent: 80, heightPercent: 80, maintainAspectRatio: true },
    twitch_badge: { widthPercent: 70, heightPercent: 70, maintainAspectRatio: true },
    twitch_banner: { widthPercent: 25, heightPercent: 40, maintainAspectRatio: true },
    youtube_thumbnail: { widthPercent: 15, heightPercent: 20, maintainAspectRatio: true },
    overlay: { widthPercent: 10, heightPercent: 15, maintainAspectRatio: true },
    default: { widthPercent: 20, heightPercent: 20, maintainAspectRatio: true },
  },
  // Character/avatar placements
  character: {
    twitch_emote: { widthPercent: 90, heightPercent: 90, maintainAspectRatio: true },
    youtube_thumbnail: { widthPercent: 40, heightPercent: 70, maintainAspectRatio: true },
    twitch_banner: { widthPercent: 30, heightPercent: 60, maintainAspectRatio: true },
    overlay: { widthPercent: 25, heightPercent: 40, maintainAspectRatio: true },
    default: { widthPercent: 35, heightPercent: 50, maintainAspectRatio: true },
  },
  // Background elements
  background: {
    twitch_emote: { widthPercent: 100, heightPercent: 100, maintainAspectRatio: false },
    youtube_thumbnail: { widthPercent: 100, heightPercent: 100, maintainAspectRatio: false },
    twitch_banner: { widthPercent: 100, heightPercent: 100, maintainAspectRatio: false },
    overlay: { widthPercent: 100, heightPercent: 100, maintainAspectRatio: false },
    default: { widthPercent: 100, heightPercent: 100, maintainAspectRatio: false },
  },
  // Icon/badge elements
  icon: {
    twitch_emote: { widthPercent: 30, heightPercent: 30, maintainAspectRatio: true },
    youtube_thumbnail: { widthPercent: 10, heightPercent: 15, maintainAspectRatio: true },
    twitch_banner: { widthPercent: 8, heightPercent: 15, maintainAspectRatio: true },
    overlay: { widthPercent: 8, heightPercent: 12, maintainAspectRatio: true },
    default: { widthPercent: 15, heightPercent: 15, maintainAspectRatio: true },
  },
  // Default for unknown asset types
  default: {
    twitch_emote: { widthPercent: 60, heightPercent: 60, maintainAspectRatio: true },
    youtube_thumbnail: { widthPercent: 30, heightPercent: 40, maintainAspectRatio: true },
    twitch_banner: { widthPercent: 25, heightPercent: 40, maintainAspectRatio: true },
    overlay: { widthPercent: 20, heightPercent: 30, maintainAspectRatio: true },
    default: { widthPercent: 30, heightPercent: 30, maintainAspectRatio: true },
  },
};

/**
 * Get recommended size for an asset based on context
 * 
 * @param assetType - Type of asset being placed (logo, character, etc.)
 * @param canvasType - Type of canvas (twitch_emote, youtube_thumbnail, etc.)
 * @param _dimensions - Canvas dimensions (reserved for future pixel-based calculations)
 * @returns Recommended size configuration
 */
export function getSmartSize(
  assetType: string,
  canvasType: string,
  _dimensions: CanvasDimensions
): SmartSize {
  const assetSizes = SIZE_RECOMMENDATIONS[assetType] || SIZE_RECOMMENDATIONS.default;
  const size = assetSizes[canvasType] || assetSizes.default;
  
  return size;
}

// ============================================================================
// Position Recommendations
// ============================================================================

/**
 * Default positions for different asset types
 * Values are percentages (0-100)
 */
const POSITION_RECOMMENDATIONS: Record<string, SmartPosition> = {
  logo: { x: 85, y: 15 },        // Top-right corner
  watermark: { x: 90, y: 90 },   // Bottom-right corner
  character: { x: 50, y: 50 },   // Center
  background: { x: 50, y: 50 },  // Center (full coverage)
  icon: { x: 15, y: 15 },        // Top-left corner
  text: { x: 50, y: 80 },        // Bottom center
  default: { x: 50, y: 50 },     // Center
};

/**
 * Fallback positions when primary position is occupied
 * Ordered by preference
 */
const FALLBACK_POSITIONS: SmartPosition[] = [
  { x: 50, y: 50 },   // Center
  { x: 25, y: 50 },   // Left center
  { x: 75, y: 50 },   // Right center
  { x: 50, y: 25 },   // Top center
  { x: 50, y: 75 },   // Bottom center
  { x: 25, y: 25 },   // Top-left quadrant
  { x: 75, y: 25 },   // Top-right quadrant
  { x: 25, y: 75 },   // Bottom-left quadrant
  { x: 75, y: 75 },   // Bottom-right quadrant
];

/**
 * Get recommended position for an asset based on context
 * Considers existing placements to avoid overlaps
 * 
 * @param assetType - Type of asset being placed
 * @param existingPlacements - Current placements on canvas
 * @param dimensions - Canvas dimensions
 * @returns Recommended position
 */
export function getSmartPosition(
  assetType: string,
  existingPlacements: AssetPlacement[],
  dimensions: CanvasDimensions
): SmartPosition {
  // Get default position for this asset type
  const defaultPosition = POSITION_RECOMMENDATIONS[assetType] || POSITION_RECOMMENDATIONS.default;
  
  // If no existing placements, use default
  if (existingPlacements.length === 0) {
    return defaultPosition;
  }

  // Create a test placement to check for collisions
  const testPlacement: AssetPlacement = {
    assetId: '__test__',
    asset: {} as any,
    position: {
      x: defaultPosition.x,
      y: defaultPosition.y,
      anchor: 'center',
    },
    size: {
      width: 20,
      height: 20,
      unit: 'percent',
      maintainAspectRatio: true,
    },
    zIndex: 0,
    rotation: 0,
    opacity: 100,
  };
  
  // Check if default position has collision
  const collision = checkPlacementCollision(testPlacement, existingPlacements, dimensions);
  
  if (!collision.hasCollision) {
    return defaultPosition;
  }
  
  // Try to find a non-colliding position
  const suggestedPos = suggestNonCollidingPosition(testPlacement, existingPlacements, dimensions);
  
  if (suggestedPos) {
    return suggestedPos;
  }
  
  // Try fallback positions
  for (const fallback of FALLBACK_POSITIONS) {
    const fallbackPlacement = {
      ...testPlacement,
      position: { ...testPlacement.position, x: fallback.x, y: fallback.y },
    };
    
    const fallbackCollision = checkPlacementCollision(fallbackPlacement, existingPlacements, dimensions);
    
    if (!fallbackCollision.hasCollision) {
      return fallback;
    }
  }
  
  // Last resort: return default position (will overlap)
  return defaultPosition;
}

// ============================================================================
// Z-Index Management
// ============================================================================

/**
 * Z-index defaults by asset type
 * Higher values appear on top
 */
const Z_INDEX_DEFAULTS: Record<string, number> = {
  background: 0,
  character: 10,
  logo: 20,
  icon: 25,
  text: 30,
  watermark: 50,
  default: 15,
};

/**
 * Get the next appropriate z-index for a new placement
 * 
 * @param existingPlacements - Current placements on canvas
 * @param assetType - Optional asset type for type-based z-index
 * @returns Recommended z-index value
 */
export function getSmartZIndex(
  existingPlacements: AssetPlacement[],
  assetType?: string
): number {
  // If we have a known asset type, use its default
  if (assetType && Z_INDEX_DEFAULTS[assetType] !== undefined) {
    const baseZIndex = Z_INDEX_DEFAULTS[assetType];
    
    // Find max z-index among same-type elements
    const sameTypeMax = existingPlacements
      .filter(p => p.zIndex >= baseZIndex && p.zIndex < baseZIndex + 10)
      .reduce((max, p) => Math.max(max, p.zIndex), baseZIndex - 1);
    
    return sameTypeMax + 1;
  }
  
  // Default: place on top of everything
  if (existingPlacements.length === 0) {
    return Z_INDEX_DEFAULTS.default;
  }
  
  const maxZIndex = Math.max(...existingPlacements.map(p => p.zIndex));
  return maxZIndex + 1;
}

/**
 * Get all smart defaults for a new asset placement
 * 
 * @param assetType - Type of asset being placed
 * @param canvasType - Type of canvas
 * @param existingPlacements - Current placements
 * @param dimensions - Canvas dimensions
 * @returns Object with recommended size, position, and z-index
 */
export function getAllSmartDefaults(
  assetType: string,
  canvasType: string,
  existingPlacements: AssetPlacement[],
  dimensions: CanvasDimensions
): {
  size: SmartSize;
  position: SmartPosition;
  zIndex: number;
} {
  return {
    size: getSmartSize(assetType, canvasType, dimensions),
    position: getSmartPosition(assetType, existingPlacements, dimensions),
    zIndex: getSmartZIndex(existingPlacements, assetType),
  };
}
