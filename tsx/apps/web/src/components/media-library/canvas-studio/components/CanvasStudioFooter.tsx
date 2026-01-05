/**
 * Canvas Studio Footer
 * 
 * Status info and action buttons.
 */

'use client';

import { DownloadIcon } from '../icons';
import type { AnySketchElement } from '../../canvas-export/types';

interface CanvasStudioFooterProps {
  sketchElements: AnySketchElement[];
  showExport: boolean;
  onExport: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export function CanvasStudioFooter({
  sketchElements,
  showExport,
  onExport,
  onCancel,
  onSave,
}: CanvasStudioFooterProps) {
  const imageCount = sketchElements.filter(el => el.type === 'image').length;
  const sketchCount = sketchElements.filter(el => el.type !== 'image').length;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border-subtle bg-background-elevated/50">
      <div className="flex items-center gap-3">
        <p className="text-xs text-text-muted">
          {imageCount} asset{imageCount !== 1 ? 's' : ''} • {sketchCount} sketch element{sketchCount !== 1 ? 's' : ''}
        </p>

        {showExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-background-surface transition-colors"
          >
            <DownloadIcon />
            Export
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-background-surface transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="px-4 py-1.5 rounded-lg text-sm font-medium bg-interactive-500 text-white hover:bg-interactive-600 transition-colors"
        >
          Save Canvas
        </button>
      </div>
    </div>
  );
}
