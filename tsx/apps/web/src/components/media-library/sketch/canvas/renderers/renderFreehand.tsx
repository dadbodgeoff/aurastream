/**
 * Freehand Element Renderer
 */

import { cn } from '@/lib/utils';
import type { FreehandElement } from '../../../canvas-export/types';
import { toViewBoxX, toViewBoxY } from '../coords';
import { getCommonProps, type RenderContext } from './types';

export function renderFreehand(
  element: FreehandElement,
  ctx: RenderContext,
  key: string
): React.ReactNode {
  if (element.points.length < 2) return null;
  
  const { width, height, isSelected } = ctx;
  const commonProps = getCommonProps(
    element.color, 
    element.strokeWidth, 
    element.opacity, 
    width, 
    height,
    element.lineStyle
  );
  
  const pathData = element.points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toViewBoxX(p.x, width)} ${toViewBoxY(p.y, height)}`)
    .join(' ');
  
  return (
    <path
      key={key}
      d={pathData}
      {...commonProps}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(isSelected && 'filter drop-shadow-[0_0_4px_rgba(33,128,141,0.8)]')}
    />
  );
}
