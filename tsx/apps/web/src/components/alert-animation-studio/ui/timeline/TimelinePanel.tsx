'use client';

/**
 * Timeline Panel Component
 *
 * Main timeline container with After Effects-style keyframe editing.
 * Contains property list, track rows, playhead, and time ruler.
 *
 * @module ui/timeline/TimelinePanel
 */

import { useCallback, useRef, useState, memo } from 'react';
import { Play, Pause, SkipBack, SkipForward, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Timeline, TimelineUIState, AnimatableProperty, Keyframe as KeyframeType } from '../../engine/timeline/types';
import { PropertyList } from './PropertyList';
import { Track } from './Track';
import { Playhead } from './Playhead';

// ============================================================================
// Types
// ============================================================================

export interface TimelinePanelProps {
  /** Timeline data */
  timeline: Timeline;
  /** UI state (playhead, selection, zoom, etc.) */
  uiState: TimelineUIState;
  /** Callback when time changes */
  onTimeChange: (time: number) => void;
  /** Callback when a keyframe is added */
  onKeyframeAdd: (trackId: string, time: number, value: number) => void;
  /** Callback when a keyframe is moved */
  onKeyframeMove: (trackId: string, keyframeId: string, newTime: number) => void;
  /** Callback when a keyframe is selected */
  onKeyframeSelect: (keyframeId: string, addToSelection?: boolean) => void;
  /** Callback when a keyframe is deleted */
  onKeyframeDelete: (trackId: string, keyframeId: string) => void;
  /** Callback when track visibility/mute/solo changes */
  onTrackToggle: (trackId: string, property: 'visible' | 'muted' | 'solo' | 'locked') => void;
  /** Callback when a track is added */
  onTrackAdd: (property: AnimatableProperty) => void;
  /** Callback when a track is removed */
  onTrackRemove: (trackId: string) => void;
  /** Callback when zoom changes */
  onZoomChange: (zoom: number) => void;
  /** Callback for play/pause */
  onPlayPause: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_ZOOM = 20; // pixels per second
const MAX_ZOOM = 500;
const ZOOM_STEP = 20;
const TRACK_HEIGHT = 32;
const RULER_HEIGHT = 28;
const PROPERTY_LIST_WIDTH = 200;

// ============================================================================
// Component
// ============================================================================

/**
 * Main timeline panel for keyframe animation editing.
 */
export const TimelinePanel = memo(function TimelinePanel({
  timeline,
  uiState,
  onTimeChange,
  onKeyframeAdd,
  onKeyframeMove,
  onKeyframeSelect,
  onKeyframeDelete,
  onTrackToggle,
  onTrackAdd,
  onTrackRemove,
  onZoomChange,
  onPlayPause,
  className,
}: TimelinePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  // Calculate timeline width based on duration and zoom
  const timelineWidth = (timeline.duration / 1000) * uiState.zoom;

  // Handle zoom in/out
  const handleZoomIn = useCallback(() => {
    onZoomChange(Math.min(uiState.zoom + ZOOM_STEP, MAX_ZOOM));
  }, [uiState.zoom, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    onZoomChange(Math.max(uiState.zoom - ZOOM_STEP, MIN_ZOOM));
  }, [uiState.zoom, onZoomChange]);

  // Handle click on timeline to seek
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDraggingPlayhead) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + (tracksContainerRef.current?.scrollLeft || 0);
      const time = (x / uiState.zoom) * 1000;
      onTimeChange(Math.max(0, Math.min(time, timeline.duration)));
    },
    [uiState.zoom, timeline.duration, onTimeChange, isDraggingPlayhead]
  );

  // Handle double-click to add keyframe
  const handleDoubleClick = useCallback(
    (trackId: string, e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = (x / uiState.zoom) * 1000;
      const track = timeline.tracks.find((t) => t.id === trackId);
      if (track) {
        // Use default value for the property
        onKeyframeAdd(trackId, time, 0);
      }
    },
    [uiState.zoom, timeline.tracks, onKeyframeAdd]
  );

  // Get active properties from tracks
  const activeProperties = timeline.tracks.map((t) => t.property);

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col bg-gray-900 border border-gray-800 rounded-lg overflow-hidden',
        className
      )}
      role="region"
      aria-label="Animation Timeline"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-gray-900/80">
        {/* Playback Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onTimeChange(0)}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            aria-label="Go to start"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={onPlayPause}
            className="p-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-colors"
            aria-label={uiState.isPlaying ? 'Pause' : 'Play'}
          >
            {uiState.isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>
          <button
            onClick={() => onTimeChange(timeline.duration)}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            aria-label="Go to end"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Time Display */}
        <div className="text-xs font-mono text-gray-400">
          {formatTime(uiState.currentTime)} / {formatTime(timeline.duration)}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            disabled={uiState.zoom <= MIN_ZOOM}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 w-12 text-center">{uiState.zoom}px/s</span>
          <button
            onClick={handleZoomIn}
            disabled={uiState.zoom >= MAX_ZOOM}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Timeline Area */}
      <div className="flex flex-1 min-h-0">
        {/* Property List Sidebar */}
        <PropertyList
          availableProperties={Object.keys(timeline.tracks.length > 0 ? {} : {}) as AnimatableProperty[]}
          activeTracks={activeProperties}
          tracks={timeline.tracks}
          onAddTrack={onTrackAdd}
          onRemoveTrack={onTrackRemove}
          onTrackToggle={onTrackToggle}
          className="flex-shrink-0"
          style={{ width: PROPERTY_LIST_WIDTH }}
        />

        {/* Tracks Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Time Ruler */}
          <TimeRuler
            duration={timeline.duration}
            zoom={uiState.zoom}
            currentTime={uiState.currentTime}
            scrollLeft={uiState.scrollX}
            height={RULER_HEIGHT}
          />

          {/* Tracks Container */}
          <div
            ref={tracksContainerRef}
            className="flex-1 overflow-auto relative"
            onClick={handleTimelineClick}
          >
            <div
              className="relative"
              style={{ width: timelineWidth, minHeight: timeline.tracks.length * TRACK_HEIGHT }}
            >
              {/* Track Rows */}
              {timeline.tracks.map((track, index) => (
                <Track
                  key={track.id}
                  track={track}
                  currentTime={uiState.currentTime}
                  zoom={uiState.zoom}
                  selectedKeyframes={uiState.selectedKeyframes}
                  onKeyframeClick={onKeyframeSelect}
                  onKeyframeMove={(keyframeId, newTime) => onKeyframeMove(track.id, keyframeId, newTime)}
                  onKeyframeDelete={(keyframeId) => onKeyframeDelete(track.id, keyframeId)}
                  onDoubleClick={(e) => handleDoubleClick(track.id, e)}
                  style={{ top: index * TRACK_HEIGHT, height: TRACK_HEIGHT }}
                />
              ))}

              {/* Playhead */}
              <Playhead
                currentTime={uiState.currentTime}
                duration={timeline.duration}
                zoom={uiState.zoom}
                onSeek={onTimeChange}
                onDragStart={() => setIsDraggingPlayhead(true)}
                onDragEnd={() => setIsDraggingPlayhead(false)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// Time Ruler Sub-component
// ============================================================================

interface TimeRulerProps {
  duration: number;
  zoom: number;
  currentTime: number;
  scrollLeft: number;
  height: number;
}

const TimeRuler = memo(function TimeRuler({
  duration,
  zoom,
  currentTime,
  scrollLeft,
  height,
}: TimeRulerProps) {
  // Calculate tick interval based on zoom
  const getTickInterval = () => {
    if (zoom >= 200) return 100; // 100ms
    if (zoom >= 100) return 250; // 250ms
    if (zoom >= 50) return 500; // 500ms
    return 1000; // 1s
  };

  const tickInterval = getTickInterval();
  const tickCount = Math.ceil(duration / tickInterval) + 1;
  const majorTickEvery = tickInterval < 1000 ? 1000 / tickInterval : 1;

  return (
    <div
      className="relative bg-gray-800/50 border-b border-gray-700 overflow-hidden"
      style={{ height }}
      role="presentation"
    >
      <div
        className="absolute top-0 left-0 h-full"
        style={{ width: (duration / 1000) * zoom }}
      >
        {Array.from({ length: tickCount }).map((_, i) => {
          const time = i * tickInterval;
          const x = (time / 1000) * zoom;
          const isMajor = i % majorTickEvery === 0;

          return (
            <div
              key={i}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: x }}
            >
              <div
                className={cn(
                  'w-px',
                  isMajor ? 'h-3 bg-gray-500' : 'h-2 bg-gray-600'
                )}
              />
              {isMajor && (
                <span className="text-[10px] text-gray-500 mt-0.5">
                  {formatTimeShort(time)}
                </span>
              )}
            </div>
          );
        })}
      </div>
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

function formatTimeShort(ms: number): string {
  const totalSeconds = ms / 1000;
  if (totalSeconds < 1) {
    return `${ms}ms`;
  }
  return `${totalSeconds.toFixed(totalSeconds % 1 === 0 ? 0 : 1)}s`;
}

export default TimelinePanel;
