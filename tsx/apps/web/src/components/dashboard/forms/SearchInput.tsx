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
        className="w-full pl-9 pr-9 py-2 bg-background-surface border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-interactive-600 focus:ring-1 focus:ring-interactive-600/20 transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
        >
          <XIcon size="sm" />
        </button>
      )}
    </div>
  );
}
