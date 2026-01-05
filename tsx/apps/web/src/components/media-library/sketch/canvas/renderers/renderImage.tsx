/**
 * Image Element Renderer
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
        preserveAspectRatio={element.maintainAspectRatio ? 'xMidYMid meet' : 'none'}
        style={{ 
          transform: `rotate(${element.rotation}deg)`, 
          transformOrigin: `${imgX}px ${imgY}px`,
        }}
        className={cn(isSelected && 'filter drop-shadow-[0_0_4px_rgba(33,128,141,0.8)]')}
      />
      {/* Selection border and handles when selected */}
      {isSelected && (
        <>
          {/* Selection border */}
          <rect
            x={imgX - imgW / 2}
            y={imgY - imgH / 2}
            width={imgW}
            height={imgH}
            fill="none"
            stroke="#21808D"
            strokeWidth={2}
            strokeDasharray="4 2"
          />
          {/* Corner handles */}
          {[
            { cx: imgX - imgW / 2, cy: imgY - imgH / 2 },
            { cx: imgX + imgW / 2, cy: imgY - imgH / 2 },
            { cx: imgX - imgW / 2, cy: imgY + imgH / 2 },
            { cx: imgX + imgW / 2, cy: imgY + imgH / 2 },
          ].map((pos, i) => (
            <circle
              key={i}
              cx={pos.cx}
              cy={pos.cy}
              r={6}
              fill="#21808D"
              stroke="white"
              strokeWidth={2}
            />
          ))}
        </>
      )}
    </g>
  );
}
