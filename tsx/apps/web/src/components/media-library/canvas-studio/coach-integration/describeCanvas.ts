/**
 * Canvas Description Generator
 * 
 * Generates human-readable descriptions of canvas contents for AI context.
 * Also generates compact JSON format for backend classification system.
 */

import type { AssetPlacement } from '../../placement/types';
import type { 
  AnySketchElement, 
  TextElement, 
  ImageElement,
  ArrowElement,
  RectangleElement,
  CircleElement,
  FreehandElement,
  StickerElement,
} from '../../canvas-export/types';
import type { CanvasDimensions } from '../types';
import type { 
  CanvasDescription, 
  ElementDescription, 
  PositionDescription,
  CompactCanvasContext,
  CompactCanvasAsset,
  CompactCanvasText,
  CompactCanvasDrawing,
} from './types';
import { getAssetTypeDisplayName } from './assetTypeInfo';

/**
 * Get position description from percentage coordinates
 */
export function getPositionDescription(x: number, y: number): PositionDescription {
  const col = x < 33 ? 'left' : x > 66 ? 'right' : 'center';
  const row = y < 33 ? 'top' : y > 66 ? 'bottom' : 'center';
  
  if (row === 'center' && col === 'center') return 'center';
  if (row === 'center') return `center-${col}` as PositionDescription;
  if (col === 'center') return `${row}-center` as PositionDescription;
  return `${row}-${col}` as PositionDescription;
}

/**
 * Get size description from percentage
 */
export function getSizeDescription(widthPercent: number): 'small' | 'medium' | 'large' | 'full' {
  if (widthPercent >= 90) return 'full';
  if (widthPercent >= 50) return 'large';
  if (widthPercent >= 25) return 'medium';
  return 'small';
}

/**
 * Describe an image/asset element
 */
function describeImageElement(el: ImageElement): ElementDescription {
  const name = el.displayName || 'image';
  const position = getPositionDescription(el.x, el.y);
  const size = getSizeDescription(el.width);
  
  let description = `${name}`;
  if (el.rotation && el.rotation !== 0) {
    description += ` (rotated ${Math.round(el.rotation)}°)`;
  }
  if (el.opacity < 100) {
    description += ` (${Math.round(el.opacity)}% opacity)`;
  }
  
  return {
    type: 'image',
    description,
    position,
    size,
    zIndex: el.zIndex,
  };
}

/**
 * Describe a text element
 */
function describeTextElement(el: TextElement): ElementDescription {
  const position = getPositionDescription(el.x, el.y);
  const sizeDesc = el.fontSize >= 96 ? 'large' : el.fontSize >= 48 ? 'medium' : 'small';
  
  return {
    type: 'text',
    description: `text "${el.text}" in ${el.color} ${el.fontSize}px`,
    position,
    size: sizeDesc,
    zIndex: el.zIndex,
  };
}

/**
 * Describe an arrow element
 */
function describeArrowElement(el: ArrowElement): ElementDescription {
  const startPos = getPositionDescription(el.startX, el.startY);
  const endPos = getPositionDescription(el.endX, el.endY);
  
  return {
    type: 'arrow',
    description: `arrow pointing from ${startPos} to ${endPos}`,
    position: startPos,
    size: 'medium',
    zIndex: el.zIndex,
  };
}

/**
 * Describe a shape element (rectangle or circle)
 */
function describeShapeElement(el: RectangleElement | CircleElement): ElementDescription {
  const isRect = el.type === 'rectangle';
  const x = isRect ? (el as RectangleElement).x : (el as CircleElement).cx;
  const y = isRect ? (el as RectangleElement).y : (el as CircleElement).cy;
  const width = isRect ? (el as RectangleElement).width : (el as CircleElement).rx * 2;
  
  const position = getPositionDescription(x, y);
  const size = getSizeDescription(width);
  const filled = (el as RectangleElement).filled ? 'filled' : 'outlined';
  
  return {
    type: el.type,
    description: `${filled} ${el.type} in ${el.color}`,
    position,
    size,
    zIndex: el.zIndex,
  };
}

/**
 * Describe a sticker element
 */
function describeStickerElement(el: StickerElement): ElementDescription {
  const position = getPositionDescription(el.x, el.y);
  const size = getSizeDescription(el.width);
  
  return {
    type: 'sticker',
    description: el.stickerType === 'emoji' ? `emoji ${el.content}` : 'sticker',
    position,
    size,
    zIndex: el.zIndex,
  };
}

/**
 * Describe a freehand drawing
 */
function describeFreehandElement(el: FreehandElement): ElementDescription {
  if (el.points.length < 2) {
    return {
      type: 'drawing',
      description: 'freehand mark',
      position: 'center',
      size: 'small',
      zIndex: el.zIndex,
    };
  }
  
  // Calculate bounding box
  const xs = el.points.map(p => p.x);
  const ys = el.points.map(p => p.y);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const width = Math.max(...xs) - Math.min(...xs);
  
  return {
    type: 'drawing',
    description: `freehand drawing in ${el.color}`,
    position: getPositionDescription(centerX, centerY),
    size: getSizeDescription(width),
    zIndex: el.zIndex,
  };
}

/**
 * Describe a single sketch element
 */
export function describeElement(el: AnySketchElement): ElementDescription | null {
  switch (el.type) {
    case 'image':
      return describeImageElement(el as ImageElement);
    case 'text':
      return describeTextElement(el as TextElement);
    case 'arrow':
    case 'line':
      return describeArrowElement(el as ArrowElement);
    case 'rectangle':
    case 'circle':
      return describeShapeElement(el as RectangleElement | CircleElement);
    case 'sticker':
      return describeStickerElement(el as StickerElement);
    case 'freehand':
      return describeFreehandElement(el as FreehandElement);
    default:
      return null;
  }
}

/**
 * Extract all text content from elements
 */
export function extractTextContent(elements: AnySketchElement[]): string[] {
  return elements
    .filter((el): el is TextElement => el.type === 'text')
    .map(el => el.text)
    .filter(text => text.trim().length > 0);
}

/**
 * Generate composition description
 */
export function generateCompositionDescription(elements: ElementDescription[]): string {
  if (elements.length === 0) return 'empty canvas';
  if (elements.length === 1) return `single ${elements[0].type} at ${elements[0].position}`;
  
  // Group by position
  const positions = new Map<string, string[]>();
  for (const el of elements) {
    const pos = el.position;
    if (!positions.has(pos)) positions.set(pos, []);
    positions.get(pos)!.push(el.type);
  }
  
  const parts: string[] = [];
  for (const [pos, types] of positions) {
    const uniqueTypes = [...new Set(types)];
    parts.push(`${uniqueTypes.join(', ')} at ${pos}`);
  }
  
  return parts.join('; ');
}

/**
 * Generate complete canvas description
 */
export function generateCanvasDescription(
  placements: AssetPlacement[],
  sketchElements: AnySketchElement[],
  dimensions: CanvasDimensions,
  assetType: string
): CanvasDescription {
  // Describe all elements
  const elementDescriptions: ElementDescription[] = [];
  
  // Add sketch elements (includes images from placements)
  for (const el of sketchElements) {
    const desc = describeElement(el);
    if (desc) elementDescriptions.push(desc);
  }
  
  // Sort by z-index
  elementDescriptions.sort((a, b) => a.zIndex - b.zIndex);
  
  // Extract text
  const textContent = extractTextContent(sketchElements);
  
  // Generate composition
  const composition = generateCompositionDescription(elementDescriptions);
  
  // Build summary
  const assetName = getAssetTypeDisplayName(assetType);
  const summary = `A ${dimensions.width}x${dimensions.height} ${assetName} with ${elementDescriptions.length} element${elementDescriptions.length !== 1 ? 's' : ''}`;
  
  return {
    summary,
    elements: elementDescriptions,
    textContent,
    composition,
    assetType,
    dimensions,
  };
}

/**
 * Format description for API transmission
 */
export function formatDescriptionForApi(description: CanvasDescription): string {
  const lines: string[] = [description.summary];
  
  if (description.elements.length > 0) {
    lines.push('');
    lines.push('Elements:');
    for (const el of description.elements) {
      lines.push(`- ${el.description} (${el.position}, ${el.size})`);
    }
  }
  
  if (description.textContent.length > 0) {
    lines.push('');
    lines.push(`Text content: ${description.textContent.map(t => `"${t}"`).join(', ')}`);
  }
  
  return lines.join('\n');
}

// =============================================================================
// Compact Canvas Context Builder (Token-Conscious Format)
// =============================================================================

/**
 * Determine asset type for classification
 */
function getAssetClassificationType(
  el: ImageElement,
  isFullSize: boolean
): CompactCanvasAsset['type'] {
  // Check display name for hints (since ImageElement doesn't have assetType)
  const displayName = (el.displayName || '').toLowerCase();
  
  if (isFullSize || displayName.includes('background') || displayName.includes('bg')) return 'background';
  if (displayName.includes('character') || displayName.includes('skin')) return 'character';
  if (displayName.includes('logo')) return 'logo';
  if (displayName.includes('face') || displayName.includes('portrait')) return 'face';
  return 'object';
}

/**
 * Get text style based on font size
 */
function getTextStyle(fontSize: number): CompactCanvasText['style'] {
  if (fontSize >= 96) return 'large';
  if (fontSize >= 48) return 'medium';
  if (fontSize >= 24) return 'small';
  return 'note';
}

/**
 * Build compact canvas context for backend classification
 * 
 * This generates the token-conscious JSON format that triggers
 * the backend's element classification system.
 * 
 * @param sketchElements - All canvas elements
 * @param dimensions - Canvas dimensions
 * @param assetType - Asset type being created
 * @returns Compact canvas context for backend
 */
export function buildCompactCanvasContext(
  sketchElements: AnySketchElement[],
  dimensions: CanvasDimensions,
  assetType: string
): CompactCanvasContext {
  const assets: CompactCanvasAsset[] = [];
  const texts: CompactCanvasText[] = [];
  const drawings: CompactCanvasDrawing[] = [];
  
  let assetCounter = 0;
  let textCounter = 0;
  let drawingCounter = 0;
  
  for (const el of sketchElements) {
    switch (el.type) {
      case 'image': {
        const img = el as ImageElement;
        const isFullSize = img.width >= 90 && img.height >= 90;
        
        assets.push({
          id: `a${++assetCounter}`,
          name: img.displayName || `Asset ${assetCounter}`,
          type: getAssetClassificationType(img, isFullSize),
          pos: isFullSize ? 'full' : `${Math.round(img.x)},${Math.round(img.y)}`,
          size: isFullSize ? undefined : `${Math.round(img.width)}x${Math.round(img.height)}`,
          z: img.zIndex,
        });
        break;
      }
      
      case 'text': {
        const txt = el as TextElement;
        texts.push({
          id: `t${++textCounter}`,
          content: txt.text,
          pos: `${Math.round(txt.x)},${Math.round(txt.y)}`,
          style: getTextStyle(txt.fontSize),
        });
        break;
      }
      
      case 'arrow':
      case 'line': {
        const arrow = el as ArrowElement;
        drawings.push({
          id: `d${++drawingCounter}`,
          type: 'arrow',
          from: `${Math.round(arrow.startX)},${Math.round(arrow.startY)}`,
          to: `${Math.round(arrow.endX)},${Math.round(arrow.endY)}`,
        });
        break;
      }
      
      case 'rectangle': {
        const rect = el as RectangleElement;
        drawings.push({
          id: `d${++drawingCounter}`,
          type: 'rectangle',
          pos: `${Math.round(rect.x)},${Math.round(rect.y)}`,
          size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          filled: rect.filled,
          color: rect.color,
        });
        break;
      }
      
      case 'circle': {
        const circle = el as CircleElement;
        drawings.push({
          id: `d${++drawingCounter}`,
          type: 'circle',
          pos: `${Math.round(circle.cx)},${Math.round(circle.cy)}`,
          size: `${Math.round(circle.rx * 2)}x${Math.round(circle.ry * 2)}`,
          filled: circle.filled,
          color: circle.color,
        });
        break;
      }
      
      case 'freehand': {
        const freehand = el as FreehandElement;
        if (freehand.points.length >= 2) {
          // Calculate bounding box center
          const xs = freehand.points.map(p => p.x);
          const ys = freehand.points.map(p => p.y);
          const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
          const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
          
          drawings.push({
            id: `d${++drawingCounter}`,
            type: 'freehand',
            pos: `${Math.round(centerX)},${Math.round(centerY)}`,
            color: freehand.color,
          });
        }
        break;
      }
      
      case 'sticker': {
        // Stickers are treated as decorative assets
        const sticker = el as StickerElement;
        assets.push({
          id: `a${++assetCounter}`,
          name: sticker.stickerType === 'emoji' ? `Emoji ${sticker.content}` : 'Sticker',
          type: 'object',
          pos: `${Math.round(sticker.x)},${Math.round(sticker.y)}`,
          size: `${Math.round(sticker.width)}x${Math.round(sticker.height)}`,
          z: sticker.zIndex,
        });
        break;
      }
    }
  }
  
  return {
    canvas: {
      type: assetType,
      size: [dimensions.width, dimensions.height],
    },
    assets,
    texts,
    drawings,
  };
}
