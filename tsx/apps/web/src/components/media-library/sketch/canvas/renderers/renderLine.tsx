/**
 * Line Element Renderer
 */

import { cn } from '@/lib/utils';
import type { LineElement } from '../../../canvas-export/types';
import { toViewBoxX, toViewBoxY } from '../coords';
import { getCommonProps, type RenderContext } from './types';

export function renderLine(
  element: LineElement,
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
  
  return (
    <line
      key={key}
      x1={toViewBoxX(element.startX, width)}
      y1={toViewBoxY(element.startY, height)}
      x2={toViewBoxX(element.endX, width)}
      y2={toViewBoxY(element.endY, height)}
      {...commonProps}
      strokeLinecap="round"
      className={cn(isSelected && 'filter drop-shadow-[0_0_4px_rgba(33,128,141,0.8)]')}
    />
  );
}
