'use client';

/**
 * Frequency Bands Component
 *
 * Real-time frequency band visualizer with 7 vertical bars.
 * Shows sub-bass through brilliance frequency ranges.
 *
 * @module ui/audio/FrequencyBands
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { FrequencyBand, FrequencyBandName } from '../../engine/audio/types';

// ============================================================================
// Types
// ============================================================================

export interface FrequencyBandsProps {
  /** Frequency band data */
  bands: FrequencyBand[];
  /** Whether to show band labels */
  showLabels?: boolean;
  /** Whether to show peak indicators */
  showPeaks?: boolean;
  /** Bar width in pixels */
  barWidth?: number;
  /** Gap between bars in pixels */
  gap?: number;
  /** Height of the visualizer */
  height?: number;
  /** Color scheme */
  colorScheme?: 'purple' | 'rainbow' | 'mono';
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const BAND_LABELS: Record<FrequencyBandName, string> = {
  sub: 'Sub',
  bass: 'Bass',
  lowMid: 'Low',
  mid: 'Mid',
  highMid: 'High',
  high: 'Treble',
  brilliance: 'Air',
};

const RAINBOW_COLORS: Record<FrequencyBandName, string> = {
  sub: '#ef4444',      // red
  bass: '#f97316',     // orange
  lowMid: '#eab308',   // yellow
  mid: '#22c55e',      // green
  highMid: '#06b6d4',  // cyan
  high: '#3b82f6',     // blue
  brilliance: '#a855f7', // purple
};

const DEFAULT_BAR_WIDTH = 24;
const DEFAULT_GAP = 4;
const DEFAULT_HEIGHT = 80;

// ============================================================================
// Component
// ============================================================================

/**
 * Real-time frequency band visualizer.
 */
export const FrequencyBands = memo(function FrequencyBands({
  bands,
  showLabels = true,
  showPeaks = true,
  barWidth = DEFAULT_BAR_WIDTH,
  gap = DEFAULT_GAP,
  height = DEFAULT_HEIGHT,
  colorScheme = 'purple',
  className,
}: FrequencyBandsProps) {
  // Get color for a band
  const getBarColor = (band: FrequencyBand, index: number): string => {
    switch (colorScheme) {
      case 'rainbow':
        return RAINBOW_COLORS[band.name];
      case 'mono':
        return '#6b7280';
      case 'purple':
      default:
        // Gradient from purple to pink
        const hue = 270 + (index / bands.length) * 30;
        return `hsl(${hue}, 70%, 60%)`;
    }
  };

  // Calculate total width
  const totalWidth = bands.length * barWidth + (bands.length - 1) * gap;

  return (
    <div
      className={cn('flex flex-col items-center', className)}
      role="img"
      aria-label="Audio frequency bands visualization"
    >
      {/* Bars Container */}
      <div
        className="relative flex items-end"
        style={{ width: totalWidth, height }}
      >
        {bands.map((band, index) => {
          const barHeight = Math.max(2, band.value * height);
          const peakHeight = band.peak * height;
          const color = getBarColor(band, index);

          return (
            <div
              key={band.name}
              className="relative flex flex-col items-center"
              style={{
                width: barWidth,
                height: '100%',
                marginLeft: index > 0 ? gap : 0,
              }}
            >
              {/* Peak indicator */}
              {showPeaks && band.peak > band.value && (
                <div
                  className="absolute w-full h-0.5 transition-all duration-75"
                  style={{
                    backgroundColor: color,
                    bottom: peakHeight,
                    opacity: 0.5,
                  }}
                />
              )}

              {/* Main bar */}
              <div
                className="absolute bottom-0 w-full rounded-t transition-all duration-75"
                style={{
                  height: barHeight,
                  backgroundColor: color,
                  boxShadow: band.value > 0.5 ? `0 0 10px ${color}40` : 'none',
                }}
              />

              {/* Background bar */}
              <div
                className="absolute bottom-0 w-full rounded-t bg-gray-800/50"
                style={{ height: '100%' }}
              />
            </div>
          );
        })}
      </div>

      {/* Labels */}
      {showLabels && (
        <div
          className="flex mt-2"
          style={{ width: totalWidth }}
        >
          {bands.map((band, index) => (
            <div
              key={`label-${band.name}`}
              className="text-center"
              style={{
                width: barWidth,
                marginLeft: index > 0 ? gap : 0,
              }}
            >
              <span className="text-[10px] text-gray-500">
                {BAND_LABELS[band.name]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Compact Variant
// ============================================================================

export interface FrequencyBandsCompactProps {
  /** Frequency band data */
  bands: FrequencyBand[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Compact inline frequency band visualizer.
 */
export const FrequencyBandsCompact = memo(function FrequencyBandsCompact({
  bands,
  className,
}: FrequencyBandsCompactProps) {
  return (
    <div
      className={cn('flex items-end gap-0.5 h-4', className)}
      role="img"
      aria-label="Audio frequency visualization"
    >
      {bands.map((band) => (
        <div
          key={band.name}
          className="w-1 bg-purple-500 rounded-t transition-all duration-75"
          style={{ height: `${Math.max(10, band.value * 100)}%` }}
        />
      ))}
    </div>
  );
});

export default FrequencyBands;
