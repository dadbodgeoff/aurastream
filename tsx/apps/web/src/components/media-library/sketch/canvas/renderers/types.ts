/**
 * Renderer Types
 */

export interface RenderContext {
  width: number;
  height: number;
  isSelected: boolean;
  textBold?: boolean;
}

export interface CommonSvgProps {
  stroke: string;
  strokeWidth: number;
  opacity: number;
  fill: string;
  strokeDasharray?: string;
}

/**
 * Get stroke dash array for line style
 */
export function getStrokeDashArray(
  lineStyle: 'solid' | 'dashed' | 'dotted' | undefined,
  strokeWidth: number
): string | undefined {
  if (!lineStyle || lineStyle === 'solid') return undefined;
  
  if (lineStyle === 'dashed') {
    return `${strokeWidth * 3} ${strokeWidth * 2}`;
  }
  
  if (lineStyle === 'dotted') {
    return `${strokeWidth} ${strokeWidth * 2}`;
  }
  
  return undefined;
}

/**
 * Get common SVG props for an element
 */
export function getCommonProps(
  color: string,
  strokeWidth: number,
  opacity: number,
  width: number,
  height: number,
  lineStyle?: 'solid' | 'dashed' | 'dotted'
): CommonSvgProps {
  const scaledStrokeWidth = strokeWidth * Math.min(width, height) / 100;
  
  return {
    stroke: color,
    strokeWidth: scaledStrokeWidth,
    opacity: opacity / 100,
    fill: 'none',
    strokeDasharray: getStrokeDashArray(lineStyle, scaledStrokeWidth),
  };
}
