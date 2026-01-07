/**
 * Canvas Bounds System - Transform Constraining
 * 
 * Applies bounds constraints to animation transforms.
 * Ensures animations stay within the defined safe zones.
 */

import type { AnimationTransform } from '../animations/core/types';
import type {
  ComputedBounds,
  AnimationConstraints,
  BoundsOverflowBehavior,
} from './types';

import {
  constrainValue,
  calculateFadeFactor,
  generateConstraints,
  generateParticleConstraints,
} from './compute';

// ============================================================================
// Transform Constraining
// ============================================================================

/**
 * Apply bounds constraints to an animation transform.
 * Converts normalized positions to pixel-based constraints.
 */
export function constrainTransform(
  transform: AnimationTransform,
  bounds: ComputedBounds,
  constraints?: AnimationConstraints
): AnimationTransform {
  const c = constraints ?? generateConstraints(bounds);
  
  // Convert normalized position to pixels, constrain, convert back
  const pixelX = transform.positionX * bounds.maxExtent.x;
  const pixelY = transform.positionY * bounds.maxExtent.y;
  
  const constrainedPixelX = constrainValue(pixelX, c.positionX);
  const constrainedPixelY = constrainValue(pixelY, c.positionY);
  
  // Calculate fade factors for opacity adjustment
  const fadeX = calculateFadeFactor(pixelX, c.positionX);
  const fadeY = calculateFadeFactor(pixelY, c.positionY);
  const fadeFactor = Math.min(fadeX, fadeY);
  
  // Constrain scale
  const avgScale = (transform.scaleX + transform.scaleY) / 2;
  const constrainedScale = constrainValue(avgScale, c.scale);
  const scaleRatio = avgScale > 0 ? constrainedScale / avgScale : 1;
  
  // Constrain rotation
  const constrainedRotZ = constrainValue(transform.rotationZ, c.rotation);
  
  return {
    ...transform,
    positionX: constrainedPixelX / bounds.maxExtent.x,
    positionY: constrainedPixelY / bounds.maxExtent.y,
    scaleX: transform.scaleX * scaleRatio,
    scaleY: transform.scaleY * scaleRatio,
    rotationZ: constrainedRotZ,
    opacity: transform.opacity * fadeFactor,
  };
}

/**
 * Apply particle-specific constraints (more lenient).
 */
export function constrainParticleTransform(
  transform: AnimationTransform,
  bounds: ComputedBounds
): AnimationTransform {
  const constraints = generateParticleConstraints(bounds);
  return constrainTransform(transform, bounds, constraints);
}

/**
 * Check if a transform is within bounds.
 */
export function isTransformInBounds(
  transform: AnimationTransform,
  bounds: ComputedBounds
): boolean {
  const constraints = generateConstraints(bounds);
  
  const pixelX = transform.positionX * bounds.maxExtent.x;
  const pixelY = transform.positionY * bounds.maxExtent.y;
  
  return (
    pixelX >= constraints.positionX.min &&
    pixelX <= constraints.positionX.max &&
    pixelY >= constraints.positionY.min &&
    pixelY <= constraints.positionY.max
  );
}

// ============================================================================
// Entry Animation Bounds
// ============================================================================

/**
 * Calculate safe entry positions for slide-in animations.
 * Returns start position just outside the safe zone.
 */
export function getEntryPosition(
  direction: 'left' | 'right' | 'top' | 'bottom',
  bounds: ComputedBounds,
  elementSize: number = 200
): { x: number; y: number } {
  const margin = elementSize / 2 + 50; // Extra margin for smooth entry
  
  switch (direction) {
    case 'left':
      return {
        x: (-bounds.maxExtent.x - margin) / bounds.maxExtent.x,
        y: 0,
      };
    case 'right':
      return {
        x: (bounds.maxExtent.x + margin) / bounds.maxExtent.x,
        y: 0,
      };
    case 'top':
      return {
        x: 0,
        y: (-bounds.maxExtent.y - margin) / bounds.maxExtent.y,
      };
    case 'bottom':
      return {
        x: 0,
        y: (bounds.maxExtent.y + margin) / bounds.maxExtent.y,
      };
  }
}

/**
 * Calculate safe exit positions for slide-out animations.
 */
export function getExitPosition(
  direction: 'left' | 'right' | 'top' | 'bottom',
  bounds: ComputedBounds,
  elementSize: number = 200
): { x: number; y: number } {
  // Exit is just the opposite of entry
  const opposites: Record<string, 'left' | 'right' | 'top' | 'bottom'> = {
    left: 'right',
    right: 'left',
    top: 'bottom',
    bottom: 'top',
  };
  return getEntryPosition(opposites[direction], bounds, elementSize);
}

// ============================================================================
// Loop Animation Bounds
// ============================================================================

/**
 * Calculate maximum safe amplitude for loop animations.
 * Ensures the animation won't exceed bounds at maximum displacement.
 */
export function getMaxSafeAmplitude(
  currentPosition: { x: number; y: number },
  bounds: ComputedBounds,
  direction: 'x' | 'y' | 'both' = 'both'
): { x: number; y: number } {
  const pixelX = currentPosition.x * bounds.maxExtent.x;
  const pixelY = currentPosition.y * bounds.maxExtent.y;
  
  // Calculate distance to nearest boundary
  const distToLeft = pixelX - (-bounds.maxExtent.x);
  const distToRight = bounds.maxExtent.x - pixelX;
  const distToTop = pixelY - (-bounds.maxExtent.y);
  const distToBottom = bounds.maxExtent.y - pixelY;
  
  const maxX = Math.min(distToLeft, distToRight);
  const maxY = Math.min(distToTop, distToBottom);
  
  return {
    x: direction === 'y' ? 0 : maxX,
    y: direction === 'x' ? 0 : maxY,
  };
}

/**
 * Scale loop amplitude to stay within bounds.
 */
export function scaleAmplitudeToFit(
  desiredAmplitudeX: number,
  desiredAmplitudeY: number,
  currentPosition: { x: number; y: number },
  bounds: ComputedBounds
): { x: number; y: number } {
  const maxSafe = getMaxSafeAmplitude(currentPosition, bounds);
  
  return {
    x: Math.min(desiredAmplitudeX, maxSafe.x * 0.9), // 90% of max for safety
    y: Math.min(desiredAmplitudeY, maxSafe.y * 0.9),
  };
}

// ============================================================================
// Particle Bounds
// ============================================================================

/**
 * Get spawn area bounds for particles.
 */
export function getParticleSpawnBounds(
  spawnArea: 'around' | 'above' | 'below' | 'center' | 'edges',
  bounds: ComputedBounds,
  elementPosition: { x: number; y: number } = { x: 0, y: 0 },
  elementSize: number = 200
): { minX: number; maxX: number; minY: number; maxY: number } {
  const halfSize = elementSize / 2;
  const centerX = elementPosition.x * bounds.maxExtent.x;
  const centerY = elementPosition.y * bounds.maxExtent.y;
  
  switch (spawnArea) {
    case 'around':
      return {
        minX: centerX - halfSize * 1.5,
        maxX: centerX + halfSize * 1.5,
        minY: centerY - halfSize * 1.5,
        maxY: centerY + halfSize * 1.5,
      };
    
    case 'above':
      return {
        minX: centerX - halfSize,
        maxX: centerX + halfSize,
        minY: centerY - halfSize * 2,
        maxY: centerY - halfSize * 0.5,
      };
    
    case 'below':
      return {
        minX: centerX - halfSize,
        maxX: centerX + halfSize,
        minY: centerY + halfSize * 0.5,
        maxY: centerY + halfSize * 2,
      };
    
    case 'center':
      return {
        minX: centerX - halfSize * 0.3,
        maxX: centerX + halfSize * 0.3,
        minY: centerY - halfSize * 0.3,
        maxY: centerY + halfSize * 0.3,
      };
    
    case 'edges':
      // Spawn at safe zone edges
      return {
        minX: -bounds.maxExtent.x,
        maxX: bounds.maxExtent.x,
        minY: -bounds.maxExtent.y,
        maxY: bounds.maxExtent.y,
      };
  }
}

/**
 * Check if a particle should be culled (too far outside bounds).
 */
export function shouldCullParticle(
  x: number,
  y: number,
  bounds: ComputedBounds,
  cullMargin: number = 1.5
): boolean {
  const maxX = bounds.maxExtent.x * cullMargin;
  const maxY = bounds.maxExtent.y * cullMargin;
  
  return (
    x < -maxX ||
    x > maxX ||
    y < -maxY ||
    y > maxY
  );
}
