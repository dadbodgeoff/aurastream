/**
 * Canvas Interaction Hook
 * 
 * Handles all pointer events for drawing, selection, and manipulation.
 * Includes line stabilization for smoother freehand drawing.
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { useSketchStore } from '../useSketchStore';
import { MIN_POINT_DISTANCE } from '../constants';
import { getCanvasCoords } from './coords';
import { hitTest, hitTestResizeHandle, distance, type ResizeHandle } from './hitTest';
import { LineStabilizer } from '../utils/lineStabilization';
import type { 
  AnySketchElement,
  FreehandElement, 
  RectangleElement, 
  CircleElement, 
  LineElement,
  ArrowElement, 
  TextElement,
} from '../../canvas-export/types';

interface DragState {
  elementId: string;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  isResizing?: boolean;
  resizeHandle?: ResizeHandle | null;
  startWidth?: number;
  startHeight?: number;
}

interface UseCanvasInteractionProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  isActive: boolean;
  getNextZIndex: () => number;
  onTextInputStart: (x: number, y: number) => void;
}

export function useCanvasInteraction({
  canvasRef,
  isActive,
  getNextZIndex,
  onTextInputStart,
}: UseCanvasInteractionProps) {
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  
  // Line stabilizer for smooth freehand drawing
  const stabilizerRef = useRef<LineStabilizer | null>(null);
  
  const {
    elements,
    tempElement,
    activeTool,
    brush,
    isDrawing,
    selectedId,
    startDrawing,
    updateDrawing,
    finishDrawing,
    selectElement,
    deleteElement,
    moveElement,
    finishMove,
    pickColor,
  } = useSketchStore();

  // Handle pointer down
  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isActive || !canvasRef.current) return;
      
      const coords = getCanvasCoords(e, canvasRef.current);
      
      // Select tool
      if (activeTool === 'select') {
        // Check resize handle first
        if (selectedId) {
          const selectedElement = elements.find(el => el.id === selectedId);
          if (selectedElement) {
            const resizeHandle = hitTestResizeHandle(coords.x, coords.y, selectedElement);
            if (resizeHandle) {
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
        
        // Check element hit
        const hitElements = elements
          .filter((el) => hitTest(coords.x, coords.y, el))
          .sort((a, b) => b.zIndex - a.zIndex);
        
        if (hitElements.length > 0) {
          const hitElement = hitElements[0];
          selectElement(hitElement.id);
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
      
      // Eraser tool
      if (activeTool === 'eraser') {
        const hitElements = elements
          .filter((el) => hitTest(coords.x, coords.y, el))
          .sort((a, b) => b.zIndex - a.zIndex);
        
        if (hitElements.length > 0) {
          deleteElement(hitElements[0].id);
        }
        return;
      }
      
      // Eyedropper tool - pick color from element
      if (activeTool === 'eyedropper') {
        const hitElements = elements
          .filter((el) => hitTest(coords.x, coords.y, el))
          .sort((a, b) => b.zIndex - a.zIndex);
        
        if (hitElements.length > 0) {
          const element = hitElements[0];
          // Get color from element
          const color = element.color || '#FFFFFF';
          pickColor(color);
        }
        return;
      }
      
      // Text tool
      if (activeTool === 'text') {
        onTextInputStart(coords.x, coords.y);
        return;
      }
      
      // Drawing tools
      setStartPoint({ x: coords.x, y: coords.y });
      
      const baseElement = {
        id: '',
        color: brush.color,
        strokeWidth: brush.strokeWidth,
        opacity: brush.opacity,
        zIndex: getNextZIndex(),
      };
      
      if (activeTool === 'pen') {
        // Initialize stabilizer with current brush settings
        stabilizerRef.current = new LineStabilizer(brush.stabilization);
        const initialPoints = stabilizerRef.current.startStroke({ x: coords.x, y: coords.y });
        
        const element: FreehandElement = {
          ...baseElement,
          type: 'freehand',
          points: initialPoints,
          lineStyle: brush.lineStyle,
        };
        startDrawing(element);
      } else if (activeTool === 'rectangle') {
        const element: RectangleElement = {
          ...baseElement,
          type: 'rectangle',
          x: coords.x,
          y: coords.y,
          width: 0,
          height: 0,
          filled: brush.filled,
          lineStyle: brush.lineStyle,
        };
        startDrawing(element);
      } else if (activeTool === 'circle') {
        const element: CircleElement = {
          ...baseElement,
          type: 'circle',
          cx: coords.x,
          cy: coords.y,
          rx: 0,
          ry: 0,
          filled: brush.filled,
          lineStyle: brush.lineStyle,
        };
        startDrawing(element);
      } else if (activeTool === 'line') {
        const element: LineElement = {
          ...baseElement,
          type: 'line',
          startX: coords.x,
          startY: coords.y,
          endX: coords.x,
          endY: coords.y,
          lineStyle: brush.lineStyle,
        };
        startDrawing(element);
      } else if (activeTool === 'arrow') {
        const element: ArrowElement = {
          ...baseElement,
          type: 'arrow',
          startX: coords.x,
          startY: coords.y,
          endX: coords.x,
          endY: coords.y,
          lineStyle: brush.lineStyle,
        };
        startDrawing(element);
      }
    },
    [isActive, activeTool, elements, brush, selectElement, deleteElement, startDrawing, getNextZIndex, selectedId, canvasRef, onTextInputStart]
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!canvasRef.current) return;
      
      const coords = getCanvasCoords(e, canvasRef.current);
      
      // Handle drag/resize
      if (dragState) {
        const deltaX = coords.x - dragState.lastX;
        const deltaY = coords.y - dragState.lastY;
        
        if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
          if (dragState.isResizing && dragState.resizeHandle) {
            handleResize(coords, dragState);
          } else {
            moveElement(dragState.elementId, deltaX, deltaY);
          }
          setDragState({ ...dragState, lastX: coords.x, lastY: coords.y });
        }
        return;
      }
      
      // Handle drawing
      if (!isDrawing || !tempElement || !startPoint) return;
      
      handleDrawingMove(coords, tempElement, startPoint);
    },
    [isDrawing, tempElement, startPoint, dragState, moveElement, canvasRef]
  );

  // Handle resize
  const handleResize = useCallback((
    coords: { x: number; y: number },
    state: DragState
  ) => {
    const element = elements.find(el => el.id === state.elementId);
    if (!element || element.type !== 'image') return;
    
    const totalDeltaX = coords.x - state.startX;
    const totalDeltaY = coords.y - state.startY;
    
    let newWidth = state.startWidth || element.width;
    let newHeight = state.startHeight || element.height;
    
    if (state.resizeHandle?.includes('e')) {
      newWidth = Math.max(5, (state.startWidth || element.width) + totalDeltaX * 2);
    } else if (state.resizeHandle?.includes('w')) {
      newWidth = Math.max(5, (state.startWidth || element.width) - totalDeltaX * 2);
    }
    
    if (state.resizeHandle?.includes('s')) {
      newHeight = Math.max(5, (state.startHeight || element.height) + totalDeltaY * 2);
    } else if (state.resizeHandle?.includes('n')) {
      newHeight = Math.max(5, (state.startHeight || element.height) - totalDeltaY * 2);
    }
    
    // Maintain aspect ratio if enabled
    if (element.maintainAspectRatio && state.startWidth && state.startHeight) {
      const ratio = state.startWidth / state.startHeight;
      if (Math.abs(totalDeltaX) > Math.abs(totalDeltaY)) {
        newHeight = newWidth / ratio;
      } else {
        newWidth = newHeight * ratio;
      }
    }
    
    useSketchStore.setState({
      elements: elements.map(el => 
        el.id === state.elementId && el.type === 'image'
          ? { ...el, width: newWidth, height: newHeight }
          : el
      ),
    });
  }, [elements]);

  // Handle drawing move
  const handleDrawingMove = useCallback((
    coords: { x: number; y: number; shiftKey: boolean },
    temp: AnySketchElement,
    start: { x: number; y: number }
  ) => {
    if (activeTool === 'pen' && temp.type === 'freehand') {
      // Use stabilizer if available
      if (stabilizerRef.current) {
        const smoothedPoints = stabilizerRef.current.addPoint({ x: coords.x, y: coords.y });
        updateDrawing({ points: smoothedPoints });
      } else {
        // Fallback to basic point addition
        const lastPoint = temp.points[temp.points.length - 1];
        const dist = distance(lastPoint.x, lastPoint.y, coords.x, coords.y);
        
        if (dist >= MIN_POINT_DISTANCE) {
          updateDrawing({ points: [...temp.points, { x: coords.x, y: coords.y }] });
        }
      }
    } else if (activeTool === 'rectangle' && temp.type === 'rectangle') {
      let newWidth = coords.x - start.x;
      let newHeight = coords.y - start.y;
      let newX = start.x;
      let newY = start.y;
      
      if (newWidth < 0) { newX = coords.x; newWidth = Math.abs(newWidth); }
      if (newHeight < 0) { newY = coords.y; newHeight = Math.abs(newHeight); }
      
      if (coords.shiftKey) {
        const size = Math.max(newWidth, newHeight);
        newWidth = size;
        newHeight = size;
      }
      
      updateDrawing({ x: newX, y: newY, width: newWidth, height: newHeight });
    } else if (activeTool === 'circle' && temp.type === 'circle') {
      let rx = Math.abs(coords.x - start.x);
      let ry = Math.abs(coords.y - start.y);
      
      if (coords.shiftKey) {
        const radius = Math.max(rx, ry);
        rx = radius;
        ry = radius;
      }
      
      updateDrawing({ cx: start.x, cy: start.y, rx, ry });
    } else if ((activeTool === 'line' || activeTool === 'arrow') && 
               (temp.type === 'line' || temp.type === 'arrow')) {
      let endX = coords.x;
      let endY = coords.y;
      
      if (coords.shiftKey) {
        const dx = endX - start.x;
        const dy = endY - start.y;
        const angle = Math.atan2(dy, dx);
        const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        const length = Math.sqrt(dx * dx + dy * dy);
        endX = start.x + Math.cos(snappedAngle) * length;
        endY = start.y + Math.sin(snappedAngle) * length;
      }
      
      updateDrawing({ endX, endY });
    }
  }, [activeTool, updateDrawing]);

  // Handle pointer up
  const handlePointerUp = useCallback(() => {
    if (dragState) {
      const totalDeltaX = Math.abs(dragState.lastX - dragState.startX);
      const totalDeltaY = Math.abs(dragState.lastY - dragState.startY);
      if (totalDeltaX > 0.5 || totalDeltaY > 0.5) {
        finishMove();
      }
      setDragState(null);
      return;
    }
    
    if (isDrawing) {
      // Finalize stabilized stroke for pen tool
      if (stabilizerRef.current && tempElement?.type === 'freehand') {
        const finalPoints = stabilizerRef.current.endStroke();
        updateDrawing({ points: finalPoints });
        stabilizerRef.current = null;
      }
      
      finishDrawing();
      setStartPoint(null);
    }
  }, [isDrawing, finishDrawing, dragState, finishMove, tempElement, updateDrawing]);

  return {
    dragState,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
