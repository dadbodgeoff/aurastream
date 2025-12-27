/**
 * Coach Context Components
 * 
 * Session context display components for the Prompt Coach chat interface.
 * Includes session badge, turns indicator, and context bar.
 * 
 * @module coach/context
 */

// useSessionContext - Hook for session state management
export { useSessionContext, default as useSessionContextDefault } from './useSessionContext';
export type {
  UseSessionContextOptions,
  UseSessionContextResult,
} from './useSessionContext';

// SessionBadge - Asset type badge component
export { SessionBadge, getAssetTypeLabel, ASSET_TYPE_LABELS } from './SessionBadge';
export type { SessionBadgeProps } from './SessionBadge';

// TurnsIndicator - Turns remaining indicator
export { TurnsIndicator } from './TurnsIndicator';
export type { TurnsIndicatorProps } from './TurnsIndicator';

// SessionContextBar - Sticky context bar
export { SessionContextBar } from './SessionContextBar';
export type { SessionContextBarProps } from './SessionContextBar';
