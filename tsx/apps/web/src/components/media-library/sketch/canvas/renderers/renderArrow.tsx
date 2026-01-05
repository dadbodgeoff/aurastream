/**
 * Arrow Element Renderer
 */

import { cn } from '@/lib/utils';
import type { ArrowElement } from '../../../canvas-export/types';
import { toViewBoxX, toViewBoxY } from '../coords';
import { getCommonProps, type RenderContext } from './types';

export function renderArrow(
  element: ArrowElement,
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
  
  const startX = toViewBoxX(element.startX, width);
  const startY = toViewBoxY(element.startY, height);
  const endX = toViewBoxX(element.endX, width);
  const endY = toViewBoxY(element.endY, height);
  const angle = Math.atan2(endY - startY, endX - startX);
  const headLength = Math.min(width, height) * 0.02;
  
  const head1X = endX - headLength * Math.cos(angle - Math.PI / 6);
  const head1Y = endY - headLength * Math.sin(angle - Math.PI / 6);
  const head2X = endX - headLength * Math.cos(angle + Math.PI / 6);
  const head2Y = endY - headLength * Math.sin(angle + Math.PI / 6);
  
  // Arrowhead should always be solid, even if line is dashed
  const arrowheadProps = { ...commonProps, strokeDasharray: undefined };
  
  return (
    <g key={key} className={cn(isSelected && 'filter drop-shadow-[0_0_4px_rgba(33,128,141,0.8)]')}>
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        {...commonProps}
        strokeLinecap="round"
      />
      <path
        d={`M ${endX} ${endY} L ${head1X} ${head1Y} M ${endX} ${endY} L ${head2X} ${head2Y}`}
        {...arrowheadProps}
        strokeLinecap="round"
      />
    </g>
  );
}
