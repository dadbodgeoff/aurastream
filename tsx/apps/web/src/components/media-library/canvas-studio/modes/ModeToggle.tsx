/**
 * Mode Toggle Component
 * 
 * Switch between Easy and Pro modes.
 */

'use client';

import { cn } from '@/lib/utils';
import type { StudioMode } from './types';

// ============================================================================
// Icons
// ============================================================================

function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

// ============================================================================
// Mode Toggle
// ============================================================================

interface ModeToggleProps {
  mode: StudioMode;
  onChange: (mode: StudioMode) => void;
  className?: string;
}

export function ModeToggle({ mode, onChange, className }: ModeToggleProps) {
  return (
    <div className={cn('flex items-center gap-1 p-1 rounded-lg bg-background-elevated border border-border-subtle', className)}>
      <button
        onClick={() => onChange('easy')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
          mode === 'easy'
            ? 'bg-emerald-500 text-white shadow-sm'
            : 'text-text-muted hover:text-text-primary hover:bg-background-surface'
        )}
      >
        <SparklesIcon />
        Easy
      </button>
      <button
        onClick={() => onChange('pro')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
          mode === 'pro'
            ? 'bg-interactive-500 text-white shadow-sm'
            : 'text-text-muted hover:text-text-primary hover:bg-background-surface'
        )}
      >
        <SlidersIcon />
        Pro
      </button>
    </div>
  );
}
