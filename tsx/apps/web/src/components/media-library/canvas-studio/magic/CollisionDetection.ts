/**
 * Collision Detection Module
 * Handles overlap detection and position suggestions for canvas elements
 */

import type { AssetPlacement } from '../../placement/types';
import type { CanvasDimensions } from '../types';
import type { BoundingBox, CollisionResult } from './types';

/**
 * Convert a placement to a bounding box in pixel coordinates
 * 
 * @param placement - The asset placement to convert
 * @param canvasDimensions - The canvas dimensions for percentage conversion
 * @returns Bounding box with pixel coordinates
 */
export function getBoundingBox(
  placement: AssetPlacement,
  canvasDimensions: CanvasDimensions
): BoundingBox {
  const { position, size } = placement;
  
  // Calculate size in pixels
  let width: number;
  let height: number;
  
  if (size.unit === 'percent') {
    width = (size.width / 100) * canvasDimensions.width;
    height = (size.height / 100) * canvasDimensions.height;
  } else {
    width = size.width;
    height = size.height;
  }
  
  // Calculate position in pixels (position is always percentage-based)
  const centerX = (position.x / 100) * canvasDimensions.width;
  const centerY = (position.y / 100) * canvasDimensions.height;
  
  // Adjust for anchor point (convert to top-left corner)
  let x: number;
  let y: number;
  
  switch (position.anchor) {
    case 'center':
      x = centerX - width / 2;
      y = centerY - height / 2;
      break;
    case 'top-left':
      x = centerX;
      y = centerY;
      break;
    case 'top-right':
      x = centerX - width;
      y = centerY;
      break;
    case 'bottom-left':
      x = centerX;
      y = centerY - height;
      break;
    case 'bottom-right':
      x = centerX - width;
      y = centerY - height;
      break;
    default:
      x = centerX - width / 2;
      y = centerY - height / 2;
  }
  
  return { x, y, width, height };
}

/**
 * Check if two bounding boxes overlap
 * 
 * @param box1 - First bounding box
 * @param box2 - Second bounding box
 * @returns True if the boxes overlap
 */
export function checkCollision(box1: BoundingBox, box2: BoundingBox): boolean {
  return !(
    box1.x + box1.width <= box2.x ||
    box2.x + box2.width <= box1.x ||
    box1.y + box1.height <= box2.y ||
    box2.y + box2.height <= box1.y
  );
}

/**
 * Calculate the overlap area between two bounding boxes
 * 
 * @param box1 - First bounding box
 * @param box2 - Second bounding box
 * @returns Overlap area in square pixels (0 if no overlap)
 */
export function calculateOverlapArea(box1: BoundingBox, box2: BoundingBox): number {
  const xOverlap = Math.max(
    0,
    Math.min(box1.x + box1.width, box2.x + box2.width) - Math.max(box1.x, box2.x)
  );
  const yOverlap = Math.max(
    0,
    Math.min(box1.y + box1.height, box2.y + box2.height) - Math.max(box1.y, box2.y)
  );
  
  return xOverlap * yOverlap;
}

/**
 * Find all overlapping placements on the canvas
 * 
 * @param placements - Array of asset placements to check
 * @param canvasDimensions - Canvas dimensions for coordinate conversion
 * @returns Map of placement IDs to arrays of overlapping placement IDs
 */
export function findCollisions(
  placements: AssetPlacement[],
  canvasDimensions: CanvasDimensions
): Map<string, string[]> {
  const collisions = new Map<string, string[]>();
  const boxes = placements.map(p => ({
    id: p.assetId,
    box: getBoundingBox(p, canvasDimensions),
  }));
  
  for (let i = 0; i < boxes.length; i++) {
    const overlapping: string[] = [];
    
    for (let j = 0; j < boxes.length; j++) {
      if (i !== j && checkCollision(boxes[i].box, boxes[j].box)) {
        overlapping.push(boxes[j].id);
      }
    }
    
    if (overlapping.length > 0) {
      collisions.set(boxes[i].id, overlapping);
    }
  }
  
  return collisions;
}

/**
 * Check collision for a single placement against existing placements
 * 
 * @param placement - The placement to check
 * @param existingPlacements - Existing placements to check against
 * @param canvasDimensions - Canvas dimensions for coordinate conversion
 * @returns Collision result with details
 */
export function checkPlacementCollision(
  placement: AssetPlacement,
  existingPlacements: AssetPlacement[],
  canvasDimensions: CanvasDimensions
): CollisionResult {
  const box = getBoundingBox(placement, canvasDimensions);
  const overlappingIds: string[] = [];
  let totalOverlapArea = 0;
  
  for (const existing of existingPlacements) {
    if (existing.assetId === placement.assetId) continue;
    
    const existingBox = getBoundingBox(existing, canvasDimensions);
    
    if (checkCollision(box, existingBox)) {
      overlappingIds.push(existing.assetId);
      totalOverlapArea += calculateOverlapArea(box, existingBox);
    }
  }
  
  return {
    hasCollision: overlappingIds.length > 0,
    overlappingIds,
    overlapArea: totalOverlapArea,
  };
}

/**
 * Suggest a non-colliding position for a placement
 * Uses a spiral search pattern to find the nearest available position
 * 
 * @param placement - The placement to find a position for
 * @param existingPlacements - Existing placements to avoid
 * @param canvasDimensions - Canvas dimensions
 * @returns Suggested position as percentage coordinates, or undefined if no position found
 */
export function suggestNonCollidingPosition(
  placement: AssetPlacement,
  existingPlacements: AssetPlacement[],
  canvasDimensions: CanvasDimensions
): { x: number; y: number } | undefined {
  // If no collision, return current position
  const currentCollision = checkPlacementCollision(placement, existingPlacements, canvasDimensions);
  if (!currentCollision.hasCollision) {
    return { x: placement.position.x, y: placement.position.y };
  }
  
  const box = getBoundingBox(placement, canvasDimensions);
  const stepSize = 5; // 5% step size for search
  const maxIterations = 100;
  
  // Spiral search pattern
  let dx = 0;
  let dy = -stepSize;
  let x = placement.position.x;
  let y = placement.position.y;
  let segmentLength = 1;
  let segmentPassed = 0;
  
  for (let i = 0; i < maxIterations; i++) {
    // Try current position
    const testPlacement: AssetPlacement = {
      ...placement,
      position: { ...placement.position, x, y },
    };
    
    // Check bounds
    const testBox = getBoundingBox(testPlacement, canvasDimensions);
    const inBounds =
      testBox.x >= 0 &&
      testBox.y >= 0 &&
      testBox.x + testBox.width <= canvasDimensions.width &&
      testBox.y + testBox.height <= canvasDimensions.height;
    
    if (inBounds) {
      const collision = checkPlacementCollision(testPlacement, existingPlacements, canvasDimensions);
      if (!collision.hasCollision) {
        return { x, y };
      }
    }
    
    // Move to next position in spiral
    x += dx;
    y += dy;
    segmentPassed++;
    
    if (segmentPassed === segmentLength) {
      segmentPassed = 0;
      // Rotate direction 90 degrees clockwise
      const temp = dx;
      dx = -dy;
      dy = temp;
      // Increase segment length every two turns
      if (dy === 0) {
        segmentLength++;
      }
    }
  }
  
  // Fallback: try corners and edges
  const fallbackPositions = [
    { x: 10, y: 10 },
    { x: 90, y: 10 },
    { x: 10, y: 90 },
    { x: 90, y: 90 },
    { x: 50, y: 10 },
    { x: 50, y: 90 },
    { x: 10, y: 50 },
    { x: 90, y: 50 },
  ];
  
  for (const pos of fallbackPositions) {
    const testPlacement: AssetPlacement = {
      ...placement,
      position: { ...placement.position, x: pos.x, y: pos.y },
    };
    
    const testBox = getBoundingBox(testPlacement, canvasDimensions);
    const inBounds =
      testBox.x >= 0 &&
      testBox.y >= 0 &&
      testBox.x + testBox.width <= canvasDimensions.width &&
      testBox.y + testBox.height <= canvasDimensions.height;
    
    if (inBounds) {
      const collision = checkPlacementCollision(testPlacement, existingPlacements, canvasDimensions);
      if (!collision.hasCollision) {
        return pos;
      }
    }
  }
  
  // No non-colliding position found
  return undefined;
}
