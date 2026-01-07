'use client';

/**
 * Track Component
 *
 * Single property track row displaying keyframes as diamonds.
 * Supports selection, dragging, and expansion for curve editing.
 *
 * @module ui/timeline/Track
 */

import { useCallback, memo, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Track as TrackType, Keyframe as KeyframeType } from '../../engine/timeline/types';
import { Keyframe } from './Keyframe';
import { CurveEditor } from './CurveEditor';

// ============================================================================
// Types
// ============================================================================

export interface TrackProps {
  /** Track data */
  track: TrackType;
  /** Current playhead time in ms */
  currentTime: number;
  /** Zoom level (pixels per second) */
  zoom: number;
  /** Set of selected keyframe IDs */
  selectedKeyframes: Set<string>;
  /** Callback when a keyframe is clicked */
  onKeyframeClick: (keyframeId: string, addToSelection?: boolean) => void;
  /** Callback when a keyframe is moved */
  onKeyframeMove: (keyframeId: string, newTime: number) => void;
  /** Callback when a keyframe is deleted */
  onKeyframeDelete: (keyframeId: string) => void;
  /** Callback for double-click to add keyframe */
  onDoubleClick?: (e: React.MouseEvent) => void;
  /** Callback when track expansion changes */
  onExpandToggle?: () => void;
  /** Style for positioning */
  style?: React.CSSProperties;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const KEYFRAME_SIZE = 10;
const CURVE_EDITOR_HEIGHT = 120;

// ============================================================================
// Component
// ============================================================================

/**
 * Single track row in the timeline showing keyframes.
 */
export const Track = memo(function Track({
  track,
  currentTime,
  zoom,
  selectedKeyframes,
  onKeyframeClick,
  onKeyframeMove,
  onKeyframeDelete,
  onDoubleClick,
  onExpandToggle,
  style,
  className,
}: TrackProps) {
  const [isExpanded, setIsExpanded] = useState(track.expanded);
  const [draggedKeyframe, setDraggedKeyframe] = useState<string | null>(null);

  // Handle keyframe drag
  const handleKeyframeDragStart = useCallback((keyframeId: string) => {
    setDraggedKeyframe(keyframeId);
  }, []);

  const handleKeyframeDragEnd = useCallback(() => {
    setDraggedKeyframe(null);
  }, []);

  const handleKeyframeDrag = useCallback(
    (keyframeId: string, deltaX: number) => {
      const deltaTime = (deltaX / zoom) * 1000;
      const keyframe = track.keyframes.find((k) => k.id === keyframeId);
      if (keyframe) {
        const newTime = Math.max(0, keyframe.time + deltaTime);
        onKeyframeMove(keyframeId, newTime);
      }
    },
    [zoom, track.keyframes, onKeyframeMove]
  );

  // Toggle expansion
  const handleExpandToggle = useCallback(() => {
    setIsExpanded(!isExpanded);
    onExpandToggle?.();
  }, [isExpanded, onExpandToggle]);

  // Get selected keyframe for curve editor
  const selectedKeyframe = track.keyframes.find((k) => selectedKeyframes.has(k.id));

  // Calculate track opacity based on mute/solo state
  const trackOpacity = track.muted ? 0.4 : 1;

  return (
    <div
      className={cn('absolute left-0 right-0', className)}
      style={{
        ...style,
        opacity: trackOpacity,
      }}
    >
      {/* Track Row */}
      <div
        className={cn(
          'relative h-8 border-b border-gray-800',
          track.locked && 'pointer-events-none',
          !track.visible && 'opacity-50'
        )}
        onDoubleClick={onDoubleClick}
        role="row"
        aria-label={`Track: ${track.property}`}
      >
        {/* Track Background with alternating colors */}
        <div className="absolute inset-0 bg-gray-900/30" />

        {/* Current Time Indicator Line */}
        <div
          className="absolute top-0 bottom-0 w-px bg-purple-500/30"
          style={{ left: (currentTime / 1000) * zoom }}
        />

        {/* Keyframes */}
        {track.keyframes.map((keyframe) => {
          const x = (keyframe.time / 1000) * zoom;
          const isSelected = selectedKeyframes.has(keyframe.id);
          const isDragging = draggedKeyframe === keyframe.id;

          return (
            <Keyframe
              key={keyframe.id}
              keyframe={keyframe}
              position={x}
              selected={isSelected}
              dragging={isDragging}
              locked={track.locked}
              color={track.color}
              onSelect={(addToSelection) => onKeyframeClick(keyframe.id, addToSelection)}
              onDragStart={() => handleKeyframeDragStart(keyframe.id)}
              onDrag={(deltaX) => handleKeyframeDrag(keyframe.id, deltaX)}
              onDragEnd={handleKeyframeDragEnd}
              onDelete={() => onKeyframeDelete(keyframe.id)}
            />
          );
        })}

        {/* Expand Button (for curve editor) */}
        {track.keyframes.length > 1 && (
          <button
            onClick={handleExpandToggle}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label={isExpanded ? 'Collapse curve editor' : 'Expand curve editor'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {/* Curve Editor (when expanded) */}
      {isExpanded && track.keyframes.length > 1 && (
        <CurveEditor
          keyframes={track.keyframes}
          selectedKeyframe={selectedKeyframe || null}
          zoom={zoom}
          trackColor={track.color}
          onHandleChange={(keyframeId, handleType, handle) => {
            // Handle bezier handle changes
            console.log('Handle change:', keyframeId, handleType, handle);
          }}
          style={{ height: CURVE_EDITOR_HEIGHT }}
        />
      )}
    </div>
  );
});

export default Track;
