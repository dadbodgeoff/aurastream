'use client';

import { cn } from '@/lib/utils';
import { SearchIcon, XIcon } from '../icons';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
}: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <SearchIcon
        size="sm"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-10 pr-10 py-2 min-h-[44px]',
          'bg-background-surface border border-border-subtle rounded-lg',
          'text-sm text-text-primary placeholder:text-text-muted',
          'focus:outline-none focus:ring-2 focus:ring-interactive-500/50 focus:border-interactive-500',
          'transition-all duration-150'
        )}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2',
            'w-6 h-6 flex items-center justify-center rounded',
            'text-text-muted hover:text-text-secondary',
            'focus:outline-none focus:ring-2 focus:ring-interactive-500',
            'transition-colors'
          )}
          aria-label="Clear search"
        >
          <XIcon size="sm" />
        </button>
      )}
    </div>
  );
}
