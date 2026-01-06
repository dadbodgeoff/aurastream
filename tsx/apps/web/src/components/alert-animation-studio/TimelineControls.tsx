'use client';

/**
 * Timeline Controls
 *
 * Playback controls for animation preview.
 */

import { Play, Pause, RotateCcw } from 'lucide-react';
import type { TimelineControlsProps } from './types';

export function TimelineControls({
  isPlaying,
  currentTime,
  durationMs,
  onPlayPause,
  onReset,
  onSeek,
}: TimelineControlsProps) {
  const progress = durationMs > 0 ? (currentTime / durationMs) * 100 : 0;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onSeek((value / 100) * durationMs);
  };

  return (
    <div className="flex items-center gap-3 border-t border-gray-800 bg-gray-900/50 px-4 py-3">
      {/* Play/Pause Button */}
      <button
        onClick={onPlayPause}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white transition-colors hover:bg-purple-700"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>

      {/* Reset Button */}
      <button
        onClick={onReset}
        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        aria-label="Reset"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      {/* Progress Bar */}
      <div className="relative flex-1">
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={handleSeek}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-700 accent-purple-500"
          style={{
            background: `linear-gradient(to right, rgb(168 85 247) ${progress}%, rgb(55 65 81) ${progress}%)`,
          }}
        />
      </div>

      {/* Time Display */}
      <span className="w-24 text-right text-xs tabular-nums text-gray-400">
        {formatTime(currentTime)} / {formatTime(durationMs)}
      </span>
    </div>
  );
}

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
