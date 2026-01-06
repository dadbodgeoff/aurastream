/**
 * SketchCanvas Component (Refactored)
 * 
 * Interactive canvas for drawing and annotating.
 * Handles mouse/touch events and renders sketch elements.
 */

'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useSketchStore } from '../useSketchStore';
import type { SketchCanvasProps } from '../types';
import type { TextElement } from '../../canvas-export/types';
import { useCanvasInteraction } from './useCanvasInteraction';
import { renderElement, type RenderContext } from './renderers';
import { TextInput } from './TextInput';

export function SketchCanvas({
  width,
  height,
  className,
  isActive = true,
  onElementsChange,
}: SketchCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null);
  
  const {
    elements: allElements,
    tempElement,
    activeTool,
    text: textSettings,
    isDrawing,
    selectedId,
    cancelDrawing,
    selectElement,
    addElement,
    deleteElement,
    swapColors,
    duplicateElement,
    bringForward,
    sendBackward,
  } = useSketchStore();

  // Filter out image elements - they're rendered by PlacementCanvas (DOM layer)
  // SketchCanvas only handles drawings, text, shapes, etc.
  const elements = allElements.filter(el => el.type !== 'image');

  // Debug: Log elements on each render
  console.log('[SketchCanvas] Rendering with elements:', {
    count: elements.length,
    types: elements.map(el => el.type),
    ids: elements.map(el => el.id?.substring(0, 8)),
    filteredOutImages: allElements.length - elements.length,
  });

  // Get next z-index
  const getNextZIndex = useCallback(() => {
    return elements.length > 0 ? Math.max(...elements.map((e) => e.zIndex)) + 1 : 1;
  }, [elements]);

  // Canvas interaction handlers
  const { dragState, handlePointerDown, handlePointerMove, handlePointerUp } = useCanvasInteraction({
    canvasRef,
    isActive,
    getNextZIndex,
    onTextInputStart: (x, y) => setTextInput({ x, y, value: '' }),
  });

  // Notify parent of element changes
  useEffect(() => {
    onElementsChange?.(elements);
  }, [elements, onElementsChange]);

  // Handle text input submit
  const handleTextSubmit = useCallback(() => {
    if (!textInput || !textInput.value.trim()) {
      setTextInput(null);
      return;
    }
    
    const element: TextElement = {
      id: '',
      type: 'text',
      x: textInput.x,
      y: textInput.y,
      text: textInput.value.trim(),
      fontSize: textSettings.fontSize,
      fontFamily: textSettings.fontFamily,
      color: textSettings.color,
      strokeWidth: 0,
      opacity: 100,
      zIndex: getNextZIndex(),
    };
    
    addElement(element);
    setTextInput(null);
  }, [textInput, textSettings, addElement, getNextZIndex]);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (textInput) return;
      
      // Delete selected element
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        deleteElement(selectedId);
      }
      
      // Escape to cancel/deselect
      if (e.key === 'Escape') {
        if (isDrawing) {
          cancelDrawing();
        } else if (selectedId) {
          selectElement(null);
        }
      }
      
      // X to swap colors
      if (e.key === 'x' || e.key === 'X') {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          swapColors();
        }
      }
      
      // Cmd/Ctrl+D to duplicate
      if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D')) {
        if (selectedId) {
          e.preventDefault();
          duplicateElement(selectedId);
        }
      }
      
      // [ and ] for layer ordering
      if (e.key === ']' && selectedId) {
        e.preventDefault();
        bringForward(selectedId);
      }
      if (e.key === '[' && selectedId) {
        e.preventDefault();
        sendBackward(selectedId);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, textInput, isDrawing, deleteElement, cancelDrawing, selectElement, swapColors, duplicateElement, bringForward, sendBackward]);

  // Render context for elements
  const renderCtx: RenderContext = {
    width,
    height,
    isSelected: false,
    textBold: textSettings.bold,
  };

  const aspectRatio = width / height;
  const cursorStyle = activeTool === 'select' 
    ? (dragState ? 'cursor-grabbing' : 'cursor-default')
    : activeTool === 'text'
    ? 'cursor-text'
    : activeTool === 'eyedropper'
    ? 'cursor-crosshair'
    : 'cursor-crosshair';

  const isOverlayMode = className?.includes('absolute');

  return (
    <div
      ref={canvasRef}
      className={cn(
        'relative bg-transparent select-none touch-none overflow-visible',
        isActive && cursorStyle,
        !isActive && 'pointer-events-none',
        className
      )}
      style={isOverlayMode ? undefined : { aspectRatio }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      {/* SVG Layer */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        {elements.map((el) => renderElement(el, { ...renderCtx, isSelected: el.id === selectedId }))}
        {tempElement && renderElement(tempElement, renderCtx, true)}
      </svg>
      
      {/* Text Input Overlay */}
      {textInput && (
        <TextInput
          textInput={textInput}
          canvasRef={canvasRef}
          textSettings={textSettings}
          onChange={(value) => setTextInput({ ...textInput, value })}
          onSubmit={handleTextSubmit}
          onCancel={() => setTextInput(null)}
        />
      )}
    </div>
  );
}

export default SketchCanvas;
