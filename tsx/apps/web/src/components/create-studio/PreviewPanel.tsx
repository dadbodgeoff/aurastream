/**
 * PreviewPanel Component
 * 
 * Live preview sidebar for Create Studio.
 * Shows generation progress and asset preview.
 * 
 * @module create-studio/PreviewPanel
 */

'use client';

import { cn } from '@/lib/utils';
import type { PreviewPanelProps } from './types';

// =============================================================================
// Icons
// =============================================================================

const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
    />
  </svg>
);

// =============================================================================
// PreviewPanel Component
// =============================================================================

/**
 * PreviewPanel - Live preview sidebar for Create Studio.
 * 
 * Features:
 * - Asset type preview placeholder
 * - Generation progress indicator
 * - Prompt preview
 * - Collapsible on mobile
 * 
 * @example
 * ```tsx
 * <PreviewPanel
 *   assetType="thumbnail"
 *   prompt="Epic gaming moment"
 *   isGenerating={false}
 *   jobId={null}
 *   onClose={() => setShowPreview(false)}
 * />
 * ```
 */
export function PreviewPanel({
  assetType,
  prompt,
  isGenerating,
  jobId,
  onClose,
  className,
}: PreviewPanelProps) {
  // Get dimensions for asset type preview
  const getDimensions = (type: string | null) => {
    const dimensions: Record<string, { width: number; height: number; label: string }> = {
      thumbnail: { width: 1280, height: 720, label: '16:9' },
      overlay: { width: 1920, height: 1080, label: '16:9' },
      banner: { width: 1200, height: 480, label: '5:2' },
      story_graphic: { width: 1080, height: 1920, label: '9:16' },
      clip_cover: { width: 1080, height: 1080, label: '1:1' },
      twitch_emote: { width: 112, height: 112, label: '1:1' },
      twitch_panel: { width: 320, height: 160, label: '2:1' },
      twitch_offline: { width: 1920, height: 1080, label: '16:9' },
    };
    return dimensions[type || ''] || { width: 1280, height: 720, label: '16:9' };
  };

  const dims = getDimensions(assetType);
  const aspectRatio = dims.width / dims.height;

  return (
    <div 
      className={cn(
        'flex flex-col h-full',
        'bg-background-surface rounded-xl',
        'border border-border-subtle',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-interactive-400" />
          <h3 className="text-sm font-semibold text-text-primary">Preview</h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'p-1.5 rounded-lg',
              'text-text-secondary hover:text-text-primary',
              'hover:bg-background-elevated',
              'transition-colors'
            )}
            aria-label="Close preview"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Preview Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Asset Preview Placeholder */}
        <div 
          className={cn(
            'relative w-full rounded-lg overflow-hidden',
            'bg-background-elevated border border-border-subtle',
            'flex items-center justify-center'
          )}
          style={{ 
            aspectRatio: aspectRatio,
            maxHeight: '300px',
          }}
        >
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-interactive-400/30 border-t-interactive-400 rounded-full animate-spin" />
              <span className="text-xs text-text-secondary">Generating...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-text-tertiary">
              <svg className="w-12 h-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs">Preview will appear here</span>
            </div>
          )}
        </div>

        {/* Dimensions Badge */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="px-2 py-1 text-xs font-medium text-text-secondary bg-background-elevated rounded">
            {dims.width} × {dims.height}
          </span>
          <span className="px-2 py-1 text-xs font-medium text-text-tertiary bg-background-elevated rounded">
            {dims.label}
          </span>
        </div>

        {/* Prompt Preview */}
        {prompt && (
          <div className="mt-6 space-y-2">
            <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Prompt
            </h4>
            <p className="text-sm text-text-primary leading-relaxed p-3 rounded-lg bg-background-elevated">
              {prompt}
            </p>
          </div>
        )}

        {/* Asset Type Info */}
        {assetType && (
          <div className="mt-6 space-y-2">
            <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Asset Type
            </h4>
            <p className="text-sm text-text-primary capitalize">
              {assetType.replace(/_/g, ' ')}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border-subtle">
        <p className="text-xs text-text-tertiary text-center">
          {isGenerating 
            ? 'Your asset is being generated...'
            : 'Select options to see a preview'
          }
        </p>
      </div>
    </div>
  );
}

export default PreviewPanel;
