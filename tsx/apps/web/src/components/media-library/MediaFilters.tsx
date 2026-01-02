'use client';

import { cn } from '@/lib/utils';
import { MEDIA_ASSET_TYPES, MEDIA_ASSET_TYPE_LABELS } from '@aurastream/api-client';
import { ASSET_TYPE_ICONS, SORT_OPTIONS } from './constants';
import type { MediaFiltersProps } from './types';
import type { MediaAssetType } from '@aurastream/api-client';

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function MediaFilters({ filters, onChange, className }: MediaFiltersProps) {
  const handleTypeChange = (type: MediaAssetType | undefined) => {
    onChange({ ...filters, assetType: type });
  };

  const handleSearchChange = (search: string) => {
    onChange({ ...filters, search: search || undefined });
  };

  const handleFavoritesToggle = () => {
    onChange({ ...filters, favoritesOnly: !filters.favoritesOnly });
  };

  const handleSortChange = (sortBy: typeof filters.sortBy) => {
    onChange({ ...filters, sortBy });
  };

  const handleSortOrderToggle = () => {
    onChange({ ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search & Quick Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search assets..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border-subtle bg-background-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-interactive-500/30 focus:border-interactive-500"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            <SearchIcon />
          </div>
        </div>

        {/* Favorites Toggle */}
        <button
          onClick={handleFavoritesToggle}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
            filters.favoritesOnly
              ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
              : 'bg-background-surface border-border-subtle text-text-muted hover:border-border-default'
          )}
        >
          <HeartIcon />
          <span className="text-sm">Favorites</span>
        </button>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <select
            value={filters.sortBy || 'created_at'}
            onChange={(e) => handleSortChange(e.target.value as typeof filters.sortBy)}
            className="px-3 py-2 rounded-lg border border-border-subtle bg-background-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-interactive-500/30"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={handleSortOrderToggle}
            className="p-2 rounded-lg border border-border-subtle bg-background-surface text-text-muted hover:border-border-default transition-colors"
            title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={cn('transition-transform', filters.sortOrder === 'asc' && 'rotate-180')}
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Type Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleTypeChange(undefined)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            !filters.assetType
              ? 'bg-interactive-500 text-white'
              : 'bg-background-elevated text-text-muted hover:bg-background-surface'
          )}
        >
          All Types
        </button>
        {MEDIA_ASSET_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5',
              filters.assetType === type
                ? 'bg-interactive-500 text-white'
                : 'bg-background-elevated text-text-muted hover:bg-background-surface'
            )}
          >
            <span>{ASSET_TYPE_ICONS[type]}</span>
            <span>{MEDIA_ASSET_TYPE_LABELS[type]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
