'use client';

/**
 * Waveform Display Component
 *
 * Canvas-based audio waveform visualization.
 * Synced with timeline for audio-reactive animations.
 *
 * @module ui/audio/WaveformDisplay
 */

import { useRef, useEffect, memo, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface WaveformDisplayProps {
  /** Waveform data (normalized -1 to 1) */
  waveformData: Float32Array | null;
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Zoom level (pixels per second) */
  zoom: number;
  /** Waveform color */
  color?: string;
  /** Progress color (played portion) */
  progressColor?: string;
  /** Background color */
  backgroundColor?: string;
  /** Height of the waveform */
  height?: number;
  /** Callback when clicking on waveform to seek */
  onSeek?: (time: number) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_COLOR = '#6b7280';
const DEFAULT_PROGRESS_COLOR = '#a855f7';
const DEFAULT_BG_COLOR = 'transparent';
const DEFAULT_HEIGHT = 64;

// ============================================================================
// Component
// ============================================================================

/**
 * Canvas-based waveform visualization component.
 */
export const WaveformDisplay = memo(function WaveformDisplay({
  waveformData,
  currentTime,
  duration,
  zoom,
  color = DEFAULT_COLOR,
  progressColor = DEFAULT_PROGRESS_COLOR,
  backgroundColor = DEFAULT_BG_COLOR,
  height = DEFAULT_HEIGHT,
  onSeek,
  className,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate canvas width based on duration and zoom
  const canvasWidth = duration > 0 ? duration * zoom : 100;

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const canvasHeight = canvas.height / dpr;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fill background
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Calculate samples per pixel
    const samplesPerPixel = Math.max(1, Math.floor(waveformData.length / width));
    const centerY = canvasHeight / 2;
    const amplitude = canvasHeight / 2 - 2;

    // Calculate progress position
    const progressX = duration > 0 ? (currentTime / duration) * width : 0;

    // Draw waveform bars
    ctx.save();
    ctx.scale(dpr, dpr);

    for (let x = 0; x < width; x++) {
      const startSample = Math.floor((x / width) * waveformData.length);
      const endSample = Math.min(startSample + samplesPerPixel, waveformData.length);

      // Find min and max in this segment
      let min = 0;
      let max = 0;
      for (let i = startSample; i < endSample; i++) {
        const value = waveformData[i];
        if (value < min) min = value;
        if (value > max) max = value;
      }

      // Draw bar
      const barHeight = Math.max(1, (max - min) * amplitude);
      const barY = centerY - barHeight / 2;

      ctx.fillStyle = x < progressX ? progressColor : color;
      ctx.fillRect(x, barY, 1, barHeight);
    }

    ctx.restore();
  }, [waveformData, currentTime, duration, color, progressColor, backgroundColor]);

  // Setup canvas and draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${height}px`;

    drawWaveform();
  }, [canvasWidth, height, drawWaveform]);

  // Handle click to seek
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onSeek || duration <= 0) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = (x / rect.width) * duration;
      onSeek(Math.max(0, Math.min(time, duration)));
    },
    [duration, onSeek]
  );

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className={cn(
          'block',
          onSeek && 'cursor-pointer'
        )}
        role="img"
        aria-label="Audio waveform visualization"
      />

      {/* Playhead indicator */}
      {duration > 0 && (
        <div
          className="absolute top-0 bottom-0 w-px bg-purple-500 pointer-events-none"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      )}

      {/* Empty state */}
      {(!waveformData || waveformData.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
          No audio loaded
        </div>
      )}
    </div>
  );
});

export default WaveformDisplay;
