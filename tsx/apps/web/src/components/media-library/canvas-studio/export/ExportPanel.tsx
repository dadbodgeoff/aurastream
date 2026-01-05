/**
 * Export Panel Component
 * 
 * UI component for configuring and executing canvas exports.
 * Features platform presets, format selection, quality controls,
 * and preview functionality.
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  ExportFormat,
  ExportOptions,
  ExportPlatform,
  ExportResult,
  ExportValidation,
} from './types';
import {
  PRESETS_BY_CATEGORY,
  getPresetById,
  getQualityPreset,
  formatSupportsTransparency,
} from './ExportPresets';
import {
  getFileSizeEstimateForPlatform,
  validateExport,
  formatFileSize,
} from './PlatformExport';
import {
  copyToClipboard,
  isClipboardSupported,
} from './ClipboardExport';

// ============================================================================
// Component Props
// ============================================================================

export interface ExportPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Export handler - called when user clicks export */
  onExport: (options: ExportOptions) => Promise<ExportResult>;
  /** Current canvas dimensions */
  dimensions: { width: number; height: number };
  /** Preview URL for the current canvas state */
  previewUrl?: string;
  /** Initial platform preset to select */
  initialPlatform?: ExportPlatform;
}


// ============================================================================
// Platform Icons
// ============================================================================

const PlatformIcon = ({ platform }: { platform: string }) => {
  const icons: Record<string, JSX.Element> = {
    youtube: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    twitch: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
      </svg>
    ),
    instagram: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    tiktok: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
    discord: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
      </svg>
    ),
    settings: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  };

  return icons[platform] || icons.settings;
};


// ============================================================================
// Action Icons
// ============================================================================

const DownloadIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const ClipboardIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const WarningIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
  </svg>
);

// ============================================================================
// Export Panel Component
// ============================================================================

export function ExportPanel({
  isOpen,
  onClose,
  onExport,
  dimensions,
  previewUrl,
  initialPlatform = 'custom',
}: ExportPanelProps) {
  // State
  const [selectedPlatform, setSelectedPlatform] = useState<ExportPlatform>(initialPlatform);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState(90);
  const [scale, setScale] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [lastResult, setLastResult] = useState<ExportResult | null>(null);
  const [validation, setValidation] = useState<ExportValidation | null>(null);

  // Get selected preset
  const selectedPreset = useMemo(() => getPresetById(selectedPlatform), [selectedPlatform]);

  // Update options when preset changes
  useEffect(() => {
    if (selectedPreset && selectedPlatform !== 'custom') {
      setFormat(selectedPreset.format);
      setQuality(selectedPreset.quality);
    }
  }, [selectedPreset, selectedPlatform]);

  // Calculate file size estimate
  const fileSizeEstimate = useMemo(() => {
    const targetWidth = scale * dimensions.width;
    const targetHeight = scale * dimensions.height;
    return getFileSizeEstimateForPlatform(
      targetWidth,
      targetHeight,
      format,
      quality,
      selectedPlatform
    );
  }, [dimensions, format, quality, scale, selectedPlatform]);

  // Check clipboard support
  const clipboardSupported = useMemo(() => isClipboardSupported(), []);


  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const options: ExportOptions = {
        format,
        quality,
        scale,
        platform: selectedPlatform,
      };
      const result = await onExport(options);
      setLastResult(result);
      
      // Validate result
      const validationResult = validateExport(result, selectedPlatform);
      setValidation(validationResult);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [format, quality, scale, selectedPlatform, onExport]);

  // Handle copy to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    if (!lastResult) return;
    
    setIsCopying(true);
    setCopySuccess(false);
    
    try {
      await copyToClipboard(lastResult.blob);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
    } finally {
      setIsCopying(false);
    }
  }, [lastResult]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!lastResult) return;
    
    const url = URL.createObjectURL(lastResult.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = lastResult.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [lastResult]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-background-surface rounded-2xl border border-border-subtle shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-lg font-semibold text-text-primary">Export Canvas</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Platform Presets */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Platform Preset
            </label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(PRESETS_BY_CATEGORY).map(([_category, presets]) => (
                presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPlatform(preset.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                      selectedPlatform === preset.id
                        ? 'border-interactive-500 bg-interactive-500/10 text-interactive-500'
                        : 'border-border-subtle bg-background-base text-text-secondary hover:border-border-default hover:text-text-primary'
                    }`}
                  >
                    <PlatformIcon platform={preset.icon} />
                    <span className="text-xs font-medium truncate w-full text-center">
                      {preset.name.split(' ').slice(-1)[0]}
                    </span>
                  </button>
                ))
              ))}
            </div>
          </div>


          {/* Preset Info */}
          {selectedPreset && selectedPlatform !== 'custom' && (
            <div className="p-3 rounded-lg bg-background-elevated border border-border-subtle">
              <p className="text-sm text-text-secondary">{selectedPreset.description}</p>
              <p className="text-xs text-text-muted mt-1">
                Recommended: {selectedPreset.dimensions.width}×{selectedPreset.dimensions.height}
                {selectedPreset.maxFileSize && ` • Max ${selectedPreset.maxFileSize}KB`}
              </p>
            </div>
          )}

          {/* Format & Quality */}
          <div className="grid grid-cols-2 gap-4">
            {/* Format */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as ExportFormat)}
                className="w-full px-3 py-2 rounded-lg bg-background-base border border-border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-interactive-500"
              >
                <option value="png">PNG (Lossless)</option>
                <option value="jpg">JPG (Smaller)</option>
                <option value="webp">WebP (Modern)</option>
              </select>
              {!formatSupportsTransparency(format) && (
                <p className="text-xs text-text-muted mt-1">
                  ⚠️ No transparency support
                </p>
              )}
            </div>

            {/* Scale */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Scale
              </label>
              <select
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-background-base border border-border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-interactive-500"
              >
                <option value={0.5}>0.5x ({Math.round(dimensions.width * 0.5)}×{Math.round(dimensions.height * 0.5)})</option>
                <option value={1}>1x ({dimensions.width}×{dimensions.height})</option>
                <option value={2}>2x ({dimensions.width * 2}×{dimensions.height * 2})</option>
              </select>
            </div>
          </div>

          {/* Quality Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text-secondary">
                Quality
              </label>
              <span className="text-sm text-text-muted">
                {quality}% ({getQualityPreset(quality)})
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full h-2 bg-background-elevated rounded-lg appearance-none cursor-pointer accent-interactive-500"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>Smaller file</span>
              <span>~{fileSizeEstimate.formatted}</span>
              <span>Better quality</span>
            </div>
            {fileSizeEstimate.exceedsLimit && (
              <p className="flex items-center gap-1 text-xs text-status-warning mt-2">
                <WarningIcon />
                Estimated size may exceed platform limit
              </p>
            )}
          </div>


          {/* Preview */}
          {(previewUrl || lastResult) && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Preview
              </label>
              <div className="relative aspect-video bg-background-base rounded-lg border border-border-subtle overflow-hidden flex items-center justify-center">
                <img
                  src={lastResult?.dataUrl || previewUrl}
                  alt="Export preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              {lastResult && (
                <p className="text-xs text-text-muted mt-2 text-center">
                  {lastResult.dimensions.width}×{lastResult.dimensions.height} • {formatFileSize(lastResult.fileSize)}
                </p>
              )}
            </div>
          )}

          {/* Validation Messages */}
          {validation && (
            <div className="space-y-2">
              {validation.errors.map((error, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-status-error/10 text-status-error text-sm">
                  <WarningIcon />
                  <span>{error}</span>
                </div>
              ))}
              {validation.warnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-status-warning/10 text-status-warning text-sm">
                  <WarningIcon />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle bg-background-elevated/50">
          <div className="flex items-center gap-2">
            {lastResult && clipboardSupported && (
              <button
                onClick={handleCopyToClipboard}
                disabled={isCopying}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-background-surface transition-colors disabled:opacity-50"
              >
                {copySuccess ? <CheckIcon /> : <ClipboardIcon />}
                {copySuccess ? 'Copied!' : 'Copy'}
              </button>
            )}
            {lastResult && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-background-surface transition-colors"
              >
                <DownloadIcon />
                Download
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-background-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-interactive-500 text-white hover:bg-interactive-600 transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <DownloadIcon />
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExportPanel;
