/**
 * Sticker Element Renderer
 */

import { cn } from '@/lib/utils';
import type { StickerElement } from '../../../canvas-export/types';
import { toViewBoxX, toViewBoxY } from '../coords';
import type { RenderContext } from './types';

export function renderSticker(
  element: StickerElement,
  ctx: RenderContext,
  key: string
): React.ReactNode {
  const { width, height, isSelected } = ctx;
  
  const stickerX = toViewBoxX(element.x, width);
  const stickerY = toViewBoxY(element.y, height);
  const stickerW = toViewBoxX(element.width, width);
  const stickerH = toViewBoxY(element.height, height);
  
  // Emoji sticker
  if (element.stickerType === 'emoji') {
    return (
      <text
        key={key}
        x={stickerX}
        y={stickerY}
        fontSize={Math.min(stickerW, stickerH) * 0.8}
        textAnchor="middle"
        dominantBaseline="central"
        opacity={element.opacity / 100}
        style={{ 
          transform: `rotate(${element.rotation}deg)`, 
          transformOrigin: `${stickerX}px ${stickerY}px` 
        }}
        className={cn(isSelected && 'filter drop-shadow-[0_0_4px_rgba(33,128,141,0.8)]')}
      >
        {element.content}
      </text>
    );
  }
  
  // SVG sticker
  if (element.stickerType === 'svg') {
    return (
      <g
        key={key}
        transform={`translate(${stickerX - stickerW / 2}, ${stickerY - stickerH / 2}) rotate(${element.rotation}, ${stickerW / 2}, ${stickerH / 2})`}
        opacity={element.opacity / 100}
        className={cn(isSelected && 'filter drop-shadow-[0_0_4px_rgba(33,128,141,0.8)]')}
        dangerouslySetInnerHTML={{ __html: element.content }}
      />
    );
  }
  
  // Image sticker
  return (
    <image
      key={key}
      href={element.content}
      x={stickerX - stickerW / 2}
      y={stickerY - stickerH / 2}
      width={stickerW}
      height={stickerH}
      opacity={element.opacity / 100}
      style={{ 
        transform: `rotate(${element.rotation}deg)`, 
        transformOrigin: `${stickerX}px ${stickerY}px` 
      }}
      className={cn(isSelected && 'filter drop-shadow-[0_0_4px_rgba(33,128,141,0.8)]')}
    />
  );
}
