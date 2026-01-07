'use client';

/**
 * Curve Editor Component
 *
 * Bezier curve editor for keyframe interpolation.
 * Shows the interpolation curve between keyframes with draggable handles.
 *
 * @module ui/timeline/CurveEditor
 */

import { useCallback, useRef, useState, memo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Keyframe, BezierHandle } from '../../engine/timeline/types';

// ============================================================================
// Types
// ============================================================================

export interface CurveEditorProps {
  /** Keyframes to display curves for */
  keyframes: Keyframe[];
  /** Currently selected keyframe (or null) */
  selectedKeyframe: Keyframe | null;
  /** Zoom level (pixels per second) */
  zoom: number;
  /** Track color */
  trackColor: string;
  /** Callback when a bezier handle is changed */
  onHandleChange: (
    keyframeId: string,
    handleType: 'handleIn' | 'handleOut',
    handle: BezierHandle
  ) => void;
  /** Style for the container */
  style?: React.CSSProperties;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const HANDLE_SIZE = 8;
const PADDING = 20;

// ============================================================================
// Component
// ============================================================================

/**
 * Bezier curve editor for visualizing and editing keyframe interpolation.
 */
export const CurveEditor = memo(function CurveEditor({
  keyframes,
  selectedKeyframe,
  zoom,
  trackColor,
  onHandleChange,
  style,
  className,
}: CurveEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingHandle, setDraggingHandle] = useState<{
    keyframeId: string;
    handleType: 'handleIn' | 'handleOut';
  } | null>(null);

  // Sort keyframes by time
  const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time);

  // Calculate value range for normalization
  const values = sortedKeyframes.map((k) => k.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  // Get container dimensions
  const containerHeight = (style?.height as number) || 120;
  const graphHeight = containerHeight - PADDING * 2;

  // Convert time to X position
  const timeToX = useCallback(
    (time: number) => (time / 1000) * zoom,
    [zoom]
  );

  // Convert value to Y position (inverted because SVG Y is top-down)
  const valueToY = useCallback(
    (value: number) => {
      const normalized = (value - minValue) / valueRange;
      return PADDING + graphHeight * (1 - normalized);
    },
    [minValue, valueRange, graphHeight]
  );

  // Convert Y position back to value
  const yToValue = useCallback(
    (y: number) => {
      const normalized = 1 - (y - PADDING) / graphHeight;
      return minValue + normalized * valueRange;
    },
    [minValue, valueRange, graphHeight]
  );

  // Generate bezier curve path between two keyframes
  const generateCurvePath = useCallback(
    (k1: Keyframe, k2: Keyframe): string => {
      const x1 = timeToX(k1.time);
      const y1 = valueToY(k1.value);
      const x2 = timeToX(k2.time);
      const y2 = valueToY(k2.value);

      const segmentWidth = x2 - x1;
      const segmentHeight = y2 - y1;

      // Default bezier handles if not specified
      const handleOut = k1.handleOut || { x: 0.33, y: 0 };
      const handleIn = k2.handleIn || { x: 0.67, y: 0 };

      // Calculate control points
      const cp1x = x1 + handleOut.x * segmentWidth;
      const cp1y = y1 + handleOut.y * segmentHeight;
      const cp2x = x1 + handleIn.x * segmentWidth;
      const cp2y = y1 + handleIn.y * segmentHeight;

      return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
    },
    [timeToX, valueToY]
  );

  // Handle mouse down on bezier handle
  const handleHandleMouseDown = useCallback(
    (keyframeId: string, handleType: 'handleIn' | 'handleOut', e: React.MouseEvent) => {
      e.stopPropagation();
      setDraggingHandle({ keyframeId, handleType });
    },
    []
  );

  // Handle mouse move during drag
  useEffect(() => {
    if (!draggingHandle || !svgRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const keyframe = sortedKeyframes.find((k) => k.id === draggingHandle.keyframeId);
      if (!keyframe) return;

      // Find adjacent keyframe for reference
      const keyframeIndex = sortedKeyframes.indexOf(keyframe);
      const adjacentKeyframe =
        draggingHandle.handleType === 'handleOut'
          ? sortedKeyframes[keyframeIndex + 1]
          : sortedKeyframes[keyframeIndex - 1];

      if (!adjacentKeyframe) return;

      // Calculate normalized handle position
      const kx = timeToX(keyframe.time);
      const ky = valueToY(keyframe.value);
      const ax = timeToX(adjacentKeyframe.time);
      const ay = valueToY(adjacentKeyframe.value);

      const segmentWidth = Math.abs(ax - kx);
      const segmentHeight = ay - ky;

      const normalizedX = Math.max(0, Math.min(1, (x - kx) / segmentWidth));
      const normalizedY = segmentHeight !== 0 ? (y - ky) / segmentHeight : 0;

      onHandleChange(draggingHandle.keyframeId, draggingHandle.handleType, {
        x: normalizedX,
        y: normalizedY,
      });
    };

    const handleMouseUp = () => {
      setDraggingHandle(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingHandle, sortedKeyframes, timeToX, valueToY, onHandleChange]);

  // Calculate total width
  const totalWidth = sortedKeyframes.length > 0
    ? timeToX(sortedKeyframes[sortedKeyframes.length - 1].time) + PADDING
    : 100;

  return (
    <div
      className={cn(
        'relative bg-gray-900/50 border-t border-gray-800 overflow-hidden',
        className
      )}
      style={style}
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox={`0 0 ${totalWidth} ${containerHeight}`}
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        <g className="text-gray-800">
          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = PADDING + graphHeight * (1 - ratio);
            return (
              <line
                key={`h-${ratio}`}
                x1={0}
                y1={y}
                x2={totalWidth}
                y2={y}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray={ratio === 0.5 ? 'none' : '2,4'}
                opacity={ratio === 0.5 ? 0.5 : 0.3}
              />
            );
          })}
        </g>

        {/* Curves between keyframes */}
        {sortedKeyframes.slice(0, -1).map((keyframe, index) => {
          const nextKeyframe = sortedKeyframes[index + 1];
          const path = generateCurvePath(keyframe, nextKeyframe);

          return (
            <path
              key={`curve-${keyframe.id}`}
              d={path}
              fill="none"
              stroke={trackColor}
              strokeWidth="2"
              opacity="0.8"
            />
          );
        })}

        {/* Keyframe points */}
        {sortedKeyframes.map((keyframe) => {
          const x = timeToX(keyframe.time);
          const y = valueToY(keyframe.value);
          const isSelected = selectedKeyframe?.id === keyframe.id;

          return (
            <g key={`point-${keyframe.id}`}>
              {/* Keyframe dot */}
              <circle
                cx={x}
                cy={y}
                r={isSelected ? 6 : 4}
                fill={isSelected ? trackColor : 'white'}
                stroke={trackColor}
                strokeWidth="2"
              />

              {/* Bezier handles (only for selected keyframe) */}
              {isSelected && (
                <>
                  {/* Handle Out (to next keyframe) */}
                  {keyframe.handleOut && sortedKeyframes.indexOf(keyframe) < sortedKeyframes.length - 1 && (
                    <BezierHandleControl
                      keyframe={keyframe}
                      handleType="handleOut"
                      handle={keyframe.handleOut}
                      nextKeyframe={sortedKeyframes[sortedKeyframes.indexOf(keyframe) + 1]}
                      timeToX={timeToX}
                      valueToY={valueToY}
                      color={trackColor}
                      onMouseDown={(e) => handleHandleMouseDown(keyframe.id, 'handleOut', e)}
                    />
                  )}

                  {/* Handle In (from previous keyframe) */}
                  {keyframe.handleIn && sortedKeyframes.indexOf(keyframe) > 0 && (
                    <BezierHandleControl
                      keyframe={keyframe}
                      handleType="handleIn"
                      handle={keyframe.handleIn}
                      prevKeyframe={sortedKeyframes[sortedKeyframes.indexOf(keyframe) - 1]}
                      timeToX={timeToX}
                      valueToY={valueToY}
                      color={trackColor}
                      onMouseDown={(e) => handleHandleMouseDown(keyframe.id, 'handleIn', e)}
                    />
                  )}
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* Value labels */}
      <div className="absolute left-1 top-0 bottom-0 flex flex-col justify-between py-4 text-[10px] text-gray-500 pointer-events-none">
        <span>{maxValue.toFixed(2)}</span>
        <span>{((maxValue + minValue) / 2).toFixed(2)}</span>
        <span>{minValue.toFixed(2)}</span>
      </div>
    </div>
  );
});

// ============================================================================
// Bezier Handle Sub-component
// ============================================================================

interface BezierHandleControlProps {
  keyframe: Keyframe;
  handleType: 'handleIn' | 'handleOut';
  handle: BezierHandle;
  nextKeyframe?: Keyframe;
  prevKeyframe?: Keyframe;
  timeToX: (time: number) => number;
  valueToY: (value: number) => number;
  color: string;
  onMouseDown: (e: React.MouseEvent) => void;
}

const BezierHandleControl = memo(function BezierHandleControl({
  keyframe,
  handleType,
  handle,
  nextKeyframe,
  prevKeyframe,
  timeToX,
  valueToY,
  color,
  onMouseDown,
}: BezierHandleControlProps) {
  const kx = timeToX(keyframe.time);
  const ky = valueToY(keyframe.value);

  const adjacentKeyframe = handleType === 'handleOut' ? nextKeyframe : prevKeyframe;
  if (!adjacentKeyframe) return null;

  const ax = timeToX(adjacentKeyframe.time);
  const ay = valueToY(adjacentKeyframe.value);

  const segmentWidth = ax - kx;
  const segmentHeight = ay - ky;

  const handleX = kx + handle.x * segmentWidth;
  const handleY = ky + handle.y * segmentHeight;

  return (
    <g>
      {/* Line from keyframe to handle */}
      <line
        x1={kx}
        y1={ky}
        x2={handleX}
        y2={handleY}
        stroke={color}
        strokeWidth="1"
        opacity="0.5"
      />

      {/* Handle circle */}
      <circle
        cx={handleX}
        cy={handleY}
        r={HANDLE_SIZE / 2}
        fill="white"
        stroke={color}
        strokeWidth="2"
        className="cursor-move"
        onMouseDown={onMouseDown}
      />
    </g>
  );
});

export default CurveEditor;
