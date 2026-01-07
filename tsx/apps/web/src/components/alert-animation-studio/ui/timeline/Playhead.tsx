'use client';

/**
 * Playhead Component
 *
 * Vertical time indicator line that can be dragged to seek.
 * Shows current time label and supports keyboard navigation.
 *
 * @module ui/timeline/Playhead
 */

import { useCallback, useRef, useState, memo, useEffect } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface PlayheadProps {
  /** Current time in milliseconds */
  currentTime: number;
  /** Total duration in milliseconds */
  duration: number;
  /** Zoom level (pixels per second) */
  zoom: number;
  /** Callback when seeking to a new time */
  onSeek: (time: number) => void;
  /** Callback when drag starts */
  onDragStart?: () => void;
  /** Callback when drag ends */
  onDragEnd?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const HEAD_WIDTH = 12;
const HEAD_HEIGHT = 16;

// ============================================================================
// Component
// ============================================================================

/**
 * Draggable playhead indicator for timeline navigation.
 */
export const Playhead = memo(function Playhead({
  currentTime,
  duration,
  zoom,
  onSeek,
  onDragStart,
  onDragEnd,
  className,
}: PlayheadProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);

  // Calculate position
  const position = (currentTime / 1000) * zoom;

  // Handle mouse down to start drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsDragging(true);
      onDragStart?.();

      // Store container reference for position calculations
      containerRef.current = elementRef.current?.parentElement || null;
    },
    [onDragStart]
  );

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = Math.max(0, Math.min((x / zoom) * 1000, duration));
      onSeek(time);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onDragEnd?.();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, zoom, duration, onSeek, onDragEnd]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 100 : 10; // 100ms with shift, 10ms without

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          onSeek(Math.max(0, currentTime - step));
          break;
        case 'ArrowRight':
          e.preventDefault();
          onSeek(Math.min(duration, currentTime + step));
          break;
        case 'Home':
          e.preventDefault();
          onSeek(0);
          break;
        case 'End':
          e.preventDefault();
          onSeek(duration);
          break;
      }
    },
    [currentTime, duration, onSeek]
  );

  return (
    <div
      ref={elementRef}
      className={cn(
        'absolute top-0 bottom-0 z-20 pointer-events-none',
        className
      )}
      style={{ left: position }}
    >
      {/* Playhead Line */}
      <div className="absolute top-0 bottom-0 w-px bg-purple-500 shadow-[0_0_4px_rgba(168,85,247,0.5)]" />

      {/* Playhead Handle */}
      <div
        className={cn(
          'absolute -top-1 pointer-events-auto cursor-ew-resize',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400',
          isDragging && 'cursor-grabbing'
        )}
        style={{
          left: -HEAD_WIDTH / 2,
          width: HEAD_WIDTH,
          height: HEAD_HEIGHT,
        }}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-label="Playhead position"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        aria-valuetext={formatTime(currentTime)}
      >
        {/* Handle Shape */}
        <svg
          viewBox="0 0 12 16"
          className="w-full h-full"
        >
          {/* Drop shadow */}
          <defs>
            <filter id="playhead-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Handle body */}
          <path
            d="M1,0 L11,0 L11,10 L6,16 L1,10 Z"
            fill="#a855f7"
            stroke="#c084fc"
            strokeWidth="1"
            filter="url(#playhead-shadow)"
          />

          {/* Inner highlight */}
          <path
            d="M3,2 L9,2 L9,8 L6,12 L3,8 Z"
            fill="#c084fc"
            opacity="0.5"
          />
        </svg>
      </div>

      {/* Time Label (shown when dragging) */}
      {isDragging && (
        <div
          className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-purple-600 text-white text-xs font-mono rounded shadow-lg whitespace-nowrap"
        >
          {formatTime(currentTime)}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Utility Functions
// ============================================================================

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}.${centiseconds.toString().padStart(2, '0')}`;
}

export default Playhead;
