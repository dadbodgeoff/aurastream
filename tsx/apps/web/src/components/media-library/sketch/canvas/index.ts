/**
 * Canvas Module
 * 
 * Refactored SketchCanvas with modular architecture.
 */

export { SketchCanvas, default } from './SketchCanvas';
export { useCanvasInteraction } from './useCanvasInteraction';
export { TextInput } from './TextInput';
export { getCanvasCoords, toViewBoxX, toViewBoxY } from './coords';
export { hitTest, hitTestResizeHandle, distance, pointToLineDistance, type ResizeHandle } from './hitTest';
export { renderElement, type RenderContext } from './renderers';
