/**
 * Circle/Ellipse Element Renderer
 */

import { cn } from '@/lib/utils';
import type { CircleElement } from '../../../canvas-export/types';
import { toViewBoxX, toViewBoxY } from '../coords';
import { getCommonProps, type RenderContext } from './types';

export function renderCircle(
  element: CircleElement,
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
  
  const cx = toViewBoxX(element.cx, width);
  const cy = toViewBoxY(element.cy, height);
  const scaleX = element.flipX ? -1 : 1;
  const scaleY = element.flipY ? -1 : 1;
  const transform = (element.flipX || element.flipY) 
    ? `translate(${cx}, ${cy}) scale(${scaleX}, ${scaleY}) translate(${-cx}, ${-cy})`
    : undefined;
  
  return (
    <ellipse
      key={key}
      cx={cx}
      cy={cy}
      rx={toViewBoxX(element.rx, width)}
      ry={toViewBoxY(element.ry, height)}
      {...commonProps}
      fill={element.filled ? element.color : 'none'}
      fillOpacity={element.filled ? element.opacity / 100 : 0}
      transform={transform}
      className={cn(isSelected && 'filter drop-shadow-[0_0_4px_rgba(33,128,141,0.8)]')}
    />
  );
}
