/**
 * Empty States Components Index
 * @module empty-states
 * 
 * Re-exports all empty state components for convenient importing.
 * 
 * @example
 * ```tsx
 * import {
 *   EmptyStateBase,
 *   AssetsEmptyState,
 *   BrandKitsEmptyState,
 *   JobsEmptyState,
 *   SearchEmptyState,
 * } from '@/components/empty-states';
 * ```
 */

// Base component
export { EmptyStateBase } from './EmptyStateBase';
export type { EmptyStateProps, EmptyStateAction } from './EmptyStateBase';

// Specific empty states
export { AssetsEmptyState } from './AssetsEmptyState';
export type { AssetsEmptyStateProps } from './AssetsEmptyState';

export { BrandKitsEmptyState } from './BrandKitsEmptyState';
export type { BrandKitsEmptyStateProps } from './BrandKitsEmptyState';

export { JobsEmptyState } from './JobsEmptyState';
export type { JobsEmptyStateProps } from './JobsEmptyState';

export { SearchEmptyState } from './SearchEmptyState';
export type { SearchEmptyStateProps } from './SearchEmptyState';

// Illustrations
export * from './illustrations';
