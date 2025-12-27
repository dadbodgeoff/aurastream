/**
 * SearchEmptyState Component
 * 
 * Empty state for search results when no matches are found.
 * Includes helpful suggestions and clear search action.
 * 
 * @module empty-states/SearchEmptyState
 */

'use client';

import React from 'react';
import { EmptyStateBase } from './EmptyStateBase';
import { NoResults } from './illustrations';

/**
 * Props for the SearchEmptyState component.
 */
export interface SearchEmptyStateProps {
  /** The search query that returned no results */
  query?: string;
  /** Handler for the primary "Clear Search" action */
  onClearSearch: () => void;
  /** Handler for the secondary "Create New" action */
  onCreateNew?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * X icon for the clear button.
 */
function XIcon(): JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 6L14 14M14 6L6 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Get description text based on whether a query is provided.
 */
function getDescription(query?: string): string {
  if (query && query.trim()) {
    return `We couldn't find anything matching "${query}". Try adjusting your search terms or create something new.`;
  }
  return 'No results found. Try adjusting your filters or search terms, or create something new.';
}

/**
 * SearchEmptyState - Empty state for search results.
 * 
 * Features:
 * - Magnifying glass illustration
 * - Dynamic description based on search query
 * - Clear search CTA button
 * - Optional secondary action for creating new content
 * - Helpful suggestions for users
 * - Fully accessible
 * 
 * @example
 * ```tsx
 * <SearchEmptyState
 *   query="purple emote"
 *   onClearSearch={() => setSearchQuery('')}
 *   onCreateNew={() => router.push('/dashboard/create')}
 * />
 * ```
 */
export function SearchEmptyState({
  query,
  onClearSearch,
  onCreateNew,
  className,
}: SearchEmptyStateProps): JSX.Element {
  return (
    <EmptyStateBase
      illustration={<NoResults />}
      title="No results found"
      description={getDescription(query)}
      primaryAction={{
        label: 'Clear search',
        onClick: onClearSearch,
        icon: <XIcon />,
      }}
      secondaryAction={
        onCreateNew
          ? {
              label: 'Create something new',
              onClick: onCreateNew,
            }
          : undefined
      }
      className={className}
      testId="search-empty-state"
    />
  );
}

SearchEmptyState.displayName = 'SearchEmptyState';

export default SearchEmptyState;
