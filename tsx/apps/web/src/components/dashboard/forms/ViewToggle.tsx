'use client';

import { cn } from '@/lib/utils';
import { GridIcon, ListIcon } from '../icons';

export type ViewMode = 'grid' | 'list';

export interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div className={cn('flex items-center bg-background-surface border border-border-subtle rounded-lg p-1', className)}>
      <button
        onClick={() => onChange('grid')}
        className={cn(
          'p-1.5 rounded transition-colors',
          value === 'grid'
            ? 'bg-interactive-600 text-white'
            : 'text-text-muted hover:text-text-secondary'
        )}
        title="Grid view"
      >
        <GridIcon size="sm" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={cn(
          'p-1.5 rounded transition-colors',
          value === 'list'
            ? 'bg-interactive-600 text-white'
            : 'text-text-muted hover:text-text-secondary'
        )}
        title="List view"
      >
        <ListIcon size="sm" />
      </button>
    </div>
  );
}
