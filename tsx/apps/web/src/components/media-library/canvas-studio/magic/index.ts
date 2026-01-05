/**
 * Magic Module - Smart Tools for Canvas Studio
 * 
 * This module provides intelligent features for the Canvas Studio:
 * - Collision Detection: Detect and resolve overlapping elements
 * - Auto Layout: Smart positioning and arrangement algorithms
 * - Smart Defaults: Context-aware default values for new placements
 * - Suggestions: AI-powered design improvement suggestions
 */

// Types
export type {
  LayoutPreset,
  LayoutSuggestion,
  BoundingBox,
  CollisionResult,
  SuggestionType,
  SuggestionPriority,
  Suggestion,
  AutoLayoutOptions,
  AlignmentOption,
  SmartSize,
  SmartPosition,
  SmartDefaultsContext,
} from './types';

// Collision Detection
export {
  getBoundingBox,
  checkCollision,
  calculateOverlapArea,
  findCollisions,
  checkPlacementCollision,
  suggestNonCollidingPosition,
} from './CollisionDetection';

// Auto Layout
export {
  LAYOUT_PRESETS,
  DEFAULT_AUTO_LAYOUT_OPTIONS,
  applyLayoutPreset,
  autoArrange,
  centerElement,
  distributeHorizontally,
  distributeVertically,
  alignElements,
} from './AutoLayout';

// Smart Defaults
export {
  getSmartSize,
  getSmartPosition,
  getSmartZIndex,
  getAllSmartDefaults,
} from './SmartDefaults';

// Suggestions
export {
  generateSuggestions,
  getSuggestionAction,
} from './Suggestions';
export type { SuggestionOptions } from './Suggestions';
