'use client';

/**
 * Video Export UI Component
 *
 * Settings and controls for video export (WebM, GIF, APNG).
 * Includes resolution, FPS, quality settings, and progress display.
 *
 * @module ui/export/VideoExportUI
 */

import { useState, useCallback, memo } from 'react';
import { Film, Settings, Download, Loader2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExportFormat, ExportProgress } from '../../engine/export/types';

// ============================================================================
// Types
// ============================================================================

export interface VideoExportConfig {
  /** Output width */
  width: number;
  /** Output height */
  height: number;
  /** Frame rate */
  fps: number;
  /** Quality preset */
  quality: 'low' | 'medium' | 'high' | 'ultra';
  /** Duration in milliseconds */
  duration: number;
  /** Loop count (0 = infinite, -1 = no loop) */
  loops: number;
  /** Include alpha channel */
  alpha: boolean;
}

export interface VideoExportUIProps {
  /** Export format */
  format: 'webm' | 'gif' | 'apng';
  /** Current configuration */
  config: VideoExportConfig;
  /** Callback when config changes */
  onConfigChange: (config: Partial<VideoExportConfig>) => void;
  /** Callback when export is initiated */
  onExport: () => void;
  /** Current export progress */
  progress: ExportProgress | null;
  /** Whether export is available */
  canExport?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const RESOLUTION_PRESETS = [
  { label: '256×256', width: 256, height: 256 },
  { label: '512×512', width: 512, height: 512 },
  { label: '720p', width: 1280, height: 720 },
  { label: '1080p', width: 1920, height: 1080 },
  { label: 'Custom', width: 0, height: 0 },
];

const FPS_OPTIONS = [10, 15, 20, 24, 30, 60];

const QUALITY_INFO = {
  low: { label: 'Low', description: 'Smaller file, lower quality' },
  medium: { label: 'Medium', description: 'Balanced quality and size' },
  high: { label: 'High', description: 'Better quality, larger file' },
  ultra: { label: 'Ultra', description: 'Best quality, largest file' },
};

const FORMAT_INFO = {
  webm: {
    name: 'WebM',
    description: 'Modern video format with alpha support',
    supportsAlpha: true,
    maxFps: 60,
    tips: ['Best for web and OBS', 'Supports transparency', 'Small file size'],
  },
  gif: {
    name: 'GIF',
    description: 'Universal animated image format',
    supportsAlpha: false,
    maxFps: 30,
    tips: ['256 color limit', 'Large file size', 'Universal support'],
  },
  apng: {
    name: 'APNG',
    description: 'Animated PNG with full color',
    supportsAlpha: true,
    maxFps: 60,
    tips: ['Full color support', 'Transparency support', 'Good browser support'],
  },
};

// ============================================================================
// Component
// ============================================================================

/**
 * Video export settings and controls.
 */
export const VideoExportUI = memo(function VideoExportUI({
  format,
  config,
  onConfigChange,
  onExport,
  progress,
  canExport = true,
  className,
}: VideoExportUIProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customResolution, setCustomResolution] = useState(false);

  const formatInfo = FORMAT_INFO[format];
  const isExporting = progress !== null && progress.phase !== 'complete' && progress.phase !== 'error';

  // Check if current resolution matches a preset
  const currentPreset = RESOLUTION_PRESETS.find(
    (p) => p.width === config.width && p.height === config.height
  );

  // Handle resolution preset change
  const handlePresetChange = useCallback(
    (preset: typeof RESOLUTION_PRESETS[0]) => {
      if (preset.width === 0) {
        setCustomResolution(true);
      } else {
        setCustomResolution(false);
        onConfigChange({ width: preset.width, height: preset.height });
      }
    },
    [onConfigChange]
  );

  // Estimate file size (rough approximation)
  const estimateFileSize = useCallback(() => {
    const pixels = config.width * config.height;
    const frames = (config.duration / 1000) * config.fps;
    const qualityMultiplier = { low: 0.5, medium: 1, high: 2, ultra: 4 }[config.quality];

    let bytesPerFrame: number;
    switch (format) {
      case 'webm':
        bytesPerFrame = pixels * 0.1 * qualityMultiplier;
        break;
      case 'gif':
        bytesPerFrame = pixels * 0.3;
        break;
      case 'apng':
        bytesPerFrame = pixels * 0.5 * qualityMultiplier;
        break;
    }

    return frames * bytesPerFrame;
  }, [config, format]);

  const estimatedSize = estimateFileSize();

  return (
    <div className={cn('flex flex-col bg-gray-900 rounded-lg border border-gray-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white">{formatInfo.name} Export</span>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            'p-1.5 rounded hover:bg-gray-800 transition-colors',
            showAdvanced ? 'text-purple-400' : 'text-gray-400'
          )}
          aria-label="Toggle advanced settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Format Info */}
      <div className="px-4 py-3 bg-gray-800/30 border-b border-gray-800">
        <p className="text-xs text-gray-400">{formatInfo.description}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {formatInfo.tips.map((tip, i) => (
            <span key={i} className="px-2 py-0.5 bg-gray-800 text-gray-500 text-[10px] rounded">
              {tip}
            </span>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="p-4 space-y-4">
        {/* Resolution */}
        <div>
          <label className="text-xs text-gray-400 mb-2 block">Resolution</label>
          <div className="flex flex-wrap gap-1">
            {RESOLUTION_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetChange(preset)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded transition-colors',
                  (preset.width === 0 ? customResolution : currentPreset?.label === preset.label)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {customResolution && (
            <div className="flex gap-2 mt-2">
              <input
                type="number"
                value={config.width}
                onChange={(e) => onConfigChange({ width: parseInt(e.target.value) || 256 })}
                min={64}
                max={4096}
                className="w-24 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white"
                placeholder="Width"
              />
              <span className="text-gray-500 self-center">×</span>
              <input
                type="number"
                value={config.height}
                onChange={(e) => onConfigChange({ height: parseInt(e.target.value) || 256 })}
                min={64}
                max={4096}
                className="w-24 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white"
                placeholder="Height"
              />
            </div>
          )}
        </div>

        {/* Frame Rate */}
        <div>
          <label className="text-xs text-gray-400 mb-2 block">Frame Rate</label>
          <div className="flex gap-1">
            {FPS_OPTIONS.filter((fps) => fps <= formatInfo.maxFps).map((fps) => (
              <button
                key={fps}
                onClick={() => onConfigChange({ fps })}
                className={cn(
                  'px-3 py-1.5 text-xs rounded transition-colors',
                  config.fps === fps
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                )}
              >
                {fps}
              </button>
            ))}
          </div>
        </div>

        {/* Quality */}
        <div>
          <label className="text-xs text-gray-400 mb-2 block">Quality</label>
          <div className="grid grid-cols-4 gap-1">
            {(Object.keys(QUALITY_INFO) as Array<keyof typeof QUALITY_INFO>).map((key) => (
              <button
                key={key}
                onClick={() => onConfigChange({ quality: key })}
                className={cn(
                  'py-1.5 text-xs rounded transition-colors',
                  config.quality === key
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                )}
              >
                {QUALITY_INFO[key].label}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="space-y-3 pt-3 border-t border-gray-800">
            {/* Alpha Channel */}
            {formatInfo.supportsAlpha && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.alpha}
                  onChange={(e) => onConfigChange({ alpha: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600"
                />
                <span className="text-xs text-gray-300">Include alpha channel (transparency)</span>
              </label>
            )}

            {/* Loop Count */}
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">
                Loops: {config.loops === 0 ? 'Infinite' : config.loops === -1 ? 'None' : config.loops}
              </label>
              <input
                type="range"
                min={-1}
                max={10}
                value={config.loops}
                onChange={(e) => onConfigChange({ loops: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">
                Duration: {(config.duration / 1000).toFixed(1)}s
              </label>
              <input
                type="range"
                min={500}
                max={10000}
                step={100}
                value={config.duration}
                onChange={(e) => onConfigChange({ duration: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        )}

        {/* Estimated Size */}
        <div className="flex items-center gap-2 p-2 bg-gray-800/50 rounded text-xs">
          <Info className="w-3 h-3 text-gray-500" />
          <span className="text-gray-400">
            Estimated size: ~{formatFileSize(estimatedSize)}
          </span>
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <div className="px-4 pb-4">
          <VideoExportProgress progress={progress} />
        </div>
      )}

      {/* Export Button */}
      <div className="p-4 pt-0">
        <button
          onClick={onExport}
          disabled={!canExport || isExporting}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors',
            canExport && !isExporting
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          )}
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export {formatInfo.name}
            </>
          )}
        </button>
      </div>
    </div>
  );
});

// ============================================================================
// Progress Sub-component
// ============================================================================

interface VideoExportProgressProps {
  progress: ExportProgress;
}

const VideoExportProgress = memo(function VideoExportProgress({
  progress,
}: VideoExportProgressProps) {
  const phaseLabels: Record<ExportProgress['phase'], string> = {
    preparing: 'Preparing export...',
    capturing: 'Capturing frames...',
    encoding: 'Encoding video...',
    finalizing: 'Finalizing...',
    complete: 'Export complete!',
    error: 'Export failed',
  };

  const isError = progress.phase === 'error';
  const isComplete = progress.phase === 'complete';

  return (
    <div className="space-y-2">
      {/* Phase Label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isError && <AlertCircle className="w-4 h-4 text-red-400" />}
          <span className={cn('text-xs', isError ? 'text-red-400' : 'text-gray-400')}>
            {phaseLabels[progress.phase]}
          </span>
        </div>
        <span className="text-xs text-gray-500">{Math.round(progress.percent)}%</span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-300',
            isError ? 'bg-red-500' : isComplete ? 'bg-green-500' : 'bg-purple-500'
          )}
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      {/* Frame Counter */}
      {progress.phase === 'capturing' && progress.totalFrames > 0 && (
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>Frame {progress.currentFrame} / {progress.totalFrames}</span>
          {progress.estimatedTimeRemaining && (
            <span>~{Math.ceil(progress.estimatedTimeRemaining / 1000)}s remaining</span>
          )}
        </div>
      )}

      {/* Message */}
      {progress.message && (
        <p className="text-[10px] text-gray-500">{progress.message}</p>
      )}
    </div>
  );
});

// ============================================================================
// Utility Functions
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default VideoExportUI;
