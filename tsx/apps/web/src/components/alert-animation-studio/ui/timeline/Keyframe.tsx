'use client';

/**
 * Keyframe Component
 *
 * Diamond-shaped keyframe marker with selection and drag support.
 * Supports keyboard navigation and accessibility.
 *
 * @module ui/timeline/Keyframe
 */

import { useCallback, useRef, useState, memo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Keyframe as KeyframeType } from '../../engine/timeline/types';

// ============================================================================
// Types
// ============================================================================

export interface KeyframeProps {
  /** Keyframe data */
  keyframe: KeyframeType;
  /** X position in pixels */
  position: number;
  /** Whether keyframe is selected */
  selected: boolean;
  /** Whether keyframe is being dragged */
  dragging?: boolean;
  /** Whether track is locked */
  locked?: boolean;
  /** Track color for the keyframe */
  color: string;
  /** Callback when keyframe is selected */
  onSelect: (addToSelection?: boolean) => void;
  /** Callback when drag starts */
  onDragStart: () => void;
  /** Callback during drag with delta X */
  onDrag: (deltaX: number) => void;
  /** Callback when drag ends */
  onDragEnd: () => void;
  /** Callback when keyframe is deleted */
  onDelete: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const KEYFRAME_SIZE = 10;
const KEYFRAME_HALF = KEYFRAME_SIZE / 2;

// ============================================================================
// Component
// ============================================================================

/**
 * Diamond-shaped keyframe marker on the timeline.
 */
export const Keyframe = memo(function Keyframe({
  keyframe,
  position,
  selected,
  dragging = false,
  locked = false,
  color,
  onSelect,
  onDragStart,
  onDrag,
  onDragEnd,
  onDelete,
  className,
}: KeyframeProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const lastX = useRef(0);

  // Handle mouse down for selection and drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (locked) return;

      e.stopPropagation();

      // Select on click
      const addToSelection = e.shiftKey || e.metaKey || e.ctrlKey;
      onSelect(addToSelection);

      // Start drag
      setIsDragging(true);
      dragStartX.current = e.clientX;
      lastX.current = e.clientX;
      onDragStart();
    },
    [locked, onSelect, onDragStart]
  );

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - lastX.current;
      lastX.current = e.clientX;
      onDrag(deltaX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onDrag, onDragEnd]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (locked) return;

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          onDelete();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onDrag(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          onDrag(10);
          break;
      }
    },
    [locked, onDelete, onSelect, onDrag]
  );

  return (
    <div
      ref={elementRef}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 cursor-pointer',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-900',
        locked && 'cursor-not-allowed opacity-50',
        dragging && 'z-10',
        className
      )}
      style={{
        left: position - KEYFRAME_HALF,
        width: KEYFRAME_SIZE,
        height: KEYFRAME_SIZE,
      }}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      tabIndex={locked ? -1 : 0}
      role="button"
      aria-label={`Keyframe at ${Math.round(keyframe.time)}ms, value ${keyframe.value.toFixed(2)}`}
      aria-pressed={selected}
    >
      {/* Diamond Shape */}
      <svg
        viewBox="0 0 10 10"
        className={cn(
          'w-full h-full transition-transform',
          selected && 'scale-125',
          dragging && 'scale-150'
        )}
      >
        {/* Outer glow when selected */}
        {selected && (
          <polygon
            points="5,0 10,5 5,10 0,5"
            fill="none"
            stroke={color}
            strokeWidth="2"
            opacity="0.5"
            className="animate-pulse"
          />
        )}

        {/* Main diamond */}
        <polygon
          points="5,1 9,5 5,9 1,5"
          fill={selected ? color : 'currentColor'}
          stroke={selected ? 'white' : color}
          strokeWidth="1"
          className={cn(
            'transition-colors',
            !selected && 'text-gray-600'
          )}
        />

        {/* Inner highlight */}
        {selected && (
          <polygon
            points="5,3 7,5 5,7 3,5"
            fill="white"
            opacity="0.5"
          />
        )}
      </svg>

      {/* Tooltip on hover */}
      <div
        className={cn(
          'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1',
          'bg-gray-800 text-white text-[10px] rounded whitespace-nowrap',
          'opacity-0 pointer-events-none transition-opacity',
          'group-hover:opacity-100'
        )}
      >
        {Math.round(keyframe.time)}ms
      </div>
    </div>
  );
});

export default Keyframe;
