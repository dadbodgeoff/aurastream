/**
 * FilterBar - Horizontal filter controls for the Community Gallery.
 * Features sort dropdown, asset type filter, and search input.
 *
 * @module community/FilterBar
 */

'use client';

import { cn } from '@/lib/utils';

export interface FilterBarProps {
  sort: 'trending' | 'recent' | 'most_liked';
  onSortChange: (sort: 'trending' | 'recent' | 'most_liked') => void;
  assetType?: string;
  onAssetTypeChange: (type: string | undefined) => void;
  searchQuery?: string;
  onSearchChange: (query: string) => void;
  className?: string;
}

const SORT_OPTIONS = [
  { value: 'trending', label: 'Trending' },
  { value: 'recent', label: 'Recent' },
  { value: 'most_liked', label: 'Most Liked' },
] as const;

const ASSET_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'twitch_emote', label: 'Emote' },
  { value: 'twitch_banner', label: 'Banner' },
  { value: 'twitch_badge', label: 'Badge' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'youtube_thumbnail', label: 'Thumbnail' },
] as const;

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

const selectStyles = cn(
  'h-10 px-3 pr-8 rounded-lg border border-border-subtle bg-background-surface text-text-primary text-sm',
  'appearance-none cursor-pointer',
  'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:border-interactive-500',
  'hover:border-border-default transition-colors',
  'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b7280\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_0.75rem_center]'
);

export function FilterBar({
  sort,
  onSortChange,
  assetType,
  onAssetTypeChange,
  searchQuery = '',
  onSearchChange,
  className,
}: FilterBarProps) {
  return (
    <div className={cn(
      'flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4',
      className
    )}>
      {/* Sort Dropdown */}
      <div className="flex items-center gap-2">
        <label htmlFor="sort-select" className="text-sm text-text-muted whitespace-nowrap">
          Sort by:
        </label>
        <select
          id="sort-select"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as FilterBarProps['sort'])}
          className={selectStyles}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {/* Asset Type Filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="type-select" className="text-sm text-text-muted whitespace-nowrap">
          Type:
        </label>
        <select
          id="type-select"
          value={assetType ?? ''}
          onChange={(e) => onAssetTypeChange(e.target.value || undefined)}
          className={selectStyles}
        >
          {ASSET_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {/* Search Input */}
      <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-muted">
          <SearchIcon />
        </div>
        <input
          type="search"
          placeholder="Search posts..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            'w-full h-10 pl-10 pr-4 rounded-lg border border-border-subtle bg-background-surface text-text-primary text-sm',
            'placeholder:text-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:border-interactive-500',
            'hover:border-border-default transition-colors'
          )}
        />
      </div>
    </div>
  );
}

export default FilterBar;
