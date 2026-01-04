/**
 * SketchToolbar Component
 * 
 * Tool palette for the sketch editor with tool selection and quick actions.
 * Follows AuraStream's ButtonGroup and toolbar patterns.
 */

'use client';

import { useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useSketchStore } from './useSketchStore';
import { TOOLS, TOOL_SHORTCUTS } from './constants';
import type { SketchTool, SketchToolbarProps } from './types';

// ============================================================================
// Icons
// ============================================================================

function CursorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
      <path d="M13 13l6 6" />
    </svg>
  );
}

function PenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}

function SquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

function CircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function LineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="19" x2="19" y2="5" />
    </svg>
  );
}

function TypeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}

function EraserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L13.4 2.8c.8-.8 2-.8 2.8 0L21 7.6c.8.8.8 2 0 2.8L11 20" />
      <path d="M6 11l4 4" />
    </svg>
  );
}

function StickerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" strokeLinecap="round" />
      <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function UndoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
    </svg>
  );
}

function RedoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

const TOOL_ICONS: Record<SketchTool, React.FC<{ className?: string }>> = {
  select: CursorIcon,
  pen: PenIcon,
  rectangle: SquareIcon,
  circle: CircleIcon,
  line: LineIcon,
  arrow: ArrowIcon,
  text: TypeIcon,
  sticker: StickerIcon,
  eraser: EraserIcon,
};

// ============================================================================
// Component
// ============================================================================

export function SketchToolbar({
  className,
  orientation = 'vertical',
}: SketchToolbarProps) {
  const { activeTool, setTool, undo, redo, canUndo, canRedo, clearAll, elements } = useSketchStore();

  // Keyboard shortcuts for tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();
      
      // Tool shortcuts
      if (TOOL_SHORTCUTS[key] && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setTool(TOOL_SHORTCUTS[key]);
        return;
      }

      // Undo: Cmd/Ctrl + Z
      if ((e.metaKey || e.ctrlKey) && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) undo();
        return;
      }

      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if ((e.metaKey || e.ctrlKey) && ((key === 'z' && e.shiftKey) || key === 'y')) {
        e.preventDefault();
        if (canRedo()) redo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, undo, redo, canUndo, canRedo]);

  const isVertical = orientation === 'vertical';

  return (
    <div
      className={cn(
        'flex gap-1 p-2 bg-background-elevated rounded-xl border border-border-subtle',
        isVertical ? 'flex-col' : 'flex-row',
        className
      )}
      role="toolbar"
      aria-label="Sketch tools"
    >
      {/* Tool buttons */}
      <div className={cn('flex gap-1', isVertical ? 'flex-col' : 'flex-row')}>
        {TOOLS.map((tool) => {
          const Icon = TOOL_ICONS[tool.id];
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => setTool(tool.id)}
              className={cn(
                'relative p-2.5 rounded-lg transition-all',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500',
                isActive
                  ? 'bg-interactive-500 text-white shadow-md'
                  : 'text-text-secondary hover:text-text-primary hover:bg-background-surface'
              )}
              title={`${tool.label} (${tool.shortcut})`}
              aria-pressed={isActive}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div
        className={cn(
          'bg-border-subtle',
          isVertical ? 'h-px w-full my-1' : 'w-px h-full mx-1'
        )}
      />

      {/* Action buttons */}
      <div className={cn('flex gap-1', isVertical ? 'flex-col' : 'flex-row')}>
        <button
          onClick={undo}
          disabled={!canUndo()}
          className={cn(
            'p-2.5 rounded-lg transition-all',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500',
            canUndo()
              ? 'text-text-secondary hover:text-text-primary hover:bg-background-surface'
              : 'text-text-muted cursor-not-allowed opacity-50'
          )}
          title="Undo (⌘Z)"
        >
          <UndoIcon className="w-5 h-5" />
        </button>

        <button
          onClick={redo}
          disabled={!canRedo()}
          className={cn(
            'p-2.5 rounded-lg transition-all',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500',
            canRedo()
              ? 'text-text-secondary hover:text-text-primary hover:bg-background-surface'
              : 'text-text-muted cursor-not-allowed opacity-50'
          )}
          title="Redo (⌘⇧Z)"
        >
          <RedoIcon className="w-5 h-5" />
        </button>

        <button
          onClick={clearAll}
          disabled={elements.length === 0}
          className={cn(
            'p-2.5 rounded-lg transition-all',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500',
            elements.length > 0
              ? 'text-text-secondary hover:text-red-400 hover:bg-red-500/10'
              : 'text-text-muted cursor-not-allowed opacity-50'
          )}
          title="Clear all"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default SketchToolbar;
