/**
 * Rectangle Element Renderer
 */

import { cn } from '@/lib/utils';
import type { RectangleElement } from '../../../canvas-export/types';
import { toViewBoxX, toViewBoxY } from '../coords';
import { getCommonProps, type RenderContext } from './types';

export function renderRectangle(
  element: RectangleElement,
  ctx: RenderContext,
  key: string
): React.ReactNode {
  const { width, height, isSelected } = ctx;
  const commonProps = getCommonProps(
    element.color, 
    element.strokeWidth, 
    element.opacity, 
    width, 
    height,
    element.lineStyle
  );
  
  // Calculate transform for flipping
  const centerX = toViewBoxX(element.x + element.width / 2, width);
  const centerY = toViewBoxY(element.y + element.height / 2, height);
  const scaleX = element.flipX ? -1 : 1;
  const scaleY = element.flipY ? -1 : 1;
  const transform = (element.flipX || element.flipY) 
    ? `translate(${centerX}, ${centerY}) scale(${scaleX}, ${scaleY}) translate(${-centerX}, ${-centerY})`
    : undefined;
  
  return (
    <rect
      key={key}
      x={toViewBoxX(element.x, width)}
      y={toViewBoxY(element.y, height)}
      width={toViewBoxX(element.width, width)}
      height={toViewBoxY(element.height, height)}
      {...commonProps}
      fill={element.filled ? element.color : 'none'}
      fillOpacity={element.filled ? element.opacity / 100 : 0}
      transform={transform}
      className={cn(isSelected && 'filter drop-shadow-[0_0_4px_rgba(33,128,141,0.8)]')}
    />
  );
}
