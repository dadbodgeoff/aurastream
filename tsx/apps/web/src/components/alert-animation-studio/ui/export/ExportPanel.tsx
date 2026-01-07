'use client';

/**
 * Export Panel Component
 *
 * Main export panel with format selection and export controls.
 * Supports OBS HTML, WebM, GIF, and APNG formats.
 *
 * @module ui/export/ExportPanel
 */

import { useState, useCallback, memo } from 'react';
import {
  Download,
  Monitor,
  Film,
  Image,
  Loader2,
  CheckCircle,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExportFormat, ExportProgress, ExportResult } from '../../engine/export/types';

// ============================================================================
// Types
// ============================================================================

export interface ExportPanelProps {
  /** Alert configuration for export */
  alertConfig: {
    id: string;
    name: string;
    width: number;
    height: number;
    duration: number;
  };
  /** Callback when export is initiated */
  onExport: (format: ExportFormat, options: ExportOptions) => Promise<ExportResult>;
  /** Current export progress (null if not exporting) */
  exportProgress: ExportProgress | null;
  /** Whether export is available */
  canExport?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface ExportOptions {
  /** Video quality preset */
  quality: 'low' | 'medium' | 'high' | 'ultra';
  /** Frame rate */
  fps: number;
  /** Include audio */
  includeAudio: boolean;
  /** Loop count (0 = infinite) */
  loops: number;
  /** Custom duration override */
  duration?: number;
}

// ============================================================================
// Constants
// ============================================================================

const FORMAT_OPTIONS: {
  value: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
}[] = [
  {
    value: 'obs',
    label: 'OBS Browser Source',
    description: 'Self-contained HTML for OBS',
    icon: <Monitor className="w-5 h-5" />,
    features: ['Real-time', 'Transparent', 'Interactive'],
  },
  {
    value: 'webm',
    label: 'WebM Video',
    description: 'High quality video with alpha',
    icon: <Film className="w-5 h-5" />,
    features: ['Alpha channel', 'VP9 codec', 'Small size'],
  },
  {
    value: 'gif',
    label: 'GIF Animation',
    description: 'Universal animated image',
    icon: <Image className="w-5 h-5" />,
    features: ['Universal', '256 colors', 'Large size'],
  },
  {
    value: 'apng',
    label: 'APNG Animation',
    description: 'Animated PNG with full color',
    icon: <Image className="w-5 h-5" />,
    features: ['Full color', 'Alpha channel', 'Good quality'],
  },
];

const QUALITY_PRESETS = {
  low: { label: 'Low', fps: 15, bitrate: 1_000_000 },
  medium: { label: 'Medium', fps: 30, bitrate: 3_000_000 },
  high: { label: 'High', fps: 60, bitrate: 5_000_000 },
  ultra: { label: 'Ultra', fps: 60, bitrate: 10_000_000 },
};

const DEFAULT_OPTIONS: ExportOptions = {
  quality: 'high',
  fps: 60,
  includeAudio: false,
  loops: 0,
};

// ============================================================================
// Component
// ============================================================================

/**
 * Main export panel for animation export.
 */
export const ExportPanel = memo(function ExportPanel({
  alertConfig,
  onExport,
  exportProgress,
  canExport = true,
  className,
}: ExportPanelProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('obs');
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_OPTIONS);
  const [showSettings, setShowSettings] = useState(false);
  const [lastResult, setLastResult] = useState<ExportResult | null>(null);

  const isExporting = exportProgress !== null && exportProgress.phase !== 'complete' && exportProgress.phase !== 'error';

  // Handle export
  const handleExport = useCallback(async () => {
    if (!canExport || isExporting) return;

    try {
      const result = await onExport(selectedFormat, options);
      setLastResult(result);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [canExport, isExporting, selectedFormat, options, onExport]);

  // Update options
  const updateOptions = useCallback((updates: Partial<ExportOptions>) => {
    setOptions((prev) => ({ ...prev, ...updates }));
  }, []);

  // Get current format info
  const currentFormat = FORMAT_OPTIONS.find((f) => f.value === selectedFormat)!;

  return (
    <div className={cn('flex flex-col bg-gray-900 rounded-lg border border-gray-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white">Export</span>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            'p-1.5 rounded hover:bg-gray-800 transition-colors',
            showSettings ? 'text-purple-400' : 'text-gray-400'
          )}
          aria-label="Toggle settings"
          aria-pressed={showSettings}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Format Selection */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {FORMAT_OPTIONS.map((format) => (
            <button
              key={format.value}
              onClick={() => setSelectedFormat(format.value)}
              className={cn(
                'flex flex-col items-start p-3 rounded-lg border transition-colors text-left',
                selectedFormat === format.value
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
              )}
              aria-pressed={selectedFormat === format.value}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={selectedFormat === format.value ? 'text-purple-400' : 'text-gray-400'}>
                  {format.icon}
                </span>
                <span className="text-sm font-medium text-white">{format.label}</span>
              </div>
              <span className="text-xs text-gray-500">{format.description}</span>
            </button>
          ))}
        </div>

        {/* Format Features */}
        <div className="flex flex-wrap gap-1">
          {currentFormat.features.map((feature) => (
            <span
              key={feature}
              className="px-2 py-0.5 bg-gray-800 text-gray-400 text-[10px] rounded"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-800 pt-3">
          {/* Quality */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Quality</label>
            <div className="flex gap-1">
              {(Object.keys(QUALITY_PRESETS) as Array<keyof typeof QUALITY_PRESETS>).map((key) => (
                <button
                  key={key}
                  onClick={() => updateOptions({ quality: key, fps: QUALITY_PRESETS[key].fps })}
                  className={cn(
                    'flex-1 py-1.5 text-xs rounded transition-colors',
                    options.quality === key
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  )}
                >
                  {QUALITY_PRESETS[key].label}
                </button>
              ))}
            </div>
          </div>

          {/* FPS (for video formats) */}
          {(selectedFormat === 'webm' || selectedFormat === 'gif' || selectedFormat === 'apng') && (
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">
                Frame Rate: {options.fps} FPS
              </label>
              <input
                type="range"
                min={10}
                max={60}
                step={5}
                value={options.fps}
                onChange={(e) => updateOptions({ fps: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          )}

          {/* Loop Count (for animated formats) */}
          {(selectedFormat === 'gif' || selectedFormat === 'apng') && (
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">
                Loops: {options.loops === 0 ? 'Infinite' : options.loops}
              </label>
              <input
                type="range"
                min={0}
                max={10}
                value={options.loops}
                onChange={(e) => updateOptions({ loops: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          )}

          {/* Output Info */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-800">
            <span>Output: {alertConfig.width}×{alertConfig.height}</span>
            <span>Duration: {(alertConfig.duration / 1000).toFixed(1)}s</span>
          </div>
        </div>
      )}

      {/* Export Progress */}
      {exportProgress && (
        <div className="px-4 pb-4">
          <ExportProgressBar progress={exportProgress} />
        </div>
      )}

      {/* Export Button */}
      <div className="p-4 pt-0">
        <button
          onClick={handleExport}
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
              Export {currentFormat.label}
            </>
          )}
        </button>
      </div>

      {/* Last Result */}
      {lastResult && !isExporting && (
        <div className={cn(
          'mx-4 mb-4 p-3 rounded-lg flex items-center gap-2',
          lastResult.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
        )}>
          {lastResult.success ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400">
                Exported successfully ({formatFileSize(lastResult.fileSize)})
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-400">{lastResult.error || 'Export failed'}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Progress Bar Sub-component
// ============================================================================

interface ExportProgressBarProps {
  progress: ExportProgress;
}

const ExportProgressBar = memo(function ExportProgressBar({ progress }: ExportProgressBarProps) {
  const phaseLabels: Record<ExportProgress['phase'], string> = {
    preparing: 'Preparing...',
    capturing: 'Capturing frames...',
    encoding: 'Encoding...',
    finalizing: 'Finalizing...',
    complete: 'Complete!',
    error: 'Error',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{phaseLabels[progress.phase]}</span>
        <span className="text-gray-500">{Math.round(progress.percent)}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-300',
            progress.phase === 'error' ? 'bg-red-500' : 'bg-purple-500'
          )}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      {progress.phase === 'capturing' && (
        <div className="text-[10px] text-gray-500 text-center">
          Frame {progress.currentFrame} / {progress.totalFrames}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Utility Functions
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default ExportPanel;
