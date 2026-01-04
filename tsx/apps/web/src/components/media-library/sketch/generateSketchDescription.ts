/**
 * Sketch Description Generator
 * 
 * Converts sketch elements into natural language descriptions
 * that AI can understand for image generation.
 * 
 * Example output:
 * "The image should have: a sky in the top area, a person in the center-left,
 * a logo in the bottom-right corner. There are arrows pointing from the person
 * to the logo. Text labels indicate 'EPIC' at the top."
 */

import type { AnySketchElement } from '../canvas-export/types';
import type { LabeledRegion } from './RegionLabel';

// ============================================================================
// Types
// ============================================================================

interface SketchDescription {
  /** Full natural language description */
  description: string;
  /** Structured breakdown */
  breakdown: {
    regions: string[];
    annotations: string[];
    textLabels: string[];
  };
  /** Confidence score (0-1) based on how well-defined the sketch is */
  confidence: number;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get human-readable position from percentage coordinates
 */
function getPositionName(x: number, y: number, width?: number, height?: number): string {
  // Calculate center point if dimensions provided
  const centerX = width ? x + width / 2 : x;
  const centerY = height ? y + height / 2 : y;
  
  // Determine column (left, center, right)
  let col: string;
  if (centerX < 33) col = 'left';
  else if (centerX > 67) col = 'right';
  else col = 'center';
  
  // Determine row (top, middle, bottom)
  let row: string;
  if (centerY < 33) row = 'top';
  else if (centerY > 67) row = 'bottom';
  else row = 'middle';
  
  // Combine into natural position
  if (row === 'middle' && col === 'center') return 'the center';
  if (row === 'middle') return `the ${col} side`;
  if (col === 'center') return `the ${row}`;
  return `the ${row}-${col}`;
}

/**
 * Get size description
 */
function getSizeDescription(width: number, height: number): string {
  const area = width * height;
  
  if (area > 4000) return 'large';
  if (area > 1500) return 'medium-sized';
  if (area > 500) return 'small';
  return 'tiny';
}

/**
 * Get shape description for rectangles
 */
function getShapeDescription(width: number, height: number): string {
  const ratio = width / height;
  
  if (ratio > 2) return 'wide horizontal';
  if (ratio > 1.3) return 'horizontal';
  if (ratio < 0.5) return 'tall vertical';
  if (ratio < 0.77) return 'vertical';
  return 'square-ish';
}

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Generate a natural language description from sketch elements
 */
export function generateSketchDescription(
  elements: AnySketchElement[],
  labeledRegions?: LabeledRegion[]
): SketchDescription {
  const regions: string[] = [];
  const annotations: string[] = [];
  const textLabels: string[] = [];
  
  // Process labeled regions first (highest priority)
  if (labeledRegions && labeledRegions.length > 0) {
    for (const region of labeledRegions) {
      if (!region.label) continue;
      
      const position = getPositionName(region.x, region.y, region.width, region.height);
      const size = getSizeDescription(region.width, region.height);
      
      regions.push(`"${region.label}" in ${position} (${size} area)`);
    }
  }
  
  // Process sketch elements
  for (const element of elements) {
    switch (element.type) {
      case 'rectangle': {
        const position = getPositionName(element.x, element.y, element.width, element.height);
        const size = getSizeDescription(element.width, element.height);
        const shape = getShapeDescription(element.width, element.height);
        
        if (element.filled) {
          annotations.push(`a ${size} filled ${shape} box in ${position}`);
        } else {
          annotations.push(`a ${size} ${shape} outlined area in ${position}`);
        }
        break;
      }
      
      case 'circle': {
        const position = getPositionName(element.cx, element.cy);
        const avgRadius = (element.rx + element.ry) / 2;
        const size = avgRadius > 20 ? 'large' : avgRadius > 10 ? 'medium' : 'small';
        const shape = Math.abs(element.rx - element.ry) < 2 ? 'circle' : 'oval';
        
        if (element.filled) {
          annotations.push(`a ${size} filled ${shape} in ${position}`);
        } else {
          annotations.push(`a ${size} ${shape} outline in ${position}`);
        }
        break;
      }
      
      case 'arrow': {
        const startPos = getPositionName(element.startX, element.startY);
        const endPos = getPositionName(element.endX, element.endY);
        
        if (startPos !== endPos) {
          annotations.push(`an arrow pointing from ${startPos} to ${endPos}`);
        } else {
          annotations.push(`an arrow in ${startPos}`);
        }
        break;
      }
      
      case 'line': {
        const startPos = getPositionName(element.startX, element.startY);
        const endPos = getPositionName(element.endX, element.endY);
        
        // Determine line orientation
        const dx = Math.abs(element.endX - element.startX);
        const dy = Math.abs(element.endY - element.startY);
        
        if (dy < 5) {
          annotations.push(`a horizontal line across ${startPos}`);
        } else if (dx < 5) {
          annotations.push(`a vertical line in ${startPos}`);
        } else {
          annotations.push(`a diagonal line from ${startPos} to ${endPos}`);
        }
        break;
      }
      
      case 'freehand': {
        // Analyze the freehand path
        if (element.points.length < 3) break;
        
        const minX = Math.min(...element.points.map(p => p.x));
        const maxX = Math.max(...element.points.map(p => p.x));
        const minY = Math.min(...element.points.map(p => p.y));
        const maxY = Math.max(...element.points.map(p => p.y));
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const position = getPositionName(centerX, centerY);
        
        annotations.push(`a freehand sketch/annotation in ${position}`);
        break;
      }
      
      case 'text': {
        const position = getPositionName(element.x, element.y);
        textLabels.push(`"${element.text}" label in ${position}`);
        break;
      }
      
      case 'sticker': {
        const position = getPositionName(element.x, element.y);
        // For emoji stickers, include the emoji itself
        if (element.stickerType === 'emoji') {
          annotations.push(`${element.content} sticker in ${position}`);
        } else {
          annotations.push(`a decorative sticker in ${position}`);
        }
        break;
      }
    }
  }
  
  // Build the full description
  const parts: string[] = [];
  
  if (regions.length > 0) {
    parts.push(`The composition should include: ${regions.join(', ')}.`);
  }
  
  if (textLabels.length > 0) {
    parts.push(`Text labels: ${textLabels.join(', ')}.`);
  }
  
  if (annotations.length > 0) {
    parts.push(`Visual guides show: ${annotations.join(', ')}.`);
  }
  
  // Calculate confidence based on how well-defined the sketch is
  let confidence = 0;
  if (regions.length > 0) confidence += 0.4;
  if (textLabels.length > 0) confidence += 0.3;
  if (annotations.length > 0) confidence += 0.2;
  if (elements.length > 3) confidence += 0.1;
  confidence = Math.min(1, confidence);
  
  return {
    description: parts.join(' ') || 'No sketch annotations provided.',
    breakdown: {
      regions,
      annotations,
      textLabels,
    },
    confidence,
  };
}

/**
 * Generate a prompt-friendly version of the description
 * Optimized for AI image generation
 */
export function generatePromptDescription(
  elements: AnySketchElement[],
  labeledRegions?: LabeledRegion[]
): string {
  const { breakdown } = generateSketchDescription(elements, labeledRegions);
  
  const parts: string[] = [];
  
  // Regions are most important - they define what should be where
  if (breakdown.regions.length > 0) {
    parts.push(`Layout: ${breakdown.regions.join('; ')}`);
  }
  
  // Text labels provide context
  if (breakdown.textLabels.length > 0) {
    parts.push(`Labels: ${breakdown.textLabels.join('; ')}`);
  }
  
  return parts.join('. ') || '';
}

export default generateSketchDescription;
