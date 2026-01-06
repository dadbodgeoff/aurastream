/**
 * Image Element Renderer
 * 
 * Renders images in the SVG layer. Selection handles are NOT rendered here -
 * they are handled by PlacementCanvas using DOM elements for consistent sizing
 * regardless of canvas dimensions.
 */

import { cn } from '@/lib/utils';
import type { ImageElement } from '../../../canvas-export/types';
import { toViewBoxX, toViewBoxY } from '../coords';
import type { RenderContext } from './types';

export function renderImage(
  element: ImageElement,
  ctx: RenderContext,
  key: string
): React.ReactNode {
  const { width, height, isSelected } = ctx;
  
  const imgX = toViewBoxX(element.x, width);
  const imgY = toViewBoxY(element.y, height);
  const imgW = toViewBoxX(element.width, width);
  const imgH = toViewBoxY(element.height, height);
  
  return (
    <g key={key}>
      <image
        href={element.src}
        x={imgX - imgW / 2}
        y={imgY - imgH / 2}
        width={imgW}
        height={imgH}
        opacity={element.opacity / 100}
        preserveAspectRatio="none"
        style={{ 
          transform: `rotate(${element.rotation}deg)`, 
          transformOrigin: `${imgX}px ${imgY}px`,
        }}
        className={cn(isSelected && 'filter drop-shadow-[0_0_4px_rgba(33,128,141,0.8)]')}
      />
      {/* Selection handles are rendered by PlacementCanvas (DOM layer) not here */}
    </g>
  );
}
