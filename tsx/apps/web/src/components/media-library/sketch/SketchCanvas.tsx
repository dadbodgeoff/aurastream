/**
 * SketchCanvas Component
 * 
 * Interactive canvas for drawing and annotating.
 * Handles mouse/touch events and renders sketch elements.
 * Supports element selection, dragging, and all drawing tools.
 */

'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useSketchStore } from './useSketchStore';
import { MIN_POINT_DISTANCE, SELECTION_TOLERANCE } from './constants';
import type { SketchCanvasProps, DrawingEvent } from './types';
import type { 
  AnySketchElement, 
  FreehandElement, 
  RectangleElement, 
  CircleElement, 
  LineElement,
  ArrowElement, 
  TextElement,
  StickerElement,
  ImageElement,
} from '../canvas-export/types';

// ============================================================================
// Types
// ============================================================================

interface DragState {
  elementId: string;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  isResizing?: boolean;
  resizeHandle?: 'nw' | 'ne' | 'sw' | 'se' | null;
  startWidth?: number;
  startHeight?: number;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get canvas-relative coordinates from mouse/touch event
 */
function getCanvasCoords(
  e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent,
  canvas: HTMLDivElement
): DrawingEvent {
  const rect = canvas.getBoundingClientRect();
  
  let clientX: number;
  let clientY: number;
  
  if ('touches' in e) {
    const touch = e.touches[0] || e.changedTouches[0];
    clientX = touch.clientX;
    clientY = touch.clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  
  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
    shiftKey: 'shiftKey' in e ? e.shiftKey : false,
  };
}

/**
 * Calculate distance between two points
 */
function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Hit test for element selection
 */
function hitTest(
  x: number,
  y: number,
  element: AnySketchElement,
  tolerance: number = SELECTION_TOLERANCE
): boolean {
  switch (element.type) {
    case 'freehand': {
      for (let i = 1; i < element.points.length; i++) {
        const p1 = element.points[i - 1];
        const p2 = element.points[i];
        const d = pointToLineDistance(x, y, p1.x, p1.y, p2.x, p2.y);
        if (d < tolerance + element.strokeWidth / 2) return true;
      }
      return false;
    }
    
    case 'rectangle': {
      const { x: rx, y: ry, width, height, filled } = element;
      if (filled) {
        return x >= rx && x <= rx + width && y >= ry && y <= ry + height;
      }
      const nearLeft = Math.abs(x - rx) < tolerance && y >= ry && y <= ry + height;
      const nearRight = Math.abs(x - (rx + width)) < tolerance && y >= ry && y <= ry + height;
      const nearTop = Math.abs(y - ry) < tolerance && x >= rx && x <= rx + width;
      const nearBottom = Math.abs(y - (ry + height)) < tolerance && x >= rx && x <= rx + width;
      return nearLeft || nearRight || nearTop || nearBottom;
    }
    
    case 'circle': {
      const { cx, cy, rx: radiusX, ry: radiusY, filled } = element;
      if (radiusX === 0 || radiusY === 0) return false;
      const normalizedDist = Math.sqrt(
        Math.pow((x - cx) / radiusX, 2) + Math.pow((y - cy) / radiusY, 2)
      );
      if (filled) {
        return normalizedDist <= 1;
      }
      const toleranceNorm = tolerance / Math.min(radiusX, radiusY);
      return Math.abs(normalizedDist - 1) < toleranceNorm;
    }
    
    case 'line':
    case 'arrow': {
      const d = pointToLineDistance(x, y, element.startX, element.startY, element.endX, element.endY);
      return d < tolerance + element.strokeWidth / 2;
    }
    
    case 'text': {
      const textWidth = element.text.length * element.fontSize * 0.6;
      const textHeight = element.fontSize;
      return (
        x >= element.x &&
        x <= element.x + textWidth &&
        y >= element.y - textHeight &&
        y <= element.y
      );
    }
    
    case 'sticker': {
      return (
        x >= element.x - element.width / 2 &&
        x <= element.x + element.width / 2 &&
        y >= element.y - element.height / 2 &&
        y <= element.y + element.height / 2
      );
    }
    
    case 'image': {
      return (
        x >= element.x - element.width / 2 &&
        x <= element.x + element.width / 2 &&
        y >= element.y - element.height / 2 &&
        y <= element.y + element.height / 2
      );
    }
    
    default:
      return false;
  }
}

/**
 * Check if click is on a resize handle for image elements
 * Returns the handle name or null
 */
function hitTestResizeHandle(
  x: number,
  y: number,
  element: AnySketchElement,
  handleRadius: number = 2
): 'nw' | 'ne' | 'sw' | 'se' | null {
  if (element.type !== 'image') return null;
  
  const halfW = element.width / 2;
  const halfH = element.height / 2;
  
  const handles = [
    { name: 'nw' as const, hx: element.x - halfW, hy: element.y - halfH },
    { name: 'ne' as const, hx: element.x + halfW, hy: element.y - halfH },
    { name: 'sw' as const, hx: element.x - halfW, hy: element.y + halfH },
    { name: 'se' as const, hx: element.x + halfW, hy: element.y + halfH },
  ];
  
  for (const handle of handles) {
    const dist = Math.sqrt((x - handle.hx) ** 2 + (y - handle.hy) ** 2);
    if (dist <= handleRadius) {
      return handle.name;
    }
  }
  
  return null;
}

/**
 * Calculate distance from point to line segment
 */
function pointToLineDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx: number;
  let yy: number;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  return distance(px, py, xx, yy);
}

// ============================================================================
// Component
// ============================================================================

export function SketchCanvas({
  width,
  height,
  className,
  isActive = true,
  onElementsChange,
}: SketchCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  
  const {
    elements,
    tempElement,
    activeTool,
    brush,
    text: textSettings,
    isDrawing,
    selectedId,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
    selectElement,
    addElement,
    deleteElement,
    moveElement,
    finishMove,
  } = useSketchStore();

  // Notify parent of element changes
  useEffect(() => {
    onElementsChange?.(elements);
  }, [elements, onElementsChange]);

  // Get next z-index
  const getNextZIndex = useCallback(() => {
    return elements.length > 0 ? Math.max(...elements.map((e) => e.zIndex)) + 1 : 1;
  }, [elements]);

  // Handle mouse/touch down
  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isActive || !canvasRef.current) return;
      
      const coords = getCanvasCoords(e, canvasRef.current);
      
      // Select tool - check for element hit and enable dragging
      if (activeTool === 'select') {
        // First check if clicking on a resize handle of the selected element
        if (selectedId) {
          const selectedElement = elements.find(el => el.id === selectedId);
          if (selectedElement) {
            const resizeHandle = hitTestResizeHandle(coords.x, coords.y, selectedElement);
            if (resizeHandle) {
              // Start resize
              setDragState({
                elementId: selectedId,
                startX: coords.x,
                startY: coords.y,
                lastX: coords.x,
                lastY: coords.y,
                isResizing: true,
                resizeHandle,
                startWidth: selectedElement.type === 'image' ? selectedElement.width : 0,
                startHeight: selectedElement.type === 'image' ? selectedElement.height : 0,
              });
              return;
            }
          }
        }
        
        const hitElements = elements
          .filter((el) => hitTest(coords.x, coords.y, el))
          .sort((a, b) => b.zIndex - a.zIndex);
        
        if (hitElements.length > 0) {
          const hitElement = hitElements[0];
          selectElement(hitElement.id);
          // Start drag
          setDragState({
            elementId: hitElement.id,
            startX: coords.x,
            startY: coords.y,
            lastX: coords.x,
            lastY: coords.y,
            isResizing: false,
            resizeHandle: null,
          });
        } else {
          selectElement(null);
        }
        return;
      }
      
      // Eraser tool - delete element at position
      if (activeTool === 'eraser') {
        const hitElements = elements
          .filter((el) => hitTest(coords.x, coords.y, el))
          .sort((a, b) => b.zIndex - a.zIndex);
        
        if (hitElements.length > 0) {
          deleteElement(hitElements[0].id);
        }
        return;
      }
      
      // Text tool - show input
      if (activeTool === 'text') {
        console.log('[SketchCanvas] Text tool clicked at:', coords.x, coords.y);
        setTextInput({ x: coords.x, y: coords.y, value: '' });
        return;
      }
      
      // Drawing tools
      setStartPoint({ x: coords.x, y: coords.y });
      
      if (activeTool === 'pen') {
        const element: FreehandElement = {
          id: '',
          type: 'freehand',
          points: [{ x: coords.x, y: coords.y }],
          color: brush.color,
          strokeWidth: brush.strokeWidth,
          opacity: brush.opacity,
          zIndex: getNextZIndex(),
        };
        startDrawing(element);
      } else if (activeTool === 'rectangle') {
        const element: RectangleElement = {
          id: '',
          type: 'rectangle',
          x: coords.x,
          y: coords.y,
          width: 0,
          height: 0,
          filled: brush.filled,
          color: brush.color,
          strokeWidth: brush.strokeWidth,
          opacity: brush.opacity,
          zIndex: getNextZIndex(),
        };
        startDrawing(element);
      } else if (activeTool === 'circle') {
        const element: CircleElement = {
          id: '',
          type: 'circle',
          cx: coords.x,
          cy: coords.y,
          rx: 0,
          ry: 0,
          filled: brush.filled,
          color: brush.color,
          strokeWidth: brush.strokeWidth,
          opacity: brush.opacity,
          zIndex: getNextZIndex(),
        };
        startDrawing(element);
      } else if (activeTool === 'line') {
        const element: LineElement = {
          id: '',
          type: 'line',
          startX: coords.x,
          startY: coords.y,
          endX: coords.x,
          endY: coords.y,
          color: brush.color,
          strokeWidth: brush.strokeWidth,
          opacity: brush.opacity,
          zIndex: getNextZIndex(),
        };
        startDrawing(element);
      } else if (activeTool === 'arrow') {
        const element: ArrowElement = {
          id: '',
          type: 'arrow',
          startX: coords.x,
          startY: coords.y,
          endX: coords.x,
          endY: coords.y,
          color: brush.color,
          strokeWidth: brush.strokeWidth,
          opacity: brush.opacity,
          zIndex: getNextZIndex(),
        };
        startDrawing(element);
      }
    },
    [
      isActive,
      activeTool,
      elements,
      brush,
      selectElement,
      deleteElement,
      startDrawing,
      getNextZIndex,
      selectedId,
    ]
  );

  // Handle mouse/touch move
  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!canvasRef.current) return;
      
      const coords = getCanvasCoords(e, canvasRef.current);
      
      // Handle dragging or resizing selected element
      if (dragState) {
        const deltaX = coords.x - dragState.lastX;
        const deltaY = coords.y - dragState.lastY;
        
        if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
          if (dragState.isResizing && dragState.resizeHandle) {
            // Handle resize for image elements
            const element = elements.find(el => el.id === dragState.elementId);
            if (element && element.type === 'image') {
              const totalDeltaX = coords.x - dragState.startX;
              const totalDeltaY = coords.y - dragState.startY;
              
              let newWidth = dragState.startWidth || element.width;
              let newHeight = dragState.startHeight || element.height;
              
              // Adjust size based on which handle is being dragged
              if (dragState.resizeHandle.includes('e')) {
                newWidth = Math.max(5, (dragState.startWidth || element.width) + totalDeltaX * 2);
              } else if (dragState.resizeHandle.includes('w')) {
                newWidth = Math.max(5, (dragState.startWidth || element.width) - totalDeltaX * 2);
              }
              
              if (dragState.resizeHandle.includes('s')) {
                newHeight = Math.max(5, (dragState.startHeight || element.height) + totalDeltaY * 2);
              } else if (dragState.resizeHandle.includes('n')) {
                newHeight = Math.max(5, (dragState.startHeight || element.height) - totalDeltaY * 2);
              }
              
              // Maintain aspect ratio if enabled
              if (element.maintainAspectRatio && dragState.startWidth && dragState.startHeight) {
                const ratio = dragState.startWidth / dragState.startHeight;
                if (Math.abs(totalDeltaX) > Math.abs(totalDeltaY)) {
                  newHeight = newWidth / ratio;
                } else {
                  newWidth = newHeight * ratio;
                }
              }
              
              // Update element size
              useSketchStore.setState({
                elements: elements.map(el => 
                  el.id === dragState.elementId && el.type === 'image'
                    ? { ...el, width: newWidth, height: newHeight }
                    : el
                ),
              });
            }
          } else {
            // Normal drag
            moveElement(dragState.elementId, deltaX, deltaY);
          }
          setDragState({
            ...dragState,
            lastX: coords.x,
            lastY: coords.y,
          });
        }
        return;
      }
      
      // Handle drawing
      if (!isDrawing || !tempElement || !startPoint) return;
      
      if (activeTool === 'pen' && tempElement.type === 'freehand') {
        const lastPoint = tempElement.points[tempElement.points.length - 1];
        const dist = distance(lastPoint.x, lastPoint.y, coords.x, coords.y);
        
        if (dist >= MIN_POINT_DISTANCE) {
          updateDrawing({
            points: [...tempElement.points, { x: coords.x, y: coords.y }],
          });
        }
      } else if (activeTool === 'rectangle' && tempElement.type === 'rectangle') {
        let newWidth = coords.x - startPoint.x;
        let newHeight = coords.y - startPoint.y;
        let newX = startPoint.x;
        let newY = startPoint.y;
        
        if (newWidth < 0) {
          newX = coords.x;
          newWidth = Math.abs(newWidth);
        }
        if (newHeight < 0) {
          newY = coords.y;
          newHeight = Math.abs(newHeight);
        }
        
        if (coords.shiftKey) {
          const size = Math.max(newWidth, newHeight);
          newWidth = size;
          newHeight = size;
        }
        
        updateDrawing({
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      } else if (activeTool === 'circle' && tempElement.type === 'circle') {
        const dx = coords.x - startPoint.x;
        const dy = coords.y - startPoint.y;
        let rx = Math.abs(dx);
        let ry = Math.abs(dy);
        
        if (coords.shiftKey) {
          const radius = Math.max(rx, ry);
          rx = radius;
          ry = radius;
        }
        
        updateDrawing({
          cx: startPoint.x,
          cy: startPoint.y,
          rx,
          ry,
        });
      } else if ((activeTool === 'line' || activeTool === 'arrow') && 
                 (tempElement.type === 'line' || tempElement.type === 'arrow')) {
        let endX = coords.x;
        let endY = coords.y;
        
        // Shift key for straight lines (45° increments)
        if (coords.shiftKey) {
          const dx = endX - startPoint.x;
          const dy = endY - startPoint.y;
          const angle = Math.atan2(dy, dx);
          const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          const length = Math.sqrt(dx * dx + dy * dy);
          endX = startPoint.x + Math.cos(snappedAngle) * length;
          endY = startPoint.y + Math.sin(snappedAngle) * length;
        }
        
        updateDrawing({
          endX,
          endY,
        });
      }
    },
    [isDrawing, tempElement, startPoint, activeTool, updateDrawing, dragState, moveElement]
  );

  // Handle mouse/touch up
  const handlePointerUp = useCallback(() => {
    if (dragState) {
      // Check if we actually moved
      const totalDeltaX = Math.abs(dragState.lastX - dragState.startX);
      const totalDeltaY = Math.abs(dragState.lastY - dragState.startY);
      if (totalDeltaX > 0.5 || totalDeltaY > 0.5) {
        finishMove();
      }
      setDragState(null);
      return;
    }
    
    if (isDrawing) {
      finishDrawing();
      setStartPoint(null);
    }
  }, [isDrawing, finishDrawing, dragState, finishMove]);

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

  // Handle keyboard for text input and deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in text input
      if (textInput) return;
      
      // Delete selected element
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        deleteElement(selectedId);
      }
      
      // Cancel drawing with Escape
      if (e.key === 'Escape') {
        if (isDrawing) {
          cancelDrawing();
          setStartPoint(null);
        } else if (selectedId) {
          selectElement(null);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, textInput, isDrawing, deleteElement, cancelDrawing, selectElement]);

  // Render elements to SVG
  const renderElement = (element: AnySketchElement, isTemp = false) => {
    const key = isTemp ? `temp-${element.id}` : element.id;
    const isSelected = element.id === selectedId;
    
    // Helper to convert percentage to viewBox coordinates
    const toX = (pct: number) => (pct / 100) * width;
    const toY = (pct: number) => (pct / 100) * height;
    
    const commonProps = {
      stroke: element.color,
      strokeWidth: element.strokeWidth * Math.min(width, height) / 100,
      opacity: element.opacity / 100,
      fill: 'none',
    };
    
    switch (element.type) {
      case 'freehand': {
        if (element.points.length < 2) return null;
        const pathData = element.points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.x)} ${toY(p.y)}`)
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
      
      case 'rectangle': {
        return (
          <rect
            key={key}
            x={toX(element.x)}
            y={toY(element.y)}
            width={toX(element.width)}
            height={toY(element.height)}
            {...commonProps}
            fill={element.filled ? element.color : 'none'}
            fillOpacity={element.filled ? element.opacity / 100 : 0}
            className={cn(isSelected && 'filter drop-shadow-[0_0_4px_rgba(33,128,141,0.8)]')}
          />
        );
      }
      
      case 'circle': {
        return (
          <ellipse
            key={key}
            cx={toX(element.cx)}
            cy={toY(element.cy)}
            rx={toX(element.rx)}
            ry={toY(element.ry)}
            {...commonProps}
            fill={element.filled ? element.color : 'none'}
            fillOpacity={element.filled ? element.opacity / 100 : 0}
            className={cn(isSelected && 'filter drop-shadow-[0_0_4px_rgba(33,128,141,0.8)]')}
          />
        );
      }
      
      case 'line': {
        return (
          <line
            key={key}
            x1={toX(element.startX)}
            y1={toY(element.startY)}
            x2={toX(element.endX)}
            y2={toY(element.endY)}
            {...commonProps}
            strokeLinecap="round"
            className={cn(isSelected && 'filter drop-shadow-[0_0_4px_rgba(33,128,141,0.8)]')}
          />
        );
      }
      
      case 'arrow': {
        const startX = toX(element.startX);
        const startY = toY(element.startY);
        const endX = toX(element.endX);
        const endY = toY(element.endY);
        const angle = Math.atan2(endY - startY, endX - startX);
        const headLength = Math.min(width, height) * 0.02;
        
        const head1X = endX - headLength * Math.cos(angle - Math.PI / 6);
        const head1Y = endY - headLength * Math.sin(angle - Math.PI / 6);
        const head2X = endX - headLength * Math.cos(angle + Math.PI / 6);
        const head2Y = endY - headLength * Math.sin(angle + Math.PI / 6);
        
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
              {...commonProps}
              strokeLinecap="round"
            />
          </g>
        );
      }
      
      case 'text': {
        const fontSize = element.fontSize * Math.min(width, height) / 100;
        return (
          <text
            key={key}
            x={toX(element.x)}
            y={toY(element.y)}
            fill={element.color}
            fontSize={fontSize}
            fontFamily={element.fontFamily}
            fontWeight={textSettings.bold ? 'bold' : 'normal'}
            opacity={element.opacity / 100}
            className={cn(isSelected && 'filter drop-shadow-[0_0_4px_rgba(33,128,141,0.8)]')}
          >
            {element.text}
          </text>
        );
      }
      
      case 'sticker': {
        const stickerX = toX(element.x);
        const stickerY = toY(element.y);
        const stickerW = toX(element.width);
        const stickerH = toY(element.height);
        
        // Render sticker based on type
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
              style={{ transform: `rotate(${element.rotation}deg)`, transformOrigin: `${stickerX}px ${stickerY}px` }}
              className={cn(isSelected && 'filter drop-shadow-[0_0_4px_rgba(33,128,141,0.8)]')}
            >
              {element.content}
            </text>
          );
        }
        
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
            style={{ transform: `rotate(${element.rotation}deg)`, transformOrigin: `${stickerX}px ${stickerY}px` }}
            className={cn(isSelected && 'filter drop-shadow-[0_0_4px_rgba(33,128,141,0.8)]')}
          />
        );
      }
      
      case 'image': {
        // Render image/asset element
        const imgX = toX(element.x);
        const imgY = toY(element.y);
        const imgW = toX(element.width);
        const imgH = toY(element.height);
        
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
      
      default:
        return null;
    }
  };

  const aspectRatio = width / height;
  const cursorStyle = activeTool === 'select' 
    ? (dragState ? 'cursor-grabbing' : 'cursor-default')
    : 'cursor-crosshair';

  // Check if we're being used as an overlay (absolute positioning from parent)
  // In this case, we should fill the parent container, not set our own aspect ratio
  const isOverlayMode = className?.includes('absolute');

  return (
    <div
      ref={canvasRef}
      className={cn(
        'relative bg-transparent select-none touch-none',
        isActive && cursorStyle,
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
      {/* SVG Layer for sketch elements */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        {/* Render all elements */}
        {elements.map((el) => renderElement(el))}
        
        {/* Render temp element while drawing */}
        {tempElement && renderElement(tempElement, true)}
      </svg>
      
      {/* Text input overlay */}
      {textInput && (() => {
        console.log('[SketchCanvas] Rendering text input at:', textInput.x, textInput.y);
        return (
          <div
            className="absolute z-50 pointer-events-auto"
            style={{
              left: `${Math.min(textInput.x, 80)}%`,
              top: `${Math.min(textInput.y, 90)}%`,
              transform: 'translate(-4px, 4px)',
            }}
          >
            <input
              type="text"
              value={textInput.value}
              onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleTextSubmit();
                }
                if (e.key === 'Escape') {
                  setTextInput(null);
                }
              }}
              onBlur={handleTextSubmit}
              autoFocus
              placeholder="Type here..."
              className="px-2 py-1 text-sm bg-background-elevated border-2 border-interactive-500 rounded shadow-lg text-text-primary placeholder-text-muted focus:outline-none min-w-[150px]"
              style={{
                fontSize: Math.max(14, textSettings.fontSize * 0.6),
                fontFamily: textSettings.fontFamily,
                color: textSettings.color,
              }}
            />
          </div>
        );
      })()}
    </div>
  );
}

export default SketchCanvas;
