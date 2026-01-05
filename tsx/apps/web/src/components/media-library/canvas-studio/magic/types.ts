/**
 * Magic Module Types
 * Smart features for Canvas Studio
 */

import type { AssetPlacement } from '../../placement/types';
import type { CanvasDimensions } from '../types';

// ============================================================================
// Layout Suggestion Types
// ============================================================================

/**
 * Predefined layout preset identifiers
 */
export type LayoutPreset = 'centered' | 'left-heavy' | 'right-heavy' | 'grid' | 'diagonal' | 'stacked';

/**
 * A layout suggestion with placement recommendations
 */
export interface LayoutSuggestion {
  /** Unique identifier for the suggestion */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of the layout */
  description: string;
  /** The preset type */
  preset: LayoutPreset;
  /** Optional thumbnail preview URL */
  thumbnail?: string;
  /** Partial placements to apply (position, size, etc.) */
  placements: Partial<AssetPlacement>[];
}

// ============================================================================
// Collision Detection Types
// ============================================================================

/**
 * Axis-aligned bounding box for collision detection
 */
export interface BoundingBox {
  /** Left edge X coordinate (pixels) */
  x: number;
  /** Top edge Y coordinate (pixels) */
  y: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * Result of a collision check between elements
 */
export interface CollisionResult {
  /** Whether any collision was detected */
  hasCollision: boolean;
  /** IDs of elements that overlap with the checked element */
  overlappingIds: string[];
  /** Total overlap area in square pixels */
  overlapArea: number;
  /** Suggested position to avoid collision (if applicable) */
  suggestedPosition?: { x: number; y: number };
}

// ============================================================================
// Suggestion System Types
// ============================================================================

/**
 * Types of suggestions the system can provide
 */
export type SuggestionType = 'layout' | 'color' | 'text' | 'spacing' | 'alignment';

/**
 * Priority levels for suggestions
 */
export type SuggestionPriority = 'high' | 'medium' | 'low';

/**
 * A smart suggestion for improving the canvas
 */
export interface Suggestion {
  /** Unique identifier */
  id: string;
  /** Category of suggestion */
  type: SuggestionType;
  /** How important this suggestion is */
  priority: SuggestionPriority;
  /** Human-readable suggestion message */
  message: string;
  /** Optional action to apply the suggestion */
  action?: {
    /** Action type identifier */
    type: string;
    /** Action payload data */
    payload: Record<string, unknown>;
  };
  /** Whether the user has dismissed this suggestion */
  dismissed?: boolean;
}

// ============================================================================
// Auto-Layout Types
// ============================================================================

/**
 * Options for auto-layout algorithms
 */
export interface AutoLayoutOptions {
  /** Padding from canvas edges in pixels */
  padding: number;
  /** Spacing between elements in pixels */
  spacing: number;
  /** Alignment of elements within the layout */
  alignment: 'start' | 'center' | 'end';
  /** How elements are distributed */
  distribution: 'packed' | 'spread';
}

/**
 * Alignment options for align operations
 */
export type AlignmentOption = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

// ============================================================================
// Smart Defaults Types
// ============================================================================

/**
 * Recommended size for an asset
 */
export interface SmartSize {
  /** Width as percentage of canvas */
  widthPercent: number;
  /** Height as percentage of canvas */
  heightPercent: number;
  /** Whether to maintain aspect ratio */
  maintainAspectRatio: boolean;
}

/**
 * Recommended position for an asset
 */
export interface SmartPosition {
  /** X position as percentage (0-100) */
  x: number;
  /** Y position as percentage (0-100) */
  y: number;
}

/**
 * Context for smart defaults calculation
 */
export interface SmartDefaultsContext {
  /** Type of asset being placed */
  assetType: string;
  /** Type of canvas (e.g., 'twitch_emote', 'youtube_thumbnail') */
  canvasType: string;
  /** Canvas dimensions */
  dimensions: CanvasDimensions;
  /** Existing placements on the canvas */
  existingPlacements: AssetPlacement[];
}
