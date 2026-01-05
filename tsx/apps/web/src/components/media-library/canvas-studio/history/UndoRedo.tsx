/**
 * Undo/Redo Buttons Component
 * 
 * Simple undo/redo buttons with keyboard shortcut hints and tooltips.
 */

'use client';

import { cn } from '@/lib/utils';

// ============================================================================
// Icons
// ============================================================================

function UndoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
    </svg>
  );
}

// ============================================================================
// Types
// ============================================================================

interface UndoRedoProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Label for the undo action (e.g., "Moved logo") */
  undoLabel?: string | null;
  /** Label for the redo action */
  redoLabel?: string | null;
  /** Show shortcut hints */
  showShortcuts?: boolean;
  /** Compact mode - smaller buttons */
  compact?: boolean;
  className?: string;
}

// ============================================================================
// Undo/Redo Component
// ============================================================================

export function UndoRedo({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  showShortcuts = true,
  compact = false,
  className,
}: UndoRedoProps) {
  const undoTitle = undoLabel ? `Undo: ${undoLabel}` : 'Undo';
  const redoTitle = redoLabel ? `Redo: ${redoLabel}` : 'Redo';

  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1 rounded-xl',
        'bg-background-surface/95 backdrop-blur-md border border-border-subtle',
        className
      )}
    >
      {/* Undo button */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={cn(
          'group flex items-center gap-1.5 rounded-lg transition-all duration-200',
          compact ? 'p-1.5' : 'px-2.5 py-1.5',
          canUndo
            ? 'text-text-secondary hover:text-text-primary hover:bg-background-elevated'
            : 'text-text-tertiary opacity-50 cursor-not-allowed'
        )}
        title={`${undoTitle} (⌘Z)`}
      >
        <UndoIcon />
        {!compact && (
          <>
            <span className="text-sm font-medium">Undo</span>
            {showShortcuts && (
              <span className="text-[10px] px-1 py-0.5 rounded bg-background-elevated text-text-tertiary group-hover:bg-background-surface">
                ⌘Z
              </span>
            )}
          </>
        )}
      </button>

      {/* Divider */}
      <div className={cn('w-px bg-border-subtle', compact ? 'h-5' : 'h-6')} />

      {/* Redo button */}
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={cn(
          'group flex items-center gap-1.5 rounded-lg transition-all duration-200',
          compact ? 'p-1.5' : 'px-2.5 py-1.5',
          canRedo
            ? 'text-text-secondary hover:text-text-primary hover:bg-background-elevated'
            : 'text-text-tertiary opacity-50 cursor-not-allowed'
        )}
        title={`${redoTitle} (⌘⇧Z)`}
      >
        <RedoIcon />
        {!compact && (
          <>
            <span className="text-sm font-medium">Redo</span>
            {showShortcuts && (
              <span className="text-[10px] px-1 py-0.5 rounded bg-background-elevated text-text-tertiary group-hover:bg-background-surface">
                ⌘⇧Z
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
}

// ============================================================================
// Compact Undo/Redo (Icon-only variant)
// ============================================================================

export function UndoRedoCompact(props: Omit<UndoRedoProps, 'compact' | 'showShortcuts'>) {
  return <UndoRedo {...props} compact showShortcuts={false} />;
}
