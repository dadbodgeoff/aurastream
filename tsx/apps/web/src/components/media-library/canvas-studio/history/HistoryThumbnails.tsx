/**
 * History Thumbnails Component
 * 
 * Visual history panel showing horizontal scrollable list of thumbnail previews.
 * Supports click to jump, hover to preview, and keyboard shortcuts.
 */

'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { HistoryEntry } from './types';

// ============================================================================
// Icons
// ============================================================================

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function EmptyStateIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

// ============================================================================
// Types
// ============================================================================

interface HistoryThumbnailsProps {
  entries: HistoryEntry[];
  currentIndex: number;
  onJumpTo: (index: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  className?: string;
}

// ============================================================================
// Thumbnail Item
// ============================================================================

interface ThumbnailItemProps {
  entry: HistoryEntry;
  index: number;
  isCurrent: boolean;
  onClick: () => void;
}

function ThumbnailItem({ entry, index, isCurrent, onClick }: ThumbnailItemProps) {
  const timeAgo = formatTimeAgo(entry.timestamp);

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-shrink-0 group relative rounded-lg overflow-hidden transition-all duration-200',
        'border-2 focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:ring-offset-2 focus:ring-offset-background-surface',
        isCurrent
          ? 'border-interactive-500 ring-2 ring-interactive-500/30'
          : 'border-border-subtle hover:border-border-default'
      )}
      title={`${entry.label} - ${timeAgo}`}
    >
      {/* Thumbnail or placeholder */}
      <div className="w-16 h-12 bg-background-elevated flex items-center justify-center">
        {entry.thumbnail ? (
          <img
            src={entry.thumbnail}
            alt={entry.label}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs text-text-tertiary font-medium">
            {index + 1}
          </span>
        )}
      </div>

      {/* Current indicator */}
      {isCurrent && (
        <div className="absolute inset-0 bg-interactive-500/10 pointer-events-none" />
      )}

      {/* Hover overlay with label */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 px-1 py-0.5 bg-background-surface/90 backdrop-blur-sm',
          'text-[10px] text-text-secondary truncate',
          'opacity-0 group-hover:opacity-100 transition-opacity'
        )}
      >
        {entry.label}
      </div>
    </button>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ============================================================================
// History Thumbnails
// ============================================================================

export function HistoryThumbnails({
  entries,
  currentIndex,
  onJumpTo,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  className,
}: HistoryThumbnailsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current entry when it changes
  useEffect(() => {
    if (scrollRef.current && currentIndex >= 0) {
      const container = scrollRef.current;
      const items = container.children;
      const currentItem = items[currentIndex] as HTMLElement | undefined;

      if (currentItem) {
        currentItem.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [currentIndex]);

  if (entries.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'bg-background-surface/80 backdrop-blur-sm border border-border-subtle',
          'text-text-tertiary text-sm',
          className
        )}
      >
        <EmptyStateIcon />
        <span>No history yet</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-xl',
        'bg-background-surface/95 backdrop-blur-md border border-border-subtle shadow-lg',
        className
      )}
    >
      {/* History icon */}
      <div className="flex items-center gap-1.5 px-2 text-text-muted">
        <ClockIcon />
        <span className="text-xs font-medium">{entries.length}</span>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-border-subtle" />

      {/* Undo button */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={cn(
          'p-1.5 rounded-lg transition-colors',
          canUndo
            ? 'text-text-secondary hover:text-text-primary hover:bg-background-elevated'
            : 'text-text-tertiary opacity-50 cursor-not-allowed'
        )}
        title="Undo (⌘Z)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
      </button>

      {/* Thumbnails scroll area */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-border-default scrollbar-track-transparent max-w-[400px]"
      >
        {entries.map((entry, index) => (
          <ThumbnailItem
            key={entry.id}
            entry={entry}
            index={index}
            isCurrent={index === currentIndex}
            onClick={() => onJumpTo(index)}
          />
        ))}
      </div>

      {/* Redo button */}
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={cn(
          'p-1.5 rounded-lg transition-colors',
          canRedo
            ? 'text-text-secondary hover:text-text-primary hover:bg-background-elevated'
            : 'text-text-tertiary opacity-50 cursor-not-allowed'
        )}
        title="Redo (⌘⇧Z)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
        </svg>
      </button>
    </div>
  );
}
