/**
 * Canvas Bounds System - Computation Functions
 * 
 * Computes safe zones, constraints, and positions from configuration.
 */

import type {
  CanvasBoundsConfig,
  CanvasDimensions,
  ComputedBounds,
  SafeZoneMargins,
  SafeZonePreset,
  AnimationConstraints,
  PropertyConstraint,
  ElementPlacement,
  AnchorPoint,
} from './types';

import {
  CANVAS_PRESETS,
  SAFE_ZONE_PRESETS,
  DEFAULT_BOUNDS_CONFIG,
} from './types';

// ============================================================================
// Bounds Computation
// ============================================================================

/**
 * Compute bounds from configuration.
 */
export function computeBounds(config: Partial<CanvasBoundsConfig> = {}): ComputedBounds {
  const fullConfig: CanvasBoundsConfig = { ...DEFAULT_BOUNDS_CONFIG, ...config };
  
  // Get dimensions
  const dimensions = fullConfig.preset === 'custom' 
    ? fullConfig.dimensions 
    : CANVAS_PRESETS[fullConfig.preset];
  
  // Get safe zone margins
  const margins = typeof fullConfig.safeZone === 'string'
    ? SAFE_ZONE_PRESETS[fullConfig.safeZone]
    : fullConfig.safeZone;
  
  // Compute safe zone rectangle
  const safeZone = {
    x: dimensions.width * margins.left + fullConfig.innerPadding,
    y: dimensions.height * margins.top + fullConfig.innerPadding,
    width: dimensions.width * (1 - margins.left - margins.right) - fullConfig.innerPadding * 2,
    height: dimensions.height * (1 - margins.top - margins.bottom) - fullConfig.innerPadding * 2,
  };
  
  // Compute center
  const center = {
    x: safeZone.x + safeZone.width / 2,
    y: safeZone.y + safeZone.height / 2,
  };
  
  // Compute max extent (how far from center animations can go)
  const maxExtent = {
    x: safeZone.width / 2,
    y: safeZone.height / 2,
  };
  
  // Compute scale factor relative to 1080p
  const baseWidth = CANVAS_PRESETS['1080p'].width;
  const scaleFactor = dimensions.width / baseWidth;
  
  return {
    canvas: dimensions,
    safeZone,
    center,
    maxExtent,
    aspectRatio: dimensions.width / dimensions.height,
    scaleFactor,
  };
}

/**
 * Get safe zone margins from preset or custom config.
 */
export function getSafeZoneMargins(
  safeZone: SafeZonePreset | SafeZoneMargins
): SafeZoneMargins {
  return typeof safeZone === 'string' ? SAFE_ZONE_PRESETS[safeZone] : safeZone;
}

// ============================================================================
// Constraint Generation
// ============================================================================

/**
 * Generate animation constraints from computed bounds.
 */
export function generateConstraints(bounds: ComputedBounds): AnimationConstraints {
  return {
    positionX: {
      min: -bounds.maxExtent.x,
      max: bounds.maxExtent.x,
      overflow: 'clamp',
    },
    positionY: {
      min: -bounds.maxExtent.y,
      max: bounds.maxExtent.y,
      overflow: 'clamp',
    },
    scale: {
      min: 0.1,
      max: 3.0,
      overflow: 'clamp',
    },
    rotation: {
      min: -Math.PI * 2,
      max: Math.PI * 2,
      overflow: 'wrap',
    },
  };
}

/**
 * Generate particle-specific constraints (more lenient).
 */
export function generateParticleConstraints(bounds: ComputedBounds): AnimationConstraints {
  // Particles can go slightly outside safe zone for visual effect
  const overflow = 1.2;
  
  return {
    positionX: {
      min: -bounds.maxExtent.x * overflow,
      max: bounds.maxExtent.x * overflow,
      overflow: 'fade',
      fadeDistance: 0.2,
    },
    positionY: {
      min: -bounds.maxExtent.y * overflow,
      max: bounds.maxExtent.y * overflow,
      overflow: 'fade',
      fadeDistance: 0.2,
    },
    scale: {
      min: 0.01,
      max: 2.0,
      overflow: 'clamp',
    },
    rotation: {
      min: -Math.PI * 4,
      max: Math.PI * 4,
      overflow: 'none',
    },
  };
}

// ============================================================================
// Value Constraining
// ============================================================================

/**
 * Apply constraint to a value.
 */
export function constrainValue(
  value: number,
  constraint: PropertyConstraint
): number {
  switch (constraint.overflow) {
    case 'clamp':
      return Math.max(constraint.min, Math.min(constraint.max, value));
    
    case 'wrap': {
      const range = constraint.max - constraint.min;
      let wrapped = ((value - constraint.min) % range + range) % range + constraint.min;
      return wrapped;
    }
    
    case 'bounce': {
      const range = constraint.max - constraint.min;
      let bounced = value;
      while (bounced < constraint.min || bounced > constraint.max) {
        if (bounced < constraint.min) {
          bounced = constraint.min + (constraint.min - bounced);
        }
        if (bounced > constraint.max) {
          bounced = constraint.max - (bounced - constraint.max);
        }
      }
      return bounced;
    }
    
    case 'fade':
    case 'none':
    default:
      return value;
  }
}

/**
 * Calculate fade factor for 'fade' overflow behavior.
 * Returns 1 when fully inside, 0 when at boundary.
 */
export function calculateFadeFactor(
  value: number,
  constraint: PropertyConstraint
): number {
  if (constraint.overflow !== 'fade') return 1;
  
  const fadeDistance = constraint.fadeDistance ?? 0.1;
  const range = constraint.max - constraint.min;
  const fadePixels = range * fadeDistance;
  
  // Distance from nearest boundary
  const distFromMin = value - constraint.min;
  const distFromMax = constraint.max - value;
  const minDist = Math.min(distFromMin, distFromMax);
  
  if (minDist >= fadePixels) return 1;
  if (minDist <= 0) return 0;
  
  return minDist / fadePixels;
}

// ============================================================================
// Position Calculation
// ============================================================================

/**
 * Calculate anchor position in pixels.
 */
export function getAnchorPosition(
  anchor: AnchorPoint,
  bounds: ComputedBounds
): { x: number; y: number } {
  const { safeZone } = bounds;
  
  const positions: Record<AnchorPoint, { x: number; y: number }> = {
    'center': { x: safeZone.x + safeZone.width / 2, y: safeZone.y + safeZone.height / 2 },
    'top-left': { x: safeZone.x, y: safeZone.y },
    'top-center': { x: safeZone.x + safeZone.width / 2, y: safeZone.y },
    'top-right': { x: safeZone.x + safeZone.width, y: safeZone.y },
    'middle-left': { x: safeZone.x, y: safeZone.y + safeZone.height / 2 },
    'middle-right': { x: safeZone.x + safeZone.width, y: safeZone.y + safeZone.height / 2 },
    'bottom-left': { x: safeZone.x, y: safeZone.y + safeZone.height },
    'bottom-center': { x: safeZone.x + safeZone.width / 2, y: safeZone.y + safeZone.height },
    'bottom-right': { x: safeZone.x + safeZone.width, y: safeZone.y + safeZone.height },
  };
  
  return positions[anchor];
}

/**
 * Calculate element position from placement config.
 */
export function calculateElementPosition(
  placement: ElementPlacement,
  bounds: ComputedBounds
): { x: number; y: number } {
  const anchor = getAnchorPosition(placement.anchor, bounds);
  
  // Adjust for element size based on anchor
  let offsetX = placement.offsetX;
  let offsetY = placement.offsetY;
  
  // Center the element on the anchor point
  if (placement.anchor.includes('center') || placement.anchor === 'center') {
    // Already centered
  } else if (placement.anchor.includes('left')) {
    offsetX += placement.width / 2;
  } else if (placement.anchor.includes('right')) {
    offsetX -= placement.width / 2;
  }
  
  if (placement.anchor.includes('top')) {
    offsetY += placement.height / 2;
  } else if (placement.anchor.includes('bottom')) {
    offsetY -= placement.height / 2;
  }
  
  return {
    x: anchor.x + offsetX,
    y: anchor.y + offsetY,
  };
}

// ============================================================================
// Coordinate Conversion
// ============================================================================

/**
 * Convert pixel position to normalized (-1 to 1) coordinates.
 */
export function pixelToNormalized(
  pixelX: number,
  pixelY: number,
  bounds: ComputedBounds
): { x: number; y: number } {
  return {
    x: (pixelX - bounds.center.x) / bounds.maxExtent.x,
    y: (pixelY - bounds.center.y) / bounds.maxExtent.y,
  };
}

/**
 * Convert normalized (-1 to 1) coordinates to pixels.
 */
export function normalizedToPixel(
  normalizedX: number,
  normalizedY: number,
  bounds: ComputedBounds
): { x: number; y: number } {
  return {
    x: bounds.center.x + normalizedX * bounds.maxExtent.x,
    y: bounds.center.y + normalizedY * bounds.maxExtent.y,
  };
}

/**
 * Scale a pixel value by the bounds scale factor.
 * Useful for consistent animation sizing across resolutions.
 */
export function scaleByFactor(value: number, bounds: ComputedBounds): number {
  return value * bounds.scaleFactor;
}

/**
 * Check if a point is within the safe zone.
 */
export function isInSafeZone(
  x: number,
  y: number,
  bounds: ComputedBounds
): boolean {
  const { safeZone } = bounds;
  return (
    x >= safeZone.x &&
    x <= safeZone.x + safeZone.width &&
    y >= safeZone.y &&
    y <= safeZone.y + safeZone.height
  );
}

/**
 * Check if an element (with dimensions) fits within safe zone.
 */
export function elementFitsInSafeZone(
  x: number,
  y: number,
  width: number,
  height: number,
  bounds: ComputedBounds
): boolean {
  const halfW = width / 2;
  const halfH = height / 2;
  
  return (
    isInSafeZone(x - halfW, y - halfH, bounds) &&
    isInSafeZone(x + halfW, y + halfH, bounds)
  );
}
