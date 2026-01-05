/**
 * Text Element Renderer
 */

import { cn } from '@/lib/utils';
import type { TextElement } from '../../../canvas-export/types';
import { toViewBoxX, toViewBoxY } from '../coords';
import type { RenderContext } from './types';

export function renderText(
  element: TextElement,
  ctx: RenderContext,
  key: string
): React.ReactNode {
  const { width, height, isSelected, textBold } = ctx;
  // fontSize is stored as actual pixel size relative to canvas dimensions
  // Scale it proportionally to the viewBox
  const fontSize = element.fontSize;
  
  return (
    <text
      key={key}
      x={toViewBoxX(element.x, width)}
      y={toViewBoxY(element.y, height)}
      fill={element.color}
      fontSize={fontSize}
      fontFamily={element.fontFamily}
      fontWeight={textBold ? 'bold' : 'normal'}
      opacity={element.opacity / 100}
      className={cn(isSelected && 'filter drop-shadow-[0_0_4px_rgba(33,128,141,0.8)]')}
    >
      {element.text}
    </text>
  );
}
