/**
 * Active Effects UI - Type Definitions
 *
 * Types for the Active Effects Bar and Property Inspector components.
 * Provides a unified interface for managing applied animation effects.
 */

import type { AnimationConfig } from '@aurastream/api-client';

// ============================================================================
// Effect Categories
// ============================================================================

export type EffectCategory = 'entry' | 'loop' | 'depth' | 'particles';

export interface EffectInfo {
  /** Unique identifier for the effect */
  id: string;
  /** Display category */
  category: EffectCategory;
  /** Effect type (e.g., 'wiggle', 'parallax', 'sparkles') */
  type: string;
  /** Human-readable label */
  label: string;
  /** Icon emoji or component */
  icon: string;
  /** Whether the effect is currently enabled */
  enabled: boolean;
  /** Color theme for the effect badge */
  color: EffectColor;
  /** Brief description */
  description?: string;
}

export type EffectColor = 
  | 'purple' 
  | 'cyan' 
  | 'pink' 
  | 'green' 
  | 'yellow' 
  | 'orange' 
  | 'red' 
  | 'blue';

// ============================================================================
// Active Effects Bar
// ============================================================================

export interface ActiveEffectsBarProps {
  /** Current animation configuration */
  config: AnimationConfig;
  /** Callback when an effect is toggled on/off */
  onToggleEffect: (category: EffectCategory, enabled: boolean) => void;
  /** Callback when an effect is removed */
  onRemoveEffect: (category: EffectCategory) => void;
  /** Callback when an effect is selected for editing */
  onSelectEffect: (category: EffectCategory | null) => void;
  /** Currently selected effect for editing */
  selectedEffect: EffectCategory | null;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Property Inspector
// ============================================================================

export interface PropertyInspectorProps {
  /** Current animation configuration */
  config: AnimationConfig;
  /** Currently selected effect category */
  selectedEffect: EffectCategory | null;
  /** Callback when configuration changes */
  onConfigChange: (config: AnimationConfig) => void;
  /** Callback to close the inspector */
  onClose: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Effect Property Definitions
// ============================================================================

export interface PropertyDefinition {
  /** Property key in the config */
  key: string;
  /** Display label */
  label: string;
  /** Property type */
  type: 'slider' | 'select' | 'color' | 'toggle' | 'number';
  /** Minimum value (for sliders/numbers) */
  min?: number;
  /** Maximum value (for sliders/numbers) */
  max?: number;
  /** Step value (for sliders/numbers) */
  step?: number;
  /** Unit suffix (e.g., 'px', '°', '%') */
  suffix?: string;
  /** Options for select type */
  options?: Array<{ value: string; label: string }>;
  /** Default value */
  defaultValue?: number | string | boolean;
  /** Help text */
  description?: string;
}

export interface EffectPropertySchema {
  /** Effect category */
  category: EffectCategory;
  /** Effect type */
  type: string;
  /** Display label */
  label: string;
  /** Icon */
  icon: string;
  /** Property definitions */
  properties: PropertyDefinition[];
}

// ============================================================================
// Effect Stack (for future layer management)
// ============================================================================

export interface EffectStackItem {
  /** Unique ID */
  id: string;
  /** Effect category */
  category: EffectCategory;
  /** Effect type */
  type: string;
  /** Display order (lower = rendered first) */
  order: number;
  /** Whether visible */
  visible: boolean;
  /** Whether locked from editing */
  locked: boolean;
}

export interface EffectStackProps {
  /** Stack items */
  items: EffectStackItem[];
  /** Selected item ID */
  selectedId: string | null;
  /** Callback when item is selected */
  onSelect: (id: string | null) => void;
  /** Callback when item visibility is toggled */
  onToggleVisibility: (id: string) => void;
  /** Callback when item is removed */
  onRemove: (id: string) => void;
  /** Callback when items are reordered */
  onReorder: (items: EffectStackItem[]) => void;
  /** Additional CSS classes */
  className?: string;
}
