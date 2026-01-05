/**
 * Element Renderers
 * 
 * SVG renderers for each sketch element type.
 */

export { renderFreehand } from './renderFreehand';
export { renderRectangle } from './renderRectangle';
export { renderCircle } from './renderCircle';
export { renderLine } from './renderLine';
export { renderArrow } from './renderArrow';
export { renderText } from './renderText';
export { renderSticker } from './renderSticker';
export { renderImage } from './renderImage';
export { getCommonProps, type RenderContext, type CommonSvgProps } from './types';

import type { AnySketchElement } from '../../../canvas-export/types';
import type { RenderContext } from './types';
import { renderFreehand } from './renderFreehand';
import { renderRectangle } from './renderRectangle';
import { renderCircle } from './renderCircle';
import { renderLine } from './renderLine';
import { renderArrow } from './renderArrow';
import { renderText } from './renderText';
import { renderSticker } from './renderSticker';
import { renderImage } from './renderImage';

/**
 * Render any sketch element to SVG
 */
export function renderElement(
  element: AnySketchElement,
  ctx: RenderContext,
  isTemp = false
): React.ReactNode {
  const key = isTemp ? `temp-${element.id}` : element.id;
  
  switch (element.type) {
    case 'freehand':
      return renderFreehand(element, ctx, key);
    case 'rectangle':
      return renderRectangle(element, ctx, key);
    case 'circle':
      return renderCircle(element, ctx, key);
    case 'line':
      return renderLine(element, ctx, key);
    case 'arrow':
      return renderArrow(element, ctx, key);
    case 'text':
      return renderText(element, ctx, key);
    case 'sticker':
      return renderSticker(element, ctx, key);
    case 'image':
      return renderImage(element, ctx, key);
    default:
      return null;
  }
}
