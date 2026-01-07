'use client';

/**
 * Beat Markers Component
 *
 * Displays detected beat markers on the timeline.
 * Color-coded by beat type (kick/snare/hihat).
 *
 * @module ui/audio/BeatMarkers
 */

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { BeatInfo, BeatType } from '../../engine/audio/types';

// ============================================================================
// Types
// ============================================================================

export interface BeatMarkersProps {
  /** Array of detected beats */
  beats: BeatInfo[];
  /** Current playback time in milliseconds */
  currentTime: number;
  /** Zoom level (pixels per second) */
  zoom: number;
  /** Height of the markers area */
  height?: number;
  /** Whether to show beat type colors */
  showColors?: boolean;
  /** Whether to show beat strength */
  showStrength?: boolean;
  /** Callback when a beat marker is clicked */
  onBeatClick?: (beat: BeatInfo) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const BEAT_COLORS: Record<BeatType, string> = {
  kick: '#ef4444',    // red
  snare: '#3b82f6',   // blue
  hihat: '#22c55e',   // green
  other: '#6b7280',   // gray
};

const BEAT_LABELS: Record<BeatType, string> = {
  kick: 'K',
  snare: 'S',
  hihat: 'H',
  other: '•',
};

const DEFAULT_HEIGHT = 24;
const MARKER_WIDTH = 2;

// ============================================================================
// Component
// ============================================================================

/**
 * Beat markers visualization for timeline.
 */
export const BeatMarkers = memo(function BeatMarkers({
  beats,
  currentTime,
  zoom,
  height = DEFAULT_HEIGHT,
  showColors = true,
  showStrength = true,
  onBeatClick,
  className,
}: BeatMarkersProps) {
  // Find the current/most recent beat
  const currentBeatIndex = useMemo(() => {
    for (let i = beats.length - 1; i >= 0; i--) {
      if (beats[i].time <= currentTime) {
        return i;
      }
    }
    return -1;
  }, [beats, currentTime]);

  // Calculate total width
  const maxTime = beats.length > 0 ? Math.max(...beats.map((b) => b.time)) : 0;
  const totalWidth = (maxTime / 1000) * zoom + 50;

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ height }}
      role="img"
      aria-label="Beat markers"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gray-900/30" />

      {/* Markers */}
      <div className="relative h-full" style={{ width: totalWidth }}>
        {beats.map((beat, index) => {
          const x = (beat.time / 1000) * zoom;
          const color = showColors ? BEAT_COLORS[beat.type] : BEAT_COLORS.other;
          const markerHeight = showStrength
            ? Math.max(4, beat.strength * (height - 4))
            : height - 4;
          const isCurrent = index === currentBeatIndex;
          const isPast = beat.time < currentTime;

          return (
            <div
              key={`beat-${index}-${beat.time}`}
              className={cn(
                'absolute bottom-0 transition-opacity',
                isPast ? 'opacity-50' : 'opacity-100',
                onBeatClick && 'cursor-pointer hover:opacity-100'
              )}
              style={{
                left: x - MARKER_WIDTH / 2,
                width: MARKER_WIDTH,
                height: markerHeight,
                backgroundColor: color,
                boxShadow: isCurrent ? `0 0 8px ${color}` : 'none',
              }}
              onClick={() => onBeatClick?.(beat)}
              role={onBeatClick ? 'button' : undefined}
              aria-label={`${beat.type} beat at ${Math.round(beat.time)}ms`}
            >
              {/* Beat type indicator (for strong beats) */}
              {beat.strength > 0.7 && (
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold"
                  style={{ color }}
                >
                  {BEAT_LABELS[beat.type]}
                </div>
              )}
            </div>
          );
        })}

        {/* Current time indicator */}
        <div
          className="absolute top-0 bottom-0 w-px bg-purple-500 pointer-events-none"
          style={{ left: (currentTime / 1000) * zoom }}
        />
      </div>

      {/* Legend */}
      {showColors && beats.length > 0 && (
        <div className="absolute top-1 right-2 flex items-center gap-2">
          {(['kick', 'snare', 'hihat'] as BeatType[]).map((type) => (
            <div key={type} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: BEAT_COLORS[type] }}
              />
              <span className="text-[9px] text-gray-500 uppercase">{type}</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {beats.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
          No beats detected
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Beat Counter Sub-component
// ============================================================================

export interface BeatCounterProps {
  /** Current BPM */
  bpm: number;
  /** Current beat phase (0-1) */
  beatPhase: number;
  /** Time since last beat in ms */
  timeSinceLastBeat: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Compact beat counter display.
 */
export const BeatCounter = memo(function BeatCounter({
  bpm,
  beatPhase,
  timeSinceLastBeat,
  className,
}: BeatCounterProps) {
  // Pulse animation based on beat phase
  const pulseScale = 1 + (1 - beatPhase) * 0.2;
  const pulseOpacity = 0.5 + (1 - beatPhase) * 0.5;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* BPM Display */}
      <div className="text-center">
        <div className="text-2xl font-bold text-white tabular-nums">
          {bpm > 0 ? Math.round(bpm) : '--'}
        </div>
        <div className="text-[10px] text-gray-500 uppercase">BPM</div>
      </div>

      {/* Beat Indicator */}
      <div
        className="w-4 h-4 rounded-full bg-purple-500 transition-transform duration-75"
        style={{
          transform: `scale(${pulseScale})`,
          opacity: pulseOpacity,
        }}
      />
    </div>
  );
});

export default BeatMarkers;
