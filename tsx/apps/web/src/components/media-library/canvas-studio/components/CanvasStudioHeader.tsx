/**
 * Canvas Studio Header
 * 
 * Title bar, Easy/Pro mode toggle, and editor mode tabs.
 */

'use client';

import { cn } from '@/lib/utils';
import { XIcon, LayoutIcon, PenIcon } from '../icons';
import { ModeToggle } from '../modes/ModeToggle';
import type { EditorMode, CanvasDimensions } from '../types';
import type { StudioMode } from '../modes/types';

interface CanvasStudioHeaderProps {
  mode: EditorMode;
  dimensions: CanvasDimensions;
  studioMode: StudioMode;
  onModeChange: (mode: EditorMode) => void;
  onStudioModeChange: (mode: StudioMode) => void;
  onClose: () => void;
}

export function CanvasStudioHeader({
  mode,
  dimensions,
  studioMode,
  onModeChange,
  onStudioModeChange,
  onClose,
}: CanvasStudioHeaderProps) {
  return (
    <div className="border-b border-border-subtle bg-background-elevated/50">
      {/* Title Row */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-interactive-500/10 text-interactive-500">
            {mode === 'assets' ? <LayoutIcon /> : <PenIcon />}
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">Canvas Studio</h2>
            <p className="text-xs text-text-secondary">
              {dimensions.label} ({dimensions.width}×{dimensions.height})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ModeToggle mode={studioMode} onChange={onStudioModeChange} />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
          >
            <XIcon />
          </button>
        </div>
      </div>

      {/* Mode Toggle Tabs - Only show in Pro mode */}
      {studioMode === 'pro' && (
        <div className="flex justify-center pb-2">
          <div className="flex items-center bg-background-base rounded-lg p-1 shadow-inner border border-border-subtle">
            <button
              onClick={() => onModeChange('assets')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                mode === 'assets'
                  ? 'bg-interactive-500 text-white shadow-md'
                  : 'text-text-secondary hover:text-text-primary hover:bg-background-surface'
              )}
            >
              <LayoutIcon />
              <span>Assets</span>
            </button>
            <button
              onClick={() => onModeChange('design')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                mode === 'design'
                  ? 'bg-interactive-500 text-white shadow-md'
                  : 'text-text-secondary hover:text-text-primary hover:bg-background-surface'
              )}
            >
              <PenIcon />
              <span>Design</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
