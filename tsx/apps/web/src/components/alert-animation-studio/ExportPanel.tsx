'use client';

/**
 * Export Panel
 *
 * Export options for WebM/GIF and OBS browser source URL.
 */

import { useState } from 'react';
import { Download, Copy, Check, Loader2, ExternalLink } from 'lucide-react';
import { useExportAnimation, useOBSBrowserSource, type AnimationConfig } from '@aurastream/api-client';
import { cn } from '@/lib/utils';
import type { ExportPanelProps } from './types';

type ExportFormat = 'webm' | 'gif';

export function ExportPanel({
  projectId,
  canvasRef,
  config,
  onExportStart,
  onExportComplete,
  onExportError,
}: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('webm');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  const exportAnimation = useExportAnimation();
  const { data: obsUrl } = useOBSBrowserSource(projectId);

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    onExportStart?.();

    try {
      // Check if browser supports WebM with alpha
      const supportsWebMAlpha = checkWebMAlphaSupport();
      const useServerExport = format === 'webm' && !supportsWebMAlpha;

      const result = await exportAnimation.mutateAsync({
        projectId,
        data: {
          format,
          useServerExport,
        },
      });

      if (result.exportMode === 'client') {
        // Client-side export using MediaRecorder
        await exportClientSide(canvasRef.current!, config, format, setProgress);
        onExportComplete?.('');
      } else {
        // Server-side export - poll for completion
        // For now, just show success
        onExportComplete?.(result.jobId);
      }
    } catch (error) {
      onExportError?.(error as Error);
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  const handleCopyOBSUrl = async () => {
    if (obsUrl?.url) {
      await navigator.clipboard.writeText(obsUrl.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="border-t border-gray-800 p-4">
      <h3 className="mb-3 text-sm font-medium text-white">Export</h3>

      {/* Format Selector */}
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setFormat('webm')}
          className={cn(
            'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            format === 'webm'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
          )}
        >
          WebM (Alpha)
        </button>
        <button
          onClick={() => setFormat('gif')}
          className={cn(
            'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            format === 'gif'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
          )}
        >
          GIF
        </button>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-2.5 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Exporting... {progress > 0 && `${Math.round(progress)}%`}
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download {format.toUpperCase()}
          </>
        )}
      </button>

      {/* OBS Browser Source */}
      {obsUrl && (
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-medium text-gray-400">OBS Browser Source</h4>
          <div className="flex gap-2">
            <input
              readOnly
              value={obsUrl.url}
              className="flex-1 truncate rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-300"
            />
            <button
              onClick={handleCopyOBSUrl}
              className="flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
            >
              {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">
            Add as Browser Source in OBS. Set size to {obsUrl.width}x{obsUrl.height}.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function checkWebMAlphaSupport(): boolean {
  // Safari doesn't support WebM alpha
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (isSafari) return false;

  // Check MediaRecorder support
  if (typeof MediaRecorder === 'undefined') return false;

  // Check VP8 codec support
  return MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
}

async function exportClientSide(
  canvas: HTMLCanvasElement,
  config: AnimationConfig,
  format: ExportFormat,
  onProgress: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const stream = canvas.captureStream(30);
      const chunks: Blob[] = [];

      const mimeType = format === 'webm' ? 'video/webm;codecs=vp8' : 'video/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);

        // Trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `animation.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        resolve();
      };

      recorder.onerror = (e) => {
        reject(new Error('Recording failed'));
      };

      // Start recording
      recorder.start();

      // Track progress
      const startTime = Date.now();
      const durationMs = config.durationMs;

      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / durationMs) * 100, 100);
        onProgress(progress);
      }, 100);

      // Stop after duration
      setTimeout(() => {
        clearInterval(progressInterval);
        recorder.stop();
      }, durationMs);
    } catch (error) {
      reject(error);
    }
  });
}
