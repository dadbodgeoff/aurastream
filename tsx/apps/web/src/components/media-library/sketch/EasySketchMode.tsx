/**
 * EasySketchMode Component
 * 
 * Simplified sketch interface for beginners and kids.
 * Three simple modes:
 * 1. 📦 Box Mode - Draw boxes and label them
 * 2. ✏️ Draw Mode - Simple freehand drawing
 * 3. 💬 Text Mode - Add text labels anywhere
 * 
 * No complex tools, no overwhelming options.
 * "A 5-year-old could do it"
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { AnySketchElement, RectangleElement, FreehandElement, TextElement } from '../canvas-export/types';

// ============================================================================
// Types
// ============================================================================

type EasyMode = 'box' | 'draw' | 'text';

interface EasySketchModeProps {
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Sketch elements */
  elements: AnySketchElement[];
  /** Callback when elements change */
  onElementsChange: (elements: AnySketchElement[]) => void;
  /** Optional background image */
  backgroundImage?: string;
  /** Optional className */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const COLORS = [
  { name: 'Red', value: '#EF4444', emoji: '🔴' },
  { name: 'Orange', value: '#F97316', emoji: '🟠' },
  { name: 'Yellow', value: '#EAB308', emoji: '🟡' },
  { name: 'Green', value: '#22C55E', emoji: '🟢' },
  { name: 'Blue', value: '#3B82F6', emoji: '🔵' },
  { name: 'Purple', value: '#A855F7', emoji: '🟣' },
  { name: 'White', value: '#FFFFFF', emoji: '⚪' },
];

function generateId(): string {
  return `easy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================================
// Icons
// ============================================================================

function BoxIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

// ============================================================================
// Component
// ============================================================================

export function EasySketchMode({
  width,
  height,
  elements,
  onElementsChange,
  backgroundImage,
  className,
}: EasySketchModeProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<EasyMode>('box');
  const [color, setColor] = useState(COLORS[4].value); // Blue default
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentElement, setCurrentElement] = useState<AnySketchElement | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null);
  const [history, setHistory] = useState<AnySketchElement[][]>([]);

  // Get coordinates as percentage
  const getCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0;
      clientY = e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY ?? 0;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  // Save to history
  const saveHistory = useCallback(() => {
    setHistory((prev) => [...prev.slice(-19), elements]);
  }, [elements]);

  // Undo
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    onElementsChange(prev);
  }, [history, onElementsChange]);

  // Clear all
  const handleClear = useCallback(() => {
    if (elements.length === 0) return;
    saveHistory();
    onElementsChange([]);
  }, [elements, saveHistory, onElementsChange]);

  // Start interaction
  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoords(e);
    
    if (mode === 'text') {
      setTextInput({ x: coords.x, y: coords.y, value: '' });
      return;
    }
    
    setIsDrawing(true);
    setStartPoint(coords);
    
    if (mode === 'box') {
      const element: RectangleElement = {
        id: generateId(),
        type: 'rectangle',
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
        filled: false,
        color,
        strokeWidth: 3,
        opacity: 100,
        zIndex: elements.length + 1,
      };
      setCurrentElement(element);
    } else if (mode === 'draw') {
      const element: FreehandElement = {
        id: generateId(),
        type: 'freehand',
        points: [{ x: coords.x, y: coords.y }],
        color,
        strokeWidth: 4,
        opacity: 100,
        zIndex: elements.length + 1,
      };
      setCurrentElement(element);
    }
  }, [mode, color, elements.length, getCoords]);

  // Continue interaction
  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !startPoint || !currentElement) return;
    
    const coords = getCoords(e);
    
    if (mode === 'box' && currentElement.type === 'rectangle') {
      const x = Math.min(startPoint.x, coords.x);
      const y = Math.min(startPoint.y, coords.y);
      const w = Math.abs(coords.x - startPoint.x);
      const h = Math.abs(coords.y - startPoint.y);
      
      setCurrentElement({
        ...currentElement,
        x,
        y,
        width: w,
        height: h,
      });
    } else if (mode === 'draw' && currentElement.type === 'freehand') {
      const lastPoint = currentElement.points[currentElement.points.length - 1];
      const dist = Math.sqrt(
        Math.pow(coords.x - lastPoint.x, 2) + Math.pow(coords.y - lastPoint.y, 2)
      );
      
      if (dist > 0.5) {
        setCurrentElement({
          ...currentElement,
          points: [...currentElement.points, { x: coords.x, y: coords.y }],
        });
      }
    }
  }, [isDrawing, startPoint, currentElement, mode, getCoords]);

  // End interaction
  const handlePointerUp = useCallback(() => {
    if (!isDrawing || !currentElement) {
      setIsDrawing(false);
      return;
    }
    
    // Validate element
    let isValid = false;
    if (currentElement.type === 'rectangle') {
      isValid = currentElement.width > 2 && currentElement.height > 2;
    } else if (currentElement.type === 'freehand') {
      isValid = currentElement.points.length >= 2;
    }
    
    if (isValid) {
      saveHistory();
      onElementsChange([...elements, currentElement]);
    }
    
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentElement(null);
  }, [isDrawing, currentElement, elements, saveHistory, onElementsChange]);

  // Submit text
  const handleTextSubmit = useCallback(() => {
    if (!textInput || !textInput.value.trim()) {
      setTextInput(null);
      return;
    }
    
    const element: TextElement = {
      id: generateId(),
      type: 'text',
      x: textInput.x,
      y: textInput.y,
      text: textInput.value.trim(),
      fontSize: 24,
      fontFamily: 'system-ui, sans-serif',
      color,
      strokeWidth: 0,
      opacity: 100,
      zIndex: elements.length + 1,
    };
    
    saveHistory();
    onElementsChange([...elements, element]);
    setTextInput(null);
  }, [textInput, color, elements, saveHistory, onElementsChange]);

  const aspectRatio = width / height;

  return (
    <div ref={containerRef} className={cn('absolute inset-0 flex flex-col', className)}>
      {/* Toolbar - Compact horizontal layout */}
      <div className="flex items-center justify-between gap-2 p-2 bg-background-elevated/80 backdrop-blur-sm border-b border-border-subtle shrink-0">
        {/* Mode selector - Compact buttons */}
        <div className="flex gap-1">
          {[
            { id: 'box' as EasyMode, icon: BoxIcon, label: '📦', desc: 'Box' },
            { id: 'draw' as EasyMode, icon: PencilIcon, label: '✏️', desc: 'Draw' },
            { id: 'text' as EasyMode, icon: TextIcon, label: '💬', desc: 'Text' },
          ].map(({ id, icon: Icon, label, desc }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 rounded-lg border transition-all text-sm',
                mode === id
                  ? 'border-interactive-500 bg-interactive-500/10 text-interactive-400'
                  : 'border-border-subtle bg-background-surface text-text-secondary hover:border-border-default'
              )}
              title={desc}
            >
              <span>{label}</span>
              <span className="hidden sm:inline text-xs">{desc}</span>
            </button>
          ))}
        </div>

        {/* Color picker - Compact */}
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={cn(
                'w-6 h-6 rounded-md text-sm transition-all',
                color === c.value
                  ? 'ring-2 ring-interactive-500 ring-offset-1 ring-offset-background-base scale-110'
                  : 'hover:scale-105'
              )}
              title={c.name}
            >
              {c.emoji}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className={cn(
              'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all',
              history.length > 0
                ? 'bg-background-surface text-text-secondary hover:text-text-primary'
                : 'bg-background-elevated/50 text-text-muted cursor-not-allowed'
            )}
            title="Undo"
          >
            <UndoIcon />
          </button>
          <button
            onClick={handleClear}
            disabled={elements.length === 0}
            className={cn(
              'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all',
              elements.length > 0
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'bg-background-elevated/50 text-text-muted cursor-not-allowed'
            )}
            title="Clear All"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Canvas - Fills remaining space */}
      <div
        ref={canvasRef}
        className={cn(
          'flex-1 relative',
          mode === 'box' && 'cursor-crosshair',
          mode === 'draw' && 'cursor-crosshair',
          mode === 'text' && 'cursor-text',
        )}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        {/* Background */}
        {backgroundImage && (
          <img
            src={backgroundImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}

        {/* SVG for elements */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Existing elements */}
          {elements.map((el) => {
            if (el.type === 'rectangle') {
              return (
                <rect
                  key={el.id}
                  x={`${el.x}%`}
                  y={`${el.y}%`}
                  width={`${el.width}%`}
                  height={`${el.height}%`}
                  stroke={el.color}
                  strokeWidth={el.strokeWidth}
                  fill={el.filled ? el.color : 'none'}
                  fillOpacity={el.filled ? 0.2 : 0}
                  rx="1"
                />
              );
            }
            if (el.type === 'freehand') {
              const pathData = el.points
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`)
                .join(' ');
              return (
                <path
                  key={el.id}
                  d={pathData}
                  stroke={el.color}
                  strokeWidth={el.strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            }
            if (el.type === 'text') {
              return (
                <text
                  key={el.id}
                  x={`${el.x}%`}
                  y={`${el.y}%`}
                  fill={el.color}
                  fontSize={el.fontSize}
                  fontFamily={el.fontFamily}
                  fontWeight="bold"
                >
                  {el.text}
                </text>
              );
            }
            return null;
          })}

          {/* Current element being drawn */}
          {currentElement && currentElement.type === 'rectangle' && (
            <rect
              x={`${currentElement.x}%`}
              y={`${currentElement.y}%`}
              width={`${currentElement.width}%`}
              height={`${currentElement.height}%`}
              stroke={currentElement.color}
              strokeWidth={currentElement.strokeWidth}
              strokeDasharray="4 2"
              fill={`${currentElement.color}20`}
              rx="1"
            />
          )}
          {currentElement && currentElement.type === 'freehand' && (
            <path
              d={currentElement.points
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`)
                .join(' ')}
              stroke={currentElement.color}
              strokeWidth={currentElement.strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {/* Text input */}
        {textInput && (
          <div
            className="absolute"
            style={{
              left: `${textInput.x}%`,
              top: `${textInput.y}%`,
              transform: 'translate(-4px, -50%)',
            }}
          >
            <input
              type="text"
              value={textInput.value}
              onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTextSubmit();
                if (e.key === 'Escape') setTextInput(null);
              }}
              onBlur={handleTextSubmit}
              autoFocus
              placeholder="Type here..."
              className="px-3 py-2 text-lg bg-background-elevated border-2 border-interactive-500 rounded-lg shadow-lg text-text-primary placeholder-text-muted focus:outline-none min-w-[150px]"
              style={{ color }}
            />
          </div>
        )}

        {/* Empty state */}
        {elements.length === 0 && !currentElement && !textInput && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center p-4 bg-background-elevated/80 rounded-xl">
              <p className="text-2xl mb-1">🎨</p>
              <p className="text-text-primary font-medium text-sm">Start drawing!</p>
              <p className="text-xs text-text-muted">
                {mode === 'box' && 'Click and drag to draw a box'}
                {mode === 'draw' && 'Click and drag to draw'}
                {mode === 'text' && 'Click anywhere to add text'}
              </p>
            </div>
          </div>
        )}
        
        {/* Element count badge */}
        {elements.length > 0 && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white/80 pointer-events-none">
            {elements.length} element{elements.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

export default EasySketchMode;
